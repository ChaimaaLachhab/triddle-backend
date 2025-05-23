const config = require('../config');

/**
 * Generates the correct frontend URL based on the environment and request
 * 
 * @param {Object} req - Express request object
 * @param {String} path - Path to append to the base URL
 * @returns {String} Complete frontend URL
 */
exports.getFrontendUrl = (req, path = '') => {
  if (config.nodeEnv === 'production') {
    const frontendUrl = process.env.FRONTEND_URL || 
                        (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(',')[0]) || 
                        'https://triddle-form-builder.vercel.app';
    
    return `${frontendUrl}${path}`;
  }
  
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host').includes('localhost') ? 
    'localhost:3000' :
    req.get('host');
    
  return `${protocol}://${host}${path}`;
};

/**
 * Generates public form URL
 * 
 * @param {Object} req - Express request object
 * @param {String} slug - Form slug
 * @param {String} formId - Form ID
 * @returns {String} Public form URL
 */
exports.getPublicFormUrl = (req, slug, formId) => {
  return exports.getFrontendUrl(req, `/f/${slug}/${formId}`);
};