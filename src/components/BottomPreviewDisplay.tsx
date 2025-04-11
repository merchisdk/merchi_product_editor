import React, { useState } from 'react';
import ImageZoomModal from './ImageZoomModal';
import '../styles/ProductEditor.css';
import '../styles/BottomPreviewDisplay.css';

interface PreviewImage {
  id: number | string;
  viewUrl: string;
}

interface BottomPreviewDisplayProps {
  images: PreviewImage[];
}

const BottomPreviewDisplay: React.FC<BottomPreviewDisplayProps> = ({
  images,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  const openModal = (index: number) => {
    setSelectedPreviewIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <>
      {!isModalOpen && (
        <div className="bottom-preview-section">
          <div className="preview-images">
            {images.map((preview, index) => (
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
        imageUrl={images[selectedPreviewIndex]?.viewUrl || ''}
        productName="Preview"
        totalImages={images.length}
        currentIndex={selectedPreviewIndex}
        allImages={images}
      />
    </>
  );
};

export default BottomPreviewDisplay; 
