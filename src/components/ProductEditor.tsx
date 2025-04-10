import React from 'react';
import { useProductEditor } from '../context/ProductEditorContext';
import FloatingToolbar from './FloatingToolbar';
import BottomPreviewDisplay from './BottomPreviewDisplay';
import '../styles/ProductEditor.css';

// Placeholder for the preview images
const placeholderPreviews = [
  { id: 1, viewUrl: 'https://picsum.photos/id/10/600/600' },
  { id: 2, viewUrl: 'https://picsum.photos/id/20/600/600' },
  { id: 3, viewUrl: 'https://picsum.photos/id/30/600/600' },
];

const ProductEditor: React.FC = () => {
  const {
    canvasRef,
    draftTemplates,
    handleTemplateChange,
    isMobileView,
    selectedTemplate,
    showPreview,
  } = useProductEditor();

  const disableCanvasEvents = (e: React.MouseEvent) => {
    // Allow clicks on toolbar and preview bar container
    if ((e.target as HTMLElement).closest('.floating-toolbar') || (e.target as HTMLElement).closest('.bottom-preview-section')) {
      return;
    }
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

      <div className="main-editor-layout" style={{ position: 'relative' }}>
        <div className="editor-container">
          <div className="canvas-area" onClick={disableCanvasEvents}>
            <canvas ref={canvasRef} />
          </div>
          <FloatingToolbar />
        </div>

        {!isMobileView && showPreview && (
          <BottomPreviewDisplay images={placeholderPreviews} />
        )}
      </div>
    </div>
  );
};

export default ProductEditor;
