import React from 'react';
import { ImageIcon, Grid3x3, Undo, Redo } from 'lucide-react';
import { useProductEditor } from '../context/ProductEditorContext';
import './Toolbar.css';

export const Toolbar: React.FC = () => {
  const {
    showGrid,
    setShowGrid,
    handleUndo,
    handleRedo,
    handleUploadImage,
  } = useProductEditor();

  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  return (
    <div className="left-toolbar">
      <div className="toolbar-content">
        <div className="toolbar-button">
          <ImageIcon width={24} height={24} />
          <span>Upload Image</span>
        </div>
        <div className="toolbar-button" onClick={handleUndo}>
          <Undo width={24} height={24} />
          <span>Undo</span>
        </div>
        <div className="toolbar-button" onClick={handleRedo}>
          <Redo width={24} height={24} />
          <span>Redo</span>
        </div>
      </div>

      <div className="grid-toggle">
        <div
          className={`toolbar-button ${showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
        >
          <Grid3x3 width={24} height={24} />
          <span>{showGrid ? 'Hide Grid' : 'Show Grid'}</span>
        </div>
      </div>
    </div>
  );
};
