export interface Config {
  port: number;
  env: string;
  puppeteer: {
    timeout: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  // 添加其他配置项...
}

const config: Config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 4000,
  env: process.env.NODE_ENV || 'development',
  puppeteer: {
    timeout: 30000, // 30 seconds
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 限制每个IP 15分钟内最多100个请求
  },
  // 添加其他配置项...
};

export default config; 