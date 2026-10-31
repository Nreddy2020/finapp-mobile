/**
 * components/family/navigation/navigationHelpers.js
 * 
 * FinLife Family OS Phase 2 Navigation Helpers & Invariants.
 * Pure JS implementations free of JSX to enable deterministic unit testing and runtime reliability.
 */

/**
 * Authoritative Family Top Tab definitions
 */
export const FAMILY_TABS = [
    { id: 'home', label: 'Home', route: '/family' },
    { id: 'people', label: 'People', route: '/family/people' },
    { id: 'operations', label: 'Operations', route: '/family/operations' },
    { id: 'protection', label: 'Protection', route: '/family/protection' },
    { id: 'more', label: 'More', route: '/family/more' }
];

/**
 * Pure function mapping pathname to active tab id.
 * Guaranteed to be single source of truth from Expo Router.
 */
export function getActiveTabFromPathname(pathname) {
    if (!pathname || typeof pathname !== 'string') return 'home';
    const clean = pathname.replace(/\/$/, '');
    if (clean === '/family') return 'home';
    if (clean.startsWith('/family/people')) return 'people';
    if (clean.startsWith('/family/operations')) return 'operations';
    if (clean.startsWith('/family/protection')) return 'protection';
    if (clean.startsWith('/family/more')) return 'more';
    return 'home';
}

/**
 * Pure helper resolving authoritative display states from household entity.
 * Guarantees zero hardcoded sample names or sample member counts.
 */
export function resolveHouseholdBannerState(household, error = null) {
    if (error) {
        return {
            type: 'UNAVAILABLE',
            title: 'Household Information Unavailable',
            badgeText: 'Unavailable',
            badgeColor: '#EF4444',
            badgeBg: '#EF444420',
            description: 'Unable to load family household status'
        };
    }

    if (!household || !household.id) {
        return {
            type: 'NO_HOUSEHOLD',
            title: 'No Household Configured',
            badgeText: 'Not Configured',
            badgeColor: '#71717A',
            badgeBg: '#71717A20',
            description: 'Set up a family household to get started'
        };
    }

    const confirmedCount = Array.isArray(household.activeMemberIds) 
        ? household.activeMemberIds.length 
        : (household.confirmedCount || 0);

    const provisionalCount = Array.isArray(household.provisionalMemberIds) 
        ? household.provisionalMemberIds.length 
        : (household.provisionalCount || 0);

    if (household.status === 'PROVISIONAL') {
        return {
            type: 'PROVISIONAL',
            title: household.name || 'Provisional Household',
            badgeText: 'Provisional',
            badgeColor: '#F59E0B',
            badgeBg: '#F59E0B20',
            description: `0 Confirmed Members • ${provisionalCount} Pending Review`
        };
    }

    // Default: ACTIVE or confirmed
    return {
        type: 'ACTIVE',
        title: household.name || 'Primary Household',
        badgeText: 'Active',
        badgeColor: '#10B981',
        badgeBg: '#10B98120',
        description: `${confirmedCount} Confirmed Member${confirmedCount === 1 ? '' : 's'}`
    };
}

/**
 * Authoritative main FinLife application home route.
 */
export const FINLIFE_HOME_ROUTE = '/(tabs)';

/**
 * Pure helper to determine back navigation action preserving caller or fallback.
 */
export function resolveBackNavigationAction(canGoBack, fallbackRoute = '/family') {
    if (canGoBack) {
        return { action: 'back' };
    }
    return { action: 'replace', route: fallbackRoute };
}

/**
 * Pure helper to resolve Global FinLife Home navigation action.
 * Always returns the deterministic replace action to the authoritative main FinLife Home route.
 * Guarantees safe exit from any Family route regardless of stack depth.
 */
export function resolveGlobalHomeNavigationAction() {
    return { action: 'replace', route: FINLIFE_HOME_ROUTE };
}

/**
 * Validates tab label legibility and display metadata.
 */
export function getTabDisplayMetadata() {
    return FAMILY_TABS.map(tab => ({
        id: tab.id,
        label: tab.label,
        charLength: tab.label.length,
        isLegible: tab.label.length >= 3 && tab.label.length <= 12
    }));
}

