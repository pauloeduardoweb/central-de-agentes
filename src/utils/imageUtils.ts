/**
 * Validates and processes a profile picture image file.
 * Restricts to JPG, JPEG, PNG, WEBP formats.
 * Enforces a 5 MB max file size limit.
 * Resizes client-side using Canvas to ensure efficient storage and fast load times.
 */
export function processProfileImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Nenhum arquivo selecionado.'));
    }

    // 1. Validate file type
    const validMimetypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileType = file.type.toLowerCase();
    
    // Also check extension as fallback for Windows/browsers with generic mime
    const fileName = file.name.toLowerCase();
    const hasValidExt = /\.(jpg|jpeg|png|webp)$/i.test(fileName);

    if (!validMimetypes.includes(fileType) && !hasValidExt) {
      return reject(new Error('Formato inválido. Por favor, envie uma imagem nos formatos JPG, JPEG, PNG ou WEBP.'));
    }

    // 2. Validate max file size (5 MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return reject(new Error('O arquivo excede o tamanho máximo permitido de 5 MB. Escolha uma imagem menor.'));
    }

    // 3. Read file and compress/resize via HTML5 Canvas
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler a imagem. Tente novamente.'));
    reader.onload = (e) => {
      const srcResult = e.target?.result as string;
      if (!srcResult) {
        return reject(new Error('Não foi possível ler os dados da imagem.'));
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem corrompido ou inválido.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 350; // Max 350x350 box
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(srcResult);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Export as compressed WebP or JPEG
          const dataUrl = canvas.toDataURL('image/webp', 0.88);
          resolve(dataUrl);
        } catch (err) {
          // Fallback to raw data url if canvas manipulation fails
          resolve(srcResult);
        }
      };
      img.src = srcResult;
    };

    reader.readAsDataURL(file);
  });
}
