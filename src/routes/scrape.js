const express = require('express');
const { scrapeImages } = require('../utils/puppeteer');

const router = express.Router();

router.post('/scrape-images', async (req, res) => {
  const { url } = req.body;

  // 输入验证
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: '请输入有效的 URL' });
  }

  try {
    const images = await scrapeImages(url);
    res.json({ success: true, images });
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ error: '获取图片失败', details: error.message });
  }
});

module.exports = router;