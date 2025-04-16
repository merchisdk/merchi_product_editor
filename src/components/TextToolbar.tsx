import React, { useState, useRef, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { ChromePicker, ColorResult } from 'react-color';
import { useProductEditor } from '../context/ProductEditorContext';
import { FontOption, fontOptions } from '../config/fontConfig';
import { defaultPalette } from '../config/colorConfig';
import { customStyles } from '../styles/textToolbarSelectStyles';
import '../styles/TextToolbar.css';

const TextToolbar: React.FC = () => {
  const { selectedTextObject, updateSelectedText } = useProductEditor();
  const [displayColorPicker, setDisplayColorPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'palette' | 'custom'>('palette');
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setDisplayColorPicker(false);
        setPickerMode('palette');
      }
    };
    if (displayColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [displayColorPicker]);

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

  const handlePaletteColorClick = (color: string) => {
    updateSelectedText({ fill: color });
    setDisplayColorPicker(false);
    setPickerMode('palette');
  };

  const handleCustomColorChange = (color: ColorResult) => {
    updateSelectedText({ fill: color.hex });
  };

  const handleSwatchClick = () => {
    const currentlyVisible = displayColorPicker;
    setDisplayColorPicker(!currentlyVisible);
    if (!currentlyVisible) {
      setPickerMode('palette');
    }
  };

  const handleCustomTriggerClick = () => {
    setPickerMode('custom');
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

      <div className="color-picker-trigger" onClick={handleSwatchClick} title="Change text color">
        <div
          className="color-picker-swatch"
          style={{ backgroundColor: currentColor }}
        />
        <span className="color-picker-label">Color</span>
      </div>

      {displayColorPicker && (
        <div className="color-picker-container" ref={colorPickerRef}>
          <div className="color-picker-popover">
            {pickerMode === 'palette' ? (
              <div className="palette-grid">
                {defaultPalette.flat().map((color, index) => {
                  if (color === null) {
                    return (
                      <button
                        key="custom-trigger"
                        className="palette-trigger-swatch"
                        onClick={handleCustomTriggerClick}
                        title="Choose custom color"
                      >
                        +
                      </button>
                    );
                  } else {
                    return (
                      <button
                        key={`${color}-${index}`}
                        className="palette-swatch"
                        style={{ backgroundColor: color }}
                        onClick={() => handlePaletteColorClick(color)}
                        title={color}
                      />
                    );
                  }
                })}
              </div>
            ) : (
              <>
                <ChromePicker
                  color={currentColor}
                  onChange={handleCustomColorChange}
                  disableAlpha={true}
                  styles={{
                    default: {
                      picker: {
                        boxShadow: 'none',
                        width: '250px'
                      }
                    }
                  }}
                />
                <button
                  className="color-picker-back-btn"
                  onClick={() => setPickerMode('palette')}
                >
                  Back to Palette
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextToolbar;
