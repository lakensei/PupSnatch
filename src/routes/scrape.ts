import express, { Request, Response } from 'express';
import { scrapePage } from '../utils/puppeteer';

const router = express.Router();

router.post('/scrape-page', async (req: Request, res: Response) => {
  const { url, options } = req.body;

  // 输入验证
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: '请输入有效的 URL' });
  }

  try {
    const result = await scrapePage(url, options);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ 
      error: '抓取失败', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 