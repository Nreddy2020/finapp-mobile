/**
 * app/(tabs)/emis.js
 * 
 * Backward-Compatible Route Wrapper for EMI Tracker / Repayments.
 * Canonical home: /(tabs)/banking-credit?tab=repayments
 * 
 * Preserves existing deep links, route parameters, and test selectors.
 */

import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { resolveBankingCreditRoute } from '../../services/banking-credit/bankingCreditContracts.js';
import BankingCreditScreen from './banking-credit.js';

export default function EMIsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        const resolved = resolveBankingCreditRoute('/emis', params);
        if (resolved.isRedirect) {
            router.replace(`${resolved.canonicalRoute}?tab=${resolved.targetTab}`);
        }
    }, [params, router]);

    return <BankingCreditScreen initialTab="repayments" />;
}
