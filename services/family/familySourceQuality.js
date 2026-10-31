// Identifiers emitted by the former screen-open demonstration seeder.
// Preserve those records for review, but never treat sample entries as actual spending.
export function hasSamplePoolData(pool) {
    return (pool.linkedExpenses || []).some(entry => /^seed_/.test(entry.transactionId || '')) ||
        (pool.contributorSplitVersions || []).some(version => (version.contributorSplits || []).some(split => split.personId === 'p_unassigned_phantom'));
}
