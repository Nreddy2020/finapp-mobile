/**
 * services/investingSchemas.js
 * 
 * Canonical contracts, entity constructors, validators, and status enumerations
 * for Phase C.3 Investing Capability Layer.
 * 
 * Single Source of Truth for entity shapes and validation rules.
 */

// 1. Status & Type Enumerations
export const PortfolioStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
});

export const HoldingStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    CLOSED: 'CLOSED'
});

export const InvestmentEventStatus = Object.freeze({
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    FAILED: 'FAILED'
});

export const SipScheduleStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
});

export const AssetType = Object.freeze({
    STOCK: 'STOCK',
    MUTUAL_FUND: 'MUTUAL_FUND',
    ETF: 'ETF',
    GOLD: 'GOLD',
    CRYPTO: 'CRYPTO',
    OTHER: 'OTHER'
});

export const EventType = Object.freeze({
    BUY: 'BUY',
    SELL: 'SELL',
    DIVIDEND: 'DIVIDEND',
    FEE: 'FEE',
    TAX: 'TAX',
    BONUS: 'BONUS',
    SPLIT: 'SPLIT'
});

// 2. Event Semantics Matrix
export const EVENT_SEMANTICS = Object.freeze({
    BUY: { quantityImpact: 'INCREASE', cashFlow: 'OUTFLOW', isIncomeExpense: false },
    SELL: { quantityImpact: 'DECREASE', cashFlow: 'INFLOW', isIncomeExpense: false },
    DIVIDEND: { quantityImpact: 'NONE', cashFlow: 'INFLOW', isIncomeExpense: true, classification: 'INCOME' },
    FEE: { quantityImpact: 'NONE', cashFlow: 'OUTFLOW', isIncomeExpense: true, classification: 'EXPENSE' },
    TAX: { quantityImpact: 'NONE', cashFlow: 'OUTFLOW', isIncomeExpense: true, classification: 'EXPENSE' },
    BONUS: { quantityImpact: 'INCREASE', cashFlow: 'NONE', isIncomeExpense: false },
    SPLIT: { quantityImpact: 'ADJUST', cashFlow: 'NONE', isIncomeExpense: false }
});

// 3. Strict Numeric Normalization Helper
export const parseNumericField = (val, fieldName, defaultValue = 0, allowNegative = false) => {
    if (val === null || val === undefined) return defaultValue;
    if (typeof val === 'number') {
        if (isNaN(val) || !isFinite(val)) {
            throw new TypeError(`[investingSchemas] Invalid numeric value for '${fieldName}': ${val}`);
        }
        if (!allowNegative && val < 0) {
            throw new RangeError(`[investingSchemas] Negative value not allowed for '${fieldName}': ${val}`);
        }
        return val;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        // Reject strings formatted with currency symbols or commas to enforce explicit numbers
        if (/[₹$€£,]/.test(trimmed)) {
            throw new TypeError(`[investingSchemas] Currency-formatted string rejected for '${fieldName}': "${val}". Provide clean numeric values.`);
        }
        const parsed = Number(trimmed);
        if (isNaN(parsed) || !isFinite(parsed)) {
            throw new TypeError(`[investingSchemas] Non-numeric string for '${fieldName}': "${val}"`);
        }
        if (!allowNegative && parsed < 0) {
            throw new RangeError(`[investingSchemas] Negative value not allowed for '${fieldName}': ${parsed}`);
        }
        return parsed;
    }
    throw new TypeError(`[investingSchemas] Unsupported data type for '${fieldName}': ${typeof val}`);
};

