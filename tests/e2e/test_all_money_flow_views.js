const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function testAllViews() {
    console.log('🚀 Running Complete E2E GUI Verification for World-Class Money Flow...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Step 1: Initial Page Load
    console.log('[Step 1] Loading Money Flow tab...');
    await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Capture top half
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_money_flow_top.png') });
    console.log('📸 Captured: 01_money_flow_top.png');

    // Step 2: Scroll down to view Where Is My Money, Quick Logger, and Smart Feed
    console.log('[Step 2] Scrolling down to view lower sections...');
    await page.evaluate(() => window.scrollBy(0, 700));
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_money_flow_middle.png') });
    console.log('📸 Captured: 02_money_flow_middle.png');

    await page.evaluate(() => window.scrollBy(0, 700));
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_money_flow_bottom.png') });
    console.log('📸 Captured: 03_money_flow_bottom.png');

    // Step 3: Scroll back to top and click "See Impact"
    console.log('[Step 3] Scrolling to top and opening What-If Simulation Modal...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const target = elements.find(el => el.innerText && el.innerText.trim().startsWith('See Impact'));
        if (target) {
            target.click();
            target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_modal_what_if_simulation.png') });
    console.log('📸 Captured: 04_modal_what_if_simulation.png');

    // Close What-If Modal by clicking Got It
    await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const target = elements.find(el => el.innerText && el.innerText.trim() === 'Got It');
        if (target) {
            target.click();
            target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Step 4: Open Add Custom Transaction Modal
    console.log('[Step 4] Opening Add Custom Transaction Modal...');
    await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const target = elements.find(el => el.innerText && el.innerText.includes('Add Custom Transaction'));
        if (target) {
            target.click();
            target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_modal_add_transaction.png') });
    console.log('📸 Captured: 05_modal_add_transaction.png');

    console.log('🎉 All E2E GUI captures completed successfully!');
    await browser.close();
}

testAllViews().catch(console.error);
