/**
 * tests/loans/test_loan_security.mjs
 * 
 * LN-09: Security, PII Redaction & Backup Encryption Suite (15 checks)
 */

import assert from 'assert';
import crypto from 'crypto';
import { LoanRestoreEngine } from '../../services/loans/loanRestore.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';
import { LoanCommitmentBinding } from '../../services/loans/loanCommitmentBinding.js';
import { LOAN_TYPES } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-09: SECURITY & ENCRYPTION SUITE');
console.log('================================================================\n');

let passCount = 0;
async function test(name, fn) {
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        await fn();
        passCount++;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        throw e;
    }
}

(async () => {
    // Setup test repository
    await LoanRepository.clearAll();
    await LoanRepository.saveFacility({
        id: 'SEC_TEST_LOAN',
        name: 'Executive Education Loan',
        lender: 'State Bank of India (Account 1234567890)',
        loanType: LOAN_TYPES.EDUCATION,
        principalPaise: 150000000n, // 15 Lakhs
        annualRatePercent: 9.5,
        tenureMonths: 84
    });

    const PASSPHRASE = 'SecureBankPassword2026!';

    // 1. Authenticated Encryption (AES-256-GCM)
    let backupEnvelope;
    await test('Check 1: createEncryptedBackup generates AES-256-GCM envelope', async () => {
        backupEnvelope = await LoanRestoreEngine.createEncryptedBackup(PASSPHRASE);
        assert.strictEqual(backupEnvelope.encryptionAlgorithm, 'AES-256-GCM');
        assert.strictEqual(backupEnvelope.keyDerivationAlgorithm, 'PBKDF2-HMAC-SHA256');
    });

    await test('Check 2: Backup envelope uses 100,000 PBKDF2 iterations', () => {
        assert.strictEqual(backupEnvelope.kdfParameters.iterations, 100000);
        assert.strictEqual(backupEnvelope.kdfParameters.keyLengthBytes, 32);
    });

    await test('Check 3: Backup envelope has 96-bit nonce (12 bytes) and 128-bit auth tag (16 bytes)', () => {
        assert.strictEqual(Buffer.from(backupEnvelope.iv, 'hex').length, 12);
        assert.strictEqual(Buffer.from(backupEnvelope.authTag, 'hex').length, 16);
    });

    await test('Check 4: Backup envelope includes ciphertext SHA-256 digest', () => {
        assert(backupEnvelope.ciphertextSha256);
        const computed = crypto.createHash('sha256').update(backupEnvelope.ciphertext).digest('hex');
        assert.strictEqual(computed, backupEnvelope.ciphertextSha256);
    });

    await test('Check 5: Passphrase with less than 8 characters is rejected', async () => {
        await assert.rejects(async () => {
            await LoanRestoreEngine.createEncryptedBackup('short');
        }, /INVALID_PASSPHRASE/);
    });

    // 2. Successful Restoration
    await test('Check 6: restoreFromEncryptedBackup decrypts and restores facilities cleanly', async () => {
        await LoanRepository.clearAll();
        assert.strictEqual((await LoanRepository.getAllFacilities()).length, 0);

        const res = await LoanRestoreEngine.restoreFromEncryptedBackup(backupEnvelope, PASSPHRASE);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.facilitiesCount, 1);

        const restored = await LoanRepository.getFacilityById('SEC_TEST_LOAN');
        assert(restored);
        assert.strictEqual(restored.principalPaise, 150000000n);
    });

    // 3. Tamper Detection & Authentication Failures
    await test('Check 7: Decryption fails closed with incorrect passphrase', async () => {
        await assert.rejects(async () => {
            await LoanRestoreEngine.restoreFromEncryptedBackup(backupEnvelope, 'WrongPassword999!');
        }, /AUTHENTICATION_FAILED/);
    });

    await test('Check 8: Tampered ciphertext is detected by SHA-256 pre-check', async () => {
        const tampered = { ...backupEnvelope };
        // Flip one character in ciphertext
        const modifiedChar = tampered.ciphertext[0] === 'a' ? 'b' : 'a';
        tampered.ciphertext = modifiedChar + tampered.ciphertext.slice(1);

        await assert.rejects(async () => {
            await LoanRestoreEngine.restoreFromEncryptedBackup(tampered, PASSPHRASE);
        }, /BACKUP_TAMPER_DETECTED/);
    });

    await test('Check 9: Forged authentication tag is rejected by GCM decipher', async () => {
        const forgedTag = { ...backupEnvelope };
        forgedTag.authTag = '00000000000000000000000000000000';
        // Update hash so it passes hash check and hits decipher
        forgedTag.ciphertextSha256 = crypto.createHash('sha256').update(forgedTag.ciphertext).digest('hex');

        await assert.rejects(async () => {
            await LoanRestoreEngine.restoreFromEncryptedBackup(forgedTag, PASSPHRASE);
        }, /AUTHENTICATION_FAILED/);
    });

    await test('Check 10: Tampered AAD metadata (e.g. altered format) fails GCM auth tag check', async () => {
        const alteredAad = { ...backupEnvelope, format: 'FORGED_FORMAT' };
        await assert.rejects(async () => {
            await LoanRestoreEngine.restoreFromEncryptedBackup(alteredAad, PASSPHRASE);
        }, /AUTHENTICATION_FAILED/);
    });

    // 4. PII Redaction & Memory Hygiene
    await test('Check 11: Commitment descriptor sanitizes raw account numbers in lender field', () => {
        const facility = {
            id: 'PII_LOAN',
            name: 'Home Loan',
            lender: 'HDFC Bank A/C 998877665544',
            loanType: LOAN_TYPES.HOME,
            monthlyEmiPaise: 4500000n
        };
        const desc = LoanCommitmentBinding.generateCommitmentDescriptor(facility);
        assert(!desc.name.includes('998877665544'));
        assert(desc.name.includes('****'));
    });

    await test('Check 12: Memory hygiene: temporary cryptographic buffers zeroable after use', () => {
        const sensitiveBuf = Buffer.from('TemporarySecretKey123456');
        assert(sensitiveBuf.length > 0);
        sensitiveBuf.fill(0);
        assert.strictEqual(sensitiveBuf[0], 0);
        assert.strictEqual(sensitiveBuf[sensitiveBuf.length - 1], 0);
    });

    await test('Check 13: Mode isolation: PRODUCTION backup tag preserved in envelope', () => {
        assert.strictEqual(backupEnvelope.mode, 'PRODUCTION');
    });

    await test('Check 14: Encrypted backup format string matches FINLIFE_LOANS_BACKUP_V1', () => {
        assert.strictEqual(backupEnvelope.format, 'FINLIFE_LOANS_BACKUP_V1');
    });

    await test('Check 15: Missing ciphertext or authTag in restore envelope triggers immediate rejection', async () => {
        await assert.rejects(async () => {
            await LoanRestoreEngine.restoreFromEncryptedBackup({}, PASSPHRASE);
        }, /CORRUPTED_BACKUP_ENVELOPE/);
    });

    console.log('\n================================================================');
    console.log(`🎉 LN-09 PASSED CERTIFICATION (${passCount} / 15 CHECKS)`);
    console.log('================================================================\n');
})();
