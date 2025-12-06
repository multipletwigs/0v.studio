/**
 * Converts near-white pixels to #F9FAFB for better canvas background matching
 * Also trims whitespace from around image content
 */
export async function trimImageWhitespace(
  imageUrl: string,
  threshold = 200, // pixels above this value become #F9FAFB
  padding = 10 // padding to add around the content
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(imageUrl);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;

      // Find bounds of non-white content AND convert near-white to pure white
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Convert near-white pixels to #F9FAFB (249, 250, 251)
          if (r > threshold && g > threshold && b > threshold) {
            data[i] = 249;
            data[i + 1] = 250;
            data[i + 2] = 251;
          } else {
            // Track bounds of non-white content
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // Put the modified image data back
      ctx.putImageData(imageData, 0, 0);

      // If no content found, return the whitened image
      if (minX >= maxX || minY >= maxY) {
        resolve(canvas.toDataURL('image/png'));
        return;
      }

      // Add padding
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(width - 1, maxX + padding);
      maxY = Math.min(height - 1, maxY + padding);

      // Create cropped canvas
      const croppedWidth = maxX - minX + 1;
      const croppedHeight = maxY - minY + 1;

      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d');

      if (!croppedCtx) {
        resolve(canvas.toDataURL('image/png'));
        return;
      }

      croppedCanvas.width = croppedWidth;
      croppedCanvas.height = croppedHeight;

      croppedCtx.drawImage(
        canvas,
        minX, minY, croppedWidth, croppedHeight,
        0, 0, croppedWidth, croppedHeight
      );

      resolve(croppedCanvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}
