import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { ProductEditorProps, DraftTemplate } from '../types';
import { drawGrid, saveGridState, clearCanvasExceptGrid } from './EditorGrid';
import { addText } from '../utils/AddText';
import { uploadImage, setupKeyboardEvents } from '../utils/ImageHandler';
import { Redo, Undo, Apps } from "grommet-icons";
import { ImageIcon } from '@radix-ui/react-icons';
import PreviewPanel from './PreviewPanel';

const ProductEditor: React.FC<ProductEditorProps> = ({
  product,
  width = 800,
  height = 600,
  onSave,
  onCancel,
  psdTemplateUrl
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

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

      // setup keyboard delete event
      const cleanupKeyboardEvents = setupKeyboardEvents(fabricCanvas, (dataUrl) => {
        onSave && onSave(dataUrl);
        setPreviewImageUrl(null); // clear preview, because the image is deleted
      });

      return () => {
        cleanupKeyboardEvents();
        if (fabricCanvas) {
          fabricCanvas.dispose();
        }
      };
    }

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [product, width, height, onSave]);

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

    fabric.Image.fromURL(
      template.file.url,
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

  // handle preview generation
  const handlePreviewGenerated = (previewDataUrl: string) => {
    setPreviewImageUrl(previewDataUrl);
  };

  // handle upload image
  const handleUploadImage = () => {
    if (canvas) {
      uploadImage(
        canvas,
        width,
        height,
        onSave,
        psdTemplateUrl ? handlePreviewGenerated : undefined,
        psdTemplateUrl
      );
    }
  };

  const handleTemplateChange = (template: DraftTemplate) => {
    if (!canvas) return;
    setSelectedTemplate(template);
    loadTemplateImage(canvas, template);
    setPreviewImageUrl(null);
  };

  // toggle grid visibility
  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  // Disable canvas events to prevent accidental template changes
  const disableCanvasEvents = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Add handleAddText function before the return statement
  const handleAddText = () => {
    if (!canvas) return;
    addText(canvas, width, height);
  };

  // Create toolbar content
  const renderToolbarContent = () => (
    <>
      <div className="toolbar-content">
        <div className="toolbar-button" onClick={handleUploadImage}>
          <ImageIcon width={24} height={24} />
          <span>Upload Image</span>
        </div>
        {/* <div className="toolbar-button" onClick={handleAddText}>
          <TextIcon width={24} height={24} />
          <span>Add Text</span>
        </div> */}
      </div>
      {/* Grid toggle button */}
      <div className="grid-toggle">
        <div
          className={`toolbar-button ${showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
        >
          <Apps width={24} height={24} />
          <span>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
        </div>
      </div>
      {/* Redo and Undo buttons */}
      <div className="toolbar-content">
        <div className="toolbar-button">
          <Undo width={24} height={24} />
          <span>Undo</span>
        </div>
        <div className="toolbar-button" onClick={handleAddText}>
          <Redo width={24} height={24} />
          <span>Redo</span>
        </div>
      </div>
    </>
  );

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
        {/* Show left toolbar only in desktop view */}
        {!isMobileView && (
          <div className={`left-toolbar ${previewImageUrl ? 'left-toolbar-with-preview' : ''}`}>
            {renderToolbarContent()}
            {/* show PSD preview */}
            {previewImageUrl && (
              <PreviewPanel
                previewImageUrl={previewImageUrl}
                title="Design Preview"
              />
            )}
          </div>
        )}

        <div className="editor-container">
          {/* Canvas area */}
          <div className="canvas-area" onClick={disableCanvasEvents}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      {/* Show bottom toolbar only in mobile view */}
      {isMobileView && (
        <div className="bottom-toolbar">
          {renderToolbarContent()}
        </div>
      )}

      {/* In mobile view, show preview panel below the editor if have a preview */}
      {isMobileView && previewImageUrl && (
        <PreviewPanel
          previewImageUrl={previewImageUrl}
          title="Design Preview"
        />
      )}
    </div>
  );
};

export default ProductEditor;
