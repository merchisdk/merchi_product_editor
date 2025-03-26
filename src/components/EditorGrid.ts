import { fabric } from 'fabric';

/**
 * @param fabricCanvas 
 * @param width 
 * @param height
 * @param gridSize 
 * @param lineColor 
 * @param enabled 
 */
export const drawGrid = (
  fabricCanvas: fabric.Canvas,
  width: number,
  height: number,
  gridSize = 20,
  lineColor = '#e0e0e0',
  enabled = true
) => {
  // remove all existing grid lines
  const gridLines = fabricCanvas.getObjects().filter(obj => obj.data?.isGrid);
  gridLines.forEach(line => fabricCanvas.remove(line));

  if (!enabled) return;

  // draw vertical lines
  for (let i = 0; i <= width; i += gridSize) {
    const line = new fabric.Line([i, 0, i, height], {
      stroke: lineColor,
      strokeWidth: 0.5,
      opacity: 0.3,
      selectable: false,
      evented: false,
      data: { isGrid: true }
    });
    fabricCanvas.add(line);
  }

  // draw horizontal lines
  for (let i = 0; i <= height; i += gridSize) {
    const line = new fabric.Line([0, i, width, i], {
      stroke: lineColor,
      strokeWidth: 0.5,
      opacity: 0.3,
      selectable: false,
      evented: false,
      data: { isGrid: true }
    });
    fabricCanvas.add(line);
  }

  fabricCanvas.renderAll();
};

/**
 * save the grid state on the canvas
 * @param fabricCanvas 
 */
export const saveGridState = (fabricCanvas: fabric.Canvas) => {
  return fabricCanvas.getObjects().filter(obj => obj.data?.isGrid);
};

/**
 * bring grid lines to front of the canvas
 * @param fabricCanvas 
 * @param gridLines 
 */
export const bringGridToFront = (fabricCanvas: fabric.Canvas, gridLines: fabric.Object[]) => {
  if (gridLines && gridLines.length > 0) {
    gridLines.forEach(line => fabricCanvas.bringToFront(line));
  }
};

/**
 * send grid lines to back of the canvas
 * @param fabricCanvas 
 * @param gridLines 
 */
export const sendGridToBack = (fabricCanvas: fabric.Canvas, gridLines: fabric.Object[]) => {
  if (gridLines && gridLines.length > 0) {
    gridLines.forEach(line => fabricCanvas.sendToBack(line));
  }
};

/**
 * clear all objects except the grid on the canvas
 * @param fabricCanvas
 */
export const clearCanvasExceptGrid = (fabricCanvas: fabric.Canvas) => {
  fabricCanvas.getObjects().forEach(obj => {
    if (!obj.data?.isGrid) {
      fabricCanvas.remove(obj);
    }
  });
}; 
