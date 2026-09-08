/**
 * app/(tabs)/loans.js
 * 
 * Backward-Compatible Route Wrapper for Formal Loans.
 * Canonical home: /(tabs)/banking-credit?tab=loans
 * 
 * Preserves existing deep links, route parameters, and test selectors.
 */

import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resolveBankingCreditRoute } from '../../services/banking-credit/bankingCreditContracts.js';
import BankingCreditScreen from './banking-credit.js';

export default function LoansScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        const resolved = resolveBankingCreditRoute('/loans', params);
        if (resolved.isRedirect) {
            router.replace(`${resolved.canonicalRoute}?tab=${resolved.targetTab}`);
        }
    }, [params, router]);

    return <BankingCreditScreen initialTab="loans" />;
}
