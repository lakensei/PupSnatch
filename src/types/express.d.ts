import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

declare global {
  namespace Express {
    interface Request extends ExpressRequest {
      // 可以在这里添加自定义的请求属性
    }
    interface Response extends ExpressResponse {
      // 可以在这里添加自定义的响应属性
    }
  }
} 