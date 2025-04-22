import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { fabric } from 'fabric';
import { Product, Job, DraftTemplate, DraftPreview } from '../types';
import { drawGrid } from '../utils/grid';
import {
  addVariationsToCanvas,
  initDraftTemplates,
} from '../utils/job';
import { renderEditorOrPreview } from '../utils/renderUtils';
import { setupKeyboardEvents } from '../utils/ImageHandler';
import { haveDraftTemplatesChanged } from '../utils/draftTemplateUtils';
import { debounce } from 'lodash';
import { FontOption, defaultFontOptions } from '../config/fontConfig';
import { defaultPalette } from '../config/colorConfig';

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
  selectedTextObject: fabric.IText | null;
  updateSelectedText: (props: Partial<fabric.IText>) => void;
  fontOptions: FontOption[];
  colorPalette: (string | null)[][];
  showLayerPanel: boolean;
  toggleLayerPanel: () => void;
}

const ProductEditorContext = createContext<ProductEditorContextType | undefined>(undefined);

interface ProductEditorProviderProps {
  children: React.ReactNode;
  groupIndex?: number;
  product: Product;
  width?: number;
  height?: number;
  job: Job;
  onSave: () => void;
  onCancel: () => void;
  hookForm?: any; // Add the form methods prop
  fontOptions?: FontOption[];
  colorPalette?: (string | null)[][];
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
  groupIndex = 0,
  product,
  width = 800,
  height = 600,
  job,
  onSave,
  onCancel,
  hookForm = null, // Initialize with null
  fontOptions = defaultFontOptions,
  colorPalette = defaultPalette,
}) => {
  const { watch } = hookForm;

  // Create refs to store the latest values to prevent excessive re-renders
  const allVariationsRef = useRef<any[]>([]);
  const productRef = useRef(product);

  // Update product ref when it changes
  useEffect(() => {
    productRef.current = product;
  }, [product]);

  const [
    draftTemplates,
    setDraftTemplates
  ] = useState(([] as any[]));

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
  const [selectedTextObject, setSelectedTextObject] = useState<fabric.IText | null>(null);
  const [updateCounter, setUpdateCounter] = useState(0);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Add a new state to track saved objects
  const [savedObjects, setSavedObjects] = useState<SavedCanvasObject[]>([]);

  // Function to toggle preview visibility
  const togglePreview = () => {
    setShowPreview(prev => !prev);
  };

  // Function to toggle layer panel visibility
  const toggleLayerPanel = () => {
    setShowLayerPanel(prev => !prev);
  };

  // Function to update selected text object properties
  const updateSelectedText = (props: Partial<fabric.IText>) => {
    if (selectedTextObject && canvas) {
      selectedTextObject.set(props);
      canvas.requestRenderAll();
      setUpdateCounter(c => c + 1);
    }
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
  const handleTemplateChange = async (draftTemplate: DraftTemplate) => {
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

      await renderEditorOrPreview(
        newCanvas,
        draftTemplate,
        templateData.variationObjects,
        height,
        width,
      );

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
      setIsCanvasLoading(false);
    }
  };

  // Replace the direct watch with a debounced version
  const debouncedWatch = useMemo(() => {
    return debounce(async (watchValues: { variationsGroups?: any; variations?: any }) => {
      // Start loading
      setIsCanvasLoading(true);

      // Extract the variations from the watch values
      const variationsGroups = watchValues.variationsGroups;
      const variations = watchValues.variations;

      // Process the latest variations to update allVariationsRef
      const newAllVariations = variationsGroups?.[groupIndex]?.variations
        ? [...variationsGroups[groupIndex].variations]
        : variations || [];
      console.log('newAllVariations', newAllVariations);

      // Store in ref to avoid triggering effects
      allVariationsRef.current = newAllVariations;

      const newDraftTemplates = initDraftTemplates(newAllVariations, productRef.current);

      // Check if the currently selected template ID still exists in the new list
      const currentSelectedIdStillExists = newDraftTemplates.some(dt => dt.template.id === selectedTemplate);

      // Store the canvas instance created in this effect run for cleanup
      let fabricCanvasInstance: fabric.Canvas | null = canvas;

      // Only update if they've actually changed
      if (haveDraftTemplatesChanged(draftTemplates, newDraftTemplates)) {
        setDraftTemplates(newDraftTemplates);
      }

      if (fabricCanvasInstance) {
        // if we have a canvas we need to clear all the old templates
        fabricCanvasInstance.clear();
        fabricCanvasInstance.setBackgroundColor(
          '#ffffff',
          () => fabricCanvasInstance?.renderAll()
        );
      } else {
        fabricCanvasInstance = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
        });
        // Update state
        setCanvas(fabricCanvasInstance);
      }

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
      }

      if (templateToLoad) {
        const finalTemplateToLoad: DraftTemplate = templateToLoad;
        const templateData = newDraftTemplates.find(dt => dt.template.id === finalTemplateToLoad.id);

        await renderEditorOrPreview(
          fabricCanvasInstance,
          finalTemplateToLoad,
          templateData?.variationObjects || [],
          height,
          width,
        );
        if (fabricCanvasInstance.getElement() && fabricCanvasInstance.getElement().parentNode) {
          drawGrid(fabricCanvasInstance, width, height, 20, '#a0a0a0', showGrid);
        }
        setIsCanvasLoading(false);
      } else {
        if (fabricCanvasInstance) {
          fabricCanvasInstance.dispose();
        }
        console.log("No template determined to load.");
        setIsCanvasLoading(false);
      }

      // setup keyboard delete event
      const cleanupKeyboardEvents = setupKeyboardEvents(fabricCanvasInstance, () => {
        console.log('inside clean');
        if (fabricCanvasInstance && document.activeElement === fabricCanvasInstance.upperCanvasEl) {
          onSave && onSave();
        }
      });

      // Add Text Toolbar Event Listener
      const handleSelection = (e: fabric.IEvent) => {
        const activeObject = fabricCanvasInstance?.getActiveObject();
        // Check if the active object is an IText instance
        if (activeObject instanceof fabric.IText) {
          setSelectedTextObject(activeObject);
        } else {
          setSelectedTextObject(null);
        }
      };

      const handleSelectionCleared = () => {
        setSelectedTextObject(null);
      };

      fabricCanvasInstance?.on('selection:created', handleSelection);
      fabricCanvasInstance?.on('selection:updated', handleSelection);
      fabricCanvasInstance?.on('selection:cleared', handleSelectionCleared);

      // Initial draw grid
      if (showGrid && fabricCanvasInstance) {
        try {
          if (fabricCanvasInstance.getElement() && fabricCanvasInstance.getElement().parentNode) {
            drawGrid(fabricCanvasInstance, width, height, 20, '#a0a0a0', showGrid);
          }
        } catch (e) {
          console.error('Error drawing initial grid:', e);
        }
      }

      // Cleanup function for this effect run
      return () => {
        console.log("Cleaning up canvas effect");
        if (fabricCanvasInstance) {
          fabricCanvasInstance.off('selection:created', handleSelection);
          fabricCanvasInstance.off('selection:updated', handleSelection);
          fabricCanvasInstance.off('selection:cleared', handleSelectionCleared);
        }
        // Dispose of the canvas instance created in this effect run
        cleanupKeyboardEvents();

        console.log('inside return ');
        // Dispose the specific instance created in this effect run to prevent leaks.

        if (fabricCanvasInstance) {
          try {
            fabricCanvasInstance.dispose();
          } catch (e) {
            console.error("Error disposing canvas in effect cleanup:", e);
          }
        }
      };
    }, 500);
  }, [groupIndex, draftTemplates]);

  // Set up the debounced watch subscription
  useEffect(() => {
    if (!hookForm) return;

    // Subscribe to form changes
    const subscription = hookForm.watch((value: any) => {
      console.log('value', value);
      debouncedWatch({
        variationsGroups: value.variationsGroups,
        variations: value.variations
      });
    });

    // Clean up subscription
    return () => subscription.unsubscribe();
  }, [hookForm, debouncedWatch]);
  // useEffect(() => {
  //   // Build new draft templates
  //   if (canvasRef.current) {
  //     // Use the ref value instead of the state-derived value
  //     const initialVariations = allVariationsRef.current.length > 0 
  //       ? allVariationsRef.current 
  //       : hookForm ? hookForm.getValues('variations') : [];

  //     const newDraftTemplates = initDraftTemplates(initialVariations, product);

  //     // Check if the currently selected template ID still exists in the new list
  //     const currentSelectedIdStillExists = newDraftTemplates.some(dt => dt.template.id === selectedTemplate);

  //     // Store the canvas instance created in this effect run for cleanup
  //     let fabricCanvasInstance: fabric.Canvas | null = null;

  //     // Start loading the new canvas
  //     setIsCanvasLoading(true);

  //     // If the draft templates have changed, set them.
  //     // Only update draft templates if they've actually changed to prevent infinite loops
  //     if (haveDraftTemplatesChanged(draftTemplates, newDraftTemplates)) {
  //       setDraftTemplates(newDraftTemplates);
  //     }

  //     const newFabricCanvas = new fabric.Canvas(canvasRef.current, {
  //       width,
  //       height,
  //       backgroundColor: '#ffffff',
  //     });
  //     // Store reference for cleanup
  //     fabricCanvasInstance = newFabricCanvas;
  //     // Update state
  //     setCanvas(newFabricCanvas);

  //     // Determine the template to load
  //     // prioritize existing selection if still valid, otherwise default to first.
  //     let templateToLoad: DraftTemplate | undefined = newDraftTemplates[0]?.template;
  //     if (currentSelectedIdStillExists && selectedTemplate) {
  //       const previouslySelected = newDraftTemplates.find(dt => dt.template.id === selectedTemplate);
  //       if (previouslySelected) {
  //         templateToLoad = previouslySelected.template;
  //       } else {
  //         setSelectedTemplate(templateToLoad?.id || null);
  //       }
  //     } else if (newDraftTemplates.length > 0) {
  //       setSelectedTemplate(templateToLoad?.id || null);
  //     } else {
  //       setSelectedTemplate(null);
  //       templateToLoad = undefined;
  //     }

  //     if (templateToLoad) {
  //       const finalTemplateToLoad: DraftTemplate = templateToLoad;
  //       const templateData = newDraftTemplates.find(dt => dt.template.id === finalTemplateToLoad.id);
  //       loadTemplateImage(
  //         newFabricCanvas,
  //         finalTemplateToLoad,
  //         templateData?.variationObjects || []
  //       ).then(() => {
  //         try {
  //           if (newFabricCanvas.getElement() && newFabricCanvas.getElement().parentNode) {
  //             drawGrid(newFabricCanvas, width, height, 20, '#a0a0a0', showGrid);
  //           }
  //         } catch (e) {
  //           console.error('Error drawing grid during initialization:', e);
  //         }
  //         setIsCanvasLoading(false);
  //       }).catch(error => {
  //         console.error("Error loading template image:", error);
  //         setIsCanvasLoading(false);
  //       });
  //     } else {
  //       if (newFabricCanvas) {
  //         newFabricCanvas.clear();
  //       }
  //       console.log("No template determined to load.");
  //       setIsCanvasLoading(false);
  //     }

  //     // setup keyboard delete event
  //     const cleanupKeyboardEvents = setupKeyboardEvents(newFabricCanvas, () => {
  //       if (document.activeElement === newFabricCanvas.upperCanvasEl) {
  //         onSave && onSave();
  //       }
  //     });

  //     // Return cleanup function for this effect run
  //     return () => {
  //       cleanupKeyboardEvents();
  //       // Dispose the specific instance created in this effect run to prevent leaks.
  //       if (fabricCanvasInstance) {
  //         try {
  //           fabricCanvasInstance.dispose();
  //         } catch (e) {
  //           console.error("Error disposing canvas in effect cleanup:", e);
  //         }
  //       }
  //     };
  //   }
  // }, []); // Empty dependency array - only runs on mount

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
        selectedTextObject,
        updateSelectedText,
        fontOptions,
        colorPalette,
        showLayerPanel,
        toggleLayerPanel,
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
