const rateLimit = require('express-rate-limit');
const config = require('../../config/config');

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: '请求过于频繁，请稍后再试',
  },
});

module.exports = limiter;