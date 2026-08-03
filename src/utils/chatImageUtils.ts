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
  maxDimension = 1600,
  quality = 0.85
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    // 1. Check raw file size limit (8 MB)
    if (file.size > 8 * 1024 * 1024) {
      return reject(new Error('A foto selecionada é grande demais. O limite é de 8 MB.'));
    }

    // 2. Allowed extensions check
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileNameLower = file.name.toLowerCase();
    const isAllowedExt = /\.(jpg|jpeg|png|webp)$/i.test(fileNameLower);

    if (!allowedMimes.includes(file.type) || !isAllowedExt) {
      return reject(new Error('Formato não suportado. Apenas JPG, JPEG, PNG e WEBP são permitidos.'));
    }

    // 3. Reject GIFs or double extension scripts
    if (fileNameLower.endsWith('.gif') || fileNameLower.includes('.php') || fileNameLower.includes('.exe')) {
      return reject(new Error('Formato de arquivo inválido ou não suportado.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem corrompido ou inválido.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale dimensions while maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Não foi possível inicializar o renderizador de imagem.'));
        }

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export to JPEG base64
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const base64 = canvas.toDataURL(outputMime, quality);

        // Approximate size from base64
        const stringLength = base64.length - (base64.indexOf(',') + 1);
        const approxSize = Math.ceil((stringLength * 3) / 4);

        resolve({
          base64,
          mime: outputMime,
          width,
          height,
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

