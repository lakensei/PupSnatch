# PupSnatch

一个基于 Node.js 和 Puppeteer 的服务，用于从网页提取内容和图片信息。

## 功能
- 通过 POST `/api/scrape-page` API 提取网页内容。
- 支持动态加载内容（AJAX、懒加载）。
- 包含反爬绕过、请求限流和错误处理。


### 本地开发与测试

#### 运行项目
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

#### powershell测试
```
Invoke-WebRequest -Uri http://localhost:3000/api/scrape-page `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"url":"https://baijiahao.baidu.com/s?id=1829346076071945435"}'
```
