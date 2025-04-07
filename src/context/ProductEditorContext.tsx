import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Product, Job, DraftTemplate, Variation } from '../types';
import { drawGrid, saveGridState, clearCanvasExceptGrid } from '../utils/grid';
import { addVariationsToCanvas, initDraftTemplates } from '../utils/job';
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
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(
    draftTemplates?.[0]?.template?.id || null
  );
  const [showGrid, setShowGrid] = useState(false);

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
        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
          width,
          height,
          backgroundColor: '#ffffff',
        });
        fabricCanvas.enableHistory();
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
        product,
        isMobileView,
        job,
        width,
        height,
        handleUndo: () => {
          if (canvas) {
            canvas.undo();
          }
        },
        handleRedo: () => {
          if (canvas) {
            canvas?.redo();
          }
        },
        handleTemplateChange,
        handleSave,
        handleCancel: () => onCancel(),
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
