import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Product, Job, DraftTemplate, Variation, DraftPreviewLayer, DraftPreview } from '../types';
import { drawGrid, saveGridState, clearCanvasExceptGrid } from '../utils/grid';
import { 
  addVariationsToCanvas, 
  initDraftTemplates, 
  buildVariationFieldCanvasObject, 
  filterVariationsByTemplate,
  canvasTemplateVariationObjects
} from '../utils/job';
import { setupKeyboardEvents } from '../utils/ImageHandler';
import { loadPsdOntoCanvas } from '../utils/psdConverter';
import { addTextToCanvas, addFilesToCanvas } from '../utils/canvasUtils';

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
  savedObjects: SavedCanvasObject[];
  restoreSavedObjects: (fabricCanvas: fabric.Canvas, savedObjs: SavedCanvasObject[]) => void;
  saveCanvasObjectsState: (fabricCanvas: fabric.Canvas) => SavedCanvasObject[];
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
  ] = useState(([] as any[]));
  
  // Add this useEffect to update draftTemplates when variations change
  useEffect(() => {
    console.log('Variations changed, updating draftTemplates');
    const newDraftTemplates = initDraftTemplates(allVariations, product);
    console.log('New draft templates:', newDraftTemplates);
    setDraftTemplates(newDraftTemplates);
  }, [variations, groupVariations, product]);

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
    
    // Update the selected template
    if (draftTemplate.id) {
      setSelectedTemplate(draftTemplate.id);
    }
    
    console.log('Completely resetting canvas for new template');
    
    // Create a clean canvas reference for tracking
    const currentCanvas = canvas;
    
    // Create a new canvas before disposing the old one
    if (canvasRef.current) {
      const newCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });
      
      // Update the state with the new canvas first
      setCanvas(newCanvas);
      
      // AFTER setting the new canvas in state, dispose the old one
      // This ensures any async operations know to abort
      currentCanvas.dispose();
      
      // Now load the template image and add variations
      loadTemplateImage(newCanvas, draftTemplate).then(() => {
        // Find the template data and add variations
        const templateData = draftTemplates.find(dt => dt.template.id === draftTemplate.id);
        if (templateData) {
          addVariationsToCanvas(
            newCanvas,
            templateData.variationObjects,
            draftTemplate
          );
        }
        
        // Draw grid if needed
        if (showGrid) {
          drawGrid(newCanvas, width, height, 20, '#a0a0a0', showGrid);
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
  const loadTemplateImage = async (
    fabricCanvas: fabric.Canvas, 
    template: DraftTemplate
  ): Promise<void> => {
    // Add an ID to the canvas to track it
    const canvasId = Date.now().toString();
    (fabricCanvas as any).loadingId = canvasId;
    
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
      
      // First, check if the canvas is still valid
      if ((fabricCanvas as any).loadingId !== canvasId) {
        console.warn('Canvas changed during PSD loading setup, aborting');
        return Promise.resolve();
      }
      
      // // Show loading indicator
      // const loadingText = new fabric.Text('Loading PSD file...', {
      //   left: width / 2,
      //   top: height / 2,
      //   fontSize: 20,
      //   originX: 'center',
      //   originY: 'center',
      //   fill: '#888888'
      // });
      
      // // Check if canvas is still valid
      // if ((fabricCanvas as any).loadingId !== canvasId) {
      //   console.warn('Canvas changed before adding loading text, aborting');
      //   return Promise.resolve();
      // }
      
      // fabricCanvas.add(loadingText);
      
      try {
        // Check again before renderAll
        if ((fabricCanvas as any).loadingId !== canvasId) {
          console.warn('Canvas changed before rendering loading text, aborting');
          return Promise.resolve();
        }
        
        fabricCanvas.renderAll();
        
        // Process the PSD file
        await loadPsdOntoCanvas(fabricCanvas, imageUrl, width, height);
        
        // Check if the canvas is still valid
        if ((fabricCanvas as any).loadingId !== canvasId) {
          console.warn('Canvas changed after PSD processing, aborting cleanup');
          return Promise.resolve();
        }
        
        // fabricCanvas.remove(loadingText);
        
        // Redraw grid to ensure it's on top
        if (hasGrid && showGrid) {
          drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
        }
        
        // Final check before renderAll
        if ((fabricCanvas as any).loadingId !== canvasId) {
          console.warn('Canvas changed before final render, aborting');
          return Promise.resolve();
        }
        
        try {
          fabricCanvas.renderAll();
          console.log('PSD loaded and rendered on canvas');
        } catch (e) {
          console.error('Error rendering canvas:', e);
        }
        
        return Promise.resolve();
      } catch (error) {
        console.error('Failed to load PSD:', error);
        
        // Check if the canvas is still valid
        if ((fabricCanvas as any).loadingId !== canvasId) {
          console.warn('Canvas changed during error handling, aborting');
          return Promise.resolve();
        }
        
        // fabricCanvas.remove(loadingText);
        
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
    // Get the canvas ID for tracking
    const canvasId = (fabricCanvas as any).loadingId;
    
    return new Promise((resolve) => {
      // Check if canvas is still valid
      if ((fabricCanvas as any).loadingId !== canvasId) {
        console.warn('Canvas changed before starting image load, aborting');
        resolve();
        return;
      }
      
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
          // Check if canvas is still valid
          if ((fabricCanvas as any).loadingId !== canvasId) {
            console.warn('Canvas changed after image loaded, aborting');
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
              // Check if canvas is still valid
              if ((fabricCanvas as any).loadingId !== canvasId) {
                console.warn('Canvas changed after alternative image loaded, aborting');
                resolve();
                return;
              }
              
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
              
              // Check again before adding to canvas
              if ((fabricCanvas as any).loadingId !== canvasId) {
                console.warn('Canvas changed before adding alternative image, aborting');
                resolve();
                return;
              }
              
              fabricCanvas.add(fabricImg);
              fabricCanvas.sendToBack(fabricImg);
              
              if (hasGrid && showGrid) {
                drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
              }
              
              // Final check before render
              if ((fabricCanvas as any).loadingId !== canvasId) {
                console.warn('Canvas changed before rendering alternative image, aborting');
                resolve();
                return;
              }
              
              try {
                fabricCanvas.renderAll();
              } catch (e) {
                console.error('Error rendering canvas with alternative image:', e);
              }
              
              resolve();
            };
            
            imgElement.onerror = () => {
              // Check if canvas is still valid
              if ((fabricCanvas as any).loadingId !== canvasId) {
                console.warn('Canvas changed after image load error, aborting');
                resolve();
                return;
              }
              
              console.error('Alternative loading also failed. Using placeholder image.');
              // Use a placeholder SVG as absolute fallback
              const placeholderURL = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20600%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_1891%20text%20%7Bfill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A40pt%20%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22285%22%20y%3D%22300%22%3EThumbnail%20Unavailable%3C%2Ftext%3E%3Ctext%20x%3D%22205%22%20y%3D%22350%22%3ETemplate%3A%20'+ template.name +'%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
              fabric.Image.fromURL(placeholderURL, (placeholderImg) => {
                // Check if canvas is still valid
                if ((fabricCanvas as any).loadingId !== canvasId) {
                  console.warn('Canvas changed before adding placeholder image, aborting');
                  resolve();
                  return;
                }
                
                placeholderImg.set({
                  left: 0,
                  top: 0,
                  width: width,
                  height: height,
                  selectable: false,
                  evented: false,
                });
                fabricCanvas.add(placeholderImg);
                
                // Final check before render
                if ((fabricCanvas as any).loadingId !== canvasId) {
                  console.warn('Canvas changed before rendering placeholder image, aborting');
                  resolve();
                  return;
                }
                
                try {
                  fabricCanvas.renderAll();
                } catch (e) {
                  console.error('Error rendering canvas with placeholder image:', e);
                }
                
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

          // Check if canvas is still valid before adding image
          if ((fabricCanvas as any).loadingId !== canvasId) {
            console.warn('Canvas changed before adding main image, aborting');
            resolve();
            return;
          }

          fabricCanvas.add(img);
          fabricCanvas.sendToBack(img); // ensure the template is on the bottom
          
          console.log('Image added to canvas');

          // Redraw grid to ensure it's on top
          if (hasGrid && showGrid) {
            drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
          }

          // Final check before render
          if ((fabricCanvas as any).loadingId !== canvasId) {
            console.warn('Canvas changed before final render, aborting');
            resolve();
            return;
          }
          
          try {
            fabricCanvas.renderAll();
            console.log('Canvas rendered');
          } catch (e) {
            console.error('Error rendering canvas:', e);
          }
          
          resolve();
        },
        { crossOrigin: 'anonymous' } // Options object for handling CORS issues
      );
    });
  };

  useEffect(() => {
    console.log('Init effect running with draftTemplates:', draftTemplates);
    
    // Cleanup function for previous canvas
    if (canvas) {
      console.log('Disposing old canvas before creating new one');
      canvas.dispose();
    }
    
    const init = async () => {
      if (canvasRef.current) {
        console.log('Creating new canvas with latest draftTemplates:', draftTemplates);
        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
        });
        
        setCanvas(fabricCanvas);

        // If there are draft templates, use the first one as default
        if (!!draftTemplates.length) {
          const draftTemplate = draftTemplates[0];
          console.log('Loading template from latest draftTemplates:', draftTemplate.template);

          if (draftTemplate?.template?.file?.viewUrl) {
            // First load the template image
            await loadTemplateImage(fabricCanvas, draftTemplate.template);
            
            // Then add the variations to the canvas
            console.log('Adding variations from latest draftTemplates');
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
        };
      }
    }
    
    init();
    
    // Cleanup function
    return () => {
      // We already handle canvas disposal at the beginning of the effect
    };
  }, [draftTemplates, width, height, showGrid, onSave]);

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

  // Add this function to update the canvas based on new variation values
  const updateCanvasFromVariations = (newVariations: Variation[], newGroupVariations: Variation[] = []) => {
    if (!canvas || !selectedTemplate) return;
    
    console.log('Updating canvas from variations');
    
    // Find the currently selected template
    const template = draftTemplates.find(dt => dt.template.id === selectedTemplate)?.template;
    if (!template) {
      console.error('Selected template not found:', selectedTemplate);
      return;
    }
    
    // Clear existing variation objects from canvas
    const objectsToRemove = canvas.getObjects().filter(obj => 
      obj.data?.fieldId !== undefined && obj.selectable === true
    );
    objectsToRemove.forEach(obj => canvas.remove(obj));
    
    // Combine all variations
    const allNewVariations = [...newVariations, ...newGroupVariations];
    
    // Add the new variations to the canvas
    const variationObjects = canvasTemplateVariationObjects(
      filterVariationsByTemplate(allNewVariations, template),
      template
    );
    
    variationObjects.forEach((object: any) => {
      if (object.canvasObjectType === 'text') {
        addTextToCanvas(
          canvas, 
          template.width || 800, 
          template.height || 600, 
          object.text, 
          object.fontSize, 
          object.fontFamily
        );
      }
      if (object.canvasObjectType === 'image') {
        addFilesToCanvas(canvas, object.files, object.width, object.height);
      }
      if (object.canvasObjectType === 'colour') {
        canvas.add(object);
      }
    });
    
    canvas.renderAll();
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
        savedObjects,
        restoreSavedObjects,
        saveCanvasObjectsState,
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