// 4. Utility Generators
const generateUniqueId = (prefix) => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${randomStr}`;
};

const normalizeSymbol = (symbol) => {
    if (!symbol || typeof symbol !== 'string') return '';
    return symbol.trim().toUpperCase();
};

// 5. Entity Constructors

/**
 * Creates a canonical Portfolio entity.
 */
export const createPortfolio = (data = {}) => {
    const name = (data.name || 'Primary Portfolio').trim();
    const currency = (data.currency || 'INR').trim().toUpperCase();
    const broker = (data.broker || 'Self-Managed').trim();
    const status = Object.values(PortfolioStatus).includes(data.status) ? data.status : PortfolioStatus.ACTIVE;
    const now = new Date().toISOString();

    return Object.freeze({
        id: data.id || generateUniqueId('port'),
        name,
        currency,
        broker,
        accountId: data.accountId || null,
        status,
        createdAt: data.createdAt || now,
        updatedAt: now
    });
};

/**
 * Creates a canonical Holding entity.
 */
export const createHolding = (data = {}) => {
    if (!data.symbol || typeof data.symbol !== 'string' || !data.symbol.trim()) {
        throw new Error('[investingSchemas] Holding creation requires a valid non-empty symbol.');
    }

    const symbol = normalizeSymbol(data.symbol);
    const name = (data.name || symbol).trim();
    const assetType = Object.values(AssetType).includes(data.assetType) ? data.assetType : AssetType.STOCK;
    const exchange = (data.exchange || 'NSE').trim().toUpperCase();
    const quantity = parseNumericField(data.quantity, 'quantity', 0, false);
    const averageCost = parseNumericField(data.averageCost, 'averageCost', 0, false);
    const currency = (data.currency || 'INR').trim().toUpperCase();
    const status = Object.values(HoldingStatus).includes(data.status) ? data.status : HoldingStatus.ACTIVE;
    const now = new Date().toISOString();

    return Object.freeze({
        id: data.id || generateUniqueId('hold'),
        portfolioId: data.portfolioId || 'default_portfolio',
        symbol,
        name,
        assetType,
        exchange,
        quantity,
        averageCost,
        currency,
        status,
        createdAt: data.createdAt || now,
        updatedAt: now
    });
};

/**
 * Creates a canonical InvestmentEvent entity.
 */
export const createInvestmentEvent = (data = {}) => {
    const type = Object.values(EventType).includes(data.type) ? data.type : EventType.BUY;
    const quantity = parseNumericField(data.quantity, 'quantity', 0, false);
    const price = parseNumericField(data.price, 'price', 0, false);
    const fees = parseNumericField(data.fees, 'fees', 0, false);
    const taxes = parseNumericField(data.taxes, 'taxes', 0, false);

    // Compute gross amount if not explicitly passed
    const rawAmount = data.amount !== undefined ? data.amount : (quantity * price);
    const amount = parseNumericField(rawAmount, 'amount', 0, false);

    const currency = (data.currency || 'INR').trim().toUpperCase();
    const status = Object.values(InvestmentEventStatus).includes(data.status) ? data.status : InvestmentEventStatus.CONFIRMED;
    const now = new Date().toISOString();

    return Object.freeze({
        id: data.id || generateUniqueId('evt'),
        portfolioId: data.portfolioId || 'default_portfolio',
        holdingId: data.holdingId || null,
        type,
        date: data.date || now,
        quantity,
        price,
        amount,
        fees,
        taxes,
        currency,
        sourceAccountId: data.sourceAccountId || null,
        linkedTransactionId: data.linkedTransactionId || null,
        status,
        createdAt: data.createdAt || now
    });
};

/**
 * Creates a canonical SipSchedule entity.
 */
export const createSipSchedule = (data = {}) => {
    const amount = parseNumericField(data.amount, 'amount', 0, false);
    const frequency = ['MONTHLY', 'WEEKLY', 'QUARTERLY'].includes(data.frequency) ? data.frequency : 'MONTHLY';
    const status = Object.values(SipScheduleStatus).includes(data.status) ? data.status : SipScheduleStatus.ACTIVE;
    const now = new Date().toISOString();

    return Object.freeze({
        id: data.id || generateUniqueId('sip'),
        portfolioId: data.portfolioId || 'default_portfolio',
        holdingId: data.holdingId || null,
        amount,
        frequency,
        startDate: data.startDate || now,
        nextRunDate: data.nextRunDate || now,
        sourceAccountId: data.sourceAccountId || null,
        status,
        createdAt: data.createdAt || now
    });
};

// 6. Validation Helpers

export const validatePortfolio = (portfolio) => {
    if (!portfolio || typeof portfolio !== 'object') return false;
    if (!portfolio.id || !portfolio.name) return false;
    return Object.values(PortfolioStatus).includes(portfolio.status);
};

export const validateHolding = (holding) => {
    if (!holding || typeof holding !== 'object') return false;
    if (!holding.id || !holding.symbol) return false;
    if (typeof holding.quantity !== 'number' || isNaN(holding.quantity) || holding.quantity < 0) return false;
    if (typeof holding.averageCost !== 'number' || isNaN(holding.averageCost) || holding.averageCost < 0) return false;
    return Object.values(HoldingStatus).includes(holding.status);
};

export const validateInvestmentEvent = (event) => {
    if (!event || typeof event !== 'object') return false;
    if (!event.id || !event.type) return false;
    if (!Object.values(EventType).includes(event.type)) return false;
    if (typeof event.quantity !== 'number' || isNaN(event.quantity) || event.quantity < 0) return false;
    if (typeof event.price !== 'number' || isNaN(event.price) || event.price < 0) return false;
    return Object.values(InvestmentEventStatus).includes(event.status);
};
