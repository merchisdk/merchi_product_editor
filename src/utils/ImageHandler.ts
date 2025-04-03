import { fabric } from 'fabric';
import { generatePsdPreview, loadPsdFromUrl } from './PsdPreviewGenerator';

/**
 * uploadImage
 * @param canvas
 * @param width
 * @param height
 * @param onImageAdded 
 * @param onPreviewGenerated 
 * @param psdTemplateUrl
 */
export const uploadImage = (
  canvas: fabric.Canvas,
  width: number,
  height: number,
  onImageAdded?: (dataUrl: string) => void,
  onPreviewGenerated?: (previewDataUrl: string) => void,
  psdTemplateUrl?: string
) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0] && canvas) {
      const file = target.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (event.target?.result && canvas) {
          const imgUrl = event.target.result as string;

          fabric.Image.fromURL(
            imgUrl,
            (img) => {
              if (!canvas) return;
              // adjust the image size to fit the canvas
              const imgWidth = img.width || 200;
              const imgHeight = img.height || 200;

              const scale = Math.min(
                (width * 0.5) / imgWidth,
                (height * 0.5) / imgHeight,
                1
              );
              img.scale(scale);
              // rotation control
              img.setControlsVisibility({
                mtr: true,
              });
              // put the image in the center of the canvas
              img.set({
                left: width / 2,
                top: height / 2,
                cornerSize: 8,
                borderColor: '#303DBF',
                cornerColor: '#303DBF',
                cornerStrokeColor: '#303DBF',
                transparentCorners: false
              });

              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.renderAll();

              if (psdTemplateUrl && onPreviewGenerated) {
                try {
                  loadPsdFromUrl(psdTemplateUrl)
                    .then(psdBuffer => {
                      return generatePsdPreview(psdBuffer, imgUrl);
                    })
                    .then(previewDataUrl => {
                      if (onPreviewGenerated) {
                        onPreviewGenerated(previewDataUrl);
                      }
                    })
                    .catch(error => {
                      console.error('Failed to generate PSD preview:', error);
                    });
                } catch (error) {
                  console.error('Failed to process preview:', error);
                }
              }

              if (onImageAdded) {
                try {
                  const dataUrl = canvas.toDataURL({
                    format: 'png',
                    quality: 1,
                  });
                  onImageAdded(dataUrl);
                } catch (err) {
                  console.warn('Failed to export dataUrl', err);
                }
              }
            },
            { crossOrigin: 'anonymous' }
          );
        }
      };

      reader.readAsDataURL(file);
    }
  };

  input.click();
};

/**
 * setupKeyboardEvents
 * @param canvas
 * @param onObjectRemoved
 * @returns
 */
export const setupKeyboardEvents = (
  canvas: fabric.Canvas,
  onObjectRemoved?: (dataUrl: string) => void
) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete') {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        canvas.remove(activeObject);
        canvas.renderAll();

        if (onObjectRemoved) {
          const dataUrl = canvas.toDataURL({
            format: 'png',
            quality: 1,
          });
          onObjectRemoved(dataUrl);
        }
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
}; 
