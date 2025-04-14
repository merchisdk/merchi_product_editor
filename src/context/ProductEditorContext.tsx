import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Product, Job, DraftTemplate, Variation, DraftPreview } from '../types';
import { drawGrid } from '../utils/grid';
import {
  addVariationsToCanvas,
  initDraftTemplates,
} from '../utils/job';
import { setupKeyboardEvents } from '../utils/ImageHandler';
import { loadPsdOntoCanvas } from '../utils/psdConverter';
import { loadRegularImagePromise } from '../utils/imageUtils';
import { haveDraftTemplatesChanged } from '../utils/draftTemplateUtils';

interface ProductEditorContextType {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draftPreviews: DraftPreview[];
  draftTemplates: { template: DraftTemplate; variationObjects: any[] }[];
  selectedTemplate: number | null;
  setSelectedTemplate: (templateId: number) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showPreview: boolean;
  togglePreview: () => void;
  product: Product;
  isMobileView: boolean;
  job: Job;
  width: number;
  height: number;
  handleUndo: () => void;
  handleRedo: () => void;
  handleTemplateChange: (draftTemplate: DraftTemplate) => void;
  handleSave: () => void;
  handleCancel: () => void;
  canvasObjects: Map<string, fabric.Object>;
  savedObjects: SavedCanvasObject[];
  isCanvasLoading: boolean;
}

const ProductEditorContext = createContext<ProductEditorContextType | undefined>(undefined);

interface ProductEditorProviderProps {
  children: React.ReactNode;
  product: Product;
  width?: number;
  height?: number;
  job: Job;
  onSave: () => void;
  onCancel: () => void;
  variations: Variation[]; // A concatinated array of variations and group variations
}

interface SavedCanvasObject {
  fieldId: string;
  type: string;
  properties: {
    left: number;
    top: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
    width?: number;
    height?: number;
    src?: string;
    [key: string]: any; // Allow for other properties
  };
}

