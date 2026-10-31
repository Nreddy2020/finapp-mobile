import assert from 'node:assert/strict';
import {FamilyRepository} from '../../services/family/familyRepository.js';
import {FamilyFinancialService} from '../../services/family/familyFinancialService.js';
import {computeHouseholdFinancialSummaryPure} from '../../services/family/familyContracts.js';

const links=[{id:'l1',householdId:'h1',commitmentId:'missing',leadPayerPersonId:'p1'},{id:'l2',householdId:'h1',commitmentId:'known',leadPayerPersonId:'p1'},{id:'archived',householdId:'h1',commitmentId:'old',isArchived:true},{id:'other',householdId:'h2',commitmentId:'other'}];
const members=[{id:'p1',fullName:'Saved Name'}];
const known={id:'known',amount:{paise:'12345',currency:'INR'},frequency:'MONTHLY',status:'ACTIVE'};
const evaluate=commitments=>computeHouseholdFinancialSummaryPure({householdId:'h1',links,members,commitments,referenceDate:'2026-09-10'});
const before=JSON.stringify(links);
let summary=evaluate([known]);
assert.equal(summary.missingCommitmentCount,1);
assert.equal(summary.totalMonthlyPaise,'12345');
assert.equal(summary.linkedCommitmentCount,1);
assert.equal(summary.memberAllocations[0].personName,'Saved Name');
summary=evaluate([known,{...known,id:'missing'}]);
assert.equal(summary.missingCommitmentCount,0);
assert.equal(summary.totalMonthlyPaise,'24690');
assert.equal(summary.linkedCommitmentCount,2);
assert.equal(JSON.stringify(links),before);

const originalPerson=FamilyRepository.getPerson;
FamilyRepository.getPerson=async()=>members[0];
try {
 const missing=await FamilyFinancialService._enrichFinancialLink(links[0],new Map());
 assert.equal(missing.sourceUnavailable,true);
 assert.equal(missing.monthlyRupees,null);
 assert.equal(missing.monthlyPaise,null);
 assert.equal(missing.commitmentAmountPaise,null);
 const restored=await FamilyFinancialService._enrichFinancialLink(links[0],new Map([['missing',known]]));
 assert.equal(restored.sourceUnavailable,false);
 assert.equal(restored.monthlyRupees,123.45);
 assert.equal(restored.leadPayerName,'Saved Name');
 assert.equal(JSON.stringify(links),before);
} finally {FamilyRepository.getPerson=originalPerson;}
console.log('16 missing-source assertions passed: incomplete, restored, household/archive isolation, original links unchanged, exact paise and saved person name.');
