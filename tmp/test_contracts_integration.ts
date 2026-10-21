import { db } from '../src/server/db';
import { ContractType } from '../src/types';

async function runContractTests() {
  console.log('=== STARTING CONTRACT INTEGRATION TESTS ===\n');

  // 1. Create a dedicated test booking to run end-to-end tests cleanly
  const testId = `bkg-test-${Date.now()}`;
  const bookingToGenerate = db.addBooking({
    id: testId,
    bookingNumber: `BKG-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    requestId: 'req-test-101',
    confirmedBy: 'إدارة النظام',
    listingId: 'list-101',
    listingTitle: 'فيلا مستقلة راقية للبيع في حدة',
    listingNumber: 'YEM-2026-101',
    listingGovernorate: 'صنعاء (أمانة العاصمة)',
    listingPrice: 350000,
    listingCurrency: 'USD',
    advertiserId: 'usr-101',
    advertiserName: 'هشام عبد الرحمن القدسي',
    advertiserPhone: '777012345',
    seekerId: 'usr-202',
    seekerName: 'أصيل محمد الحكيمي',
    seekerPhone: '778990011',
    status: 'active',
    durationHours: 48,
    startDate: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    notes: 'حجز تجريبي لاختبار دورة حياة العقد بالكامل',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  });
  console.log(`Created clean test booking [${bookingToGenerate.id}] (Listing: ${bookingToGenerate.listingTitle})`);

  // 2. Requirement 1, 2, 3: Create Contract Draft from Booking & verify data imports
  const creator = { id: 'usr-101', name: 'أحمد علي الريمي', role: 'advertiser' as const };
  console.log('\n--- Test 1: Generate Contract Draft from Booking (Importing Listing, Parties, Terms) ---');
  const contract = db.createContractFromBooking(bookingToGenerate.id, creator);
  console.log(`Contract generated successfully!`);
  console.log(`Contract ID: ${contract.id}`);
  console.log(`Contract Number: ${contract.contractNumber}`);
  console.log(`Contract Type: ${contract.contractType}`);
  console.log(`Status: ${contract.status}`);
  console.log(`Current Version: v${contract.currentVersion}`);
  console.log(`Total Versions: ${contract.versions.length}`);
  console.log(`Clauses Count: ${contract.clauses.length}`);
  console.log(`First Party (Seller/Lessor): ${contract.firstParty.name} (${contract.firstParty.phone})`);
  console.log(`Second Party (Buyer/Lessee): ${contract.secondParty.name} (${contract.secondParty.phone})`);
  console.log(`Total Amount: ${contract.financialTerms.totalAmount} ${contract.financialTerms.currency}`);
  console.log(`Payment Schedule: ${contract.financialTerms.paymentSchedule}`);

  // Assertions for Requirement 1, 2, 7
  if (!contract.id.startsWith('cnt-')) throw new Error('Contract ID is invalid');
  if (!contract.contractNumber.startsWith('CNT-')) throw new Error('Contract Number is invalid');
  if (contract.bookingId !== bookingToGenerate.id) throw new Error('Booking linkage failed');
  if (contract.listingId !== bookingToGenerate.listingId) throw new Error('Listing linkage failed');
  if (contract.firstParty.id !== bookingToGenerate.advertiserId) throw new Error('First party mismatch');
  if (contract.secondParty.id !== bookingToGenerate.seekerId) throw new Error('Second party mismatch');
  if (contract.currentVersion !== 1) throw new Error('Initial version should be 1');
  if (contract.status !== 'draft') throw new Error(`Initial status should be draft, got ${contract.status}`);

  // Check updated booking links to contract
  const updatedBooking = db.getBookingById(bookingToGenerate.id);
  if (updatedBooking?.contractId !== contract.id) throw new Error('Booking does not have contractId linked');
  console.log('✓ Requirement 1, 2, 7: Draft creation and linkages verified!');

  // 3. Requirement 4 & 5: Review & Modify Draft, preserving versions and audit trail
  console.log('\n--- Test 2: Modify Draft and Verify Version History & Immutability of Old Versions ---');
  const initialVersion1ClausesCount = contract.clauses.length;
  const newCustomClause = {
    id: 'cls-test-1',
    number: initialVersion1ClausesCount + 1,
    title: 'شرط المعاينة الهندسية ومطابقة كروكي الأمانة',
    content: 'اتفق الطرفان على مطابقة المخطط الهندسي الصادر من مكتب الأشغال العامة بأمانة العاصمة قبل موعد الإفراغ.',
    isMandatory: false
  };

  const updateResult1 = db.updateContractDraft(
    contract.id,
    {
      clauses: [...contract.clauses, newCustomClause],
      financialTerms: {
        ...contract.financialTerms,
        notes: 'تمت مراجعة المسودة وإضافة بند المعاينة الهندسية'
      },
      summaryOfChanges: 'إضافة بند الفحص الهندسي والكروكي الميداني'
    },
    { id: 'usr-202', name: 'طارق محمد الحيمي', role: 'seeker' }
  );

  console.log(`Draft updated! New Version: v${updateResult1.contract.currentVersion}`);
  console.log(`Total Versions in History: ${updateResult1.contract.versions.length}`);
  if (updateResult1.contract.currentVersion !== 2) throw new Error('Expected currentVersion to be 2');
  if (updateResult1.contract.versions.length !== 2) throw new Error('Expected 2 recorded versions');
  if (updateResult1.contract.versions[0].version !== 1) throw new Error('Version 1 was lost!');
  if (updateResult1.contract.versions[1].version !== 2) throw new Error('Version 2 was not recorded!');
  if (updateResult1.contract.versions[0].clauses.length !== initialVersion1ClausesCount) {
    throw new Error('Version 1 clauses were mutated! Immutability violated!');
  }
  console.log('✓ Requirement 4 & 5: Draft modified, version 1 and version 2 preserved intact!');

  // 4. Requirement 8 & 10: Explicit Approval by Parties
  console.log('\n--- Test 3: Contract Approval by First Party and Second Party ---');
  const approvedByFirst = db.approveContract(contract.id, 'firstParty', { id: 'usr-101', name: 'أحمد علي الريمي', role: 'advertiser' });
  console.log(`Approved by First Party: firstPartyApproval=${approvedByFirst.firstPartyApproval}, status=${approvedByFirst.status}`);
  if (!approvedByFirst.firstPartyApproval) throw new Error('First party approval not registered');
  if (approvedByFirst.status !== 'pending_approval') throw new Error('Status should be pending_approval after 1 party');

  const approvedByBoth = db.approveContract(contract.id, 'secondParty', { id: 'usr-202', name: 'طارق محمد الحيمي', role: 'seeker' });
  console.log(`Approved by Both Parties: status=${approvedByBoth.status}, approvedAt=${approvedByBoth.approvedAt}`);
  if (!approvedByBoth.secondPartyApproval) throw new Error('Second party approval not registered');
  if (approvedByBoth.status !== 'approved') throw new Error('Status should be approved once both approve');
  if (!approvedByBoth.approvedAt) throw new Error('approvedAt date missing');
  console.log('✓ Requirement 8 & 10: Approval workflow by authorized parties verified!');

  // 5. Requirement 6: Anti-Silent Modification
  console.log('\n--- Test 4: Anti-Silent Modification Prevention ---');
  console.log('Attempting to modify an approved contract...');
  const editApprovedResult = db.updateContractDraft(
    contract.id,
    {
      clauses: approvedByBoth.clauses,
      financialTerms: {
        ...approvedByBoth.financialTerms,
        totalAmount: approvedByBoth.financialTerms.totalAmount - 5000 // Sneaky price change!
      },
      summaryOfChanges: 'تعديل السعر بعد الاعتماد'
    },
    { id: 'usr-202', name: 'طارق محمد الحيمي', role: 'seeker' }
  );

  console.log(`Was approved modified detected? ${editApprovedResult.wasApprovedModified}`);
  console.log(`New Contract Status after modification: ${editApprovedResult.contract.status}`);
  console.log(`isModificationPendingApproval flag: ${editApprovedResult.contract.isModificationPendingApproval}`);
  console.log(`firstPartyApproval reset? ${editApprovedResult.contract.firstPartyApproval}`);
  console.log(`Current Version: v${editApprovedResult.contract.currentVersion}`);

  if (!editApprovedResult.wasApprovedModified) {
    throw new Error('Anti-silent modification failed to trigger!');
  }
  if (editApprovedResult.contract.status !== 'pending_approval') {
    throw new Error('Approved status was not suspended upon modification!');
  }
  if (editApprovedResult.contract.firstPartyApproval !== false) {
    throw new Error('First party approval was not revoked on modification!');
  }
  if (editApprovedResult.contract.currentVersion !== 3) {
    throw new Error('Expected new version v3 for amendment');
  }
  console.log('✓ Requirement 6: Anti-silent modification enforced! Approval was revoked and pending re-approval flag set.');

  // Re-approve version 3
  db.approveContract(contract.id, 'firstParty', { id: 'usr-101', name: 'أحمد علي الريمي', role: 'advertiser' });
  const reapproved = db.approveContract(contract.id, 'secondParty', { id: 'usr-202', name: 'طارق محمد الحيمي', role: 'seeker' });
  console.log(`Contract re-approved at v${reapproved.currentVersion}, status=${reapproved.status}`);

  // 6. Electronic Signature (Requirement 8, 9, 10)
  console.log('\n--- Test 5: Electronic Signatures & Sealing ---');
  const signed1 = db.signContract(contract.id, 'firstParty', { id: 'usr-101', name: 'أحمد علي الريمي', role: 'advertiser' }, '1002345678');
  console.log(`First Party signed: signatureStatus=${signed1.firstParty.signatureStatus}, signedAt=${signed1.firstParty.signedAt}`);
  if (signed1.firstParty.signatureStatus !== 'signed') throw new Error('First party signature failed');

  const signedBoth = db.signContract(contract.id, 'secondParty', { id: 'usr-202', name: 'طارق محمد الحيمي', role: 'seeker' }, '1008765432');
  console.log(`Both Parties signed: status=${signedBoth.status}, contract signedAt=${signedBoth.signedAt}`);
  if (signedBoth.status !== 'signed') throw new Error('Contract should be signed after both parties e-sign');
  if (!signedBoth.signedAt) throw new Error('Contract signedAt missing');
  console.log('✓ Requirement 8, 9, 10: Signatures and final execution verified!');

  // 7. Verify Lease Contract Type Support (Requirement 3)
  console.log('\n--- Test 6: Verify Lease Contract Support ---');
  const rentalTestId = `bkg-rental-test-${Date.now()}`;
  const rentalBooking = db.addBooking({
    id: rentalTestId,
    bookingNumber: `BKG-RENT-${Math.floor(1000 + Math.random() * 9000)}`,
    requestId: 'req-test-rent',
    confirmedBy: 'أحمد الريمي',
    listingId: 'list-103',
    listingTitle: 'شقة مفروشة للإيجار السنوي بحي حدة',
    listingNumber: 'YEM-2026-103',
    listingGovernorate: 'صنعاء (أمانة العاصمة)',
    listingPrice: 800,
    listingCurrency: 'USD',
    listingPurpose: 'rent',
    advertiserId: 'usr-101',
    advertiserName: 'هشام عبد الرحمن القدسي',
    advertiserPhone: '777012345',
    seekerId: 'usr-202',
    seekerName: 'أصيل محمد الحكيمي',
    seekerPhone: '778990011',
    status: 'active',
    durationHours: 48,
    startDate: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    notes: 'حجز تجريبي لاختبار عقود الإيجار الرسمية',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0]
  });

  const leaseContract = db.createContractFromBooking(rentalBooking.id, creator, { customType: 'lease' });
  console.log(`Lease contract created: ${leaseContract.contractNumber}, Type=${leaseContract.contractType}`);
  if (leaseContract.contractType !== 'lease') throw new Error('Expected lease contract type');
  const hasLeaseClause = leaseContract.clauses.some(c => c.title.includes('العين المؤجرة') || c.title.includes('مدة الإيجار'));
  if (!hasLeaseClause) throw new Error('Lease specific clauses missing');
  if (leaseContract.durationTerms?.durationMonths !== 12) throw new Error('Expected 12 months lease duration');
  if (leaseContract.financialTerms.advancePaymentMonths !== 3) throw new Error('Expected 3 months advance rent');
  console.log('✓ Requirement 3: Lease contract generation, specific clauses, and rental terms verified 100%!');

  // 8. Test Query by Booking ID & Listing ID
  console.log('\n--- Test 7: Verify Queries & Filtering ---');
  const foundByBooking = db.getContractByBookingId(bookingToGenerate.id);
  if (!foundByBooking || foundByBooking.id !== contract.id) throw new Error('getContractByBookingId failed');
  const foundById = db.getContractById(contract.id);
  if (!foundById || foundById.id !== contract.id) throw new Error('getContractById failed');
  const filteredList = db.getContracts({ bookingId: bookingToGenerate.id });
  if (filteredList.length === 0) throw new Error('getContracts filter failed');
  console.log('✓ Queries and filtering verified!');

  console.log('\n========================================');
  console.log('ALL CONTRACT INTEGRATION TESTS PASSED 100%!');
  console.log('========================================\n');
}

runContractTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
