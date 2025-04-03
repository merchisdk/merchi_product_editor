import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { ProductEditorProps } from '../types';
import { useProductEditor } from '../context/ProductEditorContext';
import { Toolbar } from './Toolbar';
import './ProductEditor.css';

export const ProductEditor: React.FC<ProductEditorProps> = ({
  product,
  job,
  width = 800,
  height = 600,
  onSave,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    canvas,
    setCanvas,
    selectedTemplate,
    setSelectedTemplate,
    showGrid,
    setShowGrid,
    handleUndo,
    handleRedo,
    handleUploadImage,
    handleSave,
    handleCancel,
  } = useProductEditor();

  useEffect(() => {
    if (canvasRef.current && !canvas) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });
      setCanvas(fabricCanvas);

      // Load the selected template
      const template = product.draftTemplates?.find(
        (t) => t.id?.toString() === selectedTemplate
      );
      if (template?.file?.url) {
        fabric.Image.fromURL(template.file.url, (img) => {
          const scale = Math.min(
            width / img.width!,
            height / img.height!
          );
          img.scale(scale);
          img.set({
            left: (width - img.width! * scale) / 2,
            top: (height - img.height! * scale) / 2,
          });
          fabricCanvas.add(img);
          fabricCanvas.renderAll();
        });
      }
    }

    return () => {
      if (canvas) {
        canvas.dispose();
        setCanvas(null);
      }
    };
  }, [canvas, setCanvas, selectedTemplate, product.draftTemplates, width, height]);

  const toggleGrid = () => {
    if (!canvas) return;
    setShowGrid(!showGrid);
    if (!showGrid) {
      // Add grid lines
      const gridSize = 20;
      for (let i = 0; i < width; i += gridSize) {
        canvas.add(
          new fabric.Line([i, 0, i, height], {
            stroke: '#ddd',
            selectable: false,
          })
        );
      }
      for (let i = 0; i < height; i += gridSize) {
        canvas.add(
          new fabric.Line([0, i, width, i], {
            stroke: '#ddd',
            selectable: false,
          })
        );
      }
    } else {
      // Remove grid lines
      canvas.getObjects().forEach((obj) => {
        if (obj instanceof fabric.Line) {
          canvas.remove(obj);
        }
      });
    }
    canvas.renderAll();
  };

  return (
    <div className="product-editor">
      <div className="main-editor-layout">
        <Toolbar />
        <div className="editor-container">
          <div className="canvas-container">
            <canvas ref={canvasRef} />
            {/* <input
              type="file"
              id="image-upload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUploadImage(file);
                }
              }}
            /> */}
          </div>
        </div>
      </div>
    </div>
  );
};
