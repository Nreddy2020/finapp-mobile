const puppeteer = require('puppeteer');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function testAllMoneyFlowV2() {
    console.log('🚀 Running Complete E2E GUI Verification for Money Flow Decision Assistant V2...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Step 1: Load Money Flow Tab
    console.log('[Step 1] Loading Money Flow tab...');
    await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Capture Top: Period selector, Balance sheet vs Period Cash Flow, Emergency Reserve
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_period_and_balance_sheet.png') });
    console.log('📸 01_period_and_balance_sheet.png captured');

    // Step 2: Open "See Calculation Math" Modal
    console.log('[Step 2] Opening Emergency Runway Math Modal...');
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('See Calculation Math'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_modal_runway_math.png') });
    console.log('📸 02_modal_runway_math.png captured');

    // Close Math Modal
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.trim() === 'Understood');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Step 3: Open "Designate Accounts" Modal
    console.log('[Step 3] Opening Account Designation Modal...');
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('Designate Accounts'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_modal_designate_accounts.png') });
    console.log('📸 03_modal_designate_accounts.png captured');

    // Close Designation Modal
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.trim() === 'Save Designation');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Step 4: Open Authoritative What-If Simulation Modal
    console.log('[Step 4] Opening Authoritative What-If Modal...');
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('See Authoritative What-If'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_modal_authoritative_what_if.png') });
    console.log('📸 04_modal_authoritative_what_if.png captured');

    // Close What-If Modal
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.trim() === 'Got It');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Step 5: Switch to "By Merchant" Tab in Where Is My Money
    console.log('[Step 5] Switching to By Merchant Tab...');
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.trim() === 'By Merchant');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Scroll slightly to view Where Is My Money
    await page.evaluate(() => {
        const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
            const style = window.getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        if (scrollables.length > 0) scrollables[0].scrollTop = 480;
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_where_is_my_money_merchant.png') });
    console.log('📸 05_where_is_my_money_merchant.png captured');

    // Step 6: Switch to "By Account" Tab
    console.log('[Step 6] Switching to By Account Tab...');
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.trim() === 'By Account');
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_where_is_my_money_account.png') });
    console.log('📸 06_where_is_my_money_account.png captured');

    // Step 7: Open Advanced Quick Logger & Transfer
    console.log('[Step 7] Opening Advanced Quick Logger (Transfer)...');
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('Log Expense / Income / Transfer'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    // Click Transfer tab in logger
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const transferBtn = els.find(e => e.innerText && e.innerText.trim() === 'Transfer');
        if (transferBtn) transferBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_modal_transfer_logger.png') });
    console.log('📸 07_modal_transfer_logger.png captured');

    // Close Logger Modal
    await page.evaluate(() => {
        const closeBtns = Array.from(document.querySelectorAll('div, button')).filter(e => e.innerText && e.innerText.trim() === '✕');
        if (closeBtns.length > 0) closeBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Step 8: Scroll to bottom for Upcoming Obligations and Grouped Feed
    console.log('[Step 8] Capturing Upcoming Obligations and Scalable Feed...');
    await page.evaluate(() => {
        const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
            const style = window.getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        if (scrollables.length > 0) scrollables[0].scrollTop = 1200;
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_upcoming_and_grouped_feed.png') });
    console.log('📸 08_upcoming_and_grouped_feed.png captured');

    // Step 9: Open 6-Month Cash Flow Trend Modal
    console.log('[Step 9] Opening 6-Month Cash Flow Trend...');
    await page.evaluate(() => {
        const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
            const style = window.getComputedStyle(el);
            return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        });
        if (scrollables.length > 0) scrollables[0].scrollTop = 0;
    });
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        const btn = els.find(e => e.innerText && e.innerText.includes('6M Trend'));
        if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_modal_cash_flow_trend.png') });
    console.log('📸 09_modal_cash_flow_trend.png captured');

    console.log('🎉 All 9 V2 GUI Verification screens captured successfully!');
    await browser.close();
}

testAllMoneyFlowV2().catch(console.error);
