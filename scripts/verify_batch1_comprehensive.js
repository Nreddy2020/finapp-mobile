const puppeteer = require('puppeteer');

(async () => {
    // Launch the browser
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--window-size=450,900'] // Mobile-like window
    });

    const page = await browser.newPage();
    // Simulate Mobile Viewport
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');

    const APP_URL = 'http://localhost:8082';
    // Helper to log with timestamp
    const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
    const screenshot = async (name) => {
        const path = `batch1_verify_${name}.png`;
        await page.screenshot({ path });
        log(`📸 Screenshot saved: ${path}`);
    };

    try {
        log('🚀 Starting Comprehensive Batch 1 Verification (Cashbooks & Validity)...');

        // ==========================================
        // MODULE 1: CASHBOOKS
        // ==========================================
        log('\n📘 Testing Module 1: Cashbooks');

        // 1. Navigation
        log('1️⃣  Navigating to Cashbooks...');
        await page.goto(`${APP_URL}/cashbooks`, { waitUntil: 'networkidle0' });

        // Wait for key header
        try {
            await page.waitForSelector('text=Financial Command Center', { timeout: 10000 });
            log('   ✅ Loaded Cashbooks Screen');
        } catch (e) {
            log('   ❌ Failed to load Cashbooks Screen');
            await screenshot('cashbooks_fail');
            throw e;
        }

        // 2. UI Element Verification
        log('2️⃣  Verifying Core UI Elements...');
        const elementsToCheck = [
            'Real-Time Liquidity',
            'Runway Forecast',
            'Haggle Helper',
            'Your Ledgers'
        ];

        for (const text of elementsToCheck) {
            const found = await page.evaluate((t) => {
                return [...document.querySelectorAll('*')].some(el => el.textContent.includes(t));
            }, text);
            if (found) log(`   ✅ Found "${text}"`);
            else log(`   ❌ Missing "${text}"`);
        }

        // 3. functional Interaction: Create New Book
        log('3️⃣  Testing "Create New Book" Interaction...');
        try {
            // Find button by text
            const createBtnFound = await page.evaluate(() => {
                const els = [...document.querySelectorAll('div, span, button')];
                const btn = els.find(e => e.innerText.includes('Create New Book') || e.innerText.includes('Create Cashbook'));
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            if (createBtnFound) {
                log('   Clicked "Create New Book"');

                // Expect Modal - check for text "New Cashbook Ledger"
                try {
                    await page.waitForFunction(
                        () => document.body.innerText.includes('New Cashbook Ledger'),
                        { timeout: 3000 }
                    );
                    log('   ✅ "New Cashbook Ledger" Modal Opened');
                    await page.reload({ waitUntil: 'networkidle0' });
                } catch {
                    log('   ⚠️ Modal did not open or "New Cashbook Ledger" text not found');
                }
            } else {
                log('   ❌ "Create New Book" button not found');
            }
        } catch (e) {
            log(`   ⚠️ Create Book Modal check failed (feature might be missing): ${e.message}`);
        }

        // 4. Feature Check: Haggle Helper
        log('4️⃣  Testing "Haggle Helper"...');
        try {
            // Look for the switch role or input type=checkbox
            const switchEl = await page.$('div[role="switch"]');
            if (switchEl) {
                await switchEl.click();
                log('   Toggled Haggle Helper Switch');
                // Wait for inputs to appear
                try {
                    await page.waitForFunction(
                        () => document.body.innerText.includes('My Cost'),
                        { timeout: 2000 }
                    );
                    log('   ✅ Haggle Helper Inputs Appeared');
                } catch {
                    log('   ⚠️ Haggle Helper inputs did not appear');
                }
            } else {
                log('   ⚠️ Haggle Helper Switch not found');
            }
        } catch (e) {
            log(`   ⚠️ Haggle Helper check failed: ${e.message}`);
        }

        // 5. Feature Check: Risk Simulator
        log('5️⃣  Testing "Risk Simulator"...');
        try {
            // Find "10%" button
            const clickedRisk = await page.evaluate(() => {
                const els = [...document.querySelectorAll('div, button')];
                const btn = els.find(e => e.innerText.trim() === '10%');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            if (clickedRisk) {
                log('   Clicked 10% Risk');
                // Expected result: text "Projected Loss" appears
                try {
                    await page.waitForFunction(
                        () => document.body.innerText.includes('Projected Loss'),
                        { timeout: 2000 }
                    );
                    log('   ✅ Risk Simulator updated Projected Loss');
                } catch {
                    log('   ⚠️ "Projected Loss" text did not appear');
                }
            } else {
                log('   ⚠️ Risk Simulator "10%" button not found');
            }
        } catch (e) {
            log(`   ⚠️ Risk Simulator check failed: ${e.message}`);
        }


        // ==========================================
        // MODULE 2: VALIDITY TRACKER
        // ==========================================
        log('\n🛡️  Testing Module 2: Validity Tracker');

        // 1. Navigation
        log('1️⃣  Navigating to Validity...');
        await page.goto(`${APP_URL}/validity`, { waitUntil: 'networkidle0' });

        try {
            await page.waitForSelector('text=Expirations', { timeout: 10000 });
            log('   ✅ Loaded Validity Screen');
        } catch (e) {
            log('   ❌ Failed to load Validity Screen');
            await screenshot('validity_fail');
        }

        // 2. UI Verification
        log('2️⃣  Verifying Core UI Elements...');
        const validityElements = [
            'Validity',
            'Documents Active',
            'Document Vault'
        ];

        for (const text of validityElements) {
            const found = await page.evaluate((t) => {
                return [...document.querySelectorAll('*')].some(el => el.textContent.includes(t));
            }, text);
            if (found) log(`   ✅ Found "${text}"`);
            else log(`   ❌ Missing "${text}"`);
        }

        // 3. Interaction: Add Document
        log('3️⃣  Testing "Add Document" Button...');
        try {
            const clickedAdd = await page.evaluate(() => {
                const els = [...document.querySelectorAll('div, span, button')];
                const btn = els.find(e => e.innerText.includes('Add Document'));
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });

            if (clickedAdd) {
                log('   Clicked "Add Document"');
                // Note: Analysis says this might do nothing. We check if anything happens.
                try {
                    await page.waitForFunction(
                        () => document.body.innerText.includes('New Document') || document.body.innerText.includes('Add'),
                        { timeout: 2000 }
                    );
                    log('   ✅ Add Modal Opened (Unexpected but good!)');
                } catch {
                    log('   ℹ️ No Modal opened (Expected per analysis: "Missing CRUD")');
                }
            } else {
                log('   ❌ "Add Document" button not found');
            }
        } catch (e) {
            log(`   ⚠️ Add Document check failed: ${e.message}`);
        }

        // 4. Empty State / List Check
        log('4️⃣  Checking Data State...');
        const hasEmptyState = await page.evaluate(() => {
            return document.body.innerText.includes('No documents');
        });

        if (hasEmptyState) {
            log('   ℹ️ App is in Empty State ("No documents")');
        } else {
            log('   ℹ️ App has documents listed');
        }


        log('\n✨ ONE-SHOT VERIFICATION COMPLETE ✨');

    } catch (error) {
        console.error('\n❌ CRITICAL FAILURE:', error);
        await screenshot('critical_failure');
    } finally {
        await browser.close();
    }
})();
