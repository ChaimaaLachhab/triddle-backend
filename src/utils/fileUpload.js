const cloudinary = require('../config/cloudinary');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../config/logger');

/**
 * Upload a file to Cloudinary
 * @param {Buffer|String} file - The file to upload (buffer or local path)
 * @param {String} folder - The folder to upload to
 * @param {Object} options - Additional options for the upload
 * @returns {Promise<Object>} - The upload result
 */
const uploadToCloudinary = async (file, folder = 'uploads', options = {}) => {
  try {
    const uploadOptions = {
      folder,
      resource_type: 'auto',
      public_id: `${uuidv4()}`,
      ...options
    };

    // If file is already a path, use it directly
    if (typeof file === 'string') {
      const result = await cloudinary.uploader.upload(file, uploadOptions);
      return result;
    }
    
    // Create a temporary file
    const tempFilePath = path.join(config.fileUploadPath, `temp_${uuidv4()}`);
    
    // Ensure the directory exists
    if (!fs.existsSync(config.fileUploadPath)) {
      fs.mkdirSync(config.fileUploadPath, { recursive: true });
    }

    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, file);
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath, uploadOptions);
    
    // Delete temporary file
    fs.unlinkSync(tempFilePath);
    
    return result;
  } catch (error) {
    logger.error(`Cloudinary upload error: ${error.message}`);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete a file from Cloudinary
 * @param {String} publicId - The public ID of the file to delete
 * @returns {Promise<Object>} - The deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary
};