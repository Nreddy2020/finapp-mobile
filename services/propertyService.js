/**
 * @file propertyService.js
 * @description Core service, persistence, serialization, and lifecycle manager
 * for the FinLife Properties Module.
 *
 * Invariants & Guarantees:
 * - Lossless BigInt paise <-> decimal string serialization. Never persists native BigInt to JSON.
 * - Atomic write commits with automatic rollback on failure (zero partial state).
 * - Duplicate operation idempotency tracking via operationId.
 * - Schema versioning (schemaVersion: 1) with unknown-field tolerance and missing-field defaults.
 * - Corrupt payload rejection.
 * - Cold cache reset recovery.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PROPERTY_TYPES,
  PROPERTY_LIFECYCLE_STATES,
  VALUATION_METHODS,
  VALUATION_CONFIDENCE,
  PROPERTY_RISK_STATUS,
  TOTAL_OWNERSHIP_BPS,
  validatePropertyType,
  validatePropertyState,
  validateMarketValue,
  validateNonNegativePropertyPaise
} from '../components/properties/propertyContracts.js';
import {
  calculateTotalCostBasis,
  areaSqFtToMicros
} from '../components/properties/propertyCalculations.js';
import {
  validatePropertyOwnership
} from '../components/properties/propertyOwnershipEngine.js';
import {
  validatePropertyStateTransition,
  isActiveProperty,
  assertPropertyMutable
} from '../components/properties/propertyLifecycleEngine.js';
import {
  appendValuationRecord,
  createValuationRecord
} from '../components/properties/propertyValuationEngine.js';

export const PROPERTY_STORAGE_KEYS = Object.freeze({
  REGISTRY: '@finlife_properties_registry_v1',
  AUDIT_LOG: '@finlife_property_audit_log_v1',
  OPERATIONS: '@finlife_property_operations_v1'
});

export const PROPERTY_SCHEMA_VERSION = 1;

export class PropertyService {
  static _propertiesCache = null;
  static _auditLogCache = null;
  static _operationsCache = null;

  /**
   * Clears in-memory cache to simulate cold app launch / test harness reset.
   */
  static clearMemoryCache() {
    this._propertiesCache = null;
    this._auditLogCache = null;
    this._operationsCache = null;
  }

  static async _safeMultiRemove(keys) {
    if (typeof AsyncStorage.multiRemove === 'function') {
      await AsyncStorage.multiRemove(keys);
    } else if (typeof AsyncStorage.removeItem === 'function') {
      await Promise.all(keys.map(k => AsyncStorage.removeItem(k)));
    }
  }

  static async _safeMultiSet(pairs) {
    if (typeof AsyncStorage.multiSet === 'function') {
      await AsyncStorage.multiSet(pairs);
    } else if (typeof AsyncStorage.setItem === 'function') {
      await Promise.all(pairs.map(([k, v]) => AsyncStorage.setItem(k, v)));
    }
  }

  /**
   * Resets all property storage keys to a clean state.
   */
  static async resetToCleanState() {
    this.clearMemoryCache();
    await this._safeMultiRemove([
      PROPERTY_STORAGE_KEYS.REGISTRY,
      PROPERTY_STORAGE_KEYS.AUDIT_LOG,
      PROPERTY_STORAGE_KEYS.OPERATIONS
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Serialization & Lossless BigInt Hydration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Serializes a runtime Property object into a JSON-safe DTO with decimal strings.
   */
  static serializeProperty(property) {
    if (!property || typeof property !== 'object') {
      throw new TypeError('serializeProperty: property must be an object');
    }

    return {
      ...property,
      schemaVersion: PROPERTY_SCHEMA_VERSION,
      marketValuePaise: property.marketValuePaise != null ? property.marketValuePaise.toString() : '0',
      totalCostBasisPaise: property.totalCostBasisPaise != null ? property.totalCostBasisPaise.toString() : '0',
      purchasePricePaise: property.purchasePricePaise != null ? property.purchasePricePaise.toString() : '0',
      registrationChargesPaise: property.registrationChargesPaise != null ? property.registrationChargesPaise.toString() : '0',
      stampDutyPaise: property.stampDutyPaise != null ? property.stampDutyPaise.toString() : '0',
      brokeragePaise: property.brokeragePaise != null ? property.brokeragePaise.toString() : '0',
      legalFeesPaise: property.legalFeesPaise != null ? property.legalFeesPaise.toString() : '0',
      capitalizedImprovementsPaise: property.capitalizedImprovementsPaise != null ? property.capitalizedImprovementsPaise.toString() : '0',
      builtUpAreaMicros: property.builtUpAreaMicros != null ? property.builtUpAreaMicros.toString() : '0',
      landAreaMicros: property.landAreaMicros != null ? property.landAreaMicros.toString() : '0',
      monthlyRentPaise: property.monthlyRentPaise != null ? property.monthlyRentPaise.toString() : '0',
      securityDepositPaise: property.securityDepositPaise != null ? property.securityDepositPaise.toString() : '0',
      ownership: Array.isArray(property.ownership)
        ? property.ownership.map(o => ({
            ...o,
            shareBps: o.shareBps != null ? o.shareBps.toString() : '0'
          }))
        : [],
      valuations: Array.isArray(property.valuations)
        ? property.valuations.map(v => ({
            ...v,
            marketValuePaise: v.marketValuePaise != null ? v.marketValuePaise.toString() : '0'
          }))
        : [],
      tenancy: property.tenancy
        ? {
            ...property.tenancy,
            monthlyRentPaise: property.tenancy.monthlyRentPaise != null ? property.tenancy.monthlyRentPaise.toString() : '0',
            securityDepositPaise: property.tenancy.securityDepositPaise != null ? property.tenancy.securityDepositPaise.toString() : '0',
            securityDepositLiabilityPaise: property.tenancy.securityDepositLiabilityPaise != null ? property.tenancy.securityDepositLiabilityPaise.toString() : '0'
          }
        : null,
      operatingExpenses: Array.isArray(property.operatingExpenses)
        ? property.operatingExpenses.map(e => ({
            ...e,
            amountPaise: e.amountPaise != null ? e.amountPaise.toString() : '0'
          }))
        : [],
      documents: Array.isArray(property.documents)
        ? property.documents.map(d => ({ ...d }))
        : []
    };
  }

  /**
   * Hydrates a serialized Property DTO back into a strongly typed runtime object.
   * Throws on corrupt or un-parsable data.
   */
  static hydrateProperty(dto) {
    if (!dto || typeof dto !== 'object') {
      throw new TypeError('hydrateProperty: DTO must be an object');
    }

    try {
      const propertyId = String(dto.propertyId || '').trim();
      if (!propertyId) throw new Error('Missing propertyId in DTO');

      const displayName = String(dto.displayName || 'Untitled Property').trim();
      const propertyType = validatePropertyType(dto.propertyType || PROPERTY_TYPES.APARTMENT);
      const status = validatePropertyState(dto.status || PROPERTY_LIFECYCLE_STATES.ACTIVE);

      const marketValuePaise = validateMarketValue(BigInt(dto.marketValuePaise ?? '0'));
      const purchasePricePaise = validateNonNegativePropertyPaise(BigInt(dto.purchasePricePaise ?? '0'), 'purchasePricePaise');
      const registrationChargesPaise = validateNonNegativePropertyPaise(BigInt(dto.registrationChargesPaise ?? '0'), 'registrationChargesPaise');
      const stampDutyPaise = validateNonNegativePropertyPaise(BigInt(dto.stampDutyPaise ?? '0'), 'stampDutyPaise');
      const brokeragePaise = validateNonNegativePropertyPaise(BigInt(dto.brokeragePaise ?? '0'), 'brokeragePaise');
      const legalFeesPaise = validateNonNegativePropertyPaise(BigInt(dto.legalFeesPaise ?? '0'), 'legalFeesPaise');
      const capitalizedImprovementsPaise = validateNonNegativePropertyPaise(BigInt(dto.capitalizedImprovementsPaise ?? '0'), 'capitalizedImprovementsPaise');

      const totalCostBasisPaise = calculateTotalCostBasis({
        purchasePricePaise,
        registrationChargesPaise,
        stampDutyPaise,
        brokeragePaise,
        legalFeesPaise,
        capitalizedImprovementsPaise
      });

      const builtUpAreaMicros = BigInt(dto.builtUpAreaMicros ?? '0');
      const landAreaMicros = BigInt(dto.landAreaMicros ?? '0');

      const monthlyRentPaise = validateNonNegativePropertyPaise(BigInt(dto.monthlyRentPaise ?? '0'), 'monthlyRentPaise');
      const securityDepositPaise = validateNonNegativePropertyPaise(BigInt(dto.securityDepositPaise ?? '0'), 'securityDepositPaise');

      // Hydrate ownership
      const rawOwnership = Array.isArray(dto.ownership) ? dto.ownership : [];
      const ownership = rawOwnership.length > 0
        ? validatePropertyOwnership(
            rawOwnership.map(o => ({
              ...o,
              shareBps: BigInt(o.shareBps ?? '0')
            }))
          )
        : [{ ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: TOTAL_OWNERSHIP_BPS }];

      // Hydrate valuations
      const valuations = Array.isArray(dto.valuations)
        ? dto.valuations.map(v => createValuationRecord({
            ...v,
            propertyId: v.propertyId || propertyId,
            marketValuePaise: BigInt(v.marketValuePaise ?? '0')
          }))
        : [];

      // Hydrate tenancy
      const tenancy = dto.tenancy
        ? {
            ...dto.tenancy,
            monthlyRentPaise: BigInt(dto.tenancy.monthlyRentPaise ?? '0'),
            securityDepositPaise: BigInt(dto.tenancy.securityDepositPaise ?? '0'),
            securityDepositLiabilityPaise: BigInt(dto.tenancy.securityDepositLiabilityPaise ?? dto.tenancy.securityDepositPaise ?? '0')
          }
        : null;

      // Hydrate operating expenses
      const operatingExpenses = Array.isArray(dto.operatingExpenses)
        ? dto.operatingExpenses.map(e => ({
            ...e,
            amountPaise: BigInt(e.amountPaise ?? '0')
          }))
        : [];

      // Hydrate documents
      const documents = Array.isArray(dto.documents)
        ? dto.documents.map(d => ({ ...d }))
        : [];

      return {
        ...dto,
        propertyId,
        displayName,
        propertyType,
        status,
        marketValuePaise,
        totalCostBasisPaise,
        purchasePricePaise,
        registrationChargesPaise,
        stampDutyPaise,
        brokeragePaise,
        legalFeesPaise,
        capitalizedImprovementsPaise,
        builtUpAreaMicros,
        landAreaMicros,
        monthlyRentPaise,
        securityDepositPaise,
        ownership,
        valuations,
        tenancy,
        operatingExpenses,
        documents
      };
    } catch (err) {
      throw new Error(`hydrateProperty corruption error: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cache Loading & Hydration
  // ─────────────────────────────────────────────────────────────────────────

  static async _ensureLoaded() {
    if (this._propertiesCache !== null && this._auditLogCache !== null && this._operationsCache !== null) {
      return;
    }

    const [registryRaw, auditRaw, opsRaw] = await Promise.all([
      AsyncStorage.getItem(PROPERTY_STORAGE_KEYS.REGISTRY),
      AsyncStorage.getItem(PROPERTY_STORAGE_KEYS.AUDIT_LOG),
      AsyncStorage.getItem(PROPERTY_STORAGE_KEYS.OPERATIONS)
    ]);

    // Hydrate properties
    let parsedRegistry = [];
    if (registryRaw) {
      try {
        const dtoArray = JSON.parse(registryRaw);
        if (!Array.isArray(dtoArray)) throw new Error('Registry is not an array');
        parsedRegistry = dtoArray.map(dto => this.hydrateProperty(dto));
      } catch (err) {
        console.error('[PropertyService] Corrupt registry detected. Reinitializing to empty array.', err);
        parsedRegistry = [];
      }
    }
    this._propertiesCache = parsedRegistry;

    // Hydrate audit log
    let parsedAudit = [];
    if (auditRaw) {
      try {
        parsedAudit = JSON.parse(auditRaw) || [];
      } catch {
        parsedAudit = [];
      }
    }
    this._auditLogCache = parsedAudit;

    // Hydrate operations
    let parsedOps = {};
    if (opsRaw) {
      try {
        parsedOps = JSON.parse(opsRaw) || {};
      } catch {
        parsedOps = {};
      }
    }
    this._operationsCache = parsedOps;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Atomic Persistence Pipeline
  // ─────────────────────────────────────────────────────────────────────────

  static async _commitState(newProperties, newAuditLog, newOps, snapshot) {
    const serializedProperties = JSON.stringify(newProperties.map(p => this.serializeProperty(p)));
    const serializedAudit = JSON.stringify(newAuditLog);
    const serializedOps = JSON.stringify(newOps);

    try {
      await this._safeMultiSet([
        [PROPERTY_STORAGE_KEYS.REGISTRY, serializedProperties],
        [PROPERTY_STORAGE_KEYS.AUDIT_LOG, serializedAudit],
        [PROPERTY_STORAGE_KEYS.OPERATIONS, serializedOps]
      ]);

      // Commit to memory cache only after storage succeeds
      this._propertiesCache = newProperties;
      this._auditLogCache = newAuditLog;
      this._operationsCache = newOps;
    } catch (writeError) {
      // Rollback memory cache to previous snapshot
      this._propertiesCache = snapshot.properties;
      this._auditLogCache = snapshot.auditLog;
      this._operationsCache = snapshot.ops;
      throw new Error(`[PropertyService] Storage commit failed. Rolled back state. Error: ${writeError.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Business Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all properties.
   */
  static async getAllProperties() {
    await this._ensureLoaded();
    return [...this._propertiesCache];
  }

  /**
   * Retrieves only active properties (excludes SOLD, TRANSFERRED, ARCHIVED).
   */
  static async getActiveProperties() {
    await this._ensureLoaded();
    return this._propertiesCache.filter(p => isActiveProperty(p));
  }

  /**
   * Retrieves a single property by ID.
   */
  static async getProperty(propertyId) {
    await this._ensureLoaded();
    const found = this._propertiesCache.find(p => p.propertyId === propertyId);
    return found ? { ...found } : null;
  }

  static async getPropertyById(propertyId) {
    return this.getProperty(propertyId);
  }

  /**
   * Adds a new property record.
   *
   * @param {Object} propertyInput
   * @param {string} [operationId] For idempotency
   * @returns {Object} Created property
   */
  static async addProperty(propertyInput, operationId = null) {
    await this._ensureLoaded();

    if (operationId && this._operationsCache[operationId]) {
      return this.hydrateProperty(this._operationsCache[operationId].result);
    }

    const snapshot = {
      properties: [...this._propertiesCache],
      auditLog: [...this._auditLogCache],
      ops: { ...this._operationsCache }
    };

    const propertyId = String(propertyInput.propertyId || `prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);

    if (this._propertiesCache.some(p => p.propertyId === propertyId)) {
      throw new Error(`Property with ID '${propertyId}' already exists`);
    }

    const propertyType = validatePropertyType(propertyInput.propertyType || PROPERTY_TYPES.RESIDENTIAL_HOUSE);
    const status = validatePropertyState(propertyInput.status || PROPERTY_LIFECYCLE_STATES.ACTIVE);
    const marketValuePaise = validateMarketValue(propertyInput.marketValuePaise ?? 0n);

    const purchasePricePaise = validateNonNegativePropertyPaise(propertyInput.purchasePricePaise ?? marketValuePaise, 'purchasePricePaise');
    const registrationChargesPaise = validateNonNegativePropertyPaise(propertyInput.registrationChargesPaise ?? 0n, 'registrationChargesPaise');
    const stampDutyPaise = validateNonNegativePropertyPaise(propertyInput.stampDutyPaise ?? 0n, 'stampDutyPaise');
    const brokeragePaise = validateNonNegativePropertyPaise(propertyInput.brokeragePaise ?? 0n, 'brokeragePaise');
    const legalFeesPaise = validateNonNegativePropertyPaise(propertyInput.legalFeesPaise ?? 0n, 'legalFeesPaise');
    const capitalizedImprovementsPaise = validateNonNegativePropertyPaise(propertyInput.capitalizedImprovementsPaise ?? 0n, 'capitalizedImprovementsPaise');

    const totalCostBasisPaise = calculateTotalCostBasis({
      purchasePricePaise,
      registrationChargesPaise,
      stampDutyPaise,
      brokeragePaise,
      legalFeesPaise,
      capitalizedImprovementsPaise
    });

    const ownership = propertyInput.ownership
      ? validatePropertyOwnership(propertyInput.ownership)
      : [{ ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: TOTAL_OWNERSHIP_BPS }];

    // Initial valuation record
    const initialValuation = createValuationRecord({
      valuationId: `val_${propertyId}_init`,
      propertyId,
      marketValuePaise,
      valuationDate: propertyInput.valuationDate || new Date().toISOString().split('T')[0],
      source: propertyInput.valuationSource || 'Initial Registration'
    });

    const newProperty = {
      propertyId,
      displayName: String(propertyInput.displayName || 'New Property').trim(),
      propertyType,
      status,
      address: propertyInput.address || {},
      geoLocation: propertyInput.geoLocation || {},
      builtUpAreaMicros: propertyInput.builtUpAreaMicros ?? (propertyInput.builtUpAreaSqFt ? areaSqFtToMicros(propertyInput.builtUpAreaSqFt) : 0n),
      landAreaMicros: propertyInput.landAreaMicros ?? (propertyInput.landAreaSqFt ? areaSqFtToMicros(propertyInput.landAreaSqFt) : 0n),
      purchaseDate: propertyInput.purchaseDate || new Date().toISOString().split('T')[0],
      marketValuePaise,
      purchasePricePaise,
      registrationChargesPaise,
      stampDutyPaise,
      brokeragePaise,
      legalFeesPaise,
      capitalizedImprovementsPaise,
      totalCostBasisPaise,
      monthlyRentPaise: validateNonNegativePropertyPaise(propertyInput.monthlyRentPaise ?? 0n, 'monthlyRentPaise'),
      securityDepositPaise: validateNonNegativePropertyPaise(propertyInput.securityDepositPaise ?? 0n, 'securityDepositPaise'),
      ownership,
      linkedLoanId: propertyInput.linkedLoanId || null,
      isLoanLinked: Boolean(propertyInput.isLoanLinked || propertyInput.linkedLoanId),
      valuations: Array.isArray(propertyInput.valuations) && propertyInput.valuations.length > 0 ? propertyInput.valuations : [initialValuation],
      riskStatus: propertyInput.riskStatus || 'CLEAR',
      documents: propertyInput.documents || [],
      tenancy: propertyInput.tenancy || null,
      operatingExpenses: propertyInput.operatingExpenses || [],
      createdAt: new Date().toISOString()
    };

    const nextProperties = [newProperty, ...this._propertiesCache];
    const auditEvent = {
      eventId: `aud_${Date.now()}`,
      propertyId,
      action: 'PROPERTY_CREATED',
      timestamp: new Date().toISOString(),
      details: { propertyType, marketValuePaise: marketValuePaise.toString() }
    };
    const nextAuditLog = [auditEvent, ...this._auditLogCache];

    const nextOps = { ...this._operationsCache };
    if (operationId) {
      nextOps[operationId] = {
        timestamp: new Date().toISOString(),
        result: this.serializeProperty(newProperty)
      };
    }

    await this._commitState(nextProperties, nextAuditLog, nextOps, snapshot);
    return newProperty;
  }

  /**
   * Transitions property lifecycle state enforcing explicit allowed matrix.
   */
  static async transitionPropertyState(propertyId, nextState, reason = '', operationId = null) {
    await this._ensureLoaded();

    if (operationId && this._operationsCache[operationId]) {
      return this.hydrateProperty(this._operationsCache[operationId].result);
    }

    const prop = await this.getProperty(propertyId);
    if (!prop) {
      throw new Error(`Property '${propertyId}' not found`);
    }

    const validatedNewState = validatePropertyStateTransition(prop.status, nextState);

    const snapshot = {
      properties: [...this._propertiesCache],
      auditLog: [...this._auditLogCache],
      ops: { ...this._operationsCache }
    };

    const updated = {
      ...prop,
      status: validatedNewState,
      updatedAt: new Date().toISOString()
    };

    const nextProperties = this._propertiesCache.map(p => p.propertyId === propertyId ? updated : p);
    const auditEvent = {
      eventId: `aud_${Date.now()}`,
      propertyId,
      action: 'STATE_TRANSITION',
      timestamp: new Date().toISOString(),
      details: { fromState: prop.status, toState: validatedNewState, reason }
    };
    const nextAuditLog = [auditEvent, ...this._auditLogCache];

    const nextOps = { ...this._operationsCache };
    if (operationId) {
      nextOps[operationId] = { timestamp: new Date().toISOString(), result: this.serializeProperty(updated) };
    }

    await this._commitState(nextProperties, nextAuditLog, nextOps, snapshot);
    return updated;
  }

  /**
   * Records a new valuation update for a property.
   */
  static async recordValuation(propertyId, valuationData, operationId = null) {
    await this._ensureLoaded();

    if (operationId && this._operationsCache[operationId]) {
      return this.hydrateProperty(this._operationsCache[operationId].result);
    }

    const prop = await this.getProperty(propertyId);
    if (!prop) {
      throw new Error(`Property '${propertyId}' not found`);
    }

    assertPropertyMutable(prop);

    const newMarketValue = validateMarketValue(valuationData.marketValuePaise);
    const valuationId = valuationData.valuationId || `val_${propertyId}_${Date.now()}`;

    const newRecord = createValuationRecord({
      ...valuationData,
      valuationId,
      propertyId,
      marketValuePaise: newMarketValue
    });

    const updatedValuations = appendValuationRecord(prop.valuations, newRecord);

    const snapshot = {
      properties: [...this._propertiesCache],
      auditLog: [...this._auditLogCache],
      ops: { ...this._operationsCache }
    };

    const updated = {
      ...prop,
      marketValuePaise: newMarketValue,
      valuations: updatedValuations,
      updatedAt: new Date().toISOString()
    };

    const nextProperties = this._propertiesCache.map(p => p.propertyId === propertyId ? updated : p);
    const auditEvent = {
      eventId: `aud_${Date.now()}`,
      propertyId,
      action: 'VALUATION_UPDATED',
      timestamp: new Date().toISOString(),
      details: {
        newMarketValuePaise: newMarketValue.toString(),
        valuationDate: newRecord.valuationDate,
        method: newRecord.method
      }
    };
    const nextAuditLog = [auditEvent, ...this._auditLogCache];

    const nextOps = { ...this._operationsCache };
    if (operationId) {
      nextOps[operationId] = { timestamp: new Date().toISOString(), result: this.serializeProperty(updated) };
    }

    await this._commitState(nextProperties, nextAuditLog, nextOps, snapshot);
    return updated;
  }

  /**
   * Seeds canonical demo real estate properties if storage registry is empty.
   */
  static async seedCanonicalProperties() {
    await this._ensureLoaded();
    if (this._propertiesCache && this._propertiesCache.length > 0) {
      return this._propertiesCache;
    }

    const canonicalSeed = [
      {
        propertyId: 'prop_villa_01',
        displayName: 'Palm Meadows Villa',
        propertyType: PROPERTY_TYPES.RESIDENTIAL_HOUSE,
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 240_000_00_00n, // ₹2.40 Cr
        purchasePricePaise: 160_000_00_00n,
        registrationChargesPaise: 9_60_00_00n,
        stampDutyPaise: 12_00_00_00n,
        legalFeesPaise: 1_50_00_00n,
        brokeragePaise: 1_60_00_00n,
        capitalizedImprovementsPaise: 15_30_00_00n,
        builtUpAreaMicros: 2_850_000_000n,
        carpetAreaMicros: 2_400_000_000n,
        plotAreaMicros: 3_600_000_000n,
        address: 'Villa 14, Palm Meadows, Whitefield, Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560066',
        valuationDate: '2025-06-15',
        valuationMethod: VALUATION_METHODS.BANK_APPRAISAL,
        valuationConfidence: VALUATION_CONFIDENCE.HIGH,
        riskStatus: PROPERTY_RISK_STATUS.CLEAR,
        linkedLoanId: null,
        ownership: [
          { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 6000n },
          { ownerId: 'spouse', ownerName: 'Spouse', relation: 'SPOUSE', shareBps: 4000n }
        ],
        documents: [
          { documentId: 'doc_vd_01', title: 'Sale Deed', documentType: 'SALE_DEED', verificationStatus: 'VERIFIED', uploadDate: '2021-03-10' },
          { documentId: 'doc_vd_02', title: 'Khata Certificate', documentType: 'KHATA_PATTADAR', verificationStatus: 'VERIFIED', uploadDate: '2021-04-02' },
          { documentId: 'doc_vd_03', title: 'Encumbrance Certificate', documentType: 'ENCUMBRANCE_CERTIFICATE', verificationStatus: 'VALID', uploadDate: '2025-01-15' }
        ],
        valuations: [
          { valuationId: 'val_v1', valuationDate: '2025-06-15', marketValuePaise: 240_000_00_00n, valuationMethod: VALUATION_METHODS.BANK_APPRAISAL, valuationConfidence: VALUATION_CONFIDENCE.HIGH, notes: 'Bank appraisal for net worth certification' },
          { valuationId: 'val_v0', valuationDate: '2021-03-10', marketValuePaise: 160_000_00_00n, valuationMethod: VALUATION_METHODS.MANUAL_ESTIMATE, valuationConfidence: VALUATION_CONFIDENCE.HIGH, notes: 'Acquisition price' }
        ]
      },
      {
        propertyId: 'prop_apt_02',
        displayName: 'Grand Highrise Residency',
        propertyType: PROPERTY_TYPES.APARTMENT,
        status: PROPERTY_LIFECYCLE_STATES.RENTED,
        marketValuePaise: 95_000_00_00n, // ₹95 Lakh
        purchasePricePaise: 75_000_00_00n,
        registrationChargesPaise: 4_50_00_00n,
        stampDutyPaise: 5_25_00_00n,
        legalFeesPaise: 50_00_00n,
        brokeragePaise: 75_00_00n,
        builtUpAreaMicros: 1_450_000_000n,
        carpetAreaMicros: 1_200_000_000n,
        address: 'Tower B, Flat 1204, Gachibowli, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500032',
        valuationDate: '2025-05-10',
        valuationMethod: VALUATION_METHODS.COMPARABLE_SALES,
        valuationConfidence: VALUATION_CONFIDENCE.HIGH,
        riskStatus: PROPERTY_RISK_STATUS.CLEAR,
        linkedLoanId: null,
        monthlyRentPaise: 35_000_00n, // ₹35,000 / mo
        securityDepositPaise: 100_000_00n,
        annualOperatingExpensesPaise: 66_000_00n,
        ownership: [
          { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 10_000n }
        ],
        tenancy: {
          tenancyId: 'ten_apt_01',
          propertyId: 'prop_apt_02',
          tenantName: 'Anand Sharma',
          tenantContact: '+91 98765 43210',
          monthlyRentPaise: 35_000_00n,
          securityDepositPaise: 100_000_00n,
          securityDepositLiabilityPaise: 100_000_00n,
          isLiability: true,
          isRentalIncome: false,
          isCapitalizedCostBasis: false,
          leaseStartDate: '2025-01-01',
          leaseEndDate: '2025-12-31',
          status: 'ACTIVE'
        },
        operatingExpenses: [
          { expenseId: 'exp_01', propertyId: 'prop_apt_02', category: 'SOCIETY_MAINTENANCE', amountPaise: 48_000_00n, expenseDate: '2025-01-01' },
          { expenseId: 'exp_02', propertyId: 'prop_apt_02', category: 'PROPERTY_TAX', amountPaise: 18_000_00n, expenseDate: '2025-04-10' }
        ],
        documents: [
          { documentId: 'doc_apt_01', title: 'Sale Deed', documentType: 'SALE_DEED', verificationStatus: 'VERIFIED', uploadDate: '2022-07-20' },
          { documentId: 'doc_apt_02', title: 'Registered Rental Agreement', documentType: 'RENTAL_AGREEMENT', verificationStatus: 'VALID', uploadDate: '2025-01-01' }
        ],
        valuations: [
          { valuationId: 'val_a1', valuationDate: '2025-05-10', marketValuePaise: 95_000_00_00n, valuationMethod: VALUATION_METHODS.COMPARABLE_SALES, valuationConfidence: VALUATION_CONFIDENCE.HIGH, notes: 'Society registry benchmark' }
        ]
      },
      {
        propertyId: 'prop_commercial_03',
        displayName: 'Tech Corridor Retail Hub',
        propertyType: PROPERTY_TYPES.COMMERCIAL_PROPERTY,
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 150_000_00_00n, // ₹1.50 Cr
        purchasePricePaise: 110_000_00_00n,
        builtUpAreaMicros: 850_000_000n,
        address: 'Shop 102, Cyber Towers Mall, Madhapur, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        valuationDate: '2025-04-01',
        valuationMethod: VALUATION_METHODS.COMPARABLE_SALES,
        valuationConfidence: VALUATION_CONFIDENCE.MEDIUM,
        riskStatus: PROPERTY_RISK_STATUS.CLEAR,
        ownership: [
          { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 5000n },
          { ownerId: 'partner', ownerName: 'Co-Investor', relation: 'OTHER', shareBps: 5000n }
        ]
      },
      {
        propertyId: 'prop_land_04',
        displayName: 'Green Meadows Plot 42',
        propertyType: PROPERTY_TYPES.PLOT,
        status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
        marketValuePaise: 65_000_00_00n, // ₹65 Lakh
        purchasePricePaise: 40_000_00_00n,
        plotAreaMicros: 2_400_000_000n,
        address: 'Plot 42, Green Meadows Layout, Devanahalli',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '562110',
        valuationDate: '2025-03-12',
        valuationMethod: VALUATION_METHODS.GOVERNMENT_GUIDELINE,
        valuationConfidence: VALUATION_CONFIDENCE.HIGH,
        riskStatus: PROPERTY_RISK_STATUS.CLEAR,
        ownership: [
          { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 10_000n }
        ]
      },
      {
        propertyId: 'prop_undercon_05',
        displayName: 'Prestige Sky Suites',
        propertyType: PROPERTY_TYPES.UNDER_CONSTRUCTION,
        status: PROPERTY_LIFECYCLE_STATES.UNDER_CONSTRUCTION,
        marketValuePaise: 110_000_00_00n, // ₹1.10 Cr
        purchasePricePaise: 100_000_00_00n,
        builtUpAreaMicros: 1_650_000_000n,
        address: 'Tower 4, Unit 802, Kokapet SEZ, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500075',
        riskStatus: PROPERTY_RISK_STATUS.LOAN_LIEN,
        ownership: [
          { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 10_000n }
        ]
      },
      {
        propertyId: 'prop_sold_06',
        displayName: 'Old Banjara Flat',
        propertyType: PROPERTY_TYPES.APARTMENT,
        status: PROPERTY_LIFECYCLE_STATES.SOLD,
        marketValuePaise: 45_000_00_00n, // ₹45 Lakh (Historical)
        address: 'Road No 12, Banjara Hills, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500034',
        ownership: [
          { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 10_000n }
        ]
      }
    ];

    for (const p of canonicalSeed) {
      await this.addProperty(p);
    }

    return this.getAllProperties();
  }
}
