import React, { useEffect, useState } from "react";
import { Close, FormPrevious, FormNext } from "grommet-icons";

const MODAL_BODY_CLASS = 'has-preview-modal-open';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  productName: string;
  totalImages: number;
  currentIndex: number;
  allImages: { viewUrl: string }[];
}

const ImageZoomModal = ({
  isOpen,
  onClose,
  imageUrl,
  productName,
  totalImages,
  currentIndex,
  allImages
}: ImageZoomModalProps) => {
  const [modalImageIndex, setModalImageIndex] = useState(currentIndex);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add(MODAL_BODY_CLASS);
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove(MODAL_BODY_CLASS);
    }

    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove(MODAL_BODY_CLASS);
    };
  }, [isOpen]);

  useEffect(() => {
    setModalImageIndex(currentIndex);
    setCurrentImageUrl(imageUrl);
  }, [currentIndex, imageUrl]);

  const handlePrevious = () => {
    setModalImageIndex((prev) => {
      const newIndex = (prev - 1 + totalImages) % totalImages;
      setCurrentImageUrl(allImages[newIndex].viewUrl);
      return newIndex;
    });
  };

  const handleNext = () => {
    setModalImageIndex((prev) => {
      const newIndex = (prev + 1) % totalImages;
      setCurrentImageUrl(allImages[newIndex].viewUrl);
      return newIndex;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="zoom-modal">
      <div className="zoom-modal-container">
        <button
          onClick={onClose}
          className="close-button"
        >
          <Close width={36} height={36} color="white" />
        </button>

        <button
          onClick={handlePrevious}
          className="nav-button-zoom left"
        >
          <FormPrevious width={42} height={42} color="white" />
        </button>

        <div className="zoom-image-container">
          <img
            src={currentImageUrl}
            alt={productName}
            className="zoom-image"
            loading="lazy"
          />
        </div>

        <button
          onClick={handleNext}
          className="nav-button-zoom right"
        >
          <FormNext width={42} height={42} color="white" />
        </button>
      </div>
    </div>
  );
};

export default ImageZoomModal; 
