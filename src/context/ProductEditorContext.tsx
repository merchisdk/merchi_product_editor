import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { fabric } from 'fabric';
import { Product, Job, DraftTemplate, DraftTemplateData, DraftPreview, SavedCanvasObject } from '../types';
import { drawGrid } from '../utils/grid';
import { initDraftTemplates } from '../utils/job';
import { renderEditorOrPreview } from '../utils/renderUtils';
import { setupKeyboardEvents } from '../utils/ImageHandler';
import { haveDraftTemplatesChanged } from '../utils/draftTemplateUtils';
import { setNewDraftPreviews } from '../utils/previewUtils';
import { debounce } from 'lodash';

interface ProductEditorContextType {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  draftPreviews: DraftPreview[];
  draftTemplates: DraftTemplateData[]; // Updated to use the new type
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
  savedObjects: SavedCanvasObject[];
  isCanvasLoading: boolean;
  selectedTextObject: fabric.IText | null;
  updateSelectedText: (props: Partial<fabric.IText>) => void;
  recordVariationFieldObjects: () => void;
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
  ] = useState<DraftTemplateData[]>([]);
  const [draftPreviews, setDraftPreviews] = useState<DraftPreview[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
    draftTemplates?.[0]?.template?.id || null
  );
  const [showGrid, setShowGrid] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isCanvasLoading, setIsCanvasLoading] = useState(true);
  const [selectedTextObject, setSelectedTextObject] = useState<fabric.IText | null>(null);

  // Add a new state to track saved objects
  const [savedObjects, setSavedObjects] = useState<SavedCanvasObject[]>([]);

  // Add this ref to track initial mounting
  const initialMountRef = useRef(false);

  // Initialize savedObjects from localStorage on component mount
  useEffect(() => {
    // Only reset on initial mount
    if (!initialMountRef.current) {
      initialMountRef.current = true;
      // Reset savedObjects on page reload instead of loading from localStorage
      setSavedObjects([]);
    }
  }, [product]);

  // Function to record the current state of variation field objects
  const recordVariationFieldObjects = useCallback(() => {
    if (!canvas || selectedTemplate === null) return;
    // Create a fresh array instead of appending to existing
    const updatedSavedObjects: SavedCanvasObject[] = [];
    let hasChanges = false;
    
    // Get all objects from the canvas
    const objects = canvas.getObjects();
    
    // Filter for objects that have a fieldId property (variation field objects)
    objects.forEach((obj: any) => {
      // Get fieldId from either direct property or from variationField

      const { fieldId } = obj;
                     
      if (fieldId) {
        // Also save a serialized version for the savedObjects state
        const updatedObject = {
          ...obj,
        };
        
        if (obj instanceof fabric.Image) {
          Object.assign(updatedObject, {
            width: obj.width,
            height: obj.height,
            src: obj.getSrc(),
          });
        }

        updatedSavedObjects.push(updatedObject);
        hasChanges = true;
      }
    });

    // Only update state if we found objects with fieldIds
    if (hasChanges) {
      // Update the savedObjects state with the new complete array
      setSavedObjects(updatedSavedObjects);
    }
  }, [canvas, selectedTemplate]); // Remove savedObjects from the dependencies

  // Function to toggle preview visibility
  const togglePreview = () => {
    setShowPreview(prev => !prev);
  };

  // Function to update selected text object properties
  const updateSelectedText = (props: Partial<fabric.IText>) => {
    if (selectedTextObject && canvas && selectedTemplate !== null) {
      selectedTextObject.set(props);
      canvas.requestRenderAll();
      
      // Record the state changes after updating text properties
      // This ensures color changes and other styling updates are saved
      setTimeout(() => {
        console.log('Recording after text update with canvas:', !!canvas, 'and template:', selectedTemplate);
        if (canvas && selectedTemplate !== null) {
          recordVariationFieldObjects();
        }
      }, 50);
    } else {
      console.warn('Cannot update text - missing canvas, text object, or template');
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

  // Handle template change with improved state tracking
  const handleTemplateChange = async (draftTemplate: DraftTemplate) => {
    if (!canvas) return;

    // Record the current state of variation field objects
    recordVariationFieldObjects();

    // Check if this is already the selected template - prevent reloading the same template
    if (draftTemplate.id && selectedTemplate === draftTemplate.id) {
      console.log('Template already selected, skipping reload:', draftTemplate.id);
      return;
    }

    // Update the selected template
    if (draftTemplate.id) {
      setSelectedTemplate(draftTemplate.id);
    }

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

      // Now load the template image and add variations
      const templateData = draftTemplates.find(dt => dt.template.id === draftTemplate.id);
      
      await renderEditorOrPreview(
        newCanvas,
        (templateData as any).template,
        (templateData as any).variationObjects,
        savedObjects,
        height,
        width,
      );

      // Update the state with the new canvas
      setCanvas(newCanvas);

      // Since selectedTemplate was just updated, we need a slight delay to ensure
      // grid is drawn and loading is set to false
      setTimeout(() => {
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
        setIsCanvasLoading(false);
      }, 50);

      // Re-setup keyboard events for the new canvas
      setupKeyboardEvents(newCanvas, (dataUrl) => {
        if (document.activeElement === newCanvas.upperCanvasEl) {
          onSave && onSave();
        }
      });
    }
  };

  // Add cleanup event handlers that properly use the callback function
  const createEventHandler = useCallback((callback: Function) => {
    return () => {
      if (callback) callback();
    };
  }, []);

  // Replace the direct watch with a debounced version
  const debouncedWatch = useMemo(() => {
    return debounce(async (watchValues: { variationsGroups?: any; variations?: any }) => {
      // Start loading
      setIsCanvasLoading(true);

      // Record the current state of variation field objects before changes
      if (canvas) {
        recordVariationFieldObjects();
      }

      // Extract the variations from the watch values
      const variationsGroups = watchValues.variationsGroups;
      const variations = watchValues.variations;
      
      // Process the latest variations to update allVariationsRef
      const newAllVariations = variationsGroups?.[groupIndex]?.variations
        ? [...variationsGroups[groupIndex].variations]
        : variations || [];

      // Store in ref to avoid triggering effects
      allVariationsRef.current = newAllVariations;

      const newDraftTemplates = initDraftTemplates(newAllVariations, productRef.current);

      // Check if the currently selected template ID still exists in the new list
      const currentSelectedIdStillExists = newDraftTemplates.some(
        dt => dt.template.id === selectedTemplate);

      // Store the canvas instance for this effect run
      let fabricCanvasInstance = canvas;
      
      // Only update if they've actually changed
      if (haveDraftTemplatesChanged(draftTemplates, newDraftTemplates)) {
        setDraftTemplates(newDraftTemplates);
        setDraftPreviews(setNewDraftPreviews(newDraftTemplates));
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

      // Handle canvas setup
      if (fabricCanvasInstance) {
        // if we have a canvas we need to clear all the old templates
        fabricCanvasInstance.clear();
        fabricCanvasInstance.setBackgroundColor(
          '#ffffff',
          () => fabricCanvasInstance?.renderAll()
        );
      } else if (canvasRef.current) {
        fabricCanvasInstance = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
        });
        // Update state immediately to ensure it's available for event handlers
        setCanvas(fabricCanvasInstance);
      } else {
        console.error('No canvas ref available');
        setIsCanvasLoading(false);
        return;
      }

      if (templateToLoad && templateToLoad.id) {
        const templateData = newDraftTemplates.find(
          dt => dt.template.id === (templateToLoad as any).id);

        // Render the template onto the canvas
        await renderEditorOrPreview(
          fabricCanvasInstance,
          templateData?.template || {},
          templateData?.variationObjects || [],
          savedObjects,
          height,
          width,
        );

        if (fabricCanvasInstance.getElement() && fabricCanvasInstance.getElement().parentNode) {
          drawGrid(fabricCanvasInstance, width, height, 20, '#a0a0a0', showGrid);
        }
        
        // Setup event handlers
        setupEventHandlers(fabricCanvasInstance);
        
        setIsCanvasLoading(false);
      } else {
        setIsCanvasLoading(false);
      }
    }, 500);
  }, [
    groupIndex,
    draftTemplates,
    canvasRef,
    showGrid,
    width,
    height,
    savedObjects,
    canvas,
    selectedTemplate,
    recordVariationFieldObjects
  ]);
  
  // Extract event handler setup to a separate function to avoid recreating in debounced watch
  const setupEventHandlers = useCallback((fabricCanvasInstance: fabric.Canvas) => {
    if (!fabricCanvasInstance) return () => {};

    // Define the record changes function with canvas and template closure
    const recordChanges = () => {
      // Use the passed instance and template ID instead of state variables
      if (fabricCanvasInstance) {
        const objects = fabricCanvasInstance.getObjects();

        const updatedSavedObjects: SavedCanvasObject[] = [];
        let hasChanges = false;

        objects.forEach((obj: any) => {
          const { fieldId } = obj;
          if (fieldId) {
            const updatedObject = {
              ...obj,
            };
            
            if (obj instanceof fabric.Image) {
              Object.assign(updatedObject, {
                width: obj.width,
                height: obj.height,
                src: obj.getSrc(),
              });
            }
            
            updatedSavedObjects.push(updatedObject);
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          setSavedObjects(updatedSavedObjects);
        }
      } else {
        console.warn('Cannot record changes - missing canvas or templateId');
      }
    };
    
    // Create a bound version for event handling
    const boundRecordChanges = createEventHandler(recordChanges);

    // Add Text Toolbar Event Listener
    const handleSelection = (e: fabric.IEvent) => {
      const activeObject = fabricCanvasInstance.getActiveObject();
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

    // setup keyboard events
    const cleanupKeyboardEvents = setupKeyboardEvents(fabricCanvasInstance, () => {
      if (document.activeElement === fabricCanvasInstance.upperCanvasEl) {
        onSave && onSave();
      }
    });

    fabricCanvasInstance.on('selection:created', handleSelection);
    fabricCanvasInstance.on('selection:updated', handleSelection);
    fabricCanvasInstance.on('selection:cleared', handleSelectionCleared);
    
    // Add event listeners for object modifications
    fabricCanvasInstance.on('object:modified', boundRecordChanges);
    fabricCanvasInstance.on('object:moved', boundRecordChanges);
    fabricCanvasInstance.on('object:scaled', boundRecordChanges);
    fabricCanvasInstance.on('object:rotated', boundRecordChanges);
    fabricCanvasInstance.on('text:changed', boundRecordChanges);
    
    // Add handlers for more specific events that might be triggered by color changes
    fabricCanvasInstance.on('object:changed', boundRecordChanges);
    fabricCanvasInstance.on('canvas:updated', boundRecordChanges);

    // Return cleanup function
    return () => {
      console.log("Cleaning up event handlers");
      fabricCanvasInstance.off('selection:created', handleSelection);
      fabricCanvasInstance.off('selection:updated', handleSelection);
      fabricCanvasInstance.off('selection:cleared', handleSelectionCleared);
      
      fabricCanvasInstance.off('object:modified', boundRecordChanges);
      fabricCanvasInstance.off('object:moved', boundRecordChanges);
      fabricCanvasInstance.off('object:scaled', boundRecordChanges);
      fabricCanvasInstance.off('object:rotated', boundRecordChanges);
      fabricCanvasInstance.off('text:changed', boundRecordChanges);
      fabricCanvasInstance.off('object:changed', boundRecordChanges);
      fabricCanvasInstance.off('canvas:updated', boundRecordChanges);
      
      cleanupKeyboardEvents();
    };
  }, [createEventHandler, onSave, setSavedObjects]);

  // Set up the debounced watch subscription
  useEffect(() => {
    if (!hookForm) return;
    
    // Subscribe to form changes
    const subscription = hookForm.watch((value: any) => {
      debouncedWatch({
        variationsGroups: value.variationsGroups,
        variations: value.variations
      });
    });
    
    // Clean up subscription
    return () => subscription.unsubscribe();
  }, [hookForm, debouncedWatch]);

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
        savedObjects,
        isCanvasLoading,
        selectedTextObject,
        updateSelectedText,
        recordVariationFieldObjects,
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
