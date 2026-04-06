/**
 * ImgBB API utility for uploading images
 * Free tier: up to 32MB per image
 */

const IMGBB_API_KEY = '8788ca5e1bb2b8d4118113102d4c21d0'; // Получи на https://api.imgbb.com/

interface ImgBBResponse {
  data: {
    url: string;
    display_url: string;
    delete_url: string;
    thumb: {
      url: string;
    };
  };
  success: boolean;
  status: number;
}

export async function uploadImageToImgBB(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Check if API key is set
  if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
    throw new Error('ImgBB API key не установлен. Получи ключ на https://api.imgbb.com/');
  }

  // Validate file size (max 32MB for ImgBB free tier)
  const maxSize = 32 * 1024 * 1024; // 32MB
  if (file.size > maxSize) {
    throw new Error('Размер файла превышает 32MB');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Только изображения разрешены для загрузки');
  }

  try {
    // Create FormData
    const formData = new FormData();
    formData.append('image', file);

    // Upload with progress tracking
    const xhr = new XMLHttpRequest();

    const uploadPromise = new Promise<string>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response: ImgBBResponse = JSON.parse(xhr.responseText);
            if (response.success && response.data.url) {
              resolve(response.data.url);
            } else {
              reject(new Error('Не удалось загрузить изображение'));
            }
          } catch (error) {
            reject(new Error('Ошибка при обработке ответа'));
          }
        } else {
          reject(new Error(`Ошибка загрузки: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Ошибка сети при загрузке'));
      });

      xhr.open('POST', `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`);
      xhr.send(formData);
    });

    return await uploadPromise;
  } catch (error) {
    console.error('Error uploading to ImgBB:', error);
    throw error;
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImagesToImgBB(
  files: File[],
  onProgress?: (current: number, total: number, progress: number) => void
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const url = await uploadImageToImgBB(files[i], (progress) => {
      if (onProgress) {
        onProgress(i + 1, files.length, progress);
      }
    });
    urls.push(url);
  }

  return urls;
}
