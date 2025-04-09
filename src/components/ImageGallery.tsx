import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import ImageNavButton from "./ImageNavButton";
import ImageZoomModal from "./ImageZoomModal";
import { ZoomIn } from 'grommet-icons';

interface ImageGalleryProps {
  imageUrl?: string;
  productName?: string;
  selectedImageIndex?: number;
  totalImages?: number;
  allImages?: { viewUrl: string }[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  imageUrl = '',
  productName = '',
  selectedImageIndex = 0,
  totalImages = 0,
  allImages = []
}) => {
  // image browser related states
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(selectedImageIndex);
  const [currentImageUrl, setCurrentImageUrl] = useState(
    allImages[selectedImageIndex]?.viewUrl || imageUrl || '/blueman_white.png'
  );

  useEffect(() => {
    // set current image URL (for normal image mode)
    if (allImages && allImages.length > 0) {
      setCurrentImageUrl(allImages[currentIndex]?.viewUrl || '/blueman_white.png');
    }
  }, [allImages, currentIndex, imageUrl]);

  const handleNavigation = (newDirection: 'left' | 'right') => {
    if (!allImages || allImages.length <= 1) return;

    setSlideDirection(newDirection === 'left' ? 'left' : 'right');

    let newIndex;
    const actualTotalImages = Math.min(totalImages, allImages.length);

    if (newDirection === 'left') {
      newIndex = currentIndex === 0 ? actualTotalImages - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex === actualTotalImages - 1 ? 0 : currentIndex + 1;
    }

    setCurrentIndex(newIndex);
    setCurrentImageUrl(allImages[newIndex]?.viewUrl || '/blueman_white.png');
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
    setCurrentImageUrl(allImages[index]?.viewUrl || '/blueman_white.png');
  };

  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? -1000 : 1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: 'left' | 'right') => ({
      zIndex: 0,
      x: direction === 'left' ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <>
      <div className="image-gallery-container">
        <div className="image-container">
          <AnimatePresence initial={false} custom={slideDirection}>
            <motion.div
              key={currentIndex}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="image-slide"
            >
              <img
                src={currentImageUrl}
                alt={productName || "Product Image"}
                className={`gallery-image ${isImageLoading ? '' : 'image-loaded'}`}
                onLoad={() => setIsImageLoading(false)}
              />
              {isImageLoading && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <button
            onClick={() => setIsZoomModalOpen(true)}
            className="zoom-button"
          >
            <ZoomIn className="zoom-icon" />
          </button>
        </div>
        {allImages.length > 1 && (
          <div className="nav-buttons-container">
            <ImageNavButton
              direction="left"
              onClick={() => handleNavigation('left')}
            />
            <ImageNavButton
              direction="right"
              onClick={() => handleNavigation('right')}
            />
          </div>
        )}
      </div>

      {allImages.length > 1 && (
        <div className="thumbnails-container">
          <div className="thumbnails-row">
            {allImages.slice(0, 5).map((image, index) => {
              const imageSrc = image.viewUrl || "/blueman_white.png";
              const isSelected = index === currentIndex;

              return (
                <button
                  key={index}
                  onClick={() => handleThumbnailClick(index)}
                  className={`thumbnail-button ${isSelected ? 'selected' : ''}`}
                >
                  <img
                    src={imageSrc}
                    loading="lazy"
                    alt={`Product Image ${index + 1}`}
                    className="thumbnail-image"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ImageZoomModal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        imageUrl={currentImageUrl}
        productName={productName}
        totalImages={allImages.length}
        currentIndex={currentIndex}
        allImages={allImages}
      />
    </>
  );
};

export default ImageGallery;
