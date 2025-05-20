const cloudinary = require('cloudinary').v2;
const config = require('./index');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

module.exports = cloudinary;