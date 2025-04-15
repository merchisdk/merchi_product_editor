import React from 'react';
import { useProductEditor } from '../context/ProductEditorContext';
import '../styles/TextToolbar.css';

const TextToolbar: React.FC = () => {
  const { selectedTextObject, updateSelectedText } = useProductEditor();

  if (!selectedTextObject || !updateSelectedText) {
    return null;
  }

  const currentFont = selectedTextObject.fontFamily || 'Nunito';
  const currentColor = typeof selectedTextObject.fill === 'string' ? selectedTextObject.fill : '#000000';

  const handleFontChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newFont = event.target.value;
    updateSelectedText({ fontFamily: newFont });
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    updateSelectedText({ fill: newColor });
  };

  const fontOptions = ['Nunito', 'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];

  return (
    <div className="text-toolbar">
      <select value={currentFont} onChange={handleFontChange}>
        {fontOptions.map(font => (
          <option key={font} value={font}>{font}</option>
        ))}
      </select>
      <input
        type="color"
        value={currentColor}
        onChange={handleColorChange}
        className="color-picker"
      />
    </div>
  );
};

export default TextToolbar; 
