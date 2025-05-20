require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '1d',
  jwtCookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE) || 1,
  
  // File upload configuration
  fileUploadPath: process.env.FILE_UPLOAD_PATH || './public/uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  
  // Cloudinary configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },
  
  // Allowed origins for CORS
  corsOrigins: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['https://triddle-form-builder.vercel.app', 'https://triddle-form-builder-c1zs7ohcp-chaimaalachhabs-projects.vercel.app', 'http://localhost:3000', 'http://localhost:5173']
};