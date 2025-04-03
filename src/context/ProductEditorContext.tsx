import React, { createContext, useContext, useState } from 'react';
import { fabric } from 'fabric';
import { Product, Job } from '../types';

interface ProductEditorContextType {
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas) => void;
  selectedTemplate: string;
  setSelectedTemplate: (template: string) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  product: Product;
  job: Job;
  width: number;
  height: number;
  handleUndo: () => void;
  handleRedo: () => void;
  handleUploadImage: (file: File) => void;
  handleSave: () => void;
  handleCancel: () => void;
}

const ProductEditorContext = createContext<ProductEditorContextType | undefined>(undefined);

interface ProductEditorProviderProps {
  children: React.ReactNode;
  product: Product;
  job: Job;
  width?: number;
  height?: number;
  onSave: () => void;
  onCancel: () => void;
}

export const ProductEditorProvider: React.FC<ProductEditorProviderProps> = ({
  children,
  product,
  job,
  width = 800,
  height = 600,
  onSave,
  onCancel,
}) => {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    product.draftTemplates?.[0]?.id?.toString() || ''
  );
  const [showGrid, setShowGrid] = useState(false);

  const handleUndo = () => {
    if (canvas) {
      canvas.undo();
    }
  };

  const handleRedo = () => {
    if (canvas) {
      canvas.redo();
    }
  };

  const handleUploadImage = (file: File) => {
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const fabricImage = new fabric.Image(img);
        const scale = Math.min(
          width / img.width,
          height / img.height
        );
        fabricImage.scale(scale);
        fabricImage.set({
          left: (width - img.width * scale) / 2,
          top: (height - img.height * scale) / 2,
        });
        canvas.add(fabricImage);
        canvas.renderAll();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      // Here you would typically send the dataUrl to your backend
      console.log('Saving canvas:', dataUrl);
      onSave();
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <ProductEditorContext.Provider
      value={{
        canvas,
        setCanvas,
        selectedTemplate,
        setSelectedTemplate,
        showGrid,
        setShowGrid,
        product,
        job,
        width,
        height,
        handleUndo,
        handleRedo,
        handleUploadImage,
        handleSave,
        handleCancel,
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
