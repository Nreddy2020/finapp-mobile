import assert from 'assert';
import {
  PropertyService,
  PROPERTY_STORAGE_KEYS
} from '../../services/propertyService.js';
import {
  PROPERTY_TYPES,
  PROPERTY_LIFECYCLE_STATES,
  PROPERTY_RISK_STATUS,
  VALUATION_METHODS,
  VALUATION_CONFIDENCE
} from '../../components/properties/propertyContracts.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log('  🟢 ' + desc);
  } catch (err) {
    console.error('  ❌ FAIL: ' + desc);
    console.error(err);
    throw err;
  }
}

async function itAsync(desc, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log('  🟢 ' + desc);
  } catch (err) {
    console.error('  ❌ FAIL: ' + desc);
    console.error(err);
    throw err;
  }
}

export async function runPropertyUpgradePersistenceTests() {
  console.log('================================================================');
  console.log('=== FINLIFE IN-PLACE UPGRADE PERSISTENCE & DATA INTEGRITY    ===');
  console.log('================================================================\n');

  passed = 0;
  total = 0;

  // Step 1: Initialize baseline with seed canonical properties
  await PropertyService.resetToCleanState();
  const initialList = await PropertyService.seedCanonicalProperties();
  assert.strictEqual(initialList.length, 6, 'Seed baseline must contain 6 canonical properties');

  // Step 2: User customizes data (adds a new custom property, updates valuation on villa)
  const customProperty = {
    propertyId: 'prop_user_custom_99',
    displayName: 'Custom Family Penthouse',
    propertyType: PROPERTY_TYPES.APARTMENT,
    status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
    marketValuePaise: 380_000_00_00n,
    purchasePricePaise: 290_000_00_00n,
    registrationChargesPaise: 15_00_00_00n,
    stampDutyPaise: 19_00_00_00n,
    builtUpAreaMicros: 3_200_000_000n,
    valuationDate: '2026-01-15',
    valuationMethod: VALUATION_METHODS.BANK_APPRAISAL,
    valuationConfidence: VALUATION_CONFIDENCE.HIGH,
    riskStatus: PROPERTY_RISK_STATUS.CLEAR,
    ownership: [
      { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 7000n },
      { ownerId: 'spouse', ownerName: 'Spouse', relation: 'SPOUSE', shareBps: 3000n }
    ],
    documents: [
      { documentId: 'doc_custom_01', title: 'Mother Deed', documentType: 'SALE_DEED', verificationStatus: 'VERIFIED', uploadDate: '2026-01-10' }
    ],
    valuations: [
      { valuationId: 'val_custom_01', valuationDate: '2026-01-15', marketValuePaise: 380_000_00_00n, valuationMethod: VALUATION_METHODS.BANK_APPRAISAL, valuationConfidence: VALUATION_CONFIDENCE.HIGH, notes: 'Pre-upgrade appraisal' }
    ]
  };

  await PropertyService.addProperty(customProperty);

  // Append valuation to existing villa
  await PropertyService.recordValuation('prop_villa_01', {
    valuationId: 'val_villa_2026_pre_upgrade',
    valuationDate: '2026-02-01',
    marketValuePaise: 260_000_00_00n,
    valuationMethod: VALUATION_METHODS.BANK_APPRAISAL,
    valuationConfidence: VALUATION_CONFIDENCE.HIGH,
    notes: 'Pre-upgrade reassessment'
  });

  // Capture pre-upgrade snapshot
  const preUpgradeProperties = await PropertyService.getAllProperties();
  const preVilla = preUpgradeProperties.find(p => p.propertyId === 'prop_villa_01');
  const preApt = preUpgradeProperties.find(p => p.propertyId === 'prop_apt_02');
  const preCustom = preUpgradeProperties.find(p => p.propertyId === 'prop_user_custom_99');

  const preSnapshot = {
    totalCount: preUpgradeProperties.length,
    villaMarketValuePaise: preVilla.marketValuePaise,
    villaValuationsCount: preVilla.valuations.length,
    villaValuationId: preVilla.valuations[0].valuationId,
    aptMonthlyRentPaise: preApt.tenancy.monthlyRentPaise,
    aptSecurityDepositPaise: preApt.tenancy.securityDepositLiabilityPaise,
    aptDocumentsCount: preApt.documents.length,
    customPropertyPresent: Boolean(preCustom),
    customOwnershipSelfBps: preCustom.ownership.find(o => o.ownerId === 'self').shareBps
  };

  // Step 3: Simulate in-place upgrade (cold process death, new binary bootstrap, clear memory cache)
  PropertyService.clearMemoryCache();

  // On new binary boot, app re-executes seedCanonicalProperties()
  const postUpgradeProperties = await PropertyService.seedCanonicalProperties();

  // Step 4: Verification Assertions

  await itAsync('UPGRADE-01: Property count is preserved before and after upgrade (7 properties)', async () => {
    assert.strictEqual(postUpgradeProperties.length, preSnapshot.totalCount);
    assert.strictEqual(postUpgradeProperties.length, 7);
  });

  await itAsync('UPGRADE-02: Valuation history preserved before and after (villa maintains new appraisal)', async () => {
    const postVilla = postUpgradeProperties.find(p => p.propertyId === 'prop_villa_01');
    assert.strictEqual(postVilla.marketValuePaise, preSnapshot.villaMarketValuePaise);
    assert.strictEqual(postVilla.marketValuePaise, 260_000_00_00n);
    assert.strictEqual(postVilla.valuations.length, preSnapshot.villaValuationsCount);
    assert.strictEqual(postVilla.valuations[0].valuationId, preSnapshot.villaValuationId);
  });

  await itAsync('UPGRADE-03: Co-ownership records preserved without drift (custom 70/30 share intact)', async () => {
    const postCustom = postUpgradeProperties.find(p => p.propertyId === 'prop_user_custom_99');
    assert.ok(postCustom, 'Custom property must exist post-upgrade');
    const selfShare = postCustom.ownership.find(o => o.ownerId === 'self').shareBps;
    assert.strictEqual(selfShare, preSnapshot.customOwnershipSelfBps);
    assert.strictEqual(selfShare, 7000n);
  });

  await itAsync('UPGRADE-04: Tenancy agreement and security deposit liabilities preserved intact', async () => {
    const postApt = postUpgradeProperties.find(p => p.propertyId === 'prop_apt_02');
    assert.strictEqual(postApt.tenancy.monthlyRentPaise, preSnapshot.aptMonthlyRentPaise);
    assert.strictEqual(postApt.tenancy.securityDepositLiabilityPaise, preSnapshot.aptSecurityDepositPaise);
    assert.strictEqual(postApt.tenancy.isLiability, true);
    assert.strictEqual(postApt.tenancy.tenantName, 'Anand Sharma');
  });

  await itAsync('UPGRADE-05: Document metadata and verification statuses preserved intact', async () => {
    const postApt = postUpgradeProperties.find(p => p.propertyId === 'prop_apt_02');
    assert.strictEqual(postApt.documents.length, preSnapshot.aptDocumentsCount);
    assert.strictEqual(postApt.documents[0].verificationStatus, 'VERIFIED');
    assert.strictEqual(postApt.documents[1].verificationStatus, 'VALID');
  });

  await itAsync('UPGRADE-06: Zero duplicate properties created during post-upgrade seed check', async () => {
    const ids = postUpgradeProperties.map(p => p.propertyId);
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, ids.length, 'All property IDs must remain strictly unique');
    assert.strictEqual(ids.filter(id => id === 'prop_villa_01').length, 1);
  });

  await itAsync('UPGRADE-07: Custom user data not reset or overwritten by canonical seed', async () => {
    const postCustom = postUpgradeProperties.find(p => p.propertyId === 'prop_user_custom_99');
    assert.ok(postCustom);
    assert.strictEqual(postCustom.displayName, 'Custom Family Penthouse');
    assert.strictEqual(postCustom.marketValuePaise, 380_000_00_00n);
  });

  await itAsync('UPGRADE-08: Historical sold property remains isolated post-upgrade', async () => {
    const postSold = postUpgradeProperties.find(p => p.propertyId === 'prop_sold_06');
    assert.ok(postSold);
    assert.strictEqual(postSold.status, PROPERTY_LIFECYCLE_STATES.SOLD);
    const active = await PropertyService.getActiveProperties();
    assert.strictEqual(active.length, 6);
    assert.strictEqual(active.some(p => p.propertyId === 'prop_sold_06'), false);
  });

  await itAsync('UPGRADE-09: Non-property module records (Assets, P2P, Banking) survive upgrade intact', async () => {
    // Write mock data to non-property AsyncStorage keys
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('@finlife_assets_registry_v1', JSON.stringify([{ assetId: 'gold_01', type: 'GOLD' }]));
    await AsyncStorage.setItem('@finlife_banking_accounts_v1', JSON.stringify([{ accountId: 'acc_hdfc_01', balancePaise: '50000000' }]));
    await AsyncStorage.setItem('@finlife_p2p_loans_v1', JSON.stringify([{ loanId: 'p2p_01', principalPaise: '10000000' }]));

    // Re-verify after cache reset and property boot
    PropertyService.clearMemoryCache();
    await PropertyService.seedCanonicalProperties();

    const assetsRaw = await AsyncStorage.getItem('@finlife_assets_registry_v1');
    const bankingRaw = await AsyncStorage.getItem('@finlife_banking_accounts_v1');
    const p2pRaw = await AsyncStorage.getItem('@finlife_p2p_loans_v1');

    assert.ok(assetsRaw && JSON.parse(assetsRaw)[0].assetId === 'gold_01', 'Assets data must survive');
    assert.ok(bankingRaw && JSON.parse(bankingRaw)[0].accountId === 'acc_hdfc_01', 'Banking data must survive');
    assert.ok(p2pRaw && JSON.parse(p2pRaw)[0].loanId === 'p2p_01', 'P2P data must survive');
  });

  await itAsync('UPGRADE-10: Zero duplicate loans or cross-module leaks across Property/Loan boundaries', async () => {
    // Assert Properties module never inserts synthetic loan records or alters Loans module storage
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const loanRegistryBefore = await AsyncStorage.getItem('@finlife_loans_registry_v1');
    
    // Perform operations in PropertyService
    await PropertyService.getAllProperties();
    await PropertyService.getActiveProperties();
    
    const loanRegistryAfter = await AsyncStorage.getItem('@finlife_loans_registry_v1');
    assert.strictEqual(loanRegistryBefore, loanRegistryAfter, 'Properties module must NEVER mutate Loans registry');
  });

  console.log('\n🎉 ALL ' + passed + ' / ' + total + ' UPGRADE DATA PRESERVATION INVARIANT TESTS PASSED!');
  return { passed, total };
}

if (process.argv[1]?.endsWith('test_property_upgrade_persistence.mjs')) {
  runPropertyUpgradePersistenceTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
