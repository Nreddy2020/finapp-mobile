const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Safe for WSL/Container
    });
    const page = await browser.newPage();

    // Capture console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));

    try {
        console.log('Navigating to http://localhost:8084...');
        await page.goto('http://localhost:8084', { waitUntil: 'networkidle0', timeout: 30000 });

        console.log('Page loaded. Checking for content...');
        // formatted net worth check
        const content = await page.content();

        // Take a screenshot
        const screenshotPath = path.join(__dirname, '..', 'app_launch_verify.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to ${screenshotPath}`);

        // Dump HTML for investigation
        const htmlPath = path.join(__dirname, '..', 'app_debug.html');
        fs.writeFileSync(htmlPath, content);
        console.log(`HTML source saved to ${htmlPath}`);

        if (content.includes('Reddy') || content.includes('Net Worth')) {
            console.log('SUCCESS: Dashboard loaded with User Name/Net Worth.');
        } else if (content.includes('root') || content.includes('expo')) {
            console.log('PARTIAL SUCCESS: Page loaded but content may be rendering or failed.');
        } else {
            console.error('FAILURE: Page content looks empty or wrong.');
        }

    } catch (error) {
        console.error('ERROR: Failed to load page:', error.message);
    } finally {
        await browser.close();
    }
})();
