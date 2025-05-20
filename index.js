const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

// 中间件：解析 JSON 请求体
app.use(express.json());

// API 端点：获取网页图片
app.post('/scrape-images', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: '请输入有效的 URL' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const images = await page.evaluate(() => {
      const imgElements = document.querySelectorAll('img');
      return Array.from(imgElements).map(img => ({
        src: img.src || img.getAttribute('data-src') || '',
        alt: img.alt || '',
        title: img.title || '',
      }));
    });

    await browser.close();

    res.json({ success: true, images });
  } catch (error) {
    console.error('错误：', error);
    res.status(500).json({ error: '获取图片失败', details: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});