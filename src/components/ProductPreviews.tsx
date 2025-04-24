import React, { useState } from 'react';
import ImageZoomModal from './ImageZoomModal';
import '../styles/ProductEditor.css';
import '../styles/BottomPreviewDisplay.css';
import { useProductEditor } from '../context/ProductEditorContext';

interface PreviewImage {
  id: number | string;
  viewUrl: string;
}

interface BottomPreviewDisplayProps {}

const ProductPreviews: React.FC<BottomPreviewDisplayProps> = () => {
  const {
    draftPreviews,
  } = useProductEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  const openModal = (index: number) => {
    setSelectedPreviewIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (!draftPreviews || draftPreviews.length === 0) {
    return null;
  }

  return (
    <>
      {!isModalOpen && (
        <div className="bottom-preview-section">
          <div className="preview-images">
            {draftPreviews.map((preview: any, index) => (
              <div
                key={preview.id}
                className="preview-image-box"
                onClick={() => openModal(index)}
                style={{
                  backgroundImage: `url(${preview.viewUrl})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center center'
                }}
                title={`Preview ${index + 1}`}
              >
              </div>
            ))}
          </div>
        </div>
      )}

      <ImageZoomModal
        isOpen={isModalOpen}
        onClose={closeModal}
        imageUrl={(draftPreviews[selectedPreviewIndex] as any)?.viewUrl || ''}
        productName="Preview"
        totalImages={draftPreviews.length}
        currentIndex={selectedPreviewIndex}
        allImages={draftPreviews}
      />
    </>
  );
};

export default ProductPreviews; 
