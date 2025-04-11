import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Product, Job, DraftTemplate, Variation } from '../types';
import { drawGrid, saveGridState, clearCanvasExceptGrid } from '../utils/grid';
import { addVariationsToCanvas, initDraftTemplates, buildVariationFieldCanvasObject } from '../utils/job';
import { setupKeyboardEvents } from '../utils/ImageHandler';

interface ProductEditorContextType {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
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
  variations: Variation[];
  groupVariations: Variation[];
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
  groupVariations = [],
}) => {
  // Combine all variations together to determine the templates to show
  const allVariations = product?.groupVariationFields?.length
    ? [...variations, ...groupVariations]
    : [...variations];
  const [
    draftTemplates,
    setDraftTemplates
  ] = useState(initDraftTemplates(allVariations, product));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [canvasObjects, setCanvasObjects] = useState<Map<string, fabric.Object>>(new Map());
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
    draftTemplates?.[0]?.template?.id || null
  );
  const [showGrid, setShowGrid] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isCanvasLoading, setIsCanvasLoading] = useState(true);

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
      const fieldId = objectData.fieldId;
      if (!fieldId) return;

      let fabricObject: fabric.Object;

      if (objectData.canvasObjectType === 'text') {
        fabricObject = new fabric.Text(objectData.text || '', {
          fontSize: objectData.fontSize,
          fontFamily: objectData.fontFamily
        });
      } else if (objectData.canvasObjectType === 'image' && objectData.files?.[0]?.viewUrl) {
        fabric.Image.fromURL(objectData.files[0].viewUrl, (img) => {
          if (img) {
            newObjects.set(fieldId.toString(), img);
            setCanvasObjects(new Map(newObjects));
          }
        });
        return;
      } else if (objectData.canvasObjectType === 'colour' && objectData.colour) {
        fabricObject = new fabric.Rect({
          fill: objectData.colour,
          width: 50,
          height: 50
        });
      } else {
        return;
      }

      newObjects.set(fieldId.toString(), fabricObject);
    });
    setCanvasObjects(newObjects);
  }, [canvas, variations, groupVariations]);

  const handleSave = () => {
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      // Here you would typically send the dataUrl to your backend
      console.log('Saving canvas:', dataUrl);
      onSave();
    }
  };

  const loadTemplateImage = (fabricCanvas: fabric.Canvas, template: DraftTemplate) => {
    if (!template.file?.viewUrl) return;

    // save the existing grid lines
    const gridLines = saveGridState(fabricCanvas);
    const hasGrid = gridLines.length > 0;

    // clear all objects except the grid
    clearCanvasExceptGrid(fabricCanvas);

    fabric.Image.fromURL(
      template.file.viewUrl,
      (img: fabric.Image) => {
        if (!fabricCanvas) return;

        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          width / img.width!,
          height / img.height!
        );
        img.scale(scale);

        // Center the image
        img.set({
          left: (width - img.width! * scale) / 2,
          top: (height - img.height! * scale) / 2,
          selectable: false, // template image is not selectable
          evented: false,    // template image is not responsive to events
        });

        fabricCanvas.add(img);
        fabricCanvas.sendToBack(img); // ensure the template is on the bottom

        // Redraw grid to ensure it's on top
        if (hasGrid && showGrid) {
          drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
        }

        fabricCanvas.renderAll();
      });
  };

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const handleTemplateChange = (draftTemplate: DraftTemplate) => {
    if (!canvas) return;
    if (draftTemplate.id) {
      setSelectedTemplate(draftTemplate.id);
    }
    loadTemplateImage(canvas, draftTemplate);
    setPreviewImageUrl(null);
  };

  useEffect(() => {
    const init = async () => {
      if (canvasRef.current) {
        setIsCanvasLoading(true);
        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
        });
        // fabricCanvas.enableHistory(); // Commented out to avoid error
        setCanvas(fabricCanvas);

        // If there are draft templates, use the first one as default
        if (!!draftTemplates.length) {
          const draftTemplate = draftTemplates[0];
          if (draftTemplate?.template?.file?.viewUrl) {
            // first load the template image
            await loadTemplateImage(fabricCanvas, draftTemplate.template);
            // then add the variations to the canvas
            await addVariationsToCanvas(
              fabricCanvas,
              draftTemplate.variationObjects,
              draftTemplate.template
            );
          }
        }

        // Draw grid after loading the template
        drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);

        // setup keyboard delete event
        const cleanupKeyboardEvents = setupKeyboardEvents(fabricCanvas, (dataUrl) => {
          if (document.activeElement === fabricCanvas.upperCanvasEl) {
            onSave && onSave();
            setPreviewImageUrl(null);
          }
        });

        setIsCanvasLoading(false);

        return () => {
          cleanupKeyboardEvents();
          if (fabricCanvas) {
            fabricCanvas.dispose();
          }
        };
      }
    }
    init();
    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [product, width, height, onSave]);

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
