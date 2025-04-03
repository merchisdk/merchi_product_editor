import React, { createContext, useContext, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { Product, Job } from '../types';

interface ProductEditorContextType {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  undoStack: fabric.Object[][];
  setUndoStack: (stack: fabric.Object[][]) => void;
  redoStack: fabric.Object[][];
  setRedoStack: (stack: fabric.Object[][]) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleUploadImage: (file: File) => void;
  handleSave: () => void;
  handleCancel: () => void;
  product: Product;
  job: Job;
}

const ProductEditorContext = createContext<ProductEditorContextType | undefined>(undefined);

interface ProductEditorProviderProps {
  children: React.ReactNode;
  product: Product;
  job: Job;
  onSave?: (editedImage: string) => void;
  onCancel?: () => void;
}

export const ProductEditorProvider: React.FC<ProductEditorProviderProps> = ({
  children,
  product,
  job,
  onSave,
  onCancel,
}) => {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    product.draftTemplates?.[0]?.id?.toString() || ''
  );
  const [showGrid, setShowGrid] = useState(false);
  const [undoStack, setUndoStack] = useState<fabric.Object[][]>([]);
  const [redoStack, setRedoStack] = useState<fabric.Object[][]>([]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !canvas) return;

    const previousState = undoStack[undoStack.length - 1];
    const currentState = canvas.getObjects();

    setRedoStack([...redoStack, currentState]);
    setUndoStack(undoStack.slice(0, -1));

    canvas.clear();
    previousState.forEach(obj => canvas.add(obj));
    canvas.renderAll();
  }, [canvas, undoStack, redoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !canvas) return;

    const nextState = redoStack[redoStack.length - 1];
    const currentState = canvas.getObjects();

    setUndoStack([...undoStack, currentState]);
    setRedoStack(redoStack.slice(0, -1));

    canvas.clear();
    nextState.forEach(obj => canvas.add(obj));
    canvas.renderAll();
  }, [canvas, undoStack, redoStack]);

  const handleUploadImage = useCallback(async (file: File) => {
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target?.result as string, (img) => {
        // Center the image on the canvas
        const scale = Math.min(
          canvas.width! / img.width!,
          canvas.height! / img.height!
        );
        img.scale(scale);
        img.set({
          left: (canvas.width! - img.width! * scale) / 2,
          top: (canvas.height! - img.height! * scale) / 2,
        });

        // Save current state for undo
        setUndoStack([...undoStack, canvas.getObjects()]);
        setRedoStack([]);

        canvas.clear();
        canvas.add(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  }, [canvas, undoStack]);

  const handleSave = useCallback(() => {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    onSave?.(dataUrl);
  }, [canvas, onSave]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const value = {
    canvas,
    setCanvas,
    selectedTemplate,
    setSelectedTemplate,
    showGrid,
    setShowGrid,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    handleUndo,
    handleRedo,
    handleUploadImage,
    handleSave,
    handleCancel,
    product,
    job,
  };

  return (
    <ProductEditorContext.Provider value={value}>
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
