import React from 'react';
import Select from 'react-select';
import { useProductEditor } from '../context/ProductEditorContext';
import { FontOption, fontOptions } from '../config/fontConfig';
import { customStyles } from '../styles/textToolbarSelectStyles';
import '../styles/TextToolbar.css';

const TextToolbar: React.FC = () => {
  const { selectedTextObject, updateSelectedText } = useProductEditor();

  if (!selectedTextObject || !updateSelectedText) {
    return null;
  }

  const currentFontValue = selectedTextObject.fontFamily || 'Nunito';
  const currentColor = typeof selectedTextObject.fill === 'string' ? selectedTextObject.fill : '#000000';

  const handleFontChange = (selectedOption: FontOption | null) => {
    if (selectedOption) {
      updateSelectedText({ fontFamily: selectedOption.value });
    }
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateSelectedText({ fill: event.target.value });
  };

  const currentFontOption = fontOptions.find(option => option.value === currentFontValue) || fontOptions[0];

  return (
    <div className="text-toolbar">
      <Select<FontOption>
        options={fontOptions}
        styles={customStyles}
        value={currentFontOption}
        onChange={handleFontChange}
        isSearchable={true}
        placeholder="Select or search font..."
        className="react-select-container"
        classNamePrefix="react-select"
      />
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
