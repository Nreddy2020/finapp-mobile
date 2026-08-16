const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function capture() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('Navigating directly to Money Flow screen...');
    await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));

    const screenshotPath = path.join(SCREENSHOT_DIR, 'money_flow_screen_verified.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    const text = await page.evaluate(() => document.body.innerText);
    console.log('--- Page Content Snippet ---');
    console.log(text.substring(0, 300));
    console.log('-----------------------------');

    await browser.close();
}

capture();
