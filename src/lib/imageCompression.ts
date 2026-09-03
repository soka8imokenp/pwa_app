/**
 * Downscales and compresses an image file to a max dimension and JPEG quality.
 * Prevents memory crashes, network timeouts, and Gemini REST API request size limit errors.
 */
export function compressImageFile(
  file: File,
  maxDimension: number = 1024,
  quality: number = 0.8
): Promise<{ base64Data: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let { width, height } = img;
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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = 'image/jpeg';
        const previewUrl = canvas.toDataURL(mimeType, quality);
        const base64Data = previewUrl.split(',')[1];
        resolve({ base64Data, mimeType, previewUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