export const ProductEditorProvider: React.FC<ProductEditorProviderProps> = ({
  children,
  product,
  width = 800,
  height = 600,
  job,
  onSave,
  onCancel,
  variations = [],
}) => {

  const [
    draftTemplates,
    setDraftTemplates
  ] = useState(([] as any[]));

  // need to fix the embed relationship with draftTemplates and draftPreviewLayers
  // const draftPreviews: DraftPreview[] = Array.from(
  //   new Map(
  //     draftTemplates
  //       .flatMap((dt) => 
  //         dt.template.draftPreviewLayers?.map((dPL: DraftPreviewLayer) => dPL.draftPreview) || []
  //       )
  //       .filter((preview): preview is DraftPreview => Boolean(preview)) // Type guard to ensure all values are DraftPreview
  //       .map(preview => [preview.id, preview]) // Use preview.id as key for Map to ensure uniqueness
  //   ).values()
  // );

  const draftPreviews = product?.draftPreviews || [];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [canvasObjects, setCanvasObjects] = useState<Map<string, fabric.Object>>(new Map());
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
    draftTemplates?.[0]?.template?.id || null
  );
  const [showGrid, setShowGrid] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isCanvasLoading, setIsCanvasLoading] = useState(true);

  // Add a new state to track saved objects
  const [savedObjects, setSavedObjects] = useState<SavedCanvasObject[]>([]);

  // Function to toggle preview visibility
  const togglePreview = () => {
    setShowPreview(prev => !prev);
  };

  const handleSave = () => {
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      // Here you would typically send the dataUrl to your backend
      console.log('Saving canvas:', dataUrl);
      onSave();
    }
  };

  // First, let's modify handleTemplateChange to fix the regression issue
  const handleTemplateChange = (draftTemplate: DraftTemplate) => {
    if (!canvas) return;

    // Check if this is already the selected template - prevent reloading the same template
    if (draftTemplate.id && selectedTemplate === draftTemplate.id) {
      console.log('Template already selected, skipping reload:', draftTemplate.id);
      return;
    }

    // Update the selected template
    if (draftTemplate.id) {
      setSelectedTemplate(draftTemplate.id);
    }

    console.log('Completely resetting canvas for new template');

    // Create a clean canvas reference for tracking
    const currentCanvas = canvas;

    // Create a new canvas before disposing the old one
    if (canvasRef.current) {
      // Dispose the old canvas properly
      try {
        currentCanvas.dispose();

        // Remove any lingering canvas containers to prevent duplicates
        if (canvasRef.current.parentElement) {
          const containers = canvasRef.current.parentElement.querySelectorAll('.canvas-container');
          if (containers.length > 1) {
            console.log(`Found ${containers.length} canvas containers, cleaning up extras`);
            // Keep only the first container
            for (let i = 1; i < containers.length; i++) {
              containers[i].remove();
            }
          }
        }
      } catch (e) {
        console.error('Error during canvas cleanup:', e);
      }

      const newCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });

      // Update the state with the new canvas
      setCanvas(newCanvas);

      // Now load the template image and add variations
      const templateData = draftTemplates.find(dt => dt.template.id === draftTemplate.id);
      loadTemplateImage(newCanvas, draftTemplate, templateData.variationObjects).then(() => {
        // Find the template data and add variations
        // const templateData = draftTemplates.find(dt => dt.template.id === draftTemplate.id);
        // if (templateData) {
        //   addVariationsToCanvas(
        //     newCanvas,
        //     templateData.variationObjects,
        //     draftTemplate
        //   );
        // }

        // Draw grid if needed
        if (showGrid) {
          try {
            if (newCanvas.getElement() && newCanvas.getElement().parentNode) {
              drawGrid(newCanvas, width, height, 20, '#a0a0a0', showGrid);
            }
          } catch (e) {
            console.error('Error drawing grid after template change:', e);
          }
        }

        // Re-setup keyboard events for the new canvas
        setupKeyboardEvents(newCanvas, (dataUrl) => {
          if (document.activeElement === newCanvas.upperCanvasEl) {
            onSave && onSave();
          }
        });
      });
    }
  };

  // Simplify loadTemplateImage to just load the template without variations
  const loadTemplateImage = async (fabricCanvas: fabric.Canvas, template: DraftTemplate, variations: any[]): Promise<void> => {
    // Check if we have a valid image URL
    if (!template.file?.viewUrl) {
      return Promise.resolve();
    }

    const file = template.file;

    const imageUrl = file.viewUrl;

    // Check if this might be a PSD file
    const isPsd = imageUrl.toLowerCase().endsWith('.psd')
    || (file.mimetype && file.mimetype.includes('photoshop'));

    // If it's a PSD file, use our specialized function to process it
    if (isPsd) {
      // First, check if the canvas is still valid
      try {
        // Process the PSD file
        await loadPsdOntoCanvas(fabricCanvas, imageUrl, variations, width, height);
        setIsCanvasLoading(false);
        return Promise.resolve();
      } catch (error) {
        console.error('Failed to load PSD:', error);

        // If PSD processing fails, fall back to our regular image loading
        await loadRegularImagePromise(fabricCanvas, template, width, height);
        setIsCanvasLoading(false);
        return Promise.resolve();
      }
    }

    // For non-PSD files, use the regular image loading approach
    await loadRegularImagePromise(fabricCanvas, template, width, height);
    setIsCanvasLoading(false);
    return Promise.resolve();
  };

  // Initialize canvas when component mounts
  useEffect(() => {
    // Build new draft templates
    if (canvasRef.current) {
      const newDraftTemplates = initDraftTemplates(variations, product);

      // Check if the currently selected template ID still exists in the new list
      const currentSelectedIdStillExists = newDraftTemplates.some(dt => dt.template.id === selectedTemplate);

      // Store the canvas instance created in this effect run for cleanup
      let fabricCanvasInstance: fabric.Canvas | null = null;

      // Start loading the new canvas
      setIsCanvasLoading(true);

      // If the draft templates have changed, set them.
      setDraftTemplates(newDraftTemplates);

      const newFabricCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });
      // Store reference for cleanup
      fabricCanvasInstance = newFabricCanvas;
      // Update state
      setCanvas(newFabricCanvas);

      // Determine the template to load
      // prioritize existing selection if still valid, otherwise default to first.
      let templateToLoad: DraftTemplate | undefined = newDraftTemplates[0]?.template;
      if (currentSelectedIdStillExists && selectedTemplate) {
        const previouslySelected = newDraftTemplates.find(dt => dt.template.id === selectedTemplate);
        if (previouslySelected) {
          templateToLoad = previouslySelected.template;
        } else {
          setSelectedTemplate(templateToLoad?.id || null);
        }
      } else if (newDraftTemplates.length > 0) {
        setSelectedTemplate(templateToLoad?.id || null);
      } else {
        setSelectedTemplate(null);
        templateToLoad = undefined;
      }

      if (templateToLoad) {
        const finalTemplateToLoad: DraftTemplate = templateToLoad;
        const templateData = newDraftTemplates.find(dt => dt.template.id === finalTemplateToLoad.id);
        loadTemplateImage(newFabricCanvas, finalTemplateToLoad, templateData?.variationObjects || []).then(() => {
          // if (templateData) {
          //   addVariationsToCanvas(
          //     newFabricCanvas,
          //     templateData.variationObjects,
          //     finalTemplateToLoad
          //   );
          // }
          try {
            if (newFabricCanvas.getElement() && newFabricCanvas.getElement().parentNode) {
              drawGrid(newFabricCanvas, width, height, 20, '#a0a0a0', showGrid);
            }
          } catch (e) {
            console.error('Error drawing grid during initialization:', e);
          }
          setIsCanvasLoading(false);
        }).catch(error => {
          console.error("Error loading template image:", error);
          setIsCanvasLoading(false);
        });
      } else {
        if (newFabricCanvas) {
          newFabricCanvas.clear();
        }
        console.log("No template determined to load.");
        setIsCanvasLoading(false);
      }

      // setup keyboard delete event
      const cleanupKeyboardEvents = setupKeyboardEvents(newFabricCanvas, () => {
        if (document.activeElement === newFabricCanvas.upperCanvasEl) {
          onSave && onSave();
        }
      });

      // Return cleanup function for this effect run
      return () => {
        cleanupKeyboardEvents();
        // Dispose the specific instance created in this effect run to prevent leaks.
        if (fabricCanvasInstance) {
          try {
            fabricCanvasInstance.dispose();
          } catch (e) {
            console.error("Error disposing canvas in effect cleanup:", e);
          }
        }
      };
    }
  }, [variations]);

  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  // Check if we're on a small screen
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateViewMode = () => {
        setIsMobileView(window.innerWidth < 480);
      }

      updateViewMode();
      window.addEventListener('resize', updateViewMode);

      return () => window.removeEventListener('resize', updateViewMode);
    }
  }, []);

  // draw grid when the grid state or canvas size changes
  useEffect(() => {
    if (canvas) {
      try {
        if (!canvas.getElement() || !canvas.getElement().parentNode) {
          return;
        }

        drawGrid(canvas, width, height, 20, '#a0a0a0', showGrid);
      } catch (error) {
        console.error('Error in drawGrid effect hook:', error);
      }
    }
  }, [showGrid, width, height, canvas]);

  return (
    <ProductEditorContext.Provider
      value={{
        canvas,
        setCanvas,
        canvasRef,
        draftPreviews,
        draftTemplates,
        selectedTemplate,
        setSelectedTemplate,
        showGrid,
        setShowGrid,
        showPreview,
        togglePreview,
        product,
        isMobileView,
        job,
        width,
        height,
        handleUndo: () => {
          // if (canvas) {
          //   canvas.undo();
          // }
          // History functionality disabled
          console.log('Undo functionality is disabled');
        },
        handleRedo: () => {
          // if (canvas) {
          //   canvas.redo();
          // }
          // History functionality disabled
          console.log('Redo functionality is disabled');
        },
        handleTemplateChange,
        handleSave,
        handleCancel: () => onCancel(),
        canvasObjects,
        savedObjects,
        isCanvasLoading,
      }}
    >
      {children}
    </ProductEditorContext.Provider>
  );
};

export const useProductEditor = () => {
  const context = useContext(ProductEditorContext);
  if (context === undefined) {
    throw new Error('useProductEditor must be used within a ProductEditorProvider');
  }
  return context;
};
