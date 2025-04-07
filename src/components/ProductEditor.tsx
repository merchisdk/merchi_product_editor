import React from 'react';
import { DraftTemplate, ProductEditorProps } from '../types';
import { useProductEditor } from '../context/ProductEditorContext';
import Toolbar from './Toolbar';

const ProductEditor: React.FC<ProductEditorProps> = () => {
  const {
    canvasRef,
    draftTemplates,
    handleTemplateChange,
    isMobileView,
    selectedTemplate,
  } = useProductEditor();

  // Disable canvas events to prevent accidental template changes
  const disableCanvasEvents = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="product-editor">
      {/* Template buttons */}
      {draftTemplates.length > 0 && (
        <div className="template-buttons">
          {draftTemplates.map(({ template }) => (
            <div
              key={template.id}
              className={`template-button ${selectedTemplate === template.id ? 'selected' : ''}`}
              onClick={() => handleTemplateChange(template)}
            >
              <span className="template-name">
                {template.name || `Template ${template.id}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="main-editor-layout">
        {/* Show left toolbar only in desktop view */}
        {!isMobileView && (
          // <div className={`left-toolbar ${previewImageUrl ? 'left-toolbar-with-preview' : ''}`}>
          <div className={`left-toolbar`}>
            <Toolbar />
            {/* show PSD preview */}
            {/* {previewImageUrl && (
              <PreviewPanel
                previewImageUrl={previewImageUrl}
                title="Design Preview"
              />
            )} */}
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
          <Toolbar />
        </div>
      )}

      {/* In mobile view, show preview panel below the editor if have a preview */}
      {/* {isMobileView && previewImageUrl && (
        <PreviewPanel
          previewImageUrl={previewImageUrl}
          title="Design Preview"
        />
      )} */}
    </div>
  );
};

export default ProductEditor;
