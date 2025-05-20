require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  puppeteer: {
    timeout: parseInt(process.env.PUPPETEER_TIMEOUT, 10) || 30000,
  },
  rateLimit: {
    windowMs: parseInt(process.env.REQUEST_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.MAX_REQUESTS_PER_WINDOW, 10) || 100,
  },
};