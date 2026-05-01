import FirecrawlApp from '@mendable/firecrawl-js';
import axios from 'axios';

let firecrawlInstance: FirecrawlApp | null = null;

function getFirecrawl() {
  if (!firecrawlInstance) {
    firecrawlInstance = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || 'dummy_key' });
  }
  return firecrawlInstance;
}

export async function scrapeProductData(productName: string, productUrl: string, onProgress?: (msg: string) => void): Promise<string> {
  let combinedText = '';

  // 1. Scrape Product Site using Firecrawl
  try {
    const msg = `Scraping product site via Firecrawl: ${productUrl}`;
    console.log(`[scraperService] ${msg}`);
    if (onProgress) onProgress(msg);
    
    const scrapeResult = await getFirecrawl().scrape(productUrl, {
      formats: ['markdown'],
    });

    if (scrapeResult && scrapeResult.markdown) {
      combinedText += `\n--- Content from ${productUrl} ---\n${scrapeResult.markdown.substring(0, 5000)}\n`;
      if (onProgress) onProgress(`✓ Successfully scraped product site (${scrapeResult.markdown.length} bytes)`);
    } else {
      if (onProgress) onProgress(`⚠ Product site returned no markdown content.`);
    }
  } catch (error: any) {
    const msg = `Error scraping product site ${productUrl}: ${error.message}`;
    console.error(`[scraperService] ${msg}`);
    if (onProgress) onProgress(`❌ ${msg}`);
  }

  // 2. Scrape G2 using Firecrawl Search
  try {
    const msg = `Searching G2 reviews via Firecrawl for: ${productName}`;
    console.log(`[scraperService] ${msg}`);
    if (onProgress) onProgress(msg);
    
    // Search G2 for reviews of the product
    const searchResult = await getFirecrawl().search(`site:g2.com/products/ ${productName} reviews pricing`, {
      limit: 2,
      scrapeOptions: { formats: ['markdown'] }
    });

    if (searchResult && searchResult.web && searchResult.web.length > 0) {
      combinedText += `\n--- G2 Reviews ---\n`;
      let totalG2Chars = 0;
      for (const result of searchResult.web) {
        // The type could be SearchResultWeb or Document. If it has markdown, it's a scraped Document.
        const doc = result as any;
        if (doc.markdown) {
          combinedText += `${doc.markdown.substring(0, 3000)}\n\n`;
          totalG2Chars += doc.markdown.length;
        }
      }
      if (onProgress) onProgress(`✓ Found G2 reviews (${totalG2Chars} bytes)`);
    } else {
      console.error(`[scraperService] Firecrawl G2 search returned no web data`);
      if (onProgress) onProgress(`⚠ No G2 reviews found.`);
    }
  } catch (error: any) {
    const msg = `Error searching G2: ${error.message}`;
    console.error(`[scraperService] ${msg}`);
    if (onProgress) onProgress(`❌ ${msg}`);
  }

  // 3. Scrape Reddit 
  try {
    const msg = `Searching Reddit via Firecrawl for: ${productName}`;
    console.log(`[scraperService] ${msg}`);
    if (onProgress) onProgress(msg);

    const redditSearch = await getFirecrawl().search(`site:reddit.com ${productName} saas reviews alternatives`, {
      limit: 2,
      scrapeOptions: { formats: ['markdown'] }
    });

    if (redditSearch && redditSearch.web && redditSearch.web.length > 0) {
      combinedText += `\n--- Reddit Discussions ---\n`;
      let totalRedditChars = 0;
      for (const result of redditSearch.web) {
        const doc = result as any;
        if (doc.markdown) {
          // Basic cleanup of common reddit markdown noise
          const cleanMd = doc.markdown.replace(/.*Vote.*Reply.*/g, '').substring(0, 2000);
          combinedText += `${cleanMd}\n\n`;
          totalRedditChars += cleanMd.length;
        }
      }
      if (onProgress) onProgress(`✓ Found Reddit discussions via Firecrawl (${totalRedditChars} bytes)`);
    } else {
      console.log(`[scraperService] Firecrawl Reddit search returned no web data, using fallback.`);
      if (onProgress) onProgress(`⚠ Firecrawl returned no Reddit data, falling back to direct JSON...`);
      
      const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(productName)}&limit=10`;
      const response = await axios.get(redditUrl, { headers: { 'User-Agent': 'barf-extractor-agent/1.0.0' } });
      const posts = response.data?.data?.children || [];
      let redditText = '';
      for (const post of posts) {
        redditText += `Title: ${post.data.title}\nText: ${post.data.selftext || ''}\n`;
      }
      combinedText += `\n--- Reddit Discussions (Fallback) ---\n${redditText.substring(0, 5000)}\n`;
      if (onProgress) onProgress(`✓ Fallback Reddit search successful (${redditText.length} bytes)`);
    }
  } catch (error: any) {
    const msg = `Error scraping Reddit: ${error.message}`;
    console.error(`[scraperService] ${msg}`);
    if (onProgress) onProgress(`❌ ${msg}`);
  }

  if (onProgress) onProgress(`✓ Scraping phase complete. Total collected text: ${combinedText.length} bytes.`);
  return combinedText;
}
