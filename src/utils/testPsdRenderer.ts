import { renderDraftPreviewsWithLayers } from './psdRenderUtils';
import { DraftPreview } from '../types';

/**
 * Test function to demonstrate the usage of renderDraftPreviewsWithLayers
 * 
 * @param psdUrl URL of a PSD file to use for testing
 * @param renderedLayerImages Array of URLs for rendered layer images
 * @returns Promise that resolves to the rendered PNG data URL
 */
export async function testPsdRenderer(
  psdUrl: string,
  renderedLayerImages: string[] = []
): Promise<string> {
  // Create a sample draft preview with the provided PSD URL
  const mockDraftPreview: DraftPreview = {
    id: 1,
    file: {
      viewUrl: psdUrl,
      id: 1
    },
    name: 'Test Preview'
  };

  // Create sample layer names - in a real scenario, these would match the actual layer names in the PSD
  const layerNames = ['Layer 1', 'Layer 2', 'Design'];

  // Create mock renderedLayers using the provided image URLs
  const mockRenderedLayers = renderedLayerImages.map((imageUrl, index) => ({
    templateId: index + 1,
    image: imageUrl
  }));

  // Create mock draftPreviewLayers that map layer names to rendered layers
  const mockDraftPreviewLayers = layerNames.map((layerName, index) => ({
    layerName,
    renderedLayer: mockRenderedLayers[index] || null
  }));

  // Create the mock mapped preview object
  const mockMappedPreview = {
    draftPreview: mockDraftPreview,
    draftPreviewLayers: mockDraftPreviewLayers
  };

  // Process the mock data with our renderer
  try {
    const result = await renderDraftPreviewsWithLayers([mockMappedPreview]);
    
    // Return the PNG data URL from the first result (we only passed one preview)
    if (result.length > 0) {
      return result[0].pngDataUrl;
    } else {
      throw new Error('No results returned from renderer');
    }
  } catch (error) {
    console.error('Failed to render test PSD:', error);
    throw error;
  }
}

/**
 * Renders a PSD file replacing a specific layer with a rendered image
 * 
 * @param psdUrl URL of the PSD file to process
 * @param layerName Name of the layer to replace
 * @param renderedImageUrl URL of the image to use for replacement
 * @returns Promise that resolves to the rendered PNG data URL
 */
export async function renderPsdWithReplacedLayer(
  psdUrl: string,
  layerName: string,
  renderedImageUrl: string
): Promise<string> {
  // Create a sample draft preview with the provided PSD URL
  const mockDraftPreview: DraftPreview = {
    id: 1,
    file: {
      viewUrl: psdUrl,
      id: 1
    },
    name: 'Test Preview with Layer Replacement'
  };

  // Create a single draft preview layer for the specified layer
  const mockDraftPreviewLayers = [{
    layerName,
    renderedLayer: {
      templateId: 1,
      image: renderedImageUrl
    }
  }];

  // Create the mock mapped preview object
  const mockMappedPreview = {
    draftPreview: mockDraftPreview,
    draftPreviewLayers: mockDraftPreviewLayers
  };

  // Process the mock data with our renderer
  try {
    const result = await renderDraftPreviewsWithLayers([mockMappedPreview]);
    
    // Return the PNG data URL from the first result
    if (result.length > 0) {
      return result[0].pngDataUrl;
    } else {
      throw new Error('No results returned from renderer');
    }
  } catch (error) {
    console.error('Failed to render PSD with replaced layer:', error);
    throw error;
  }
}
