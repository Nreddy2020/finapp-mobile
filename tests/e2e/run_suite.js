const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const HEADLESS = process.env.HEADLESS !== 'false';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

async function runSuite() {
    console.log('==============================================');
    console.log('🚀 Starting FinLife E2E CI Test Suite');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`🖥️  Headless Mode: ${HEADLESS}`);
    console.log('==============================================\n');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: HEADLESS ? 'new' : false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=390,844'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Track console logs and errors
    const consoleLogs = [];
    const pageErrors = [];

    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        if (msg.type() === 'error') {
            console.error(`[Browser Error]: ${text}`);
        }
    });

    page.on('pageerror', err => {
        pageErrors.push(err.toString());
        console.error(`[Page Exception]: ${err.toString()}`);
    });

    try {
        console.log(`[Test 1] Navigating to ${BASE_URL}...`);
        const response = await page.goto(BASE_URL, {
            waitUntil: ['domcontentloaded', 'networkidle0'],
            timeout: 60000
        });

        console.log(`HTTP Status: ${response ? response.status() : 'N/A'}`);

        console.log('[Test 2] Verifying Application Root Element...');
        await page.waitForSelector('#root, [data-testid="root"], div', { timeout: 15000 });

        const content = await page.content();
        const hasContent = content.length > 500;
        console.log(`Page content length: ${content.length} characters`);

        if (!hasContent) {
            throw new Error('Application page content appears empty or failed to mount.');
        }

        console.log('✅ Application root loaded successfully.');

        console.log('[Test 3] Capturing Success Screenshot...');
        const successScreenshotPath = path.join(SCREENSHOT_DIR, 'app_success.png');
        await page.screenshot({ path: successScreenshotPath, fullPage: true });
        console.log(`📸 Screenshot saved: ${successScreenshotPath}`);

        console.log('\n==============================================');
        console.log('✅ ALL E2E CI TESTS PASSED SUCCESSFULLY');
        console.log('==============================================\n');

        await browser.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ E2E Test Suite Failure:', error.message);

        try {
            const failureScreenshotPath = path.join(SCREENSHOT_DIR, 'failure.png');
            await page.screenshot({ path: failureScreenshotPath, fullPage: true });
            console.error(`📸 Failure screenshot saved: ${failureScreenshotPath}`);
        } catch (e) {
            console.error('Failed to capture failure screenshot:', e.message);
        }

        await browser.close();
        process.exit(1);
    }
}

runSuite();
