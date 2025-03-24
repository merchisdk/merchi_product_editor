# Merchi Product Editor

A React component for editing product images using Fabric.js. This library allows users to add and edit text overlays on product images using Merchi draft templates.

## Installation

```bash
npm install merchi_product_editor
```

## Usage

```jsx
import { ProductEditor } from 'merchi_product_editor';

function App() {
  const product = {
    id: 1,
    name: "Sample Product",
    draftTemplates: [
      {
        id: 1,
        name: "Template 1",
        file: {
          url: "https://example.com/template1.jpg"
        }
      }
    ]
  };

  const handleSave = (editedImage: string) => {
    // Handle the edited image data URL
    console.log('Edited image:', editedImage);
  };

  const handleCancel = () => {
    // Handle cancel action
    console.log('Editing cancelled');
  };

  return (
    <ProductEditor
      product={product}
      width={800}
      height={600}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| product | Product | Yes | - | Merchi Product entity containing draft templates |
| width | number | No | 800 | Width of the editor canvas |
| height | number | No | 600 | Height of the editor canvas |
| onSave | (editedImage: string) => void | No | - | Callback function when saving the edited image |
| onCancel | () => void | No | - | Callback function when canceling the edit |

## Features

- Load and switch between multiple draft templates
- Add text overlays to product images
- Customize text properties (color, size, font)
- Drag and resize text elements
- Save edited image as data URL
- Responsive canvas sizing

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## License

MIT 