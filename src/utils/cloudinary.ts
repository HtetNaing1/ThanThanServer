import cloudinary from '../config/cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

/**
 * Upload an image to Cloudinary
 * @param filePath - Path to the file or base64 string
 * @param folder - Folder name in Cloudinary
 * @returns Upload result with URL and public ID
 */
export const uploadImage = async (
  filePath: string,
  folder: string = 'thanthanjewellery'
): Promise<UploadResult> => {
  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    const cloudinaryError = error as UploadApiErrorResponse;
    return {
      success: false,
      error: cloudinaryError.message || 'Failed to upload image',
    };
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param filePaths - Array of file paths or base64 strings
 * @param folder - Folder name in Cloudinary
 * @returns Array of upload results
 */
export const uploadMultipleImages = async (
  filePaths: string[],
  folder: string = 'thanthanjewellery'
): Promise<UploadResult[]> => {
  const uploadPromises = filePaths.map((filePath) => uploadImage(filePath, folder));
  return Promise.all(uploadPromises);
};

/**
 * Delete an image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Delete result
 */
export const deleteImage = async (publicId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    const cloudinaryError = error as UploadApiErrorResponse;
    return {
      success: false,
      error: cloudinaryError.message || 'Failed to delete image',
    };
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of public IDs to delete
 * @returns Delete results
 */
export const deleteMultipleImages = async (
  publicIds: string[]
): Promise<{ success: boolean; error?: string }[]> => {
  const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
  return Promise.all(deletePromises);
};

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID
 */
export const getPublicIdFromUrl = (url: string): string | null => {
  try {
    // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.ext
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Get everything after 'upload' and version number, remove extension
    const pathAfterUpload = parts.slice(uploadIndex + 2).join('/');
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
    return publicId;
  } catch {
    return null;
  }
};
