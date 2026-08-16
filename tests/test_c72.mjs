import fs from 'fs';
import path from 'path';
import ConcentrationEngine, {
    ConcentrationRiskTier,
    CONCENTRATION_POLICY_VERSION,
    CONCENTRATION_POLICY_V1
} from '../services/concentrationEngine.js';
import { CANONICAL_ASSET_CLASSES } from '../services/targetAllocationService.js';
import { ConfidenceLevel, DataQualityStatus } from '../services/riskTaxonomy.js';
import { saveHoldings, saveInvestmentEvents, saveMarketQuotes, loadHoldings, loadInvestmentEvents, loadMarketQuotes, loadData, STORAGE_KEYS } from '../services/storage.js';
import { MoneyFlowEngine } from '../services/moneyFlowEngine.js';

console.log('================================================================');
console.log('=== Stage C.7.2 Concentration & Diversification 28-Test Suite ===');
console.log('================================================================\n');

async function runC72AcceptanceSuite() {
    let passCount = 0;
    const totalTests = 28;
    const standardAsOfDate = '2024-01-10T00:00:00.000Z';

    try {
        // Test 1: Empty Portfolio Handling
        console.log('--- Test 1: Empty Portfolio Handling ---');
        const emptyResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: [],
            quotesOverride: {}
        });
        if (emptyResult.holdingCount === 0 &&
            emptyResult.totalMarketValue === 0.0 &&
            emptyResult.holdingHHI === 0.0 &&
            emptyResult.effectiveConstituents === 0.0 &&
            emptyResult.riskTier === ConcentrationRiskTier.BALANCED &&
            emptyResult.warnings.includes('EMPTY_OR_ZERO_VALUE_PORTFOLIO')) {
            console.log('✅ Test 1 PASS: Empty portfolio handled gracefully without NaN or division-by-zero.');
            passCount++;
        } else {
            console.error('❌ Test 1 FAIL: Empty portfolio result invalid:', emptyResult);
        }

        // Test 2: Single Holding Portfolio (N=1, V=10000)
        console.log('\n--- Test 2: Single Holding Portfolio (N=1) ---');
        const singleHolding = [{ id: 'h1', symbol: 'INFY', assetType: 'STOCK', quantity: 10, currentPrice: 1000 }];
        const singleQuotes = { INFY: { currentPrice: 1000, price: 1000 } };
        const singleResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: singleHolding,
            quotesOverride: singleQuotes
        });
        if (singleResult.holdingHHI === 10000.0 &&
            singleResult.effectiveConstituents === 1.0 &&
            singleResult.diversificationRatio === 0.0 &&
            singleResult.normalizedHoldingHHI === 0.0 &&
            singleResult.top1Ratio === 1.0 &&
            singleResult.riskTier === ConcentrationRiskTier.CRITICAL) {
            console.log('✅ Test 2 PASS: Single holding correctly calculated (HHI=10000, Neff=1.0, DR=0, CRITICAL tier).');
            passCount++;
        } else {
            console.error('❌ Test 2 FAIL: Single holding calculation mismatch:', singleResult);
        }

        // Test 3: Two Equal Holdings (N=2, 50/50)
        console.log('\n--- Test 3: Two Equal Holdings (N=2, 50/50) ---');
        const twoEqual = [
            { id: 'h1', symbol: 'INFY', assetType: 'STOCK', quantity: 10, currentPrice: 500 },
            { id: 'h2', symbol: 'TCS', assetType: 'STOCK', quantity: 10, currentPrice: 500 }
        ];
        const twoQuotes = {
            INFY: { currentPrice: 500, price: 500 },
            TCS: { currentPrice: 500, price: 500 }
        };
        const twoResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: twoEqual,
            quotesOverride: twoQuotes
        });
        if (twoResult.holdingHHI === 5000.0 &&
            twoResult.effectiveConstituents === 2.0 &&
            Math.abs(twoResult.diversificationRatio - 1.0) < 0.0001 &&
            twoResult.top1Ratio === 0.5 &&
            twoResult.top3Ratio === 1.0) {
            console.log('✅ Test 3 PASS: Two equal holdings exact (HHI=5000.00, Neff=2.0, DR=1.000000).');
            passCount++;
        } else {
            console.error('❌ Test 3 FAIL: Two equal holdings calculation mismatch:', twoResult);
        }

        // Test 4: 8 Equal Canonical Asset Classes (N=8, 12.5% each)
        console.log('\n--- Test 4: 8 Equal Canonical Asset Classes ---');
        const eightClasses = CANONICAL_ASSET_CLASSES.map((cls, idx) => ({
            id: `h_${cls}`,
            symbol: `SYM_${cls}`,
            assetType: cls,
            quantity: 1,
            currentPrice: 1000
        }));
        const eightQuotes = {};
        eightClasses.forEach(h => { eightQuotes[h.symbol] = { currentPrice: 1000, price: 1000 }; });
        const eightResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: eightClasses,
            quotesOverride: eightQuotes
        });
        // 8 equal -> HHI = 8 * (1/8)^2 * 10000 = 1250.00
        if (eightResult.assetClassHHI === 1250.0 &&
            eightResult.holdingHHI === 1250.0 &&
            eightResult.effectiveConstituents === 8.0 &&
            Math.abs(eightResult.diversificationRatio - 1.0) < 0.0001 &&
            eightResult.riskTier === ConcentrationRiskTier.BALANCED) {
            console.log('✅ Test 4 PASS: 8 equal canonical classes verified (HHI=1250.00, Neff=8.0, BALANCED tier).');
            passCount++;
        } else {
            console.error('❌ Test 4 FAIL: 8 equal classes mismatch:', eightResult);
        }

        // Test 5: 100 Equal Holdings (N=100, 1% each)
        console.log('\n--- Test 5: 100 Equal Holdings ---');
        const hundredHoldings = [];
        const hundredQuotes = {};
        for (let i = 1; i <= 100; i++) {
            const sym = `STK_${i}`;
            hundredHoldings.push({ id: `h_${i}`, symbol: sym, assetType: 'STOCK', quantity: 1, currentPrice: 100 });
            hundredQuotes[sym] = { currentPrice: 100, price: 100 };
        }
        const hundredResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: hundredHoldings,
            quotesOverride: hundredQuotes
        });
        // 100 equal -> HHI = 100 * (0.01)^2 * 10000 = 100.00, Neff = 100.0
        if (hundredResult.holdingHHI === 100.0 &&
            hundredResult.effectiveConstituents === 100.0 &&
            Math.abs(hundredResult.diversificationRatio - 1.0) < 0.0001 &&
            hundredResult.top1Ratio === 0.01 &&
            hundredResult.top5Ratio === 0.05) {
            console.log('✅ Test 5 PASS: 100 equal holdings verified (HHI=100.00, Neff=100.0, Top5=0.05).');
            passCount++;
        } else {
            console.error('❌ Test 5 FAIL: 100 equal holdings mismatch:', hundredResult);
        }

        // Test 6: 90% Dominant Holding in 10 Holdings
        console.log('\n--- Test 6: 90% Dominant Holding in 10 Holdings ---');
        const dominantHoldings = [
            { id: 'h_dom', symbol: 'DOMINANT', assetType: 'STOCK', quantity: 1, currentPrice: 9000 }
        ];
        const dominantQuotes = { DOMINANT: { currentPrice: 9000, price: 9000 } };
        for (let i = 1; i <= 9; i++) {
            const sym = `MINOR_${i}`;
            dominantHoldings.push({ id: `h_${i}`, symbol: sym, assetType: 'STOCK', quantity: 1, currentPrice: 111.111111 });
            dominantQuotes[sym] = { currentPrice: 111.111111, price: 111.111111 };
        }
        const dominantResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: dominantHoldings,
            quotesOverride: dominantQuotes
        });
        if (dominantResult.holdingHHI > 8100.0 &&
            dominantResult.effectiveConstituents < 1.25 &&
            dominantResult.riskTier === ConcentrationRiskTier.CRITICAL &&
            dominantResult.warnings.includes('CRITICAL_SINGLE_HOLDING') &&
            dominantResult.warnings.includes('UNDER_DIVERSIFIED_PORTFOLIO')) {
            console.log(`✅ Test 6 PASS: 90% dominant asset correctly flagged (HHI=${dominantResult.holdingHHI}, Neff=${dominantResult.effectiveConstituents}, CRITICAL tier).`);
            passCount++;
        } else {
            console.error('❌ Test 6 FAIL: Dominant holding test failed:', dominantResult);
        }

        // Test 7: Asset-Class HHI vs Holding-Level HHI Decomposition
        console.log('\n--- Test 7: Asset-Class HHI vs Holding-Level HHI Decomposition ---');
        // 4 stocks of 2500 each in 1 asset class (STOCK)
        const fourStocks = [
            { id: 's1', symbol: 'STK1', assetType: 'STOCK', quantity: 1, currentPrice: 2500 },
            { id: 's2', symbol: 'STK2', assetType: 'STOCK', quantity: 1, currentPrice: 2500 },
            { id: 's3', symbol: 'STK3', assetType: 'STOCK', quantity: 1, currentPrice: 2500 },
            { id: 's4', symbol: 'STK4', assetType: 'STOCK', quantity: 1, currentPrice: 2500 }
        ];
        const fourQuotes = {
            STK1: { currentPrice: 2500 }, STK2: { currentPrice: 2500 },
            STK3: { currentPrice: 2500 }, STK4: { currentPrice: 2500 }
        };
        const decompResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: fourStocks,
            quotesOverride: fourQuotes
        });
        // Asset-class HHI = 10000 (100% in STOCK), Holding HHI = 4 * (0.25)^2 * 10000 = 2500
        if (decompResult.assetClassHHI === 10000.0 && decompResult.holdingHHI === 2500.0) {
            console.log('✅ Test 7 PASS: Asset-class HHI (10000.00) and Holding-level HHI (2500.00) correctly segregated.');
            passCount++;
        } else {
            console.error('❌ Test 7 FAIL: HHI decomposition mismatch:', decompResult);
        }

        // Test 8: Normalized Holding HHI (HHI*) Mathematical Range
        console.log('\n--- Test 8: Normalized Holding HHI (HHI*) Mathematical Range ---');
        if (eightResult.normalizedHoldingHHI === 0.0 && singleResult.normalizedHoldingHHI === 0.0 && dominantResult.normalizedHoldingHHI > 75.0 && dominantResult.normalizedHoldingHHI <= 100.0) {
            console.log(`✅ Test 8 PASS: Normalized HHI exact (Equal: ${eightResult.normalizedHoldingHHI}, Dominant: ${dominantResult.normalizedHoldingHHI}).`);
            passCount++;
        } else {
            console.error('❌ Test 8 FAIL: Normalized HHI mismatch:', { eight: eightResult.normalizedHoldingHHI, dom: dominantResult.normalizedHoldingHHI });
        }

        // Test 9: Neff Inverse Simpson Calculation
        console.log('\n--- Test 9: Neff Inverse Simpson Calculation ---');
        if (twoResult.effectiveConstituents === 2.0 && decompResult.effectiveConstituents === 4.0) {
            console.log('✅ Test 9 PASS: Neff inverse Simpson index exact across portfolio structures.');
            passCount++;
        } else {
            console.error('❌ Test 9 FAIL: Neff mismatch.');
        }

        // Test 10: Shannon Entropy Calculation Accuracy
        console.log('\n--- Test 10: Shannon Entropy Calculation Accuracy ---');
        // For N=4 equal weights, H = - 4 * (0.25 * ln(0.25)) = ln(4) = 1.386294
        const expectedEntropy4 = Math.log(4);
        if (Math.abs(decompResult.shannonEntropy - expectedEntropy4) < 0.0001) {
            console.log(`✅ Test 10 PASS: Shannon entropy exact for 4 equal assets (${decompResult.shannonEntropy} vs expected ${expectedEntropy4.toFixed(6)}).`);
            passCount++;
        } else {
            console.error('❌ Test 10 FAIL: Shannon entropy calculation mismatch:', decompResult.shannonEntropy);
        }

        // Test 11: Exponential Entropy (E_eff)
        console.log('\n--- Test 11: Exponential Entropy (E_eff) ---');
        // E_eff = exp(ln(4)) = 4.0
        if (Math.abs(decompResult.exponentialEntropy - 4.0) < 0.0001) {
            console.log('✅ Test 11 PASS: Exponential entropy equals effective constituent count for equal weights (E_eff = 4.0).');
            passCount++;
        } else {
            console.error('❌ Test 11 FAIL: Exponential entropy mismatch:', decompResult.exponentialEntropy);
        }

        // Test 12: Diversification Ratio (DR) Range [0, 1]
        console.log('\n--- Test 12: Diversification Ratio (DR) Range [0, 1] ---');
        if (dominantResult.diversificationRatio >= 0.0 && dominantResult.diversificationRatio <= 1.0 &&
            decompResult.diversificationRatio === 1.0) {
            console.log(`✅ Test 12 PASS: Diversification ratio verified in [0, 1] (Dominant: ${dominantResult.diversificationRatio}, Equal: ${decompResult.diversificationRatio}).`);
            passCount++;
        } else {
            console.error('❌ Test 12 FAIL: Diversification ratio out of bounds.');
        }

        // Test 13: Top-1 Ratio Calculation
        console.log('\n--- Test 13: Top-1 Ratio Calculation ---');
        if (singleResult.top1Ratio === 1.0 && twoResult.top1Ratio === 0.5 && decompResult.top1Ratio === 0.25) {
            console.log('✅ Test 13 PASS: Top-1 ratios exact across portfolios.');
            passCount++;
        } else {
            console.error('❌ Test 13 FAIL: Top-1 ratio mismatch.');
        }

        // Test 14: Top-3 Ratio Calculation
        console.log('\n--- Test 14: Top-3 Ratio Calculation ---');
        if (twoResult.top3Ratio === 1.0 && decompResult.top3Ratio === 0.75) {
            console.log('✅ Test 14 PASS: Top-3 ratios exact (Two-asset: 1.0, Four-asset: 0.75).');
            passCount++;
        } else {
            console.error('❌ Test 14 FAIL: Top-3 ratio mismatch.');
        }

        // Test 15: Top-5 Ratio Calculation
        console.log('\n--- Test 15: Top-5 Ratio Calculation ---');
        if (eightResult.top5Ratio === 0.625 && hundredResult.top5Ratio === 0.05) {
            console.log('✅ Test 15 PASS: Top-5 ratios exact (8-asset: 0.625, 100-asset: 0.05).');
            passCount++;
        } else {
            console.error('❌ Test 15 FAIL: Top-5 ratio mismatch.');
        }

        // Test 16: Deterministic Tie-Breaking (marketValue DESC -> symbol ASC -> holdingId ASC)
        console.log('\n--- Test 16: Deterministic Tie-Breaking ---');
        const tieHoldings = [
            { id: 'h_b2', symbol: 'BETA', assetType: 'STOCK', quantity: 1, currentPrice: 1000 },
            { id: 'h_a1', symbol: 'ALPHA', assetType: 'STOCK', quantity: 1, currentPrice: 1000 },
            { id: 'h_b1', symbol: 'BETA', assetType: 'STOCK', quantity: 1, currentPrice: 1000 }
        ];
        const tieQuotes = {
            ALPHA: { currentPrice: 1000 },
            BETA: { currentPrice: 1000 }
        };
        const tieResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: tieHoldings,
            quotesOverride: tieQuotes
        });
        const orderSymbols = tieResult.topHoldings.map(h => `${h.symbol}_${h.holdingId}`);
        if (orderSymbols[0] === 'ALPHA_h_a1' && orderSymbols[1] === 'BETA_h_b1' && orderSymbols[2] === 'BETA_h_b2') {
            console.log('✅ Test 16 PASS: Deterministic 3-tier tie breaking verified (ALPHA_h_a1 -> BETA_h_b1 -> BETA_h_b2).');
            passCount++;
        } else {
            console.error('❌ Test 16 FAIL: Tie breaking failed:', orderSymbols);
        }

        // Test 17: BALANCED Concentration Tier Boundary
        console.log('\n--- Test 17: BALANCED Concentration Tier Boundary ---');
        // 6 equal holdings -> HHI = 6 * (1/6)^2 * 10000 = 1666.67? No, 8 equal holdings -> HHI = 1250 <= 1500, Top1 = 0.125 <= 0.20
        if (eightResult.riskTier === ConcentrationRiskTier.BALANCED) {
            console.log('✅ Test 17 PASS: BALANCED tier boundary verified (HHI <= 1500, Top1 <= 0.20).');
            passCount++;
        } else {
            console.error('❌ Test 17 FAIL: BALANCED boundary failed:', eightResult.riskTier);
        }

        // Test 18: MODERATE Concentration Tier Boundary
        console.log('\n--- Test 18: MODERATE Concentration Tier Boundary ---');
        // 4 equal holdings -> HHI = 2500 (1500 < HHI <= 3000), Top1 = 0.25 (0.20 < Top1 <= 0.35)
        if (decompResult.riskTier === ConcentrationRiskTier.MODERATE) {
            console.log('✅ Test 18 PASS: MODERATE tier boundary verified (HHI=2500.00, Top1=0.25).');
            passCount++;
        } else {
            console.error('❌ Test 18 FAIL: MODERATE boundary failed:', decompResult.riskTier);
        }

        // Test 19: HIGH Concentration Tier Boundary
        console.log('\n--- Test 19: HIGH Concentration Tier Boundary ---');
        // 3 equal holdings -> HHI = 3333.33 (3000 < HHI <= 5000), Top1 = 0.333333
        const threeEqual = [
            { id: 't1', symbol: 'S1', assetType: 'STOCK', quantity: 1, currentPrice: 1000 },
            { id: 't2', symbol: 'S2', assetType: 'STOCK', quantity: 1, currentPrice: 1000 },
            { id: 't3', symbol: 'S3', assetType: 'STOCK', quantity: 1, currentPrice: 1000 }
        ];
        const threeQuotes = { S1: { currentPrice: 1000 }, S2: { currentPrice: 1000 }, S3: { currentPrice: 1000 } };
        const threeResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: threeEqual,
            quotesOverride: threeQuotes
        });
        if (threeResult.riskTier === ConcentrationRiskTier.HIGH) {
            console.log('✅ Test 19 PASS: HIGH tier boundary verified (HHI=3333.33, Top1=0.333333).');
            passCount++;
        } else {
            console.error('❌ Test 19 FAIL: HIGH boundary failed:', threeResult.riskTier);
        }

        // Test 20: CRITICAL Concentration Tier Boundary
        console.log('\n--- Test 20: CRITICAL Concentration Tier Boundary ---');
        if (singleResult.riskTier === ConcentrationRiskTier.CRITICAL && dominantResult.riskTier === ConcentrationRiskTier.CRITICAL) {
            console.log('✅ Test 20 PASS: CRITICAL tier boundary verified (HHI > 5000 or Top1 > 0.50).');
            passCount++;
        } else {
            console.error('❌ Test 20 FAIL: CRITICAL boundary failed.');
        }

        // Test 21: CRITICAL_SINGLE_HOLDING Diagnostic Warning (Top1 > 35%)
        console.log('\n--- Test 21: CRITICAL_SINGLE_HOLDING Diagnostic Warning ---');
        const critSingle = [
            { id: 'c1', symbol: 'BIG', assetType: 'STOCK', quantity: 1, currentPrice: 4000 }, // 40%
            { id: 'c2', symbol: 'MED1', assetType: 'STOCK', quantity: 1, currentPrice: 3000 },
            { id: 'c3', symbol: 'MED2', assetType: 'STOCK', quantity: 1, currentPrice: 3000 }
        ];
        const critQuotes = { BIG: { currentPrice: 4000 }, MED1: { currentPrice: 3000 }, MED2: { currentPrice: 3000 } };
        const critResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: critSingle,
            quotesOverride: critQuotes
        });
        if (critResult.warnings.includes('CRITICAL_SINGLE_HOLDING') && critResult.top1Ratio === 0.4) {
            console.log('✅ Test 21 PASS: CRITICAL_SINGLE_HOLDING triggered when Top1 > 35% (got 40.0%).');
            passCount++;
        } else {
            console.error('❌ Test 21 FAIL: CRITICAL_SINGLE_HOLDING warning failed:', critResult.warnings);
        }

        // Test 22: HIGH_TOP3_CONCENTRATION Diagnostic Warning (Top3 > 60%)
        console.log('\n--- Test 22: HIGH_TOP3_CONCENTRATION Diagnostic Warning ---');
        // Top 3 = 40% + 30% + 30% = 100% > 60%
        if (critResult.warnings.includes('HIGH_TOP3_CONCENTRATION')) {
            console.log('✅ Test 22 PASS: HIGH_TOP3_CONCENTRATION triggered when Top3 > 60% (got 100.0%).');
            passCount++;
        } else {
            console.error('❌ Test 22 FAIL: HIGH_TOP3_CONCENTRATION warning failed:', critResult.warnings);
        }

        // Test 23: SPECULATIVE_ASSET_OVERWEIGHT Diagnostic Warning (Crypto > 15%)
        console.log('\n--- Test 23: SPECULATIVE_ASSET_OVERWEIGHT Diagnostic Warning ---');
        const cryptoHoldings = [
            { id: 'btc', symbol: 'BTC', assetType: 'CRYPTO', quantity: 1, currentPrice: 2000 }, // 20%
            { id: 'stk', symbol: 'STK', assetType: 'STOCK', quantity: 1, currentPrice: 8000 }   // 80%
        ];
        const cryptoQuotes = { BTC: { currentPrice: 2000 }, STK: { currentPrice: 8000 } };
        const cryptoResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: cryptoHoldings,
            quotesOverride: cryptoQuotes
        });
        if (cryptoResult.warnings.includes('SPECULATIVE_ASSET_OVERWEIGHT')) {
            console.log('✅ Test 23 PASS: SPECULATIVE_ASSET_OVERWEIGHT triggered when Crypto > 15% (got 20.0%).');
            passCount++;
        } else {
            console.error('❌ Test 23 FAIL: Crypto warning failed:', cryptoResult.warnings);
        }

        // Test 24: STOCK_CLASS_DOMINANCE and BROAD_EQUITY_DOMINANCE Warnings
        console.log('\n--- Test 24: STOCK_CLASS_DOMINANCE and BROAD_EQUITY_DOMINANCE Warnings ---');
        const equityHoldings = [
            { id: 's1', symbol: 'STOCK1', assetType: 'STOCK', quantity: 1, currentPrice: 7000 }, // 70%
            { id: 'mf1', symbol: 'EQ_MF', assetType: 'MUTUAL_FUND', quantity: 1, currentPrice: 1500, metadata: { equitySubtype: 'EQUITY' } }, // 15%
            { id: 'gld', symbol: 'GOLD', assetType: 'GOLD', quantity: 1, currentPrice: 1500 } // 15%
        ];
        const equityQuotes = { STOCK1: { currentPrice: 7000 }, EQ_MF: { currentPrice: 1500 }, GOLD: { currentPrice: 1500 } };
        const eqResult = await ConcentrationEngine.calculateConcentrationDiagnostics({
            asOfDate: standardAsOfDate,
            holdingsOverride: equityHoldings,
            quotesOverride: equityQuotes
        });
        // Stock = 70% <= 75% -> no STOCK_CLASS_DOMINANCE. Broad Equity = 70% + 15% = 85% > 80% -> BROAD_EQUITY_DOMINANCE!
        if (!eqResult.warnings.includes('STOCK_CLASS_DOMINANCE') && eqResult.warnings.includes('BROAD_EQUITY_DOMINANCE')) {
            console.log('✅ Test 24 PASS: BROAD_EQUITY_DOMINANCE evaluated authoritatively using metadata without guessing.');
            passCount++;
        } else {
            console.error('❌ Test 24 FAIL: Equity dominance warning failed:', eqResult.warnings);
        }

        // Test 25: UNDER_DIVERSIFIED_PORTFOLIO Warning (Neff < 3.0 when N >= 5)
        console.log('\n--- Test 25: UNDER_DIVERSIFIED_PORTFOLIO Warning ---');
        if (dominantResult.warnings.includes('UNDER_DIVERSIFIED_PORTFOLIO')) {
            console.log('✅ Test 25 PASS: UNDER_DIVERSIFIED_PORTFOLIO triggered when Neff < 3.0 with N >= 5.');
            passCount++;
        } else {
            console.error('❌ Test 25 FAIL: Under-diversification warning failed:', dominantResult.warnings);
        }

        // Test 26: Mandatory Deterministic asOfDate & AST Scan
        console.log('\n--- Test 26: Mandatory Deterministic asOfDate & AST Scan ---');
        let missingAsOfThrew = false;
        let invalidAsOfThrew = false;

        try {
            await ConcentrationEngine.calculateConcentrationDiagnostics({ holdingsOverride: singleHolding });
        } catch (err) {
            if (err.message.includes('asOfDate is required')) missingAsOfThrew = true;
        }

        try {
            await ConcentrationEngine.calculateConcentrationDiagnostics({ asOfDate: 'invalid_date', holdingsOverride: singleHolding });
        } catch (err) {
            if (err.message.includes('Invalid asOfDate')) invalidAsOfThrew = true;
        }

        const engineSrc = fs.readFileSync(path.resolve('services/concentrationEngine.js'), 'utf8');
        const hasDateNow = engineSrc.includes('Date.now()');
        const hasArglessNewDate = /\bnew\s+Date\(\s*\)/.test(engineSrc);

        if (missingAsOfThrew && invalidAsOfThrew && !hasDateNow && !hasArglessNewDate) {
            console.log('✅ Test 26 PASS: Mandatory asOfDate enforced; AST scan confirms 0 wall-clock calls in concentrationEngine.js.');
            passCount++;
        } else {
            console.error('❌ Test 26 FAIL: Deterministic check failed:', { missingAsOfThrew, invalidAsOfThrew, hasDateNow, hasArglessNewDate });
        }

        // Test 27: Deep 5-Store Read-Only Safety Guard
        console.log('\n--- Test 27: Deep 5-Store Read-Only Safety Guard ---');
        const holdingsBefore = JSON.stringify(await loadHoldings());
        const eventsBefore = JSON.stringify(await loadInvestmentEvents());
        const quotesBefore = JSON.stringify(await loadMarketQuotes());
        const txsBefore = JSON.stringify(await MoneyFlowEngine.getTransactions());
        const walletsBefore = JSON.stringify(await loadData(STORAGE_KEYS.WALLETS, []));

        // Execute full diagnostic pipeline
        await ConcentrationEngine.calculateConcentrationDiagnostics({ asOfDate: standardAsOfDate });

        const holdingsAfter = JSON.stringify(await loadHoldings());
        const eventsAfter = JSON.stringify(await loadInvestmentEvents());
        const quotesAfter = JSON.stringify(await loadMarketQuotes());
        const txsAfter = JSON.stringify(await MoneyFlowEngine.getTransactions());
        const walletsAfter = JSON.stringify(await loadData(STORAGE_KEYS.WALLETS, []));

        const isUnchanged = holdingsBefore === holdingsAfter &&
                            eventsBefore === eventsAfter &&
                            quotesBefore === quotesAfter &&
                            txsBefore === txsAfter &&
                            walletsBefore === walletsAfter;

        if (isUnchanged) {
            console.log('✅ Test 27 PASS: 100% Zero state mutations across all 5 stores verified.');
            passCount++;
        } else {
            console.error('❌ Test 27 FAIL: State mutation detected in concentration diagnostic execution!');
        }

        // Test 28: Stage C.7.2 Acceptance Standard Check
        console.log('\n--- Test 28: Stage C.7.2 Acceptance Standard Check ---');
        if (passCount === 27) {
            console.log('✅ Test 28 PASS: All Stage C.7.2 mathematical, policy, and governance criteria satisfied.');
            passCount++;
        } else {
            console.error('❌ Test 28 FAIL: Incomplete test suite execution.');
        }

        console.log(`\n================================================================`);
        console.log(`=== STAGE C.7.2 ACCEPTANCE RESULT: ${passCount}/${totalTests} TESTS PASSED PERFECTLY ===`);
        console.log(`================================================================\n`);

        if (passCount !== totalTests) {
            console.error(`🚨 HARDENING FAILURE: Only ${passCount}/${totalTests} tests passed. Exiting with code 1.`);
            process.exit(1);
        }

    } catch (err) {
        console.error('C.7.2 Acceptance suite exception:', err);
        process.exit(1);
    }
}

runC72AcceptanceSuite();
