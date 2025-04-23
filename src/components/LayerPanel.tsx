import React, { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useProductEditor } from '../context/ProductEditorContext';
import { Close, Drag, TextAlignCenter, Image as ImageIcon } from 'grommet-icons';
import '../styles/LayerPanel.css';

const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const LayerPanel: React.FC = () => {
  const { canvas, toggleLayerPanel, selectedObjectId, selectObject } = useProductEditor();
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (canvas) {
      const updateLayers = () => {
        const filteredObjects = canvas.getObjects().filter(obj =>
          (obj.type === 'i-text' || obj.type === 'image') && obj.selectable
        );
        setLayers([...filteredObjects].reverse());
      };
      updateLayers();
      canvas.on('object:added', updateLayers);
      canvas.on('object:removed', updateLayers);
      canvas.on('stack:changed', updateLayers);
      canvas.on('selection:created', updateLayers);
      canvas.on('selection:updated', updateLayers);
      canvas.on('selection:cleared', updateLayers);
      return () => {
        canvas.off('object:added', updateLayers);
        canvas.off('object:removed', updateLayers);
        canvas.off('stack:changed', updateLayers);
        canvas.off('selection:created', updateLayers);
        canvas.off('selection:updated', updateLayers);
        canvas.off('selection:cleared', updateLayers);
      };
    }
  }, [canvas]);

  const getLayerInfo = (object: fabric.Object): { name: string; icon: JSX.Element } => {
    if (object.type === 'i-text') {
      return {
        name: (object as fabric.IText).text?.substring(0, 20) || 'Text',
        icon: <TextAlignCenter size="medium" />
      };
    }
    if (object.type === 'image') {
      const imageObject = object as fabric.Image;
      const src = imageObject.getSrc();
      return {
        name: (object as any).name || (src ? src.split('/').pop()?.substring(0, 20) : undefined) || 'Image',
        icon: <img src={src} alt="layer thumb" className="layer-thumbnail" />
      };
    }
    return { name: 'Unknown Layer', icon: <></> };
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setDragging(true), 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    dragOverItemIndex.current = index;
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {

  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLUListElement>) => {
    e.preventDefault();
    if (dragItemIndex.current === null || dragOverItemIndex.current === null || dragItemIndex.current === dragOverItemIndex.current) {
      setDragging(false);
      dragItemIndex.current = null;
      dragOverItemIndex.current = null;
      return;
    }

    const sourceIndex = dragItemIndex.current;
    const destinationIndex = dragOverItemIndex.current;

    const reorderedLayers = reorder(
      layers,
      sourceIndex,
      destinationIndex
    );
    setLayers(reorderedLayers);

    if (canvas) {
      const objectToMove = layers[sourceIndex];
      const totalObjects = canvas.getObjects().length;
      const fabricTargetIndex = totalObjects - 1 - destinationIndex;
      canvas.moveTo(objectToMove, fabricTargetIndex);
      canvas.requestRenderAll();
    }

    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
    setDragging(false);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    setDragging(false);
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleLayerClick = (layer: fabric.Object) => {
    selectObject(layer);
  };

  return (
    <div className={`layer-panel ${dragging ? 'is-dragging-panel' : ''}`}>
      <div className="layer-panel-header">
        <p>Layers</p>
        <button onClick={toggleLayerPanel} className="close-button" title="Close Panel">
          <Close size="small" />
        </button>
      </div>
      <ul
        className="layer-list"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {layers.map((layer, index) => {
          const layerInfo = getLayerInfo(layer);
          const layerId = (layer as any).id;
          const isSelected = layerId && layerId === selectedObjectId;
          const isBeingDragged = dragging && dragItemIndex.current === index;
          return (
            <li
              key={`layer-${layerId || index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDragEnd={handleDragEnd}
              onClick={() => handleLayerClick(layer)}
              className={`layer-item ${isSelected ? 'selected' : ''} ${isBeingDragged ? 'is-dragging-item' : ''}`}
            >
              <span className="layer-icon">{layerInfo.icon}</span>
              <span className="layer-name">{layerInfo.name}</span>
              <span className="layer-drag-indicator">
                <Drag size="small" />
              </span>
            </li>
          );
        })}
        {layers.length === 0 && <li className="no-layers">No layers found</li>}
      </ul>
    </div>
  );
};

export default LayerPanel;
