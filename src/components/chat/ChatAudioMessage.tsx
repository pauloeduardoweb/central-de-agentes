import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Mic } from 'lucide-react';

interface ChatAudioMessageProps {
  audioUrl: string;
  duration?: number | string | null;
  isOwn?: boolean;
}

export const ChatAudioMessage: React.FC<ChatAudioMessageProps> = ({
  audioUrl,
  duration,
  isOwn = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(
    typeof duration === 'number' && duration > 0
      ? duration
      : typeof duration === 'string' && !isNaN(Number(duration)) && Number(duration) > 0
      ? Number(duration)
      : 0
  );
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackError(null);
    if (typeof duration === 'number' && duration > 0) {
      setTotalDuration(duration);
    } else if (typeof duration === 'string' && !isNaN(Number(duration)) && Number(duration) > 0) {
      setTotalDuration(Number(duration));
    } else {
      setTotalDuration(0);
    }
  }, [audioUrl, duration]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaybackError(null);

    try {
      if (audio.paused) {
        audio.playbackRate = playbackRate;
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error('[AUDIO PLAYBACK ERROR]', error);
      setPlaybackError('Não foi possível reproduzir este áudio.');
      setIsPlaying(false);
    }
  };

  const toggleSpeed = () => {
    const rates = [0.5, 1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setTotalDuration(audio.duration);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleError = () => {
    console.error('[AUDIO ELEMENT ERROR]', audioRef.current?.error);
    setPlaybackError('Erro ao carregar o áudio.');
    setIsPlaying(false);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`p-3 rounded-2xl flex flex-col gap-2 min-w-[240px] sm:min-w-[280px] max-w-xs sm:max-w-md ${
      isOwn ? 'bg-emerald-950/40 border border-emerald-500/30' : 'bg-[#111b21] border border-slate-700/60'
    }`}>
      {/* Real HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
      />

      <div className="flex items-center gap-2.5">
        {/* Mic Icon Badge */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isOwn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
        }`}>
          <Mic className="w-4 h-4" />
        </div>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handlePlayPause}
          style={{ touchAction: 'manipulation' }}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition-all transform active:scale-95 shadow-md cursor-pointer shrink-0 z-20 ${
            isOwn ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'
          }`}
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          title={isPlaying ? 'Pausar Áudio' : 'Ouvir Áudio'}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        {/* Waveform / Progress Bar */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative w-full h-3 flex items-center">
            {/* Simulated waveform bars background */}
            <div className="absolute inset-0 flex items-center justify-between gap-0.5 opacity-30 pointer-events-none">
              {[40, 70, 30, 90, 100, 60, 40, 80, 50, 90, 70, 30, 80, 100, 60, 40, 90, 50, 80, 60, 30].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full ${isOwn ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            {/* Interactive Range Seekbar */}
            <input
              type="range"
              min={0}
              max={totalDuration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 accent-emerald-400 bg-slate-700/80 rounded-lg appearance-none cursor-pointer z-10"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(totalDuration)}</span>
          </div>
        </div>

        {/* Playback Speed Switcher */}
        <button
          type="button"
          onClick={toggleSpeed}
          style={{ touchAction: 'manipulation' }}
          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 cursor-pointer shrink-0"
          title="Velocidade de reprodução"
        >
          {playbackRate}x
        </button>

        {/* Download Audio Button */}
        <a
          href={audioUrl}
          download="audio_geracaoz.webm"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="Baixar Áudio"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>

      {playbackError && (
        <div className="text-[11px] text-red-400 font-medium px-1">
          {playbackError}
        </div>
      )}
    </div>
  );
};
