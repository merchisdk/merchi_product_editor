import { fabric } from 'fabric';

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

/**
 * Renders an image containing only what's visible inside a clipPath on the canvas
 * 
 * @param canvas - The Fabric.js canvas instance
 * @param options - Optional rendering options
 * @returns A promise that resolves to the dataURL of the contents inside the clipPath, or null if no clipped object is found
 */
export const renderClippedImage = (
  canvas: fabric.Canvas,
  options?: {
    format?: string;
    quality?: number;
    multiplier?: number;
    backgroundColor?: string;
  }
): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!canvas) {
      console.error('Canvas is null or undefined');
      resolve(null);
      return;
    }

    try {
      // Find objects with clipPath
      const objects = canvas.getObjects();
      let targetObject: fabric.Object | null = null;

      targetObject = objects.find((obj: any) => obj.id === 'design-boundary-rect') || null;

      if (!targetObject) {
        console.warn('No boundary object found');
        resolve(null);
        return;
      }

      // Get bounds of the object with clipPath
      const objBounds = targetObject.getBoundingRect();
      
      // Create a new canvas element
      const tempCanvasEl = document.createElement('canvas');
      tempCanvasEl.width = objBounds.width;
      tempCanvasEl.height = objBounds.height;
      // Explicitly set alpha to true to support transparency
      const tempCtx = tempCanvasEl.getContext('2d', { alpha: true });
      
      if (!tempCtx) {
        console.error('Could not get canvas context');
        resolve(null);
        return;
      }

      // Clear the canvas to ensure transparency
      tempCtx.clearRect(0, 0, tempCanvasEl.width, tempCanvasEl.height);
      
      // Set background color if provided, otherwise keep transparent
      if (options?.backgroundColor) {
        tempCtx.fillStyle = options.backgroundColor;
        tempCtx.fillRect(0, 0, tempCanvasEl.width, tempCanvasEl.height);
      }

      // Save current canvas state
      const originalZoom = canvas.getZoom();
      const originalViewportTransform = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
      
      // Save the original background color of the canvas
      const originalBackgroundColor = canvas.backgroundColor;
      
      // Temporarily set canvas background to transparent
      canvas.backgroundColor = 'transparent';

      // Temporarily modify the canvas view to focus on our object
      canvas.setZoom(1);
      canvas.setViewportTransform([1, 0, 0, 1, -objBounds.left, -objBounds.top]);
      
      // Temporarily hide all objects except our target and its clipped content
      const originalVisibilities = objects.map(obj => ({ object: obj, visible: obj.visible }));
      objects.forEach(obj => {
        if (!(obj as any).fieldId) {
          obj.visible = false;
        }
      });

      // Temporarily disable selection borders at canvas level
      const originalSelectionBorder = canvas.selectionBorderColor;
      const originalSelectionColor = canvas.selectionColor;
      canvas.selectionBorderColor = 'transparent';
      canvas.selectionColor = 'transparent';

      // Temporarily disable selection borders at object level
      const originalObjectStates = objects.map(obj => ({
        object: obj,
        borderColor: obj.borderColor,
        cornerColor: obj.cornerColor,
        cornerStrokeColor: obj.cornerStrokeColor,
        transparentCorners: obj.transparentCorners,
        hasControls: obj.hasControls,
        hasBorders: obj.hasBorders
      }));

      objects.forEach(obj => {
        obj.borderColor = 'transparent';
        obj.cornerColor = 'transparent';
        obj.cornerStrokeColor = 'transparent';
        obj.transparentCorners = true;
        obj.hasControls = false;
        obj.hasBorders = false;
      });

      // Render just the isolated object
      canvas.renderAll();
      
      // Draw the current canvas view to our temp canvas
      tempCtx.drawImage(
        canvas.getElement(), 
        0, 0, objBounds.width, objBounds.height,
        0, 0, objBounds.width, objBounds.height
      );
      
      // Restore the original canvas state
      canvas.setZoom(originalZoom);
      canvas.setViewportTransform(originalViewportTransform);
      canvas.backgroundColor = originalBackgroundColor;
      originalVisibilities.forEach(item => {
        item.object.visible = item.visible;
      });

      // Restore object-level selection borders
      originalObjectStates.forEach(state => {
        state.object.borderColor = state.borderColor;
        state.object.cornerColor = state.cornerColor;
        state.object.cornerStrokeColor = state.cornerStrokeColor;
        state.object.transparentCorners = state.transparentCorners;
        state.object.hasControls = state.hasControls;
        state.object.hasBorders = state.hasBorders;
      });

      // Restore canvas-level selection borders
      canvas.selectionBorderColor = originalSelectionBorder;
      canvas.selectionColor = originalSelectionColor;
      canvas.renderAll();
      
      // Get the data URL from the temp canvas
      const format = options?.format || 'png';
      const quality = options?.quality || 1;

      // Create a new canvas for final rendering with proper transparency
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = tempCanvasEl.width;
      finalCanvas.height = tempCanvasEl.height;
      const finalCtx = finalCanvas.getContext('2d', { alpha: true });

      if (!finalCtx) {
        console.error('Could not get final canvas context');
        resolve(null);
        return;
      }

      // Clear the final canvas to ensure transparency
      finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
      
      // Draw the temp canvas content to the final canvas
      finalCtx.drawImage(tempCanvasEl, 0, 0);

      // Try to get the data URL from the final canvas
      try {
        // Ensure PNG format for transparency support
        const dataUrl = finalCanvas.toDataURL(`image/${format === 'jpg' ? 'png' : format}`, quality);
        resolve(dataUrl);
      } catch (error) {
        console.error('Error getting data URL:', error);
        resolve(null);
      }
      
    } catch (error) {
      console.error('Error rendering clipped image:', error);
      resolve(null);
    }
  });
};

