import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';

async function main() {
    const env = await CashbookRepository.load({ mode: 'DEMO' });
    console.log('Books in DEMO:');
    env.books.forEach(b => console.log(`  - ${b.id}: ${b.name} (${b.type})`));
    console.log('Accounts in DEMO:');
    env.accounts.forEach(a => console.log(`  - ${a.id}: ${a.name} (${a.type})`));
    console.log('Active Book ID:', env.activeBookId);
}

main().catch(console.error);
