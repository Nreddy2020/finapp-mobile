const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function runCapture() {
    console.log('🚀 Running Complete 5-Section and Modal GUI Visual Capture...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Step 1: Load Money Flow screen
    await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Section 1 & 2: Top View (Live Cash Flow Hero & CFO Intelligence)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_hero_and_cfo.png') });
    console.log('📸 01_hero_and_cfo.png captured');

    // Find scrollable container and scroll down
    await page.evaluate(() => {
        const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
            const style = window.getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        if (scrollables.length > 0) {
            scrollables[0].scrollTop = 450;
        } else {
            window.scrollBy(0, 450);
        }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_where_is_my_money.png') });
    console.log('📸 02_where_is_my_money.png captured');

    // Scroll further down to Quick Logger & Smart Transaction Feed
    await page.evaluate(() => {
        const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
            const style = window.getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        if (scrollables.length > 0) {
            scrollables[0].scrollTop = 1000;
        } else {
            window.scrollBy(0, 1000);
        }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_logger_and_feed.png') });
    console.log('📸 03_logger_and_feed.png captured');

    // Open Full Breakdown Modal
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('View Full Breakdown'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_modal_full_breakdown.png') });
    console.log('📸 04_modal_full_breakdown.png captured');

    // Close Breakdown Modal
    await page.evaluate(() => {
        const closeBtns = Array.from(document.querySelectorAll('div, button')).filter(e => e.innerText && e.innerText.trim() === '✕');
        if (closeBtns.length > 0) closeBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Open Add Custom Transaction Modal
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('Add Custom Transaction'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_modal_custom_transaction.png') });
    console.log('📸 05_modal_custom_transaction.png captured');

    console.log('✅ Visual verification captures complete!');
    await browser.close();
}

runCapture().catch(console.error);
