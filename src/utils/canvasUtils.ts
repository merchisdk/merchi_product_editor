import { fabric } from 'fabric';
import { MerchiFile, DraftTemplate } from '../types';

export const loadImageFromUrl = (
  canvas: fabric.Canvas,
  viewUrl: string,
  width: number,
  height: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(viewUrl, (img) => {
      if (!img) {
        reject(new Error('Failed to load image'));
        return;
      }

      // Scale image to fit canvas while maintaining aspect ratio
      const scale = Math.min(
        width / img.width!,
        height / img.height!
      );
      img.scale(scale);

      // Center the image
      img.set({
        left: (width - img.width! * scale) / 2,
        top: (height - img.height! * scale) / 2,
        selectable: false,
        evented: false,
      });

      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
      resolve();
    });
  });
};

/**
 * Adds an editable text object to the canvas
 * @param canvas - The Fabric.js canvas instance
 * @param width - The width of the canvas
 * @param height - The height of the canvas
 * @param defaultText - Optional default text (defaults to "Text")
 * @param fontSize - Optional font size (defaults to 24)
 * @param fontFamily - Optional font family (defaults to Arial)
 */
export const addTextToCanvas = (
  canvas: fabric.Canvas,
  width: number,
  height: number,
  defaultText: string = 'Text',
  fontSize: number = 24,
  fontFamily: string = 'Nunito'
) => {
  if (!canvas) return null;

  try {
    // Safe check if canvas is still valid
    if (!canvas.getElement() || !canvas.getElement().parentNode) {
      return null;
    }

    // Create a new text object with minimal options
    const text = new fabric.IText(
      defaultText,
      {
        left: width / 2,
        top: height / 2,
        fontFamily: fontFamily,
        fontSize: fontSize,
        fill: '#000000',
        originX: 'center',
        originY: 'center',
        selectable: true,
        editable: true
      }
    );

    // Add the text to the canvas
    canvas.add(text);

    // Ensure the text is rendered
    canvas.renderAll();

    // Make the text active - this is critical
    const setActiveTextObject = () => {
      try {
        // Check if canvas is still valid
        if (canvas && canvas.getElement() && canvas.getElement().parentNode) {
          canvas.setActiveObject(text);
          canvas.renderAll();
        }
      } catch (err) {
        console.error('Error setting active text object:', err);
      }
    };

    // Initial selection
    setActiveTextObject();

    // Delayed selection to ensure text becomes active
    setTimeout(setActiveTextObject, 50);

    return text;
  } catch (error) {
    console.error('Error adding text to canvas:', error);
    return null;
  }
};

export const addFilesToCanvas = async (
  canvas: fabric.Canvas,
  files: MerchiFile[],
  width: number,
  height: number
): Promise<void> => {
  if (!canvas || !files.length) return;

  for (const file of files) {
    if (!file.viewUrl) continue;

    await new Promise<void>((resolve) => {
      if (!file.viewUrl) {
        resolve();
        return;
      }
      fabric.Image.fromURL(file.viewUrl, (img) => {
        if (!img) {
          resolve();
          return;
        }

        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          (width * 0.5) / img.width!,
          (height * 0.5) / img.height!,
          1
        );
        img.scale(scale);

        // Center the image
        img.set({
          left: width / 2,
          top: height / 2,
          cornerSize: 8,
          borderColor: '#303DBF',
          cornerColor: '#303DBF',
          cornerStrokeColor: '#303DBF',
          transparentCorners: false,
          selectable: true,
          evented: true
        });

        (img as any).fileId = file.id;

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        resolve();
      });
    });
  }
};
