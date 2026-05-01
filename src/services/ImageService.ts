/**
 * ImageService handles image uploads to ImgBB.
 * This is used as an alternative to Firebase Storage.
 */

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export class ImageService {
  /**
   * Uploads an image file to ImgBB and returns the direct display URL.
   * @param file The image file to upload.
   * @param onProgress Callback for upload progress (simulated as ImgBB doesn't provide native progress for fetch).
   * @returns The direct URL of the uploaded image.
   */
  static async uploadImage(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!IMGBB_API_KEY) {
      console.warn("ImgBB API Key missing, falling back to server proxy");
      return this.uploadViaProxy(file, onProgress);
    }

    // Simulate progress since fetch doesn't provide it easily for small uploads
    if (onProgress) {
      onProgress(10);
      setTimeout(() => onProgress(40), 200);
      setTimeout(() => onProgress(70), 500);
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to upload image to ImgBB");
      }

      const data = await response.json();
      
      if (!data.data?.url) {
        throw new Error("ImgBB upload successful but no URL returned");
      }

      if (onProgress) onProgress(100);
      
      // Return the direct display URL
      return data.data.url;
    } catch (error) {
      console.error("ImgBB Upload Error:", error);
      throw error;
    }
  }

  /**
   * Fallback to server proxy for image upload
   */
  static async uploadViaProxy(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) onProgress(30);
    
    const response = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Image upload failed');
    }

    if (onProgress) onProgress(100);
    return data.downloadUrl;
  }

  /**
   * Converts a base64 string or data URL to a File object.
   */
  static dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
