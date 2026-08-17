const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function debugGUI() {
    console.log('🔍 Starting comprehensive GUI diagnosis...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const routes = [
        '/',
        '/(tabs)/self',
        '/(tabs)/self?tab=flow',
        '/(tabs)/investments',
        '/(tabs)/testing'
    ];

    for (const route of routes) {
        console.log(`\n==============================================`);
        console.log(`Testing Route: http://localhost:8081${route}`);
        console.log(`==============================================`);
        const page = await browser.newPage();
        await page.setViewport({ width: 390, height: 844, isMobile: true });

        const errors = [];
        const logs = [];

        page.on('console', msg => {
            const text = msg.text();
            logs.push({ type: msg.type(), text });
            if (msg.type() === 'error' || text.toLowerCase().includes('error') || text.toLowerCase().includes('uncaught')) {
                errors.push(`[Console ${msg.type()}]: ${text}`);
            }
        });

        page.on('pageerror', err => {
            errors.push(`[PageError]: ${err.stack || err.toString()}`);
        });

        try {
            const response = await page.goto(`http://localhost:8081${route}`, {
                waitUntil: 'networkidle0',
                timeout: 15000
            });

            console.log(`HTTP Status: ${response ? response.status() : 'N/A'}`);
            await new Promise(r => setTimeout(r, 2000));

            const bodyText = await page.evaluate(() => document.body.innerText);
            console.log(`Rendered Text Preview (first 200 chars):\n${bodyText.substring(0, 200).trim() || '[EMPTY BODY]'}`);

            const filename = route.replace(/[^a-zA-Z0-9]/g, '_') || 'root';
            const screenshotPath = path.join(__dirname, 'screenshots', `debug_${filename}.png`);
            await page.screenshot({ path: screenshotPath });
            console.log(`📸 Saved screenshot: ${screenshotPath}`);

            if (errors.length > 0) {
                console.log(`⚠️ ${errors.length} Errors detected on ${route}:`);
                errors.forEach(e => console.log('  ' + e));
            } else {
                console.log(`✅ Zero errors detected on ${route}`);
            }
        } catch (err) {
            console.error(`❌ Failed to load route ${route}:`, err.message);
        } finally {
            await page.close();
        }
    }

    await browser.close();
}

debugGUI();
