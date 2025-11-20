/**
 * 이미지 리사이징 및 최적화 유틸리티
 * WebP 포맷 우선 사용, 미지원 시 JPEG fallback
 */

export interface ImageResizeOptions {
  maxSize?: number; // 최대 크기 (픽셀, 기본값: 300)
  quality?: number; // 품질 (0-1, 기본값: 0.85)
  format?: 'webp' | 'jpeg'; // 포맷 (기본값: 'webp')
}

/**
 * 이미지 파일을 리사이즈하고 최적화된 Data URL로 변환
 * @param file 이미지 파일
 * @param options 리사이징 옵션
 * @returns 최적화된 이미지의 Data URL
 */
export const resizeImage = (
  file: File,
  options: ImageResizeOptions = {}
): Promise<string> => {
  const {
    maxSize = 300,
    quality = 0.85,
    format = 'webp',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 정사각형으로 크롭 (중앙 기준)
          const minDimension = Math.min(width, height);
          const cropX = (width - minDimension) / 2;
          const cropY = (height - minDimension) / 2;
          
          // 최대 크기로 리사이즈
          let targetSize = minDimension;
          if (targetSize > maxSize) {
            targetSize = maxSize;
          }
          
          canvas.width = targetSize;
          canvas.height = targetSize;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context를 가져올 수 없습니다.'));
            return;
          }
          
          // 고품질 리사이징을 위한 설정
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // 중앙 크롭 및 리사이즈
          ctx.drawImage(
            img,
            cropX, cropY, minDimension, minDimension, // 소스 영역 (중앙 크롭)
            0, 0, targetSize, targetSize // 대상 영역
          );
          
          // WebP 지원 여부 확인 및 변환 시도
          const tryConvertToWebP = (): void => {
            if (format === 'webp' && canvas.toBlob) {
              // WebP 변환 시도
              canvas.toBlob(
                (blob) => {
                  if (blob && blob.type === 'image/webp') {
                    // WebP 변환 성공
                    const blobReader = new FileReader();
                    blobReader.onloadend = () => {
                      resolve(blobReader.result as string);
                    };
                    blobReader.onerror = () => {
                      reject(new Error('이미지 변환 중 오류가 발생했습니다.'));
                    };
                    blobReader.readAsDataURL(blob);
                  } else {
                    // WebP 변환 실패 시 JPEG로 fallback
                    convertToJPEG();
                  }
                },
                'image/webp',
                quality
              );
            } else {
              // WebP를 요청하지 않았거나 지원하지 않으면 JPEG로 변환
              convertToJPEG();
            }
          };
          
          // JPEG로 변환
          const convertToJPEG = (): void => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('이미지 변환에 실패했습니다.'));
                  return;
                }
                
                // Blob을 Data URL로 변환
                const blobReader = new FileReader();
                blobReader.onloadend = () => {
                  resolve(blobReader.result as string);
                };
                blobReader.onerror = () => {
                  reject(new Error('이미지 변환 중 오류가 발생했습니다.'));
                };
                blobReader.readAsDataURL(blob);
              },
              'image/jpeg',
              quality
            );
          };
          
          // WebP 변환 시도 (실패 시 자동으로 JPEG로 fallback)
          tryConvertToWebP();
        } catch (error) {
          reject(error instanceof Error ? error : new Error('이미지 처리 중 오류가 발생했습니다.'));
        }
      };
      
      img.onerror = () => {
        reject(new Error('이미지를 로드할 수 없습니다.'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * 이미지 파일 유효성 검사
 * @param file 파일 객체
 * @param maxFileSize 최대 파일 크기 (바이트, 기본값: 5MB)
 * @returns 유효성 검사 결과
 */
export const validateImageFile = (
  file: File,
  maxFileSize: number = 5 * 1024 * 1024 // 5MB
): { valid: boolean; error?: string } => {
  // 파일 타입 확인
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: '이미지 파일만 업로드할 수 있습니다.' };
  }
  
  // 파일 크기 확인
  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: `파일 크기는 ${Math.round(maxFileSize / 1024 / 1024)}MB 이하여야 합니다.`,
    };
  }
  
  return { valid: true };
};

