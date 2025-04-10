import { fabric } from 'fabric';
import { readPsd, Layer } from 'ag-psd';

// Extended Canvas interface with our custom properties
interface ExtendedCanvas extends fabric.Canvas {
  designBounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  psdUrl?: string;
}

/**
 * Extracts layers from a PSD file and renders them to a PNG
 * 
 * @param psdUrl URL to the PSD file
 * @returns Promise that resolves to a PNG data URL
 */
export const extractPsdBaseLayer = async (psdUrl: string): Promise<{dataUrl: string, designBounds?: {left: number, top: number, right: number, bottom: number}}> => {
  try {
    
    // Fetch the PSD file
    const response = await fetch(psdUrl, { 
      mode: 'cors',
      credentials: 'same-origin',
      headers: {
        'Accept': '*/*',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PSD file: ${response.status} ${response.statusText}`);
    }
  
    const arrayBuffer = await response.arrayBuffer();
    
    // Check if we actually got a PSD file (PSD files start with '8BPS')
    const firstBytes = new Uint8Array(arrayBuffer, 0, 4);
    const signature = 
      String.fromCharCode(firstBytes[0]) + 
      String.fromCharCode(firstBytes[1]) + 
      String.fromCharCode(firstBytes[2]) + 
      String.fromCharCode(firstBytes[3]);
    
    if (signature !== '8BPS') {
      // TODO handle different file types
      console.warn('Warning: File does not have PSD signature. Got:', signature);
      // Continue anyway - the server might be returning a different format
    }
    
    try {
      // Use ag-psd to read the PSD file
      const psd = readPsd(
        arrayBuffer,
        {
          skipCompositeImageData: false,
          skipLayerImageData: false,
          skipThumbnail: false
        }
      );
      
      // Create a canvas to draw the layers
      const canvas = document.createElement('canvas');
      canvas.width = psd.width;
      canvas.height = psd.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Variable to store Design layer bounds, if found
      let designBounds: {
        left: number,
        top: number,
        right: number,
        bottom: number
      } | undefined;
      
      // If there are no layers or children, try to use the document itself
      if (!psd.children || psd.children.length === 0) {
        if (psd.imageData) {
          // If we have imageData on the main document, use it
          const imageData = new ImageData(
            new Uint8ClampedArray(psd.imageData.data),
            psd.width,
            psd.height
          );
          ctx.putImageData(imageData, 0, 0);
        } else {
          throw new Error('No layers or composite image data found in PSD');
        }
      } else {
        // Categorize and sort layers to handle special layers appropriately
        let layers = [...psd.children];
        let designLayer = null;
        let maskLayer = null;
        let contentLayers: any[] = [];
        
        // First pass - identify special layers and regular content layers
        for (const layer of layers) {
          if (layer.name === 'Design') {
            designLayer = layer;
            // Store design layer bounds for future reference
            if (typeof layer.left === 'number' && 
                typeof layer.top === 'number' && 
                typeof layer.right === 'number' && 
                typeof layer.bottom === 'number') {
              designBounds = {
                left: layer.left,
                top: layer.top,
                right: layer.right,
                bottom: layer.bottom
              };
            }
          } else if (layer.name === 'Mask') {
            maskLayer = layer;
          } else {
            contentLayers.push(layer);
          }
        }
        
        // Function to render a single layer
        const renderLayer = (layer: any, ctx: CanvasRenderingContext2D) => {
          // Check if the layer has a canvas
          if (layer.canvas && 
              typeof layer.left === 'number' && 
              typeof layer.top === 'number') {
            
            // Apply layer blending and opacity
            ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
            
            // Draw this layer onto the main canvas at its position
            ctx.drawImage(
              layer.canvas,
              layer.left,
              layer.top
            );
            
            // Reset alpha
            ctx.globalAlpha = 1;
          } else if (layer.imageData && 
                     typeof layer.left === 'number' && 
                     typeof layer.top === 'number') {
            console.log('Using imageData instead of canvas');
            
            // Create a temporary canvas for this layer
            const layerCanvas = document.createElement('canvas');
            const width = layer.right - layer.left;
            const height = layer.bottom - layer.top;
            layerCanvas.width = width;
            layerCanvas.height = height;
            const layerCtx = layerCanvas.getContext('2d');
            
            if (layerCtx && layer.imageData) {
              // Create an ImageData object from the PSD image data
              const imageData = new ImageData(
                new Uint8ClampedArray(layer.imageData.data),
                width,
                height
              );
              
              // Put the layer's image data on this canvas
              layerCtx.putImageData(imageData, 0, 0);
              
              // Apply layer blending and opacity
              ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1;
              
              // Draw this layer onto the main canvas at its position
              ctx.drawImage(
                layerCanvas, 
                layer.left, 
                layer.top
              );
              
              // Reset alpha
              ctx.globalAlpha = 1;
            }
          } else {
            console.warn(`Layer "${layer.name}" has no canvas or imageData`);
          }
        };
        
        // Function to recursively process layers and their children
        const processLayer = (layer: any, ctx: CanvasRenderingContext2D) => {
          // Skip hidden layers
          if (layer.hidden) {
            return;
          }
          
          // If this is a group layer with children, process its children
          if (layer.children && layer.children.length > 0) {
            // Process children
            const children = [...layer.children];
            children.forEach(child => processLayer(child, ctx));
            return;
          }
          
          // Render the actual layer
          renderLayer(layer, ctx);
        };
        
        // Render in the correct order:
        // 1. First render the "Design" layer (margins/boundaries)
        if (designLayer) {
          processLayer(designLayer, ctx);
        }
        
        // 2. Then render all content layers
        for (const layer of contentLayers) {
          processLayer(layer, ctx);
        }
        
        // 3. Finally render the "Mask" layer on top to hide overflow
        if (maskLayer) {
          processLayer(maskLayer, ctx);
        }
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      
      // Return both the data URL and the design bounds if found
      return { dataUrl, designBounds };
    } catch (parseError) {
      // Try an alternative fallback approach - direct image extraction
      // Create a blob from the buffer and create an object URL
      const blob = new Blob([arrayBuffer], { 
        type: response.headers.get('content-type') || 'application/octet-stream' 
      });
      const objectUrl = URL.createObjectURL(blob);
      
      // Try loading as a regular image if the server actually returned an image
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(objectUrl);
          resolve({ dataUrl });
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not parse PSD or load as image'));
        };
        
        img.src = objectUrl;
      });
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Loads a PSD file onto a fabric.js canvas
 * 
 * @param canvas fabric.js Canvas instance
 * @param psdUrl URL to the PSD file
 * @param width Canvas width
 * @param height Canvas height
 * @returns Promise that resolves when the image is added to the canvas
 */
export const loadPsdOntoCanvas = async (
  canvas: ExtendedCanvas, 
  psdUrl: string,
  width: number,
  height: number
): Promise<void> => {
  try {
    // Get the rendered PSD and design bounds if available
    console.log('Extracting PSD base layer...');
    const { dataUrl, designBounds } = await extractPsdBaseLayer(psdUrl);
    
    return new Promise((resolve, reject) => {
      fabric.Image.fromURL(dataUrl, (img) => {
        if (!img || !img.width || !img.height) {
          reject(new Error('Failed to create fabric image from PSD'));
          return;
        }
        
        // Scale image to fit canvas
        const scale = Math.min(
          width / img.width,
          height / img.height
        );
        
        // Center the image - important for design bounds calculation
        const imgLeft = (width - img.width * scale) / 2;
        const imgTop = (height - img.height * scale) / 2;
        
        // Set image scale and position
        img.scaleX = scale;
        img.scaleY = scale;
        img.left = imgLeft;
        img.top = imgTop;
        img.selectable = false;
        img.evented = false;
        
        // Add image to canvas
        canvas.add(img);
        
        // If we have design bounds, store them for reference
        if (designBounds) {
          // Calculate scaled design bounds
          const scaledDesignBounds = {
            left: imgLeft + (designBounds.left * scale),
            top: imgTop + (designBounds.top * scale),
            width: (designBounds.right - designBounds.left) * scale,
            height: (designBounds.bottom - designBounds.top) * scale,
            right: imgLeft + (designBounds.right * scale),
            bottom: imgTop + (designBounds.bottom * scale)
          };
          
          // Store on the canvas for future reference
          canvas.designBounds = scaledDesignBounds;
          
          // Add a visual indicator of the design area
          const boundaryRect = new fabric.Rect({
            left: scaledDesignBounds.left,
            top: scaledDesignBounds.top,
            width: scaledDesignBounds.width,
            height: scaledDesignBounds.height,
            fill: 'transparent',
            stroke: 'rgba(255, 0, 0, 0.5)',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false
          });
          canvas.add(boundaryRect);
          
          // Add a test text object that can be moved around
          const textOptions = {
            left: scaledDesignBounds.left + scaledDesignBounds.width / 2,
            top: scaledDesignBounds.top + scaledDesignBounds.height / 2,
            fontFamily: 'Arial',
            fontSize: 30,
            fill: '#0000FF',
            text: 'Test Text',
            originX: 'center', 
            originY: 'center',
            selectable: true,
            evented: true
          };
          
          const testText = new fabric.IText(textOptions.text, textOptions);
          canvas.add(testText);
          
          // Create a clip path for the text based on design bounds
          const clipPath = new fabric.Rect({
            left: scaledDesignBounds.left,
            top: scaledDesignBounds.top,
            width: scaledDesignBounds.width,
            height: scaledDesignBounds.height,
            absolutePositioned: true
          });
          
          // Apply the clip path to the text
          testText.clipPath = clipPath;
        }
        
        canvas.renderAll();
        resolve();
      });
    });
  } catch (error) {
    console.error('Error loading PSD onto canvas:', error);
    throw error;
  }
}; 
