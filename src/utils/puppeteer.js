const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('../../config/config');

puppeteer.use(StealthPlugin());

async function scrapeImages(url) {
  let browser;
  try {
    // 启动 Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    // 模拟移动端
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    );

    // 加载页面
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: config.puppeteer.timeout,
    });

    // 模拟滚动以加载懒加载图片
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    // 提取图片
    const images = await page.evaluate(() => {
      const imgElements = document.querySelectorAll('img');
      return Array.from(imgElements).map((img) => ({
        src: img.src || img.getAttribute('data-src') || '',
        alt: img.alt || '',
        title: img.title || '',
      }));
    });

    return images;
  } catch (error) {
    throw new Error(`Puppeteer 错误: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeImages };