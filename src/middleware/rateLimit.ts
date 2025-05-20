import rateLimit from 'express-rate-limit';
import config from '../../config/config';

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: '请求过于频繁，请稍后再试',
  },
});

export default limiter; 