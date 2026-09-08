import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import { CashbookType, createCashbook } from '../services/cashbook/cashbookContracts.js';

async function run() {
    const targetType = process.argv[2] || CashbookType.BUSINESS_CASH_AND_OBLIGATIONS;
    const mode = 'DEMO';
    const env = await CashbookRepository.load({ mode });

    let book = env.books.find(b => b.type === targetType);
    if (!book) {
        let name = 'Business Operations';
        if (targetType === CashbookType.LOANS_TAKEN) name = 'HDFC Home Loan';
        if (targetType === CashbookType.PF) name = 'EPFO Provident Fund';

        book = createCashbook({
            id: `book_${targetType.toLowerCase()}_${Date.now().toString(36)}`,
            name,
            type: targetType,
            description: `${name} Ledger`
        });
        await CashbookRepository.saveBook(book, { mode });
    }

    await CashbookRepository.setActiveBookId(book.id, { mode });
    console.log(`Switched to book: ${book.name} (${book.type})`);
}

run().catch(console.error);
