import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface AudioExtractionResult {
  success: boolean;
  hasAudio: boolean;
  audioBuffer?: Buffer;
  audioMime?: string;
  durationSeconds?: number;
  error?: string;
}

export interface AudioBinariesHealth {
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  ffmpegPath: string | null;
  ffprobePath: string | null;
  ffmpegVersion?: string;
}

/**
 * Resolução dinâmica e segura de binários do FFmpeg e FFprobe
 */
let cachedFfmpegPath: string | null = null;
let cachedFfprobePath: string | null = null;
let cachedFfmpegVersion: string | undefined = undefined;

export function resolveFfmpegPath(): string | null {
  if (cachedFfmpegPath && isExecutable(cachedFfmpegPath)) {
    return cachedFfmpegPath;
  }

  const candidates = [
    process.env.FFMPEG_PATH,
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    'ffmpeg',
  ].filter((p): p is string => Boolean(p && p.trim()));

  for (const candidate of candidates) {
    try {
      const res = spawnSync(candidate, ['-version'], { timeout: 2000 });
      if (res.status === 0) {
        cachedFfmpegPath = candidate;
        const outStr = res.stdout ? res.stdout.toString() : '';
        const match = outStr.match(/ffmpeg version\s+([^\s]+)/i);
        if (match && match[1]) {
          cachedFfmpegVersion = match[1];
        }
        return candidate;
      }
    } catch {}
  }

  return null;
}

export function resolveFfprobePath(): string | null {
  if (cachedFfprobePath && isExecutable(cachedFfprobePath)) {
    return cachedFfprobePath;
  }

  const candidates = [
    process.env.FFPROBE_PATH,
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    'ffprobe',
  ].filter((p): p is string => Boolean(p && p.trim()));

  for (const candidate of candidates) {
    try {
      const res = spawnSync(candidate, ['-version'], { timeout: 2000 });
      if (res.status === 0) {
        cachedFfprobePath = candidate;
        return candidate;
      }
    } catch {}
  }

  return null;
}

