export interface CompressedImageResult {
  base64: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  name: string;
  file: File;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function compressAndPrepareImage(
  file: File,
  initialMaxDimension = 1600,
  initialQuality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // 1. Check raw file size limit (15 MB input limit before browser compression)
    if (file.size > 15 * 1024 * 1024) {
      return reject(new Error('A foto selecionada é grande demais. O limite máximo é de 15 MB.'));
    }

    // 2. Allowed extensions check
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileNameLower = file.name.toLowerCase();
    const isAllowedExt = /\.(jpg|jpeg|png|webp)$/i.test(fileNameLower);

    if (!allowedMimes.includes(file.type) && !isAllowedExt) {
      return reject(new Error('Formato não suportado. Apenas JPG, JPEG, PNG e WEBP são permitidos.'));
    }

    // 3. Reject GIFs or dangerous scripts in image upload
    if (fileNameLower.endsWith('.gif') || fileNameLower.includes('.php') || fileNameLower.includes('.exe') || fileNameLower.includes('.sh')) {
      return reject(new Error('Formato de arquivo inválido ou não suportado.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem corrompido ou inválido.'));
      img.onload = () => {
        let maxDimension = initialMaxDimension;
        let quality = initialQuality;

        // Function to attempt render and compression at given maxDimension & quality
        const attemptCompression = (dim: number, qual: number) => {
          let width = img.width;
          let height = img.height;

          // Scale dimensions maintaining aspect ratio
          if (width > dim || height > dim) {
            if (width > height) {
              height = Math.round((height * dim) / width);
              width = dim;
            } else {
              width = Math.round((width * dim) / height);
              height = dim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Não foi possível inicializar o renderizador de imagem.');
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Prefer WEBP; fallback to JPEG if WEBP is unsupported
          let outputMime = 'image/webp';
          let base64 = canvas.toDataURL(outputMime, qual);
          if (!base64.startsWith('data:image/webp')) {
            outputMime = 'image/jpeg';
            base64 = canvas.toDataURL(outputMime, qual);
          }

          const base64Length = base64.length - (base64.indexOf(',') + 1);
          const approxSize = Math.ceil((base64Length * 3) / 4);

          return { base64, mime: outputMime, width: canvas.width, height: canvas.height, size: approxSize };
        };

        const MAX_ALLOWED_BYTES = 1.8 * 1024 * 1024; // 1.8 MB safety threshold for Vercel payloads
        let result = attemptCompression(maxDimension, quality);

        // Progressive quality & dimension reduction loop if output exceeds 1.8MB
        const qualitySteps = [0.82, 0.70, 0.55, 0.40, 0.25];
        const dimensionSteps = [1600, 1200, 960, 720];

        let dimIdx = 0;
        let qualIdx = 0;

        while (result.size > MAX_ALLOWED_BYTES && (dimIdx < dimensionSteps.length || qualIdx < qualitySteps.length)) {
          if (qualIdx < qualitySteps.length - 1) {
            qualIdx++;
          } else if (dimIdx < dimensionSteps.length - 1) {
            dimIdx++;
            qualIdx = 1; // Reset to medium quality for smaller dimension
          } else {
            break;
          }

          maxDimension = dimensionSteps[dimIdx];
          quality = qualitySteps[qualIdx];

          console.log(`[IMAGE COMPRESS] Reducing payload: dim=${maxDimension}, quality=${quality}, prevSize=${(result.size / 1024 / 1024).toFixed(2)}MB`);
          result = attemptCompression(maxDimension, quality);
        }

        if (result.size > 2.0 * 1024 * 1024) {
          return reject(new Error('A imagem é muito complexa para envio. Escolha uma foto com menor resolução.'));
        }

        console.log(`[IMAGE COMPRESS SUCCESS] Final Size: ${(result.size / 1024).toFixed(1)} KB, Dim: ${result.width}x${result.height}, Mime: ${result.mime}`);

        resolve({
          base64: result.base64,
          mime: result.mime,
          width: result.width,
          height: result.height,
          size: result.size,
          name: file.name,
          file,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export async function compressAndPrepareAvatar(
  file: File,
  targetSize = 512,
  quality = 0.85
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      return reject(new Error('A foto selecionada é grande demais. O limite é de 8 MB.'));
    }

    const fileNameLower = file.name.toLowerCase();
    if (fileNameLower.includes('.php') || fileNameLower.includes('.exe') || fileNameLower.includes('.sh')) {
      return reject(new Error('Formato de arquivo inválido ou não permitido.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de foto.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem selecionada. Escolha outra foto.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Não foi possível inicializar o renderizador de foto.'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Center crop to square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        const outputMime = 'image/jpeg';
        const base64 = canvas.toDataURL(outputMime, quality);

        const stringLength = base64.length - (base64.indexOf(',') + 1);
        const approxSize = Math.ceil((stringLength * 3) / 4);

        resolve({
          base64,
          mime: outputMime,
          width: targetSize,
          height: targetSize,
          size: approxSize,
          name: file.name,
          file,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

