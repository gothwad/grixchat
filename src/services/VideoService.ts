/**
 * Service for handling video uploads using Cloudinary
 */

export const VideoService = {
  /**
   * Uploads a video to Cloudinary
   * @param file The video file to upload
   * @param onProgress Callback for upload progress
   * @returns The secure URL of the uploaded video
   */
  uploadVideo: async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary config missing, falling back to server proxy');
      return VideoService.uploadViaProxy(file);
    }

    try {
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            console.error('Cloudinary upload failed:', xhr.responseText);
            reject(new Error('Cloudinary upload failed'));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during Cloudinary upload'));
        };

        xhr.send(formData);
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return VideoService.uploadViaProxy(file);
    }
  },

  /**
   * Fallback to server proxy for video upload
   */
  uploadViaProxy: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Video upload failed');
    }

    return data.downloadUrl;
  }
};