function isExecutable(filePath: string): boolean {
  try {
    if (filePath.includes(path.sep)) {
      fs.accessSync(filePath, fs.constants.X_OK);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Health check dos binários de áudio
 */
export function getAudioBinariesHealth(): AudioBinariesHealth {
  const ffmpegPath = resolveFfmpegPath();
  const ffprobePath = resolveFfprobePath();

  return {
    ffmpegAvailable: Boolean(ffmpegPath),
    ffprobeAvailable: Boolean(ffprobePath),
    ffmpegPath,
    ffprobePath,
    ffmpegVersion: cachedFfmpegVersion,
  };
}

/**
 * Inspeciona os fluxos de um arquivo de mídia e extrai a faixa de áudio
 * em formato MP3 leve e otimizado para reconhecimento de fala com IA.
 */
export async function extractAudioFromMediaBuffer(
  mediaBuffer: Buffer,
  hintMime = 'video/mp4'
): Promise<AudioExtractionResult> {
  if (!mediaBuffer || mediaBuffer.length < 1000) {
    return {
      success: false,
      hasAudio: false,
      error: 'BUFFER_EMPTY_OR_TOO_SMALL',
    };
  }

  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath) {
    console.error('[AudioExtractor]: FFMPEG_NOT_AVAILABLE - No working ffmpeg binary found.');
    return {
      success: false,
      hasAudio: false,
      error: 'FFMPEG_NOT_AVAILABLE',
    };
  }

  const ffprobePath = resolveFfprobePath();
  if (!ffprobePath) {
    console.warn('[AudioExtractor]: FFPROBE_NOT_AVAILABLE - Proceeding without probe verification.');
  }

  const tmpDir = os.tmpdir();
  const fileId = `tiktok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const inputExt = hintMime.includes('webm') ? 'webm' : hintMime.includes('ogg') ? 'ogg' : hintMime.includes('mp3') ? 'mp3' : 'mp4';
  const inputPath = path.join(tmpDir, `${fileId}_in.${inputExt}`);
  const outputPath = path.join(tmpDir, `${fileId}_audio.mp3`);

  try {
    // 1. Gravar arquivo temporário de entrada
    await fs.promises.writeFile(inputPath, mediaBuffer);

    // 2. Executar ffprobe (se disponível) para verificar se há stream de áudio e extrair duração
    let durationSeconds = 0;
    if (ffprobePath) {
      const probeResult = await runFfprobe(ffprobePath, inputPath);
      if (!probeResult.hasAudioStream) {
        return {
          success: false,
          hasAudio: false,
          durationSeconds: probeResult.durationSeconds || 0,
          error: 'VIDEO_WITHOUT_AUDIO',
        };
      }
      durationSeconds = probeResult.durationSeconds;
    }

    // 3. Executar ffmpeg para converter em MP3 de alta fidelidade para voz (16kHz, mono, 64kbps)
    // 16kHz mono a 64kbps gera ~8KB por segundo de áudio (1 min = ~480 KB!), com excelente fidelidade fonética.
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-y', // sobrescrever saída se existir
        '-i', inputPath, // entrada
        '-vn', // sem vídeo
        '-acodec', 'libmp3lame', // codec mp3
        '-ar', '16000', // taxa de amostragem 16kHz (ideal para speech-to-text)
        '-ac', '1', // mono
        '-b:a', '64k', // bitrate 64 kbps
        outputPath,
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Se o erro indicar que não há streams de áudio correspondentes:
          if (stderr.includes('does not contain any stream') || stderr.includes('Output file is empty')) {
            reject(new Error('VIDEO_WITHOUT_AUDIO'));
          } else {
            reject(new Error(`FFMPEG_EXTRACTION_FAILED (code ${code}): ${stderr.slice(-300)}`));
          }
        }
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });

    // 4. Ler o buffer de áudio gerado
    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        hasAudio: false,
        error: 'AUDIO_OUTPUT_FILE_MISSING',
      };
    }

    const audioBuffer = await fs.promises.readFile(outputPath);
    if (audioBuffer.length < 500) {
      return {
        success: false,
        hasAudio: false,
        error: 'AUDIO_OUTPUT_EMPTY',
      };
    }

    return {
      success: true,
      hasAudio: true,
      audioBuffer,
      audioMime: 'audio/mp3',
      durationSeconds: durationSeconds || Math.max(1, Math.round(audioBuffer.length / 8000)),
    };
  } catch (err: any) {
    console.error('[extractAudioFromMediaBuffer Error]:', err?.message || err);
    if (err?.message === 'VIDEO_WITHOUT_AUDIO') {
      return {
        success: false,
        hasAudio: false,
        error: 'VIDEO_WITHOUT_AUDIO',
      };
    }
    return {
      success: false,
      hasAudio: false,
      error: err?.message || 'AUDIO_EXTRACTION_ERROR',
    };
  } finally {
    // Limpeza garantida de arquivos temporários
    try {
      if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
    } catch {}
    try {
      if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);
    } catch {}
  }
}

/**
 * Roda ffprobe para detectar se existe stream de áudio e descobrir duração
 */
function runFfprobe(ffprobePath: string, filePath: string): Promise<{ hasAudioStream: boolean; durationSeconds: number }> {
  return new Promise((resolve) => {
    const ffprobe = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'stream=codec_type,duration:format=duration',
      '-of', 'json',
      filePath,
    ]);

    let stdout = '';
    ffprobe.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    ffprobe.on('close', () => {
      try {
        const parsed = JSON.parse(stdout);
        const streams = parsed.streams || [];
        const hasAudio = streams.some((s: any) => s.codec_type === 'audio');
        let duration = 0;
        if (parsed.format?.duration) {
          duration = Math.round(parseFloat(parsed.format.duration));
        } else if (streams[0]?.duration) {
          duration = Math.round(parseFloat(streams[0].duration));
        }
        resolve({ hasAudioStream: hasAudio, durationSeconds: duration });
      } catch {
        // Se falhar o parse do JSON do ffprobe, assume que tem áudio e deixa o ffmpeg tentar
        resolve({ hasAudioStream: true, durationSeconds: 0 });
      }
    });

    ffprobe.on('error', () => {
      // Fallback em caso de erro ao invocar ffprobe
      resolve({ hasAudioStream: true, durationSeconds: 0 });
    });
  });
}
