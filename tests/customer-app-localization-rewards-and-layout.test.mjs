import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = 'e:/Jewellery App';

test('1. Verify all required Rewards, Passbook, and Cash Modal keys exist in en and ta', async () => {
  const translationsFilePath = path.join(projectRoot, 'customer-app/src/i18n/translations.ts');
  assert.ok(fs.existsSync(translationsFilePath), 'translations.ts must exist');

  const content = fs.readFileSync(translationsFilePath, 'utf8');

  // Verify key rewards keys
  const expectedKeys = [
    'rewardTitle',
    'selectSchemeForRewards',
    'slotLabel',
    'perMonth',
    'goldSchemeDefault',
    'yourCompletionGift',
    'certEyebrow',
    'certCompletedMsg',
    'certInProgressMsg',
    'stampedAndVerified',
    'inProgress',
    'specialGiftsForYou',
    'handcrafted',
    'festiveWelcomeCollection',
    'giftSweetName',
    'giftSweetSubtitle',
    'giftSweetTag',
    'giftKaramName',
    'giftKaramSubtitle',
    'giftKaramTag',
    'giftEverSilverName',
    'giftEverSilverSubtitle',
    'giftEverSilverTag',
    'schemeBenefitsTitle',
    'completionBonusLabel',
    'creditedToPlan',
    'maturityValueLabel',
    'jewelleryPurchase',
    'physicalGiftsTitle',
    'physicalGiftsList',
    'showroomCounterCollection',
    'giftEligibilityTitle',
    'giftEligibilityDesc',
    'paidTag',
    'paymentPending',
    'completedStatus',
    'noInstallmentRecords',
    'receiptShort',
    'payByCashModalTitle',
    'howToPayCashTitle',
    'cashStep1Title',
    'cashStep1Desc',
    'cashStep2Title',
    'cashStep2Desc',
    'cashStep3Title',
    'cashStep3Desc',
    'cashStep4Title',
    'cashStep4Desc',
    'amountDueLabel',
    'hoursLabel',
    'noticeLabel',
  ];

  // Check en and ta sections
  const enMatch = content.match(/en:\s*\{([\s\S]*?)\},\s*ta:/);
  const taMatch = content.match(/ta:\s*\{([\s\S]*?)\},\s*\};/);

  assert.ok(enMatch, 'en translations block must be present');
  assert.ok(taMatch, 'ta translations block must be present');

  const enBlock = enMatch[1];
  const taBlock = taMatch[1];

  for (const key of expectedKeys) {
    const keyRegex = new RegExp(`\\b${key}\\s*:`, 'm');
    assert.ok(keyRegex.test(enBlock), `Key "${key}" must exist in en translations`);
    assert.ok(keyRegex.test(taBlock), `Key "${key}" must exist in ta translations`);
  }

  // Check specific Tamil translations for gifts
  assert.match(taBlock, /giftSweetName:\s*['"]ஸ்வீட்['"]/);
  assert.match(taBlock, /giftKaramName:\s*['"]காரம்['"]/);
  assert.match(taBlock, /giftEverSilverName:\s*['"]எவர் சில்வர் பாத்திரம்['"]/);
});

test('2. Verify Language Selection Screen layout updates', async () => {
  const languageScreenPath = path.join(projectRoot, 'customer-app/src/app/language.tsx');
  const code = fs.readFileSync(languageScreenPath, 'utf8');

  // Verify bottomSwitcherBar is completely removed
  assert.doesNotMatch(code, /bottomSwitcherBar/, 'bottomSwitcherBar must be removed');
  assert.doesNotMatch(code, /bottomTabItem/, 'bottomTabItem styles must be removed');

  // Verify sticky bottom CTA container exists
  assert.match(code, /styles\.bottomCtaContainer/, 'bottomCtaContainer must be used');
  assert.match(code, /styles\.continueButton/, 'continueButton must be present');
  assert.match(code, /handleContinue/, 'handleContinue must be linked to button');

  // Verify Tamil and English selection cards are preserved
  assert.match(code, /handleSelectLanguage\('ta'\)/, 'Tamil selection card must exist');
  assert.match(code, /handleSelectLanguage\('en'\)/, 'English selection card must exist');
  assert.match(code, /checkmark-circle/, 'Gold checkmark circle must be retained');
});

test('3. Verify Rewards Screen uses useLanguage and no hardcoded English strings', async () => {
  const rewardScreenPath = path.join(projectRoot, 'customer-app/src/app/(tabs)/reward.tsx');
  const code = fs.readFileSync(rewardScreenPath, 'utf8');

  assert.match(code, /import\s*\{\s*useLanguage\s*\}\s*from\s*['"]@\/i18n['"]/, 'reward.tsx must import useLanguage');
  assert.match(code, /const\s*\{\s*t\s*\}\s*=\s*useLanguage\(\)/, 'reward.tsx must call useLanguage()');

  // Verify all major reward sections call t(...)
  assert.match(code, /t\('rewardTitle'\)/);
  assert.match(code, /t\('specialGiftsForYou'\)/);
  assert.match(code, /t\('giftSweetName'\)/);
  assert.match(code, /t\('giftKaramName'\)/);
  assert.match(code, /t\('giftEverSilverName'\)/);
  assert.match(code, /t\('schemeBenefitsTitle'\)/);
  assert.match(code, /t\('completionBonusLabel'\)/);
  assert.match(code, /t\('physicalGiftsTitle'\)/);
  assert.match(code, /t\('giftEligibilityTitle'\)/);
  assert.match(code, /t\('giftEligibilityDesc'\)/);

  // Check adjustsFontSizeToFit
  assert.match(code, /adjustsFontSizeToFit/);
  assert.match(code, /minimumFontScale=\{0\.85\}/);
});

test('4. Verify tab navigation and header responsive text scaling', async () => {
  const layoutPath = path.join(projectRoot, 'customer-app/src/app/(tabs)/_layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');
  assert.match(layoutCode, /adjustsFontSizeToFit/, 'Tab layout must have adjustsFontSizeToFit for Tamil');
  assert.match(layoutCode, /minimumFontScale=\{0\.8\}/, 'Tab layout must specify minimumFontScale');

  const headerPath = path.join(projectRoot, 'customer-app/src/components/CustomerHeader.tsx');
  const headerCode = fs.readFileSync(headerPath, 'utf8');
  assert.match(headerCode, /adjustsFontSizeToFit/, 'CustomerHeader must use adjustsFontSizeToFit');
  assert.match(headerCode, /switchProfileText[\s\S]*?adjustsFontSizeToFit/, 'Switch profile button must have font scaling');
});

test('5. Verify Home and Passbook responsive text and button fitting', async () => {
  const homePath = path.join(projectRoot, 'customer-app/src/app/(tabs)/index.tsx');
  const homeCode = fs.readFileSync(homePath, 'utf8');
  assert.match(homeCode, /payCashBtnText[\s\S]*?adjustsFontSizeToFit/, 'Pay by cash button must scale font');
  assert.match(homeCode, /payOnlineBtnText[\s\S]*?adjustsFontSizeToFit/, 'Pay online button must scale font');
  assert.match(homeCode, /responsive\.width\s*<\s*375\s*\?\s*'column'\s*:\s*'row'/, 'Payment buttons must stack on narrow screens');

  const passbookPath = path.join(projectRoot, 'customer-app/src/app/(tabs)/passbook.tsx');
  const passbookCode = fs.readFileSync(passbookPath, 'utf8');
  assert.match(passbookCode, /dueAlertTitle[\s\S]*?adjustsFontSizeToFit/, 'Due alert title must scale font');
  assert.match(passbookCode, /paidDoneText[\s\S]*?adjustsFontSizeToFit/, 'Paid done badge must scale font');
  assert.match(passbookCode, /duePillBadgeText[\s\S]*?adjustsFontSizeToFit/, 'Due pill badge must scale font');
});
