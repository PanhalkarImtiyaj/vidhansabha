import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} folder - Storage folder (e.g., 'banners', 'majhyaBaddal', 'batmya')
 * @param {string} fileName - Optional custom filename
 * @returns {Promise<{url: string, path: string}>} - Download URL and storage path
 */
export const uploadImageToStorage = async (file, folder, fileName = null) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('कोणतीही फाइल निवडली गेली नाही');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      throw new Error('कृपया फक्त प्रतिमा फाइल निवडा (JPG, PNG, GIF, WebP)');
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('फाइल साइझ 5MB पेक्षा कमी असावा');
    }

    // Generate unique filename if not provided
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFileName = fileName || `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    
    // Create storage path
    const storagePath = `${folder}/${finalFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    console.log(`Uploading file to: ${storagePath}`);
    const uploadResult = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    console.log(`Upload successful. URL: ${downloadURL}`);
    
    return {
      url: downloadURL,
      path: storagePath,
      fileName: finalFileName,
      originalName: file.name,
      uploadMethod: 'storage',
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Handle specific Firebase Storage errors
    if (error.code === 'storage/unauthorized') {
      throw new Error('फाइल अपलोड करण्याची परवानगी नाही');
    } else if (error.code === 'storage/canceled') {
      throw new Error('फाइल अपलोड रद्द केले गेले');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('स्टोरेज कोटा संपला आहे');
    } else if (error.code === 'storage/invalid-format') {
      throw new Error('अवैध फाइल फॉर्मेट');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('अपलोड करताना नेटवर्क समस्या आली');
    }
    
    throw error;
  }
};

/**
 * Delete file from Firebase Storage
 * @param {string} filePath - Path to the file in storage
 * @returns {Promise<void>}
 */
export const deleteImageFromStorage = async (filePath) => {
  if (!filePath) {
    console.warn('No file path provided for deletion');
    return;
  }
  
  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log('File deleted successfully from Storage:', filePath);
  } catch (error) {
    console.error('Error deleting file from Storage:', error);
    // Don't throw error as this is cleanup operation
  }
};

// Delete PDF from Firebase Storage (alias for consistency)
export const deletePDFFromStorage = deleteImageFromStorage;

/**
 * Convert file to base64 (fallback method)
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('कोणतीही फाइल निवडली गेली नाही'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

/**
 * Upload image with fallback to base64
 * @param {File} file - Image file to upload
 * @param {string} folder - Storage folder
 * @returns {Promise<{url: string, path: string, method: string}>}
 */
export const uploadImageWithFallback = async (file, folder) => {
  try {
    // First try Firebase Storage
    return await uploadImageToStorage(file, folder);
  } catch (error) {
    console.warn('Firebase Storage failed, falling back to base64:', error);
    
    // Fallback to base64
    const base64Data = await convertToBase64(file);
    return {
      url: base64Data,
      originalName: file.name,
      path: null, // No storage path for base64
      uploadMethod: 'base64',
      size: file.size,
      type: file.type
    };
  }
};

/**
 * Upload PDF to Firebase Storage
 * @param {File} file - PDF file to upload
 * @param {string} folder - Storage folder
 * @returns {Promise<{url: string, path: string, method: string}>}
 */
export const uploadPDFToStorage = async (file, folder) => {
  try {
    validatePDFFile(file); // No size limit for PDFs
    
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    console.log('Uploading PDF to Firebase Storage:', fileName);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('PDF uploaded successfully to Storage');
    
    return {
      url: downloadURL,
      originalName: file.name,
      path: snapshot.ref.fullPath,
      uploadMethod: 'storage',
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading PDF to Storage:', error);
    throw error;
  }
};

/**
 * Upload PDF with fallback to base64
 * @param {File} file - PDF file to upload
 * @param {string} folder - Storage folder
 * @returns {Promise<{url: string, path: string, method: string}>}
 */
export const uploadPDFWithFallback = async (file, folder) => {
  try {
    // First try Firebase Storage
    return await uploadPDFToStorage(file, folder);
  } catch (error) {
    console.warn('Firebase Storage failed for PDF, falling back to base64:', error);
    
    // Fallback to base64
    const base64Data = await convertToBase64(file);
    return {
      url: base64Data,
      originalName: file.name,
      path: null, // No storage path for base64
      uploadMethod: 'base64',
      size: file.size,
      type: file.type
    };
  }
};

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB (default: 5)
 * @returns {boolean} - True if valid
 */
export const validateImageFile = (file, maxSizeMB = 5) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('कृपया फक्त JPG, PNG, GIF किंवा WebP फॉर्मेटची फाइल निवडा!');
  }
  
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`फाइल साइझ ${maxSizeMB}MB पेक्षा कमी असावा!`);
  }
  
  return true;
};

/**
 * Validate PDF file type (no size limit)
 * @param {File} file - PDF file to validate
 * @returns {boolean} - True if valid
 */
export const validatePDFFile = (file) => {
  if (file.type !== 'application/pdf') {
    throw new Error('कृपया फक्त PDF फाइल निवडा!');
  }
  
  // No size limit - allow any PDF size
  return true;
};

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  uploadImageToStorage,
  deleteImageFromStorage,
  convertToBase64,
  uploadImageWithFallback,
  validateImageFile,
  formatFileSize
};
