import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { ProductEditorProps, DraftTemplate } from '../types';

const ProductEditor: React.FC<ProductEditorProps> = ({
  product,
  width = 800,
  height = 600,
  onSave,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });
      setCanvas(fabricCanvas);

      // If there are draft templates, use the first one as default
      if (product.draftTemplates && product.draftTemplates.length > 0) {
        const template = product.draftTemplates[0];
        setSelectedTemplate(template);
        
        if (template.file?.url) {
          fabric.Image.fromURL(template.file.url, (img: fabric.Image) => {
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
            });

            fabricCanvas.add(img);
            fabricCanvas.renderAll();
          });
        }
      }
    }

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [product, width, height]);

  const handleSave = () => {
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
    });
    
    onSave?.(dataUrl);
  };

  const handleTemplateChange = (template: DraftTemplate) => {
    if (!canvas || !template.file?.url) return;

    // Clear existing objects
    canvas.clear();
    
    // Load new template image
    fabric.Image.fromURL(template.file.url, (img: fabric.Image) => {
      const scale = Math.min(
        width / img.width!,
        height / img.height!
      );
      img.scale(scale);
      
      img.set({
        left: (width - img.width! * scale) / 2,
        top: (height - img.height! * scale) / 2,
      });

      canvas.add(img);
      canvas.renderAll();
    });

    setSelectedTemplate(template);
  };

  return (
    <div className="product-editor">
      <div className="editor-toolbar">
        {product.draftTemplates && product.draftTemplates.length > 0 && (
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const template = product.draftTemplates?.find(t => t.id === Number(e.target.value));
              if (template) handleTemplateChange(template);
            }}
          >
            {product.draftTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name || `Template ${template.id}`}
              </option>
            ))}
          </select>
        )}
        <button onClick={handleSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default ProductEditor;
