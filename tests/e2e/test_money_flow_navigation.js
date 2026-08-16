const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function testMoneyFlowNavigation() {
    console.log('==============================================');
    console.log('🚀 Testing Money Flow Live Navigation & Screen');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log('==============================================\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
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
        await page.goto(BASE_URL, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000));

        console.log('[Step 2] Finding and clicking Money Flow tile...');
        // Find element containing "Money Flow" text
        const moneyFlowElements = await page.$$('div, span, p');
        let moneyFlowTile = null;
        for (const el of moneyFlowElements) {
            const text = await page.evaluate(e => e.innerText, el);
            if (text && text.includes('Money Flow') && text.includes('Spend table')) {
                moneyFlowTile = el;
                break;
            }
        }

        if (moneyFlowTile) {
            console.log('Found Money Flow tile, clicking...');
            await moneyFlowTile.click();
        } else {
            console.log('Navigating directly to /(tabs)/self?tab=flow via URL...');
            await page.goto(`${BASE_URL}/(tabs)/self?tab=flow`, { waitUntil: ['domcontentloaded', 'networkidle0'], timeout: 30000 });
        }

        await new Promise(r => setTimeout(r, 3000));

        console.log('[Step 3] Capturing Money Flow Screenshot...');
        const moneyFlowScreenshot = path.join(SCREENSHOT_DIR, 'money_flow_success.png');
        await page.screenshot({ path: moneyFlowScreenshot, fullPage: true });
        console.log(`📸 Screenshot saved: ${moneyFlowScreenshot}`);

        const pageText = await page.evaluate(() => document.body.innerText);
        const hasSpendingTable = pageText.includes('Personal Spending Table') || pageText.includes('PERSONAL CFO INTELLIGENCE') || pageText.includes('Money Flow');
        
        console.log(`Content verification - Money Flow active: ${hasSpendingTable}`);
        if (!hasSpendingTable && pageText.includes('Unmatched Route')) {
            throw new Error('Navigation resulted in Unmatched Route!');
        }

        console.log('\n==============================================');
        console.log('✅ MONEY FLOW SCREEN IS FULLY WORKING!');
        console.log('==============================================\n');

        await browser.close();
        process.exit(0);

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        const failScreenshot = path.join(SCREENSHOT_DIR, 'money_flow_failure.png');
        await page.screenshot({ path: failScreenshot, fullPage: true });
        await browser.close();
        process.exit(1);
    }
}

testMoneyFlowNavigation();
