import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import config from '../../config/config';

puppeteer.use(StealthPlugin());

// 定义要移除的元素选择器常量
const ELEMENTS_TO_REMOVE_SELECTOR = `
  script, style, 
  nav, header, footer, 
  [class*="menu"], [class*="nav"], 
  [class*="header"], [class*="footer"], 
  [class*="foot"], [class*="sidebar"], 
  [class*="ad"], [class*="banner"], [class*="share"],
  [class*="follow"], [class*="comment"],
  [id*="menu"], [id*="nav"],
  [id*="header"], [id*="footer"],
  [id*="foot"], [id*="sidebar"],
  [id*="ad"], [id*="banner"], [id*="share"],
  [id*="follow"], [id*="comment"]
`;

interface ScrapeOptions {
  getText?: boolean;
  getHtml?: boolean;
  getImages?: boolean;
  detectMenu?: boolean;
}

interface ImageInfo {
  src: string;
  alt: string;
  title: string;
}

interface MenuItem {
  text: string;
  href: string;
  title: string;
}

interface ScrapeResult {
  pageType: 'article' | 'product' | 'list' | 'unknown';
  text?: string;
  html?: string;
  images?: ImageInfo[];
  menu?: MenuItem[] | null;
  pageStructure?: {
    header: string | null;
    navigation: string | null;
    contents: string[];
    footer: string | null;
  };
}

/**
 * 网页内容抓取函数
 * @param {string} url - 要抓取的网页URL
 * @param {ScrapeOptions} options - 抓取选项
 * @returns {Promise<ScrapeResult>} 抓取结果
 */
