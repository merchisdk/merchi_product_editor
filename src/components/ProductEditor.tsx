import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { ProductEditorProps, DraftTemplate } from '../types';
import { TextIcon, ImageIcon, DashboardIcon } from '@radix-ui/react-icons';
import { drawGrid, saveGridState, clearCanvasExceptGrid } from './EditorGrid';

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
  const [showGrid, setShowGrid] = useState<boolean>(false);

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
          loadTemplateImage(fabricCanvas, template);
        }
      }

      // Draw grid after loading the template
      drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
    }

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [product, width, height]);

  // draw grid when the grid state or canvas size changes
  useEffect(() => {
    if (canvas) {
      drawGrid(canvas, width, height, 20, '#a0a0a0', showGrid);
    }
  }, [showGrid, width, height, canvas]);

  const loadTemplateImage = (fabricCanvas: fabric.Canvas, template: DraftTemplate) => {
    if (!template.file?.url) return;

    // save the existing grid lines
    const gridLines = saveGridState(fabricCanvas);
    const hasGrid = gridLines.length > 0;

    // clear all objects except the grid
    clearCanvasExceptGrid(fabricCanvas);

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

      // Redraw grid to ensure it's on top
      if (hasGrid && showGrid) {
        drawGrid(fabricCanvas, width, height, 20, '#a0a0a0', showGrid);
      }

      fabricCanvas.renderAll();
    });
  };

  const handleSave = () => {
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
    });

    onSave?.(dataUrl);
  };

  const handleTemplateChange = (template: DraftTemplate) => {
    if (!canvas) return;

    setSelectedTemplate(template);
    loadTemplateImage(canvas, template);
  };

  // toggle grid visibility
  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  // Disable canvas events to prevent accidental template changes
  const disableCanvasEvents = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="product-editor">
      {/* Template buttons */}
      {product.draftTemplates && product.draftTemplates.length > 0 && (
        <div className="template-buttons">
          {product.draftTemplates.map((template) => (
            <div
              key={template.id}
              className={`template-button ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => handleTemplateChange(template)}
            >
              <span className="template-name">{template.name || `Template ${template.id}`}</span>
            </div>
          ))}
        </div>
      )}

      <div className="main-editor-layout">
        {/* Left toolbar */}
        <div className="left-toolbar">
          <div className="toolbar-content">
            <div className="toolbar-button">
              <ImageIcon width={24} height={24} />
              <span>Upload Image</span>
            </div>
            <div className="toolbar-button">
              <TextIcon width={24} height={24} />
              <span>Add Text</span>
            </div>
          </div>

          {/* Grid toggle button */}
          <div className="grid-toggle">
            <div
              className={`toolbar-button ${showGrid ? 'active' : ''}`}
              onClick={toggleGrid}
            >
              <DashboardIcon width={24} height={24} />
              <span>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
            </div>
          </div>
        </div>

        <div className="editor-container">
          {/* Canvas area */}
          <div className="canvas-area" onClick={disableCanvasEvents}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductEditor;
