export interface ImageFeatures {
  width: number;
  height: number;
  aspectRatio: number;
  dominantColors: string[];
  brightness: number;
  isBright: boolean;
  isWhiteOrNeutralBg: boolean;
  canvasDataUrl?: string;
}

export class ImagePreprocessor {
  static async preprocess(imageDataUrl: string): Promise<ImageFeatures> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const width = img.width || 300;
        const height = img.height || 300;
        const aspectRatio = width / height;

        // Draw on small canvas for fast pixel analysis
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({
            width,
            height,
            aspectRatio,
            dominantColors: ['neutro'],
            brightness: 128,
            isBright: true,
            isWhiteOrNeutralBg: true,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, 64, 64);
        const imgData = ctx.getImageData(0, 0, 64, 64);
        const data = imgData.data;

        let totalBrightness = 0;
        let whitePixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;

          if (r > 220 && g > 220 && b > 220) {
            whitePixels++;
          }
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        const isWhiteBg = whitePixels > (data.length / 4) * 0.25;

        const dominantColors: string[] = [];
        if (avgBrightness > 180) dominantColors.push('branca / clara');
        else if (avgBrightness < 70) dominantColors.push('escura / preta');
        else dominantColors.push('colorida / vibrante');

        resolve({
          width,
          height,
          aspectRatio,
          dominantColors,
          brightness: avgBrightness,
          isBright: avgBrightness > 128,
          isWhiteOrNeutralBg: isWhiteBg,
        });
      };

      img.onerror = () => {
        resolve({
          width: 300,
          height: 300,
          aspectRatio: 1,
          dominantColors: ['neutro'],
          brightness: 128,
          isBright: true,
          isWhiteOrNeutralBg: false,
        });
      };

      img.src = imageDataUrl;
    });
  }
}
