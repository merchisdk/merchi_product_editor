import React from 'react';
import { Apps, Redo, Undo } from 'grommet-icons';
import { useProductEditor } from '../context/ProductEditorContext';
import { addTextToCanvas } from '../utils/canvasUtils';

export default function Toolbar() {
  const {
    canvas,
    width,
    setShowGrid,
    showGrid,
    height,
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
}
