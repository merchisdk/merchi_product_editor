import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Product, Job, DraftTemplate, Variation, DraftPreviewLayer, DraftPreview } from '../types';
import { drawGrid, saveGridState, clearCanvasExceptGrid } from '../utils/grid';
import { addVariationsToCanvas, initDraftTemplates, buildVariationFieldCanvasObject } from '../utils/job';
import { setupKeyboardEvents } from '../utils/ImageHandler';
import { loadPsdOntoCanvas } from '../utils/psdConverter';

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
  updateCanvasFromVariations: (newVariations: Variation[], newGroupVariations?: Variation[]) => void;
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
  variations: Variation[];
  groupVariations: Variation[];
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
  groupVariations = [], // variations of the group not the group itself
}) => {
  // Combine all variations together to determine the templates to show
  const allVariations = product?.groupVariationFields?.length
    ? [...variations, ...groupVariations]
    : [...variations];

  const [
    draftTemplates,
    setDraftTemplates
  ] = useState(initDraftTemplates(allVariations, product));

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

  // Add a new state to track saved objects
  const [savedObjects, setSavedObjects] = useState<SavedCanvasObject[]>([]);

  // Function to toggle preview visibility
  const togglePreview = () => {
    setShowPreview(prev => !prev);
  };

  // Initialize canvas objects from variations
  useEffect(() => {
    if (!canvas) return;

    const newObjects = new Map<string, fabric.Object>();
    allVariations.forEach(variation => {
      const objectData = buildVariationFieldCanvasObject(variation);
      console.log('objectData', objectData);
      const fieldId = objectData.fieldId;
    //   if (!fieldId) return;

    //   let fabricObject: fabric.Object;

    //   if (objectData.canvasObjectType === 'text') {
    //     fabricObject = new fabric.Text(objectData.text || '', {
    //       fontSize: objectData.fontSize,
    //       fontFamily: objectData.fontFamily
    //     });
    //   } else if (objectData.canvasObjectType === 'image' && objectData.files?.[0]?.viewUrl) {
    //     fabric.Image.fromURL(objectData.files[0].viewUrl, (img) => {
    //       if (img) {
    //         newObjects.set(fieldId.toString(), img);
    //         setCanvasObjects(new Map(newObjects));
    //       }
    //     });
    //     return;
    //   } else if (objectData.canvasObjectType === 'colour' && objectData.colour) {
    //     fabricObject = new fabric.Rect({
    //       fill: objectData.colour,
    //       width: 50,
    //       height: 50
    //     });
    //   } else {
    //     return;
    //   }

    //   newObjects.set(fieldId.toString(), fabricObject);
    });
    // setCanvasObjects(newObjects);
  }, [canvas, variations, groupVariations]);

  const handleSave = () => {
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      // Here you would typically send the dataUrl to your backend
      console.log('Saving canvas:', dataUrl);
      onSave();
    }
  };

  // Add this function to save the current state of canvas objects
  const saveCanvasObjectsState = (fabricCanvas: fabric.Canvas) => {
    if (!fabricCanvas) return [];
    
    console.log('Saving canvas objects state');
    const objects = fabricCanvas.getObjects().filter(obj => {
      // Filter out grid lines, template images, and other non-variation objects
      // We only want to save objects related to variations
      return obj.selectable === true && 
             !(obj instanceof fabric.Line) && 
             obj.data?.fieldId !== undefined;
    });
    
    const savedObjs: SavedCanvasObject[] = objects.map(obj => {
      // Get image source properly
      let imageSrc: string | undefined = undefined;
      if (obj instanceof fabric.Image && obj.getSrc) {
        try {
          imageSrc = obj.getSrc();
        } catch (e) {
          console.warn('Could not get image source:', e);
        }
      }
      
      return {
        fieldId: obj.data?.fieldId || '',
        type: obj.type || '',
        properties: {
          left: obj.left || 0,
          top: obj.top || 0,
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          angle: obj.angle || 0,
          text: obj instanceof fabric.Text ? obj.text : undefined,
          fontSize: obj instanceof fabric.Text ? obj.fontSize : undefined,
          fontFamily: obj instanceof fabric.Text ? obj.fontFamily : undefined,
          fill: obj.fill as string || undefined,
          width: obj.width,
          height: obj.height,
          src: imageSrc,
        }
      };
    });
    
    console.log('Saved objects:', savedObjs);
    return savedObjs;
  };
  
  // Add this function to restore saved objects
  const restoreSavedObjects = (fabricCanvas: fabric.Canvas, savedObjs: SavedCanvasObject[]) => {
    if (!fabricCanvas || !savedObjs.length) return;
    
    console.log('Restoring saved objects:', savedObjs);
    
    // Create a promise for each object to be restored
    const promises = savedObjs.map(savedObj => {
      return new Promise<void>((resolve) => {
        if (savedObj.type === 'text' || savedObj.type === 'i-text') {
          const textObj = new fabric.IText(savedObj.properties.text || '', {
            left: savedObj.properties.left,
            top: savedObj.properties.top,
            scaleX: savedObj.properties.scaleX,
            scaleY: savedObj.properties.scaleY,
            angle: savedObj.properties.angle,
            fontSize: savedObj.properties.fontSize,
            fontFamily: savedObj.properties.fontFamily,
            fill: savedObj.properties.fill,
            data: { fieldId: savedObj.fieldId }
          });
          fabricCanvas.add(textObj);
          resolve();
        } else if (savedObj.type === 'image' && savedObj.properties.src) {
          fabric.Image.fromURL(savedObj.properties.src, (img) => {
            img.set({
              left: savedObj.properties.left,
              top: savedObj.properties.top,
              scaleX: savedObj.properties.scaleX,
              scaleY: savedObj.properties.scaleY,
              angle: savedObj.properties.angle,
              data: { fieldId: savedObj.fieldId }
            });
            fabricCanvas.add(img);
            resolve();
          }, { crossOrigin: 'anonymous' });
        } else if (savedObj.type === 'rect') {
          const rectObj = new fabric.Rect({
            left: savedObj.properties.left,
            top: savedObj.properties.top,
            width: savedObj.properties.width,
            height: savedObj.properties.height,
            scaleX: savedObj.properties.scaleX,
            scaleY: savedObj.properties.scaleY,
            angle: savedObj.properties.angle,
            fill: savedObj.properties.fill,
            data: { fieldId: savedObj.fieldId }
          });
          fabricCanvas.add(rectObj);
          resolve();
        } else {
          // Handle other object types if needed
          resolve();
        }
      });
    });
    
    // Wait for all objects to be restored, then render the canvas
    Promise.all(promises).then(() => {
      fabricCanvas.renderAll();
      console.log('All objects restored');
    });
  };

  // First, let's modify handleTemplateChange to fix the regression issue
  const handleTemplateChange = (draftTemplate: DraftTemplate) => {
    if (!canvas) return;
    
    // Check if this is already the selected template - prevent reloading the same template
    if (draftTemplate.id && selectedTemplate === draftTemplate.id) {
      console.log('Template already selected, skipping reload:', draftTemplate.id);
      return;
    }
    
    // Save the current state of canvas objects before changing template
    const objectsToSave = saveCanvasObjectsState(canvas);
    console.log(`Saving ${objectsToSave.length} objects before template change`);
    
    // Update the selected template
    if (draftTemplate.id) {
      setSelectedTemplate(draftTemplate.id);
    }
    
    // First clear the canvas (except grid)
    clearCanvasExceptGrid(canvas);
    
    // Then load the template image without adding default variations
    loadTemplateImage(canvas, draftTemplate).then(() => {
      // After the template is loaded, restore the saved objects
      if (objectsToSave.length > 0) {
        console.log(`Restoring ${objectsToSave.length} saved objects after template change`);
        restoreSavedObjects(canvas, objectsToSave);
      } else {
        console.log('No saved objects to restore, loading default variations');
        // If there are no saved objects, add the default variation objects
        const templateData = draftTemplates.find(dt => dt.template.id === draftTemplate.id);
        if (templateData) {
          addVariationsToCanvas(
            canvas,
            templateData.variationObjects,
            draftTemplate
          );
        }
      }
    });
  };

  // Simplify loadTemplateImage to just load the template without variations
  const loadTemplateImage = async (
    fabricCanvas: fabric.Canvas, 
    template: DraftTemplate
  ): Promise<void> => {
    console.log('loadTemplateImage called with template:', template.id, template.name);
    
    // Check if we have a valid image URL
    if (!template.file?.viewUrl) {
      console.error('Template has no viewUrl!', template);
      return Promise.resolve();
    }
    
    const imageUrl = template.file.viewUrl;
    console.log('Original image URL:', imageUrl);
    
    // Check if this might be a PSD file
    const isPsd = imageUrl.toLowerCase().endsWith('.psd') || 
                  (template.file.mimetype && template.file.mimetype.includes('photoshop'));
    
    // save the existing grid lines
    const gridLines = saveGridState(fabricCanvas);
    const hasGrid = gridLines.length > 0;
    
    // If it's a PSD file, use our specialized function to process it
    if (isPsd) {
      console.log('Detected PSD file, using PSD processing utility');
      
      // Show loading indicator
      const loadingText = new fabric.Text('Loading PSD file...', {
        left: width / 2,
        top: height / 2,
        fontSize: 20,
        originX: 'center',
        originY: 'center',
        fill: '#888888'
      });
      fabricCanvas.add(loadingText);
      fabricCanvas.renderAll();
      
      try {
        // Process the PSD file
        await loadPsdOntoCanvas(fabricCanvas, imageUrl, width, height);
        fabricCanvas.remove(loadingText);
        
        // Redraw grid to ensure it's on top
        if (hasGrid && showGrid) {
          drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
        }
        
        fabricCanvas.renderAll();
        console.log('PSD loaded and rendered on canvas');
        return Promise.resolve();
      } catch (error) {
        console.error('Failed to load PSD:', error);
        fabricCanvas.remove(loadingText);
        
        // If PSD processing fails, fall back to our regular image loading
        return loadRegularImagePromise(fabricCanvas, template, hasGrid);
      }
    }
    
    // For non-PSD files, use the regular image loading approach
    return loadRegularImagePromise(fabricCanvas, template, hasGrid);
  };
  
  // Simplify loadRegularImagePromise to just load the template image
  const loadRegularImagePromise = (
    fabricCanvas: fabric.Canvas, 
    template: DraftTemplate, 
    hasGrid: boolean
  ): Promise<void> => {
    return new Promise((resolve) => {
      const imageUrl = template.file!.viewUrl;
      
      // Check if this might be a problematic file format
      const isPossiblyUnsupported = !imageUrl.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
      
      // If we have a thumbnailUrl or previewUrl, use that instead for unsupported formats
      let urlToUse = imageUrl;
      if (isPossiblyUnsupported) {
        console.log('Detected possibly unsupported file format, looking for alternatives');
        
        // Try to use alternative URLs if available
        if (template.file?.thumbnailUrl) {
          console.log('Using thumbnailUrl instead');
          urlToUse = template.file.thumbnailUrl;
        } else if (template.file?.previewUrl) {
          console.log('Using previewUrl instead');
          urlToUse = template.file.previewUrl;
        } else {
          console.log('No alternative image URL found, attempting to load original');
        }
      }
      
      console.log('Loading image from URL:', urlToUse);

      // Add error handling for image loading
      fabric.Image.fromURL(
        urlToUse,
        (img: fabric.Image) => {
          if (!fabricCanvas) {
            console.error('Canvas is no longer available');
            resolve();
            return;
          }
          
          if (!img || !img.width || !img.height) {
            console.error('Failed to load image or image has invalid dimensions:', img);
            // Try loading the image with a different approach - create an HTML image first
            console.log('Attempting alternative loading method...');
            const imgElement = new Image();
            imgElement.crossOrigin = 'anonymous';
            imgElement.onload = () => {
              const fabricImg = new fabric.Image(imgElement);
              console.log('Alternative loading successful!');
              
              // Continue with the same scaling and positioning logic
              const scale = Math.min(
                width / fabricImg.width!,
                height / fabricImg.height!
              );
              fabricImg.scale(scale);
              
              fabricImg.set({
                left: (width - fabricImg.width! * scale) / 2,
                top: (height - fabricImg.height! * scale) / 2,
                selectable: false,
                evented: false,
              });
              
              fabricCanvas.add(fabricImg);
              fabricCanvas.sendToBack(fabricImg);
              
              if (hasGrid && showGrid) {
                drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
              }
              
              fabricCanvas.renderAll();
              resolve();
            };
            
            imgElement.onerror = () => {
              console.error('Alternative loading also failed. Using placeholder image.');
              // Use a placeholder SVG as absolute fallback
              const placeholderURL = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_1891%20text%20%7Bfill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A40pt%20%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22285%22%20y%3D%22300%22%3EThumbnail%20Unavailable%3C%2Ftext%3E%3Ctext%20x%3D%22205%22%20y%3D%22350%22%3ETemplate%3A%20'+ template.name +'%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
              fabric.Image.fromURL(placeholderURL, (placeholderImg) => {
                placeholderImg.set({
                  left: 0,
                  top: 0,
                  width: width,
                  height: height,
                  selectable: false,
                  evented: false,
                });
                fabricCanvas.add(placeholderImg);
                fabricCanvas.renderAll();
                resolve();
              });
            };
            
            imgElement.src = urlToUse;
            return;
          }
          
          console.log('Image loaded successfully:', {
            width: img.width,
            height: img.height
          });

          // Scale image to fit canvas while maintaining aspect ratio
          const scale = Math.min(
            width / img.width!,
            height / img.height!
          );
          img.scale(scale);
          
          console.log('Image scaled with factor:', scale);

          // Center the image
          img.set({
            left: (width - img.width! * scale) / 2,
            top: (height - img.height! * scale) / 2,
            selectable: false, // template image is not selectable
            evented: false,    // template image is not responsive to events
          });
          
          console.log('Image positioned at:', {
            left: img.left,
            top: img.top
          });

          fabricCanvas.add(img);
          fabricCanvas.sendToBack(img); // ensure the template is on the bottom
          
          console.log('Image added to canvas');

          // Redraw grid to ensure it's on top
          if (hasGrid && showGrid) {
            drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
          }

          fabricCanvas.renderAll();
          console.log('Canvas rendered');
          resolve();
        },
        { crossOrigin: 'anonymous' } // Options object for handling CORS issues
      );
    });
  };

  useEffect(() => {
    const init = async () => {
      if (canvasRef.current) {
        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
        });
        // fabricCanvas.enableHistory(); // Commented out to avoid error
        setCanvas(fabricCanvas);

        // If there are draft templates, use the first one as default
        if (!!draftTemplates.length) {
          console.log('Loading template:', draftTemplates[0].template);
          const draftTemplate = draftTemplates[0];
          if (draftTemplate?.template?.file?.viewUrl) {
            // First load the template image
            await loadTemplateImage(fabricCanvas, draftTemplate.template);
            
            // Then add the variations to the canvas
            console.log('Adding default variations for initial load');
            await addVariationsToCanvas(
              fabricCanvas,
              draftTemplate.variationObjects,
              draftTemplate.template
            );
          } else {
            console.warn('Template has no viewUrl:', draftTemplate.template);
          }
        } else {
          console.warn('No draft templates available to load');
        }

        // Draw grid after loading the template
        drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);

        // setup keyboard delete event
        const cleanupKeyboardEvents = setupKeyboardEvents(fabricCanvas, (dataUrl) => {
          if (document.activeElement === fabricCanvas.upperCanvasEl) {
            onSave && onSave();
          }
        });

        return () => {
          cleanupKeyboardEvents();
          if (fabricCanvas) {
            fabricCanvas.dispose();
          }
        };
      }
    }
    init();
  }, [product, width, height, onSave, draftTemplates]);

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
      drawGrid(canvas, width, height, 20, '#a0a0a0', showGrid);
    }
  }, [showGrid, width, height, canvas]);

  // Function to update a canvas object when a variation changes
  const updateCanvasObject = (variation: Variation) => {
    const objectData = buildVariationFieldCanvasObject(variation);
    const fieldId = objectData.fieldId;
    if (!fieldId || !canvas) return;

    const existingObject = canvasObjects.get(fieldId.toString());
    if (existingObject) {
      if (objectData.canvasObjectType === 'text' && existingObject instanceof fabric.Text) {
        existingObject.set({
          text: objectData.text || '',
          fontSize: objectData.fontSize,
          fontFamily: objectData.fontFamily,
        });
      } else if (objectData.canvasObjectType === 'colour' && existingObject instanceof fabric.Rect && objectData.colour) {
        existingObject.set({
          fill: objectData.colour,
        });
      }
      // Add more conditions if needed for other object types

      canvas.renderAll(); // Re-render the canvas to apply changes
    }
  };

  // Function to check for changed variations and update canvas objects
  const updateCanvasFromVariations = (newVariations: Variation[], newGroupVariations: Variation[] = []) => {
    if (!canvas) return;

    // Combine all variations
    const newAllVariations = product?.groupVariationFields?.length
      ? [...newVariations, ...newGroupVariations]
      : [...newVariations];

    // Process each variation to find changes
    newAllVariations.forEach(newVariation => {
      // Find corresponding old variation to check if it changed
      const oldVariation = allVariations.find(v =>
        v.variationField?.id === newVariation.variationField?.id
      );

      // Update the canvas if the variation is new or has changed
      if (!oldVariation || oldVariation.value !== newVariation.value ||
        JSON.stringify(oldVariation.variationFiles || []) !== JSON.stringify(newVariation.variationFiles || [])) {
        updateCanvasObject(newVariation);
      }
    });
  };

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
        updateCanvasFromVariations,
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
