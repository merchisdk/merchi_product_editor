import React from 'react';
import { useProductEditor } from '../context/ProductEditorContext';
import FloatingToolbar from './FloatingToolbar';
import BottomPreviewDisplay from './BottomPreviewDisplay';
import Toolbar from './Toolbar';
import LoadingOverlay from './LoadingOverlay';
import '../styles/ProductEditor.css';
import { fabric } from 'fabric';

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
    isCanvasLoading,
  } = useProductEditor();

  const disableCanvasEvents = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.floating-toolbar') ||
      (e.target as HTMLElement).closest('.bottom-preview-section') ||
      (e.target as HTMLElement).closest('.mobile-bottom-toolbar')) {
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
        <LoadingOverlay isLoading={isCanvasLoading} className="canvas-loading" />
        <div
          className={`editor-container ${isMobileView && showPreview ? 'has-bottom-padding' : ''}`}
        >
          <div className="canvas-area" onClick={disableCanvasEvents}>
            <canvas ref={canvasRef} />
          </div>
          {!isMobileView && <FloatingToolbar />}
        </div>

        {showPreview && (
          <BottomPreviewDisplay images={placeholderPreviews} />
        )}
      </div>

      {isMobileView && (
        <div className="mobile-bottom-toolbar">
          <Toolbar />
        </div>
      )}
    </div>
  );
};

export default ProductEditor;
