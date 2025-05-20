const express = require('express');
const config = require('../config/config');
const rateLimit = require('./middleware/rateLimit');
const scrapeRoutes = require('./routes/scrape');

const app = express();

// 中间件
app.use(express.json());
app.use(rateLimit);

// 路由
app.use('/api', scrapeRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '路由不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', details: err.message });
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`服务器运行在 http://localhost:${config.port} (环境: ${config.env})`);
});