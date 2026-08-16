const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function testTargetedModals() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // 1. Capture Logger Modal
    await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('Add Custom Transaction'));
        if (btn) {
            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            btn.click();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_02_quick_logger.png') });

    // 2. Capture Breakdown Modal
    await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('View Full Breakdown'));
        if (btn) {
            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            btn.click();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_03_full_breakdown.png') });

    await browser.close();
}

testTargetedModals().catch(console.error);
