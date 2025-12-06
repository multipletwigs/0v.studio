import type { Editor } from 'tldraw';

export interface CanvasExport {
  imageBase64: string;
  svgString: string;
  blob: Blob;
}

/**
 * Export the current viewport as an image
 */
export async function exportCanvas(editor: Editor): Promise<CanvasExport> {
  // Get the current viewport bounds
  const viewport = editor.getViewportPageBounds();

  // Get all shapes visible in the viewport (for SVG export)
  const allShapeIds = Array.from(editor.getCurrentPageShapeIds());

  // Export PNG of the viewport
  const imageResult = await editor.toImage(allShapeIds, {
    format: 'png',
    background: true,
    bounds: viewport,
    padding: 0,
  });

  if (!imageResult?.blob) {
    throw new Error('Failed to export viewport image');
  }

  // Export SVG of the viewport
  const svgResult = await editor.getSvgString(allShapeIds, {
    background: true,
    bounds: viewport,
    padding: 0,
  });

  const svgString = svgResult?.svg ?? '';

  // Convert blob to base64
  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageResult.blob);
  });

  return { imageBase64, svgString, blob: imageResult.blob };
}

/**
 * Download the canvas as an image file
 */
export async function downloadCanvas(editor: Editor, filename: string = 'tldraw-screenshot.png'): Promise<void> {
  const { blob } = await exportCanvas(editor);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