async function scrapePage(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
  const {
    getText = true,
    getHtml = false,
    getImages = false,
    detectMenu = false
  } = options;

  let browser: Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page: Page = await browser.newPage();

    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    );

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: config.puppeteer.timeout,
    });

    // 模拟滚动以加载懒加载内容
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
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

    const result: ScrapeResult = {
      pageType: 'unknown'
    };

    const { pageType, pageStructure } = await page.evaluate(() => {
      // 通过关键词判断区域
      const getElementSelector = (element: Element): string => {
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        return '';
      };

      // 1. 导航区域识别
      const findNavigation = () => {
        const navKeywords = ['menu', 'nav', 'navigation', 'head'];
        const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
          const cls = (el.getAttribute('class') || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          return navKeywords.some(k => cls.includes(k) || id.includes(k)) && el.querySelectorAll('a').length > 1;
        });
        // 优先返回链接多的
        candidates.sort((a, b) => b.querySelectorAll('a').length - a.querySelectorAll('a').length);
        return candidates.length ? candidates[0] : null;
      };

      // 2. 内容区域识别
      const findMainContent = () => {
        const contentKeywords = ['info', 'content', 'container', 'main', 'body', 'detail', 'article'];
        const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
          const cls = (el.getAttribute('class') || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          // 必须有较多文本
          const textLen = (el.textContent || '').replace(/\s+/g, '').length;
          return contentKeywords.some(k => cls.includes(k) || id.includes(k)) && textLen > 100;
        });
        // 去重（不包含在其他候选里的）
        const filtered = candidates.filter(el => !candidates.some(other => other !== el && other.contains(el)));
        // 按文本长度排序
        filtered.sort((a, b) => (b.textContent || '').length - (a.textContent || '').length);
        return filtered;
      };

      // 3. 头部区域
      const findHeader = () => {
        const headerKeywords = ['header', 'head', 'top'];
        const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
          const cls = (el.getAttribute('class') || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          return headerKeywords.some(k => cls.includes(k) || id.includes(k));
        });
        return candidates.length ? candidates[0] : null;
      };

      // 4. 底部区域
      const findFooter = () => {
        const footerKeywords = ['footer', 'foot', 'bottom'];
        const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
          const cls = (el.getAttribute('class') || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          return footerKeywords.some(k => cls.includes(k) || id.includes(k));
        });
        return candidates.length ? candidates[0] : null;
      };

      // 检测页面类型
      const hasArticle = document.querySelector('article') !== null;
      const hasList = document.querySelector('ul, ol') !== null;
      const hasProduct = document.querySelector('[itemtype*="Product"]') !== null;
      let pageType: 'article' | 'product' | 'list' | 'unknown' = 'unknown';
      if (hasArticle) pageType = 'article';
      else if (hasProduct) pageType = 'product';
      else if (hasList) pageType = 'list';

      // 识别各区域
      const header = findHeader();
      const navigation = findNavigation();
      const mainContents = findMainContent();
      const footer = findFooter();
      // 内容区域排除头部/导航/底部
      const filteredContents = mainContents.filter(content => {
        if (header && header.contains(content)) return false;
        if (navigation && navigation.contains(content)) return false;
        if (footer && footer.contains(content)) return false;
        return true;
      });
      return {
        pageType,
        pageStructure: {
          header: header ? getElementSelector(header) : null,
          navigation: navigation ? getElementSelector(navigation) : null,
          contents: filteredContents.map(getElementSelector).filter(Boolean),
          footer: footer ? getElementSelector(footer) : null
        }
      };
    });

    result.pageType = pageType;
    result.pageStructure = pageStructure;

    // 获取图片
    if (getImages) {
      result.images = await page.evaluate((structure) => {
        if (!structure.contents || structure.contents.length === 0) {
          return [];
        }

        // 在所有内容区域中查找图片
        const allImages = new Set<ImageInfo>();
        const uniqueUrls = new Set<string>(); // 添加URL去重集合
        
        for (const selector of structure.contents) {
          const element = document.querySelector(selector);
          if (!element) continue;

          const imgElements = element.querySelectorAll('img');
          Array.from(imgElements).forEach(img => {
            // 过滤掉小图标和装饰性图片
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;
            
            // 检查图片类名和ID
            const classNames = (img.getAttribute('class') || '').toLowerCase();
            const id = img.id.toLowerCase();
            const isDecorative = 
              classNames.includes('icon') || 
              classNames.includes('logo') || 
              classNames.includes('banner') ||
              id.includes('icon') || 
              id.includes('logo') || 
              id.includes('banner');

            if (!isDecorative && width > 100 && height > 100) {
              const imgSrc = img.src || img.getAttribute('data-src') || '';
              
              // 检查URL是否已存在，如果不存在则添加
              if (imgSrc && !uniqueUrls.has(imgSrc)) {
                uniqueUrls.add(imgSrc);
                allImages.add({
                  src: imgSrc,
                  alt: img.alt || '',
                  title: img.title || '',
                });
              }
            }
          });
        }

        return Array.from(allImages);
      }, pageStructure);
    }

    // 获取文本内容
    if (getText) {
      result.text = await page.evaluate((structure, elementsToRemoveSelector) => {
        if (!structure.contents || structure.contents.length === 0) {
          return document.body.innerText;
        }

        // 合并所有内容区域的文本
        return structure.contents
          .map(selector => {
            const element = document.querySelector(selector);
            if (!element) return '';

            // 移除不需要的元素
            const clone = element.cloneNode(true) as HTMLElement;
            const elementsToRemove = clone.querySelectorAll(elementsToRemoveSelector);
            elementsToRemove.forEach(el => el.remove());

            return clone.innerText.trim();
          })
          .filter(Boolean)
          .join('\n\n');
      }, pageStructure, ELEMENTS_TO_REMOVE_SELECTOR);
      // 清理多余的\t和换行，只保留必要的换行
      if (result.text) {
        result.text = result.text.replace(/\t+/g, '')
                                .replace(/\n{3,}/g, '\n\n')
                                .replace(/[ \u3000]+\n/g, '\n')
                                .trim();
      }
    }

    // 获取原始HTML
    if (getHtml) {
      result.html = await page.evaluate((structure, elementsToRemoveSelector) => {
        if (!structure.contents || structure.contents.length === 0) {
          return document.body.innerHTML;
        }

        // 合并所有内容区域的HTML
        return structure.contents
          .map(selector => {
            const element = document.querySelector(selector);
            if (!element) return '';

            // 移除不需要的元素
            const clone = element.cloneNode(true) as HTMLElement;
            const elementsToRemove = clone.querySelectorAll(elementsToRemoveSelector);
            elementsToRemove.forEach(el => el.remove());

            return clone.innerHTML;
          })
          .filter(Boolean)
          .join('\n');
      }, pageStructure, ELEMENTS_TO_REMOVE_SELECTOR);
    }

    // 检测菜单
    if (detectMenu) {
      result.menu = await page.evaluate((structure) => {
        // 如果已经识别到导航区域，直接使用
        if (structure.navigation) {
          const menuElement = document.querySelector(structure.navigation);
          if (menuElement) {
            const menuItems = menuElement.querySelectorAll('a');
            const uniqueUrls = new Set<string>();
            const baseUrl = window.location.origin;
            
            return Array.from(menuItems)
              .map(item => {
                const href = item.href;
                return {
                  text: item.innerText.trim(),
                  href: href,
                  title: item.title || ''
                };
              })
              .filter(item => {
                // 过滤掉空链接和纯域名链接
                if (!item.href || item.href === baseUrl || item.href === baseUrl + '/') {
                  return false;
                }
                
                // 去重
                if (uniqueUrls.has(item.href)) {
                  return false;
                }
                uniqueUrls.add(item.href);
                return true;
              });
          }
        }

        // 如果没有识别到导航区域，尝试在整个页面中查找
        const allElements = Array.from(document.querySelectorAll('*'));
        let bestMenuElement: Element | null = null;
        let maxMenuScore = 0;

        for (const element of allElements) {
          const classNames = (element.getAttribute('class') || '').toLowerCase();
          const id = element.id.toLowerCase();
          
          // 计算菜单得分
          let menuScore = 0;
          
          // 菜单相关关键词加分
          const menuKeywords = ['menu', 'nav', 'navigation', 'header-menu', 'main-menu'];
          menuKeywords.forEach(keyword => {
            if (classNames.includes(keyword) || id.includes(keyword)) {
              menuScore += 2;
            }
          });

          // 检查是否包含链接
          const hasLinks = element.querySelectorAll('a').length > 0;
          if (hasLinks) {
            menuScore += 1;
          }

          // 检查子元素数量
          const childElements = element.children.length;
          if (childElements > 2 && childElements < 20) {
            menuScore += 1;
          }

          // 检查元素位置
          const rect = element.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const isInViewport = rect.top >= 0 && rect.bottom <= viewportHeight;
          if (isInViewport) {
            menuScore += 1;
          }

          // 更新最佳菜单元素
          if (menuScore > maxMenuScore) {
            maxMenuScore = menuScore;
            bestMenuElement = element;
          }
        }

        if (bestMenuElement) {
          const menuItems = bestMenuElement.querySelectorAll('a');
          const uniqueUrls = new Set<string>();
          const baseUrl = window.location.origin;
          
          return Array.from(menuItems)
            .map(item => {
              const href = item.href;
              return {
                text: item.innerText.trim(),
                href: href,
                title: item.title || ''
              };
            })
            .filter(item => {
              // 过滤掉空链接和纯域名链接
              if (!item.href || item.href === baseUrl || item.href === baseUrl + '/') {
                return false;
              }
              
              // 去重
              if (uniqueUrls.has(item.href)) {
                return false;
              }
              uniqueUrls.add(item.href);
              return true;
            });
        }
        return null;
      }, pageStructure);
    }

    return result;
  } catch (error) {
    throw new Error(`Puppeteer 错误: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (browser) await browser.close();
  }
}

// 为了向后兼容，保留原来的函数名
const scrapeImages = (url: string): Promise<ScrapeResult> => scrapePage(url, { getImages: true });

export { scrapePage, scrapeImages };
export type { ScrapeOptions, ScrapeResult, ImageInfo, MenuItem };