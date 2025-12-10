import React, { useState, useRef, useEffect, useCallback } from 'react';
import { commonStyles } from '../../styles/commonStyles';

interface ImageCropModalProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  onCrop,
  onCancel,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState(200); // 크롭 영역 크기 (1:1 비율)
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);

  // 이미지 표시 영역 계산 함수
  const getImageDisplayArea = useCallback(() => {
    if (!imageRef.current || !containerRef.current || !imageLoaded) {
      return null;
    }
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgAspectRatio = imageSize.width / imageSize.height;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let displayWidth: number;
    let displayHeight: number;
    let displayX: number;
    let displayY: number;
    
    if (imgAspectRatio > containerAspectRatio) {
      // 이미지가 더 넓음 - 너비에 맞춤
      displayWidth = containerWidth;
      displayHeight = containerWidth / imgAspectRatio;
      displayX = 0;
      displayY = (containerHeight - displayHeight) / 2;
    } else {
      // 이미지가 더 높음 - 높이에 맞춤
      displayHeight = containerHeight;
      displayWidth = containerHeight * imgAspectRatio;
      displayX = (containerWidth - displayWidth) / 2;
      displayY = 0;
    }
    
    return { displayX, displayY, displayWidth, displayHeight };
  }, [imageLoaded, imageSize.width, imageSize.height]);

  // 이미지 로드 시 크기 설정
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // 이미지가 로드되고 컨테이너 크기가 결정되면 초기 크롭 영역 설정
  useEffect(() => {
    if (!imageLoaded || !containerRef.current || imageSize.width === 0 || imageSize.height === 0) return;
    
    // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 계산
    const timer = setTimeout(() => {
      const displayArea = getImageDisplayArea();
      if (!displayArea) return;
      
      const { displayWidth, displayHeight } = displayArea;
      const maxCropSize = Math.min(displayWidth, displayHeight) * 0.9;
      const initialCropSize = Math.min(maxCropSize, 250);
      
      setCropSize(initialCropSize);
      
      // 이미지 표시 영역 중앙에 위치
      setCropPosition({
        x: displayArea.displayX + (displayWidth - initialCropSize) / 2,
        y: displayArea.displayY + (displayHeight - initialCropSize) / 2,
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [imageLoaded, imageSize.width, imageSize.height, getImageDisplayArea]);

  // 마우스 다운 - 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropAreaRef.current) return;
    setIsDragging(true);
    const rect = cropAreaRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // 마우스 이동 - 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !cropAreaRef.current) return;
    
    const displayArea = getImageDisplayArea();
    if (!displayArea) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragStart.x;
    const newY = e.clientY - containerRect.top - dragStart.y;
    
    // 이미지 표시 영역 내에서만 이동 가능하도록 경계 체크
    const minX = displayArea.displayX;
    const minY = displayArea.displayY;
    const maxX = displayArea.displayX + displayArea.displayWidth - cropSize;
    const maxY = displayArea.displayY + displayArea.displayHeight - cropSize;
    
    setCropPosition({
      x: Math.max(minX, Math.min(newX, maxX)),
      y: Math.max(minY, Math.min(newY, maxY)),
    });
  };

  // 마우스 업 - 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 터치 이벤트 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!cropAreaRef.current) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = cropAreaRef.current.getBoundingClientRect();
    setDragStart({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current || !cropAreaRef.current) return;
    e.preventDefault();
    
    const displayArea = getImageDisplayArea();
    if (!displayArea) return;
    
    const touch = e.touches[0];
    const containerRect = containerRef.current.getBoundingClientRect();
    const newX = touch.clientX - containerRect.left - dragStart.x;
    const newY = touch.clientY - containerRect.top - dragStart.y;
    
    // 이미지 표시 영역 내에서만 이동 가능하도록 경계 체크
    const minX = displayArea.displayX;
    const minY = displayArea.displayY;
    const maxX = displayArea.displayX + displayArea.displayWidth - cropSize;
    const maxY = displayArea.displayY + displayArea.displayHeight - cropSize;
    
    setCropPosition({
      x: Math.max(minX, Math.min(newX, maxX)),
      y: Math.max(minY, Math.min(newY, maxY)),
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 크롭 실행
  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return;
    
    const displayArea = getImageDisplayArea();
    if (!displayArea) return;
    
    const img = imageRef.current;
    const { displayX, displayY, displayWidth, displayHeight } = displayArea;
    
    // 크롭 영역이 이미지 표시 영역 내에 있는지 확인
    const cropXInDisplay = cropPosition.x - displayX;
    const cropYInDisplay = cropPosition.y - displayY;
    
    // 이미지 원본 크기와 표시 크기의 비율 계산
    const scaleX = imageSize.width / displayWidth;
    const scaleY = imageSize.height / displayHeight;
    
    // 원본 이미지에서의 크롭 좌표 계산
    const cropX = cropXInDisplay * scaleX;
    const cropY = cropYInDisplay * scaleY;
    const cropWidth = cropSize * scaleX;
    const cropHeight = cropSize * scaleY;
    
    // Canvas를 사용하여 이미지 크롭
    const canvas = document.createElement('canvas');
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // 고품질 리사이징 설정
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
      img,
      cropX, cropY, cropWidth, cropHeight, // 소스 영역 (원본 이미지 좌표)
      0, 0, cropSize, cropSize // 대상 영역 (Canvas)
    );
    
    // WebP로 변환 시도
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          // WebP 실패 시 JPEG로 fallback
          canvas.toBlob(
            (jpegBlob) => {
              if (!jpegBlob) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                onCrop(reader.result as string);
              };
              reader.readAsDataURL(jpegBlob);
            },
            'image/jpeg',
            0.85
          );
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          onCrop(reader.result as string);
        };
        reader.readAsDataURL(blob);
      },
      'image/webp',
      0.85
    );
  };

  return (
    <div className={commonStyles.modalOverlay} onClick={onCancel}>
      <div
        className={`${commonStyles.modalContainerLarge} p-4 md:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            프로필 이미지 선택
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            드래그하여 원하는 영역을 선택하세요 (1:1 비율)
          </p>
        </div>
        
        <div
          ref={containerRef}
          className="relative w-full h-64 md:h-80 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden mb-4"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imageLoaded && (
            <>
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="w-full h-full object-contain"
                draggable={false}
              />
              
              {/* 크롭 영역 오버레이 */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, 
                    rgba(0,0,0,0.5) 0%, 
                    rgba(0,0,0,0.5) ${(cropPosition.x / (containerRef.current?.clientWidth || 1)) * 100}%, 
                    transparent ${(cropPosition.x / (containerRef.current?.clientWidth || 1)) * 100}%, 
                    transparent ${((cropPosition.x + cropSize) / (containerRef.current?.clientWidth || 1)) * 100}%, 
                    rgba(0,0,0,0.5) ${((cropPosition.x + cropSize) / (containerRef.current?.clientWidth || 1)) * 100}%, 
                    rgba(0,0,0,0.5) 100%),
                    linear-gradient(to bottom, 
                    rgba(0,0,0,0.5) 0%, 
                    rgba(0,0,0,0.5) ${(cropPosition.y / (containerRef.current?.clientHeight || 1)) * 100}%, 
                    transparent ${(cropPosition.y / (containerRef.current?.clientHeight || 1)) * 100}%, 
                    transparent ${((cropPosition.y + cropSize) / (containerRef.current?.clientHeight || 1)) * 100}%, 
                    rgba(0,0,0,0.5) ${((cropPosition.y + cropSize) / (containerRef.current?.clientHeight || 1)) * 100}%, 
                    rgba(0,0,0,0.5) 100%)`,
                }}
              />
              
              {/* 크롭 영역 */}
              <div
                ref={cropAreaRef}
                className="absolute border-2 border-white shadow-lg cursor-move"
                style={{
                  left: `${cropPosition.x}px`,
                  top: `${cropPosition.y}px`,
                  width: `${cropSize}px`,
                  height: `${cropSize}px`,
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* 크롭 영역 핸들 */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full border border-gray-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border border-gray-300" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full border border-gray-300" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full border border-gray-300" />
              </div>
            </>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`${commonStyles.buttonBase} ${commonStyles.secondaryButton} flex-1`}
          >
            취소
          </button>
          <button
            onClick={handleCrop}
            className={`${commonStyles.buttonBase} ${commonStyles.primaryButton} flex-1`}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
};

