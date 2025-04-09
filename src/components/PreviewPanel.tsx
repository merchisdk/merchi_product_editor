import React from 'react';
import '../styles/PreviewPanel.css';

interface PreviewPanelProps {
  previewImageUrl: string | null;
  title?: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  previewImageUrl,
  title = 'Preview'
}) => {
  if (!previewImageUrl) {
    return null;
  }

  return (
    <div className="preview-panel">
      <h3 className="preview-title">{title}</h3>
      <div className="preview-image-container">
        <img
          src={previewImageUrl}
          className="preview-image"
        />
      </div>
    </div>
  );
};

export default PreviewPanel; 
