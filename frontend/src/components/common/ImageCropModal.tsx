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
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCropState, setInitialCropState] = useState({ size: 0, x: 0, y: 0 });
  
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

  // 마우스 다운 - 드래그 시작 (이동 또는 크기 조정)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropAreaRef.current) return;
    
    // 핸들 클릭인지 확인
    const target = e.target as HTMLElement;
    const handleType = target.getAttribute('data-handle') as 'nw' | 'ne' | 'sw' | 'se' | null;
    
    if (handleType) {
      // 크기 조정 모드
      setIsResizing(true);
      setResizeHandle(handleType);
      setInitialCropState({
        size: cropSize,
        x: cropPosition.x,
        y: cropPosition.y,
      });
      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    } else {
      // 이동 모드
      setIsDragging(true);
      const rect = cropAreaRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // 마우스 이동 - 드래그 중 (이동 또는 크기 조정)
  const handleMouseMove = (e: React.MouseEvent) => {
    const displayArea = getImageDisplayArea();
    if (!displayArea || !containerRef.current) return;
    
    if (isResizing && resizeHandle) {
      // 크기 조정 모드
      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      // 핸들 위치에 따라 크기 조정 계산
      let newSize = initialCropState.size;
      let newX = initialCropState.x;
      let newY = initialCropState.y;
      
      const startX = initialCropState.x;
      const startY = initialCropState.y;
      const startSize = initialCropState.size;
      const endX = startX + startSize;
      const endY = startY + startSize;
      
      // 핸들 위치에 따라 크기와 위치 계산
      switch (resizeHandle) {
        case 'nw': // 왼쪽 위
          newSize = Math.max(endX - mouseX, endY - mouseY);
          newX = endX - newSize;
          newY = endY - newSize;
          break;
        case 'ne': // 오른쪽 위
          newSize = Math.max(mouseX - startX, endY - mouseY);
          newX = startX;
          newY = endY - newSize;
          break;
        case 'sw': // 왼쪽 아래
          newSize = Math.max(endX - mouseX, mouseY - startY);
          newX = endX - newSize;
          newY = startY;
          break;
        case 'se': // 오른쪽 아래
          newSize = Math.max(mouseX - startX, mouseY - startY);
          newX = startX;
          newY = startY;
          break;
      }
      
      // 최소/최대 크기 제한
      const minSize = 50;
      const maxSize = Math.min(displayArea.displayWidth, displayArea.displayHeight);
      newSize = Math.max(minSize, Math.min(newSize, maxSize));
      
      // 크기 조정에 따른 위치 재계산
      switch (resizeHandle) {
        case 'nw':
          newX = endX - newSize;
          newY = endY - newSize;
          break;
        case 'ne':
          newX = startX;
          newY = endY - newSize;
          break;
        case 'sw':
          newX = endX - newSize;
          newY = startY;
          break;
        case 'se':
          newX = startX;
          newY = startY;
          break;
      }
      
      // 이미지 표시 영역 내에서만 가능하도록 경계 체크
      const minX = displayArea.displayX;
      const minY = displayArea.displayY;
      const maxX = displayArea.displayX + displayArea.displayWidth - newSize;
      const maxY = displayArea.displayY + displayArea.displayHeight - newSize;
      
      // 경계를 벗어나면 위치 조정
      if (newX < minX) {
        newX = minX;
        if (resizeHandle === 'nw' || resizeHandle === 'sw') {
          newSize = endX - newX;
        }
      }
      if (newY < minY) {
        newY = minY;
        if (resizeHandle === 'nw' || resizeHandle === 'ne') {
          newSize = endY - newY;
        }
      }
      if (newX + newSize > displayArea.displayX + displayArea.displayWidth) {
        newSize = displayArea.displayX + displayArea.displayWidth - newX;
      }
      if (newY + newSize > displayArea.displayY + displayArea.displayHeight) {
        newSize = displayArea.displayY + displayArea.displayHeight - newY;
      }
      
      // 최소 크기 재확인
      if (newSize < minSize) {
        newSize = minSize;
        switch (resizeHandle) {
          case 'nw':
            newX = endX - minSize;
            newY = endY - minSize;
            break;
          case 'ne':
            newX = startX;
            newY = endY - minSize;
            break;
          case 'sw':
            newX = endX - minSize;
            newY = startY;
            break;
          case 'se':
            newX = startX;
            newY = startY;
            break;
        }
      }
      
      setCropSize(newSize);
      setCropPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    } else if (isDragging && cropAreaRef.current) {
      // 이동 모드
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
    }
  };

  // 마우스 업 - 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // 터치 이벤트 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!cropAreaRef.current) return;
    
    // 핸들 터치인지 확인
    const target = e.target as HTMLElement;
    const handleType = target.getAttribute('data-handle') as 'nw' | 'ne' | 'sw' | 'se' | null;
    
    if (handleType) {
      // 크기 조정 모드
      setIsResizing(true);
      setResizeHandle(handleType);
      setInitialCropState({
        size: cropSize,
        x: cropPosition.x,
        y: cropPosition.y,
      });
      const touch = e.touches[0];
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
      });
    } else {
      // 이동 모드
      setIsDragging(true);
      const touch = e.touches[0];
      const rect = cropAreaRef.current.getBoundingClientRect();
      setDragStart({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if ((!isDragging && !isResizing) || !containerRef.current) return;
    e.preventDefault();
    
    const displayArea = getImageDisplayArea();
    if (!displayArea) return;
    
    const touch = e.touches[0];
    
    if (isResizing && resizeHandle) {
      // 크기 조정 모드 (터치)
      const containerRect = containerRef.current.getBoundingClientRect();
      const touchX = touch.clientX - containerRect.left;
      const touchY = touch.clientY - containerRect.top;
      
      // 핸들 위치에 따라 크기 조정 계산
      let newSize = initialCropState.size;
      let newX = initialCropState.x;
      let newY = initialCropState.y;
      
      const startX = initialCropState.x;
      const startY = initialCropState.y;
      const startSize = initialCropState.size;
      const endX = startX + startSize;
      const endY = startY + startSize;
      
      // 핸들 위치에 따라 크기와 위치 계산
      switch (resizeHandle) {
        case 'nw': // 왼쪽 위
          newSize = Math.max(endX - touchX, endY - touchY);
          newX = endX - newSize;
          newY = endY - newSize;
          break;
        case 'ne': // 오른쪽 위
          newSize = Math.max(touchX - startX, endY - touchY);
          newX = startX;
          newY = endY - newSize;
          break;
        case 'sw': // 왼쪽 아래
          newSize = Math.max(endX - touchX, touchY - startY);
          newX = endX - newSize;
          newY = startY;
          break;
        case 'se': // 오른쪽 아래
          newSize = Math.max(touchX - startX, touchY - startY);
          newX = startX;
          newY = startY;
          break;
      }
      
      // 최소/최대 크기 제한
      const minSize = 50;
      const maxSize = Math.min(displayArea.displayWidth, displayArea.displayHeight);
      newSize = Math.max(minSize, Math.min(newSize, maxSize));
      
      // 크기 조정에 따른 위치 재계산
      switch (resizeHandle) {
        case 'nw':
          newX = endX - newSize;
          newY = endY - newSize;
          break;
        case 'ne':
          newX = startX;
          newY = endY - newSize;
          break;
        case 'sw':
          newX = endX - newSize;
          newY = startY;
          break;
        case 'se':
          newX = startX;
          newY = startY;
          break;
      }
      
      // 이미지 표시 영역 내에서만 가능하도록 경계 체크
      const minX = displayArea.displayX;
      const minY = displayArea.displayY;
      const maxX = displayArea.displayX + displayArea.displayWidth - newSize;
      const maxY = displayArea.displayY + displayArea.displayHeight - newSize;
      
      // 경계를 벗어나면 위치 조정
      if (newX < minX) {
        newX = minX;
        if (resizeHandle === 'nw' || resizeHandle === 'sw') {
          newSize = endX - newX;
        }
      }
      if (newY < minY) {
        newY = minY;
        if (resizeHandle === 'nw' || resizeHandle === 'ne') {
          newSize = endY - newY;
        }
      }
      if (newX + newSize > displayArea.displayX + displayArea.displayWidth) {
        newSize = displayArea.displayX + displayArea.displayWidth - newX;
      }
      if (newY + newSize > displayArea.displayY + displayArea.displayHeight) {
        newSize = displayArea.displayY + displayArea.displayHeight - newY;
      }
      
      // 최소 크기 재확인
      if (newSize < minSize) {
        newSize = minSize;
        switch (resizeHandle) {
          case 'nw':
            newX = endX - minSize;
            newY = endY - minSize;
            break;
          case 'ne':
            newX = startX;
            newY = endY - minSize;
            break;
          case 'sw':
            newX = endX - minSize;
            newY = startY;
            break;
          case 'se':
            newX = startX;
            newY = startY;
            break;
        }
      }
      
      setCropSize(newSize);
      setCropPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    } else if (isDragging && cropAreaRef.current) {
      // 이동 모드 (터치)
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = touch.clientX - containerRect.left - dragStart.x;
      const newY = touch.clientY - containerRect.top - dragStart.y;
      
      const minX = displayArea.displayX;
      const minY = displayArea.displayY;
      const maxX = displayArea.displayX + displayArea.displayWidth - cropSize;
      const maxY = displayArea.displayY + displayArea.displayHeight - cropSize;
      
      setCropPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
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
            드래그하여 이동하거나 모서리를 드래그하여 크기를 조정하세요 (1:1 비율)
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
                {/* 크롭 영역 핸들 - 크기 조정용 */}
                <div 
                  data-handle="nw"
                  className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full border-2 border-purple-500 cursor-nwse-resize hover:bg-purple-100 transition-colors"
                  style={{ touchAction: 'none' }}
                />
                <div 
                  data-handle="ne"
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full border-2 border-purple-500 cursor-nesw-resize hover:bg-purple-100 transition-colors"
                  style={{ touchAction: 'none' }}
                />
                <div 
                  data-handle="sw"
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-white rounded-full border-2 border-purple-500 cursor-nesw-resize hover:bg-purple-100 transition-colors"
                  style={{ touchAction: 'none' }}
                />
                <div 
                  data-handle="se"
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white rounded-full border-2 border-purple-500 cursor-nwse-resize hover:bg-purple-100 transition-colors"
                  style={{ touchAction: 'none' }}
                />
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