/**
 * Waits for all objects to be added and loaded on the canvas
 * @param canvas - The Fabric.js canvas instance
 * @param expectedObjectCount - The expected number of objects
 * @returns A promise that resolves to true if all objects are loaded, false if timeout
 */
export const waitForObjects = async (
  canvas: fabric.Canvas,
  expectedObjectCount: number
): Promise<boolean> => {
  let attempts = 0;
  const maxAttempts = 40;
  
  while (attempts < maxAttempts) {
    const currentObjects = canvas.getObjects();
    console.log('Current objects count:', currentObjects.length, 'Expected:', expectedObjectCount);
    
    // Check if we have the expected number of objects
    if (currentObjects.length >= expectedObjectCount) {
      // Check if all image objects are fully loaded
      const allImagesLoaded = currentObjects.every((obj: any) => {
        if (obj instanceof fabric.Image) {
          return (obj as any).isLoaded;
        }
        return true;
      });
      
      if (allImagesLoaded) {
        return true;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  console.warn('Timeout waiting for objects to be added and loaded');
  return false;
};

/**
 * Renders the canvas content and waits for all objects to be loaded
 * @param canvas - The Fabric.js canvas instance
 * @param expectedObjectCount - The expected number of objects
 * @returns A promise that resolves to the rendered image data URL
 */
export const renderCanvasWithObjects = async (
  canvas: fabric.Canvas,
  expectedObjectCount: number
): Promise<string | null> => {
  // Wait for all objects to be added and loaded
  const objectsReady = await waitForObjects(canvas, expectedObjectCount);
  console.log('Objects ready:', objectsReady);

  if (!objectsReady) {
    console.warn('Objects not ready, skipping render');
    return null;
  }

  // Force a render and wait for it to complete
  canvas.renderAll();
  
  // Wait for the next frame to ensure all objects are rendered
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  // Double-check that we have the latest objects
  const currentObjects = canvas.getObjects();
  console.log('Current objects before rendering:', currentObjects);
  
  // Wait for another frame to ensure all objects are fully processed
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  try {
    const renderedImage = await renderClippedImage(canvas);
    if (renderedImage) {
      console.log('Rendered image updated');
      return renderedImage;
    }
  } catch (error) {
    console.error('Error rendering clipped image:', error);
  }
  
  return null;
};
