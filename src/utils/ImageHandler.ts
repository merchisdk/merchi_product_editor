import { fabric } from 'fabric';

export const setupKeyboardEvents = (
  canvas: fabric.Canvas,
  onObjectRemoved?: (dataUrl: string) => void,
  customDeleteHandler?: (obj: fabric.Object) => void
) => {
  if (!canvas || !canvas.getElement()) {
    return () => { };
  }

  const canvasEl = canvas.getElement();
  canvasEl.setAttribute('tabindex', '1');

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        if (customDeleteHandler) {
          customDeleteHandler(activeObject);
        } else {
          canvas.remove(activeObject);
          canvas.renderAll();
        }

        if (onObjectRemoved) {
          onObjectRemoved('');
        }
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  canvasEl.addEventListener('keydown', handleKeyDown);

  canvas.on('selection:created', () => canvasEl.focus());
  canvas.on('selection:updated', () => canvasEl.focus());
  canvas.on('mouse:down', () => canvasEl.focus());

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    canvasEl.removeEventListener('keydown', handleKeyDown);
    canvas.off('selection:created');
    canvas.off('selection:updated');
    canvas.off('mouse:down');
  };
}; 
