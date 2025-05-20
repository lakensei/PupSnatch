# Web Image Scraper

一个基于 Node.js 和 Puppeteer 的服务，用于从网页提取图片信息。

## 功能
- 通过 POST `/api/scrape-images` API 提取网页图片（`src`、`alt`、`title`）。
- 支持动态加载内容（AJAX、懒加载）。
- 包含反爬绕过、请求限流和错误处理。


### 本地开发与测试

#### 1. 创建项目
```bash
mkdir web-image-scraper
cd web-image-scraper
npm init -y


npm install express dotenv express-rate-limit puppeteer-extra puppeteer-extra-plugin-stealth
npm install --save-dev nodemon



Invoke-WebRequest -Uri http://localhost:4000/api/scrape-images `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"url":"https://baijiahao.baidu.com/s?id=1829346076071945435"}'



npm install -g pm2
pm2 start ecosystem.config.js