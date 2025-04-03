import * as agPsd from 'ag-psd';


export async function generatePsdPreview(
  psdBuffer: ArrayBuffer,
  imageUrl: string
): Promise<string> {
  try {

    const uploadedImage = await loadImage(imageUrl);

    const psd = agPsd.readPsd(psdBuffer);
    const designLayer = findLayerByName(psd.children, 'Design');
    const productLayer = findLayerByName(psd.children, 'Product');
    const overlayLayer = findLayerByName(psd.children, 'Overlay');

    if (!designLayer) {
      throw new Error('Design layer not found in PSD');
    }

    // create canvas to draw the composite image
    const canvas = document.createElement('canvas');
    canvas.width = psd.width;
    canvas.height = psd.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas 2d context');
    }

    // 1. draw the Product layer (bottom layer)
    if (productLayer && productLayer.canvas) {
      ctx.drawImage(productLayer.canvas, productLayer.left || 0, productLayer.top || 0);
    }

    // 2. draw the uploaded image to the Design layer position
    drawImageToDesignLayer(ctx, uploadedImage, designLayer);

    // 3. draw the Overlay layer
    if (overlayLayer && overlayLayer.canvas) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = (overlayLayer.opacity || 255) / 255;
      ctx.drawImage(overlayLayer.canvas, overlayLayer.left || 0, overlayLayer.top || 0);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to generate PSD preview:', error);
    throw error;
  }
}

/**
 * find the layer by name
 */
function findLayerByName(layers: any[] | undefined, name: string): any | null {
  if (!layers) return null;

  for (const layer of layers) {
    if (layer.name === name) {
      return layer;
    }

    if (layer.children) {
      const found = findLayerByName(layer.children, name);
      if (found) return found;
    }
  }

  return null;
}

/**
 * draw the uploaded image to the design layer position
 */
function drawImageToDesignLayer(ctx: CanvasRenderingContext2D, image: HTMLImageElement, designLayer: any): void {
  const left = designLayer.left || 0;
  const top = designLayer.top || 0;
  const width = (designLayer.right || 0) - left;
  const height = (designLayer.bottom || 0) - top;

  const aspectRatio = image.width / image.height;
  let drawWidth = width;
  let drawHeight = height;

  if (aspectRatio > width / height) {
    drawHeight = width / aspectRatio;
  } else {
    drawWidth = height * aspectRatio;
  }

  const offsetX = left + (width - drawWidth) / 2;
  const offsetY = top + (height - drawHeight) / 2;

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

/**
 * load image
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * load PSD file and return ArrayBuffer
 * for loading PSD from URL
 */
export async function loadPsdFromUrl(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load PSD: ${response.statusText}`);
  }
  return await response.arrayBuffer();
} 
