import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropModalProps {
  imageSrc: string;
  aspectRatio: number;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

function getCroppedImg(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return Promise.reject(new Error('Failed to get canvas context'));
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95); // Save as high-quality JPEG
  });
}

export default function ImageCropModal({ imageSrc, aspectRatio, onSave, onClose }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  }

  const handleSaveCrop = async () => {
    if (completedCrop && imgRef.current) {
      try {
        const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
        onSave(croppedImageBlob);
      } catch (e) {
        console.error('Error cropping image:', e);
      }
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Edit Image</h2>
        <div className="crop-container">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
          >
            <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} alt="Crop preview" style={{ maxHeight: '70vh' }} />
          </ReactCrop>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="button-secondary">Cancel</button>
          <button onClick={handleSaveCrop} className="button-primary">Save</button>
        </div>
      </div>
      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050; /* Ensure it's above other UI */
        }
        .modal-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          color: black;
        }
        .crop-container {
          margin: 20px 0;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        button {
          padding: 10px 20px;
          border-radius: 5px;
          border: none;
          cursor: pointer;
        }
        .button-primary { background-color: #0070f3; color: white; }
        .button-secondary { background-color: #e0e0e0; color: black; }
      `}</style>
    </div>
  );
}