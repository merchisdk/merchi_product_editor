import React from 'react';
import { Apps, Redo, Undo, View, Trash, Layer } from 'grommet-icons';
import { useProductEditor } from '../context/ProductEditorContext';
import { addTextToCanvas } from '../utils/canvasUtils';
import '../styles/Toolbar.css';

export default function Toolbar() {
  const {
    canvas,
    width,
    setShowGrid,
    showGrid,
    height,
    showPreview,
    togglePreview,
    showLayerPanel,
    toggleLayerPanel,
  } = useProductEditor();

  // Add handleAddText function before the return statement
  const handleAddText = () => {
    if (!canvas) return;
    addTextToCanvas(canvas, width, height);
  };

  const toggleGrid = () => setShowGrid(!showGrid);

  return (
    <>
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

      {/* Preview toggle button */}
      <div className="preview-toggle">
        <div
          className={`toolbar-button ${showPreview ? 'active' : ''}`}
          onClick={togglePreview}
        >
          <View width={24} height={24} />
          <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
        </div>
      </div>

      {/* Layer button */}
      <div
        className={`toolbar-button ${showLayerPanel ? 'active' : ''}`}
        onClick={toggleLayerPanel}
      >
        <Layer width={24} height={24} />
        <span>Layer</span>
      </div>

      {/* Delete button */}
      <div className="toolbar-button">
        <Trash width={24} height={24} />
        <span>Delete</span>
      </div>

      {/* Redo and Undo buttons */}
      <div className="toolbar-content">
        <div className="toolbar-button">
          <Undo width={24} height={24} />
          <span>Undo</span>
        </div>
        <div className="toolbar-button">
          <Redo width={24} height={24} />
          <span>Redo</span>
        </div>
      </div>
    </>
  );
}
