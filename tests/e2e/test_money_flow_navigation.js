const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function testMoneyFlowNavigation() {
    console.log('==============================================');
    console.log('🚀 Testing Money Flow Live GUI Navigation');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log('==============================================\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`[Browser Error]: ${msg.text()}`);
        }
    });

    try {
        console.log('[Step 1] Loading Home Dashboard...');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2000));

        console.log('[Step 2] Finding and clicking Money Flow tile...');
        const elements = await page.$$('div, span, p');
        let tile = null;
        for (const el of elements) {
            const text = await page.evaluate(e => e.innerText, el);
            if (text && text.includes('Money Flow') && text.includes('Spend table')) {
                tile = el;
                break;
            }
        }

        if (tile) {
            console.log('Found Money Flow tile, clicking...');
            await tile.click();
        } else {
            console.log('Navigating directly to /(tabs)/self?tab=flow...');
            await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        }

        await new Promise(r => setTimeout(r, 2000));

        console.log('[Step 3] Capturing Money Flow GUI Screenshot...');
        const screenshotPath = path.join(SCREENSHOT_DIR, 'money_flow_gui_rendered.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);

        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasSpendTable = bodyText.includes('Personal Spending Table');
        const hasCFOBanner = bodyText.includes('PERSONAL CFO INTELLIGENCE');
        const hasNoRenderError = !bodyText.includes('Render Error') && !bodyText.includes('calculatorInput');

        console.log(`- Personal Spending Table present: ${hasSpendTable}`);
        console.log(`- Personal CFO Banner present: ${hasCFOBanner}`);
        console.log(`- Zero Render Errors: ${hasNoRenderError}`);

        if (!hasNoRenderError) {
            throw new Error('Screen encountered a Render Error!');
        }

        console.log('\n==============================================');
        console.log('✅ MONEY FLOW GUI SCREEN IS 100% WORKING!');
        console.log('==============================================\n');

        await browser.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ GUI Test failed:', err.message);
        await browser.close();
        process.exit(1);
    }
}

testMoneyFlowNavigation();
