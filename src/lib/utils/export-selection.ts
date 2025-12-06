import type { Editor } from 'tldraw';

export interface SelectionExport {
  imageBase64: string;
  svgString: string;
}

export async function exportSelection(editor: Editor): Promise<SelectionExport> {
  const selectedIds = editor.getSelectedShapeIds();
  if (selectedIds.length === 0) {
    throw new Error('No shapes selected');
  }

  // Export PNG
  const imageResult = await editor.toImage(selectedIds, {
    format: 'png',
    background: true,
    padding: 16,
  });

  if (!imageResult?.blob) {
    throw new Error('Failed to export image');
  }

  // Export SVG
  const svgResult = await editor.getSvgString(selectedIds, {
    background: true,
    padding: 16,
  });

  const svgString = svgResult?.svg ?? '';

  // Convert blob to base64 (browser-compatible)
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

  return { imageBase64, svgString };
}
