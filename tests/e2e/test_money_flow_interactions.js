const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function testInteractions() {
    console.log('🚀 Running E2E User Interaction Tests for Money Flow Assistant...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('[1] Loading Money Flow screen...');
    await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // 1. Capture Full Page Scrolling
    console.log('[2] Capturing Full Money Flow page...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'money_flow_full_page.png'), fullPage: true });

    // 2. Click "See Impact ↗"
    console.log('[3] Clicking "See Impact ↗" button to test What-If Simulation Modal...');
    const seeImpactBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('div, span, p, button'));
        return btns.find(b => b.innerText && b.innerText.includes('See Impact'));
    });

    if (seeImpactBtn) {
        await seeImpactBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_what_if_impact.png') });
        console.log('📸 What-If Modal captured!');

        // Close modal
        const gotItBtn = await page.evaluateHandle(() => {
            const btns = Array.from(document.querySelectorAll('div, span, p, button'));
            return btns.find(b => b.innerText && b.innerText.trim() === 'Got It');
        });
        if (gotItBtn) {
            await gotItBtn.click();
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    // 3. Click "+ Add Custom Transaction"
    console.log('[4] Clicking "+ Add Custom Transaction" to test Quick Logger Modal...');
    const addTxBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('div, span, p, button'));
        return btns.find(b => b.innerText && b.innerText.includes('+ Add Custom Transaction'));
    });

    if (addTxBtn) {
        await addTxBtn.click();
        await new Promise(r => setTimeout(r, 1500));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_quick_logger.png') });
        console.log('📸 Quick Logger Modal captured!');
    }

    console.log('✅ Interaction test sequence completed successfully!');
    await browser.close();
}

testInteractions().catch(console.error);
