import express, { Request, Response, NextFunction } from 'express';
import config from '../config/config';
import rateLimit from './middleware/rateLimit';
import scrapeRoutes from './routes/scrape';
import path from 'path';

const app = express();

// 中间件
app.use(express.json());
app.use(rateLimit);

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API 路由
app.use('/api', scrapeRoutes);

// 根路由 - 返回测试页面
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: '路由不存在' });
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误', 
    details: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
  });
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`服务器运行在 http://localhost:${config.port} (环境: ${config.env})`);
}); 