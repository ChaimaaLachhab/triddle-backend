const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CloudinaryUtils {
  static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  static ALLOWED_FILE_TYPES = /^.*\.(jpg|jpeg|png|gif|bmp|tif|webp|svg|mp4|avi|mov|mkv|webm|pdf|doc|docx|xls|xlsx|ppt|pptx)$/i;
  
  /**
   * Validates file before upload
   * @param {Object} file - The file to validate
   * @throws {Error} If file validation fails
   */
  static validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`Max file size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    const fileName = file.originalname || file.name;
    if (!this.ALLOWED_FILE_TYPES.test(fileName)) {
      throw new Error('Invalid file type');
    }
  }
  
  /**
   * Generates a unique filename
   * @param {String} originalName - Original filename
   * @returns {String} The unique filename
   */
  static generateUniqueFileName(originalName) {
    const timestamp = new Date().toISOString()
      .replace(/[-:T]/g, '')
      .replace(/\.\d+Z$/, '');
    
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    return `${baseName}_${timestamp}${extension}`;
  }
  
  /**
   * Uploads a file to Cloudinary using buffer stream
   * @param {Object} file - File object with buffer data
   * @param {String} folder - Cloudinary folder path
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Object>} Upload result with URL and public ID
   */
  static async uploadFile(file, folder = 'uploads', options = {}) {
    try {
      this.validateFile(file);
      
      // Handle different file formats from various middleware
      const fileBuffer = file.buffer || file.data;
      const fileName = file.originalname || file.name;
      
      // Generate a unique name for the file
      const uniqueFileName = this.generateUniqueFileName(fileName);
      
      // Create the public ID including folder path
      const publicId = `${folder}/${path.basename(uniqueFileName, path.extname(uniqueFileName))}`;
      
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          public_id: publicId,
          resource_type: 'auto',
          ...options
        };
        
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(new Error(`Failed to upload file to Cloudinary: ${error.message}`));
            }
            
            if (!result.secure_url || !result.public_id) {
              return reject(new Error('Cloudinary upload did not return expected results'));
            }
            
            resolve({
              publicId: result.public_id,
              url: result.secure_url,
              format: result.format,
              resourceType: result.resource_type,
              width: result.width,
              height: result.height,
              bytes: result.bytes
            });
          }
        );
        
        // Stream the buffer to Cloudinary
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }
  
  /**
   * Uploads multiple files to Cloudinary
   * @param {Array} files - Array of file objects
   * @param {String} folder - Cloudinary folder path
   * @param {Object} options - Additional Cloudinary options
   * @returns {Promise<Array>} Array of upload results
   */
  static async uploadMultipleFiles(files, folder = 'uploads', options = {}) {
    const uploadPromises = files.map(file => this.uploadFile(file, folder, options));
    return Promise.all(uploadPromises);
  }
  
  /**
   * Deletes a file from Cloudinary by public ID
   * @param {String} publicId - Cloudinary public ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result !== 'ok') {
        throw new Error(`Cloudinary deletion failed: ${result.result}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
  
  /**
   * Deletes multiple files from Cloudinary
   * @param {Array} publicIds - Array of Cloudinary public IDs
   * @returns {Promise<Array>} Array of deletion results
   */
  static async deleteMultipleFiles(publicIds) {
    const deletePromises = publicIds.map(publicId => this.deleteFile(publicId));
    return Promise.all(deletePromises);
  }
}

module.exports = CloudinaryUtils;