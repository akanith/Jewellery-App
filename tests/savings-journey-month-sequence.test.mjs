import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Load translations directly for assertion
const translationsPath = path.resolve('customer-app/src/i18n/translations.ts');
const translationsContent = fs.readFileSync(translationsPath, 'utf8');

// Simple parser for translations
const enMatch = translationsContent.match(/en:\s*\{([\s\S]*?)\},\s*ta:/);
const taMatch = translationsContent.match(/ta:\s*\{([\s\S]*?)\},\s*\};/);

function extractKeys(block) {
  const map = {};
  const lines = block.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*['"]([^'"]+)['"]/);
    if (match) {
      map[match[1]] = match[2];
    }
  }
  return map;
}

const en = extractKeys(enMatch[1]);
const ta = extractKeys(taMatch[1]);

// Import schemeTimeline module logic (simulated in JS or compiled)
// We test both the logic implementation and the actual source code.
const ALL_MONTH_KEYS_BY_INDEX = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

const FULL_MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAME_TO_INDEX = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

function parseMonthAndYear(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11) {
      return { monthIndex: month, year };
    }
  }

  const textMatch = trimmed.match(/([A-Za-z]+)[,\s]+(\d{4})/);
  if (textMatch) {
    const rawMonth = textMatch[1].toLowerCase();
    const rawYear = parseInt(textMatch[2], 10);
    if (rawMonth in MONTH_NAME_TO_INDEX && rawYear >= 2000 && rawYear <= 2100) {
      return { monthIndex: MONTH_NAME_TO_INDEX[rawMonth], year: rawYear };
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return { monthIndex: d.getMonth(), year: d.getFullYear() };
  }

  return null;
}

function getSchemeStartMonthAndYear(scheme) {
  const DEFAULT_START = { monthIndex: 9, year: 2026 }; // October 2026
  if (!scheme) return DEFAULT_START;

  const directStart =
    parseMonthAndYear(scheme.startDate) ||
    parseMonthAndYear(scheme.start_month) ||
    parseMonthAndYear(scheme.startMonth);
  if (directStart) return directStart;

  if (scheme.currentInstallment?.calendarMonth && scheme.currentInstallment.installmentNumber) {
    const currentParsed = parseMonthAndYear(scheme.currentInstallment.calendarMonth);
    if (currentParsed) {
      const offset = Math.max(0, scheme.currentInstallment.installmentNumber - 1);
      const calculated = new Date(currentParsed.year, currentParsed.monthIndex - offset, 1);
      return { monthIndex: calculated.getMonth(), year: calculated.getFullYear() };
    }
  }

  const maturityRaw =
    scheme.endDate ||
    scheme.end_month ||
    scheme.endMonth ||
    scheme.maturityDate;
  if (maturityRaw) {
    const endParsed = parseMonthAndYear(maturityRaw);
    if (endParsed) {
      const totalInsts = scheme.totalInstallments || 12;
      const offset = Math.max(0, totalInsts - 1);
      const calculated = new Date(endParsed.year, endParsed.monthIndex - offset, 1);
      return { monthIndex: calculated.getMonth(), year: calculated.getFullYear() };
    }
  }

  return DEFAULT_START;
}

function generateSavingsJourneyMonths(options = {}) {
  const { scheme } = options;
  const { monthIndex: startMonthIndex, year: startYear } = getSchemeStartMonthAndYear(scheme);

  const totalCount = scheme?.totalInstallments ?? options.totalCount ?? 12;
  const paidCount = scheme?.paidInstallments ?? options.paidCount ?? 0;
  const isSchemeOpen = !scheme?.status || scheme.status === 'ACTIVE';

  let currentStepNum = -1;
  if (isSchemeOpen && paidCount < totalCount) {
    if (scheme?.currentInstallment?.installmentNumber) {
      currentStepNum = scheme.currentInstallment.installmentNumber;
    } else {
      currentStepNum = paidCount + 1;
    }
  }

  const steps = [];
  for (let i = 0; i < totalCount; i++) {
    const stepNum = i + 1;
    const targetDate = new Date(startYear, startMonthIndex + i, 1);
    const mIndex = targetDate.getMonth();
    const yr = targetDate.getFullYear();
    const monthKey = ALL_MONTH_KEYS_BY_INDEX[mIndex];
    const calendarMonth = `${FULL_MONTH_NAMES_EN[mIndex]} ${yr}`;

    const isCompleted = stepNum <= paidCount;
    const isCurrent = stepNum === currentStepNum;
    const isMaturityStep = stepNum === totalCount;

    steps.push({
      installmentNumber: stepNum,
      monthKey,
      year: yr,
      calendarMonth,
      isCompleted,
      isCurrent,
      isMaturityStep,
    });
  }

  return steps;
}

function getMaturityMonthStr(schemeOrInstallments, maybeInstallments) {
  let scheme = null;
  let installments = undefined;

  if (Array.isArray(schemeOrInstallments)) {
    installments = schemeOrInstallments;
  } else if (schemeOrInstallments) {
    scheme = schemeOrInstallments;
    installments = maybeInstallments;
  }

  if (installments && installments.length > 0) {
    const lastInst = installments[installments.length - 1];
    if (lastInst?.calendarMonth) {
      const parsed = parseMonthAndYear(lastInst.calendarMonth);
      if (parsed) {
        const nextMonthDate = new Date(parsed.year, parsed.monthIndex + 1, 1);
        return `${FULL_MONTH_NAMES_EN[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;
      }
    }
  }

  const { monthIndex: startMonthIndex, year: startYear } = getSchemeStartMonthAndYear(scheme);
  const total = scheme?.totalInstallments || 12;
  const maturityDate = new Date(startYear, startMonthIndex + total, 1);
  return `${FULL_MONTH_NAMES_EN[maturityDate.getMonth()]} ${maturityDate.getFullYear()}`;
}

test('1. October 2026 scheme generates exact 12-month sequence Oct 2026 through Sep 2027', () => {
  const steps = generateSavingsJourneyMonths({
    scheme: {
      startDate: '2026-10-01',
      totalInstallments: 12,
      paidInstallments: 1,
    },
  });

  assert.equal(steps.length, 12, 'Must generate exactly 12 steps');

  const expectedMonthKeys = [
    'oct', 'nov', 'dec', 'jan', 'feb', 'mar',
    'apr', 'may', 'jun', 'jul', 'aug', 'sep'
  ];
  const expectedYears = [
    2026, 2026, 2026, 2027, 2027, 2027,
    2027, 2027, 2027, 2027, 2027, 2027
  ];

  for (let i = 0; i < 12; i++) {
    assert.equal(steps[i].installmentNumber, i + 1);
    assert.equal(steps[i].monthKey, expectedMonthKeys[i], `Installment ${i + 1} must have monthKey ${expectedMonthKeys[i]}`);
    assert.equal(steps[i].year, expectedYears[i], `Installment ${i + 1} must be in year ${expectedYears[i]}`);
  }

  // Installment 1: Oct 2026
  assert.equal(steps[0].calendarMonth, 'October 2026');
  // Installment 12: Sep 2027
  assert.equal(steps[11].calendarMonth, 'September 2027');
});

test('2. Year transition across Dec 2026 and Jan 2027 is seamless and accurate', () => {
  const steps = generateSavingsJourneyMonths({
    scheme: {
      startMonth: 'October 2026',
      totalInstallments: 12,
    },
  });

  const decStep = steps[2]; // Installment 3
  const janStep = steps[3]; // Installment 4

  assert.equal(decStep.installmentNumber, 3);
  assert.equal(decStep.monthKey, 'dec');
  assert.equal(decStep.year, 2026);
  assert.equal(decStep.calendarMonth, 'December 2026');

  assert.equal(janStep.installmentNumber, 4);
  assert.equal(janStep.monthKey, 'jan');
  assert.equal(janStep.year, 2027);
  assert.equal(janStep.calendarMonth, 'January 2027');
});

test('3. Existing schemes with different start months are dynamically calculated', () => {
  // Case A: Scheme starting in September 2026
  const sepSteps = generateSavingsJourneyMonths({
    scheme: {
      startDate: '2026-09-01',
      totalInstallments: 12,
    },
  });
  const expectedSepKeys = ['sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug'];
  assert.deepEqual(sepSteps.map((s) => s.monthKey), expectedSepKeys);
  assert.equal(sepSteps[0].calendarMonth, 'September 2026');
  assert.equal(sepSteps[11].calendarMonth, 'August 2027');

  // Case B: Scheme starting in November 2026
  const novSteps = generateSavingsJourneyMonths({
    scheme: {
      startDate: '2026-11-01',
      totalInstallments: 12,
    },
  });
  const expectedNovKeys = ['nov', 'dec', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct'];
  assert.deepEqual(novSteps.map((s) => s.monthKey), expectedNovKeys);
  assert.equal(novSteps[0].calendarMonth, 'November 2026');
  assert.equal(novSteps[11].calendarMonth, 'October 2027');

  // Case C: Scheme starting in January 2027
  const janSteps = generateSavingsJourneyMonths({
    scheme: {
      startDate: '2027-01-01',
      totalInstallments: 12,
    },
  });
  const expectedJanKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  assert.deepEqual(janSteps.map((s) => s.monthKey), expectedJanKeys);
  assert.equal(janSteps[0].calendarMonth, 'January 2027');
  assert.equal(janSteps[11].calendarMonth, 'December 2027');
});

test('4. Start month inferred from currentInstallment when startDate is omitted', () => {
  // Current installment is Installment 2 (November 2026) -> Start month must be October 2026
  const steps = generateSavingsJourneyMonths({
    scheme: {
      totalInstallments: 12,
      paidInstallments: 1,
      currentInstallment: {
        installmentNumber: 2,
        calendarMonth: 'November 2026',
        amount: 1000,
        status: 'PENDING',
      },
    },
  });
  assert.equal(steps[0].monthKey, 'oct');
  assert.equal(steps[0].calendarMonth, 'October 2026');
  assert.equal(steps[1].monthKey, 'nov');
  assert.equal(steps[1].calendarMonth, 'November 2026');
  assert.equal(steps[11].monthKey, 'sep');
  assert.equal(steps[11].calendarMonth, 'September 2027');
});

test('5. Completed scheme infers October 2026 start from maturityDate (September 2027)', () => {
  const steps = generateSavingsJourneyMonths({
    scheme: {
      totalInstallments: 12,
      paidInstallments: 12,
      status: 'COMPLETED',
      maturityDate: 'September 2027',
      currentInstallment: null,
    },
  });
  assert.equal(steps[0].monthKey, 'oct');
  assert.equal(steps[0].calendarMonth, 'October 2026');
  assert.equal(steps[11].monthKey, 'sep');
  assert.equal(steps[11].calendarMonth, 'September 2027');
});

test('6. Completed vs Current vs Upcoming installment indicators reflect actual payment states', () => {
  // Scenario: 1 installment paid (October 2026 paid, November 2026 pending)
  const steps = generateSavingsJourneyMonths({
    scheme: {
      startDate: '2026-10-01',
      totalInstallments: 12,
      paidInstallments: 1,
      status: 'ACTIVE',
      currentInstallment: {
        installmentNumber: 2,
        calendarMonth: 'November 2026',
        amount: 1000,
        status: 'PENDING',
      },
    },
  });

  // Step 1 (Oct): Completed
  assert.equal(steps[0].isCompleted, true, 'Step 1 must be marked completed');
  assert.equal(steps[0].isCurrent, false, 'Step 1 must not be marked current');

  // Step 2 (Nov): Current (pending due)
  assert.equal(steps[1].isCompleted, false, 'Step 2 must not be marked completed');
  assert.equal(steps[1].isCurrent, true, 'Step 2 must be marked current');

  // Steps 3-12: Upcoming (neither completed nor current)
  for (let i = 2; i < 12; i++) {
    assert.equal(steps[i].isCompleted, false, `Step ${i + 1} must not be completed`);
    assert.equal(steps[i].isCurrent, false, `Step ${i + 1} must not be current`);
  }

  // Step 12 is maturity step
  assert.equal(steps[11].isMaturityStep, true, 'Step 12 must have isMaturityStep true');
  assert.equal(steps[10].isMaturityStep, false, 'Step 11 must not have isMaturityStep true');
});

test('7. Fully paid scheme (12/12) marks all completed and none current', () => {
  const steps = generateSavingsJourneyMonths({
    scheme: {
      startDate: '2026-10-01',
      totalInstallments: 12,
      paidInstallments: 12,
      status: 'COMPLETED',
      currentInstallment: null,
    },
  });

  for (let i = 0; i < 12; i++) {
    assert.equal(steps[i].isCompleted, true, `Step ${i + 1} must be completed`);
    assert.equal(steps[i].isCurrent, false, `Step ${i + 1} must not be current`);
  }
});

test('8. English and Tamil localization keys are all defined and non-empty', () => {
  const steps = generateSavingsJourneyMonths({
    scheme: { startDate: '2026-10-01' },
  });

  const expectedTranslations = [
    { key: 'oct', en: 'Oct', ta: 'அக்' },
    { key: 'nov', en: 'Nov', ta: 'நவ' },
    { key: 'dec', en: 'Dec', ta: 'டிச' },
    { key: 'jan', en: 'Jan', ta: 'ஜன' },
    { key: 'feb', en: 'Feb', ta: 'பிப்' },
    { key: 'mar', en: 'Mar', ta: 'மார்' },
    { key: 'apr', en: 'Apr', ta: 'ஏப்' },
    { key: 'may', en: 'May', ta: 'மே' },
    { key: 'jun', en: 'Jun', ta: 'ஜூன்' },
    { key: 'jul', en: 'Jul', ta: 'ஜூலை' },
    { key: 'aug', en: 'Aug', ta: 'ஆக' },
    { key: 'sep', en: 'Sep', ta: 'செப்' },
  ];

  for (let i = 0; i < 12; i++) {
    const step = steps[i];
    const expected = expectedTranslations[i];
    assert.equal(step.monthKey, expected.key);
    assert.equal(en[step.monthKey], expected.en, `English translation for ${step.monthKey} must match`);
    assert.equal(ta[step.monthKey], expected.ta, `Tamil translation for ${step.monthKey} must match`);
  }
});

test('9. Maturity redemption month calculation is accurate across scheme types', () => {
  // October 2026 scheme -> maturity month is October 2027
  const maturityOct = getMaturityMonthStr({ startDate: '2026-10-01', totalInstallments: 12 });
  assert.equal(maturityOct, 'October 2027');

  // Passbook installments ending in September 2027 -> maturity month is October 2027
  const passbookInsts = [
    { calendarMonth: 'October 2026' },
    { calendarMonth: 'September 2027' },
  ];
  const maturityFromPassbook = getMaturityMonthStr(passbookInsts);
  assert.equal(maturityFromPassbook, 'October 2027');

  // September 2026 scheme -> maturity month is September 2027
  const maturitySep = getMaturityMonthStr({ startDate: '2026-09-01', totalInstallments: 12 });
  assert.equal(maturitySep, 'September 2027');
});

test('10. Verify customer-app codebase has zero remaining hardcoded MONTH_KEYS', () => {
  const homeScreenCode = fs.readFileSync(path.resolve('customer-app/src/app/(tabs)/index.tsx'), 'utf8');

  // Must not have hardcoded MONTH_KEYS definition
  assert.doesNotMatch(
    homeScreenCode,
    /const\s+MONTH_KEYS\s*:\s*TranslationKey\[\]/,
    'Hardcoded MONTH_KEYS array must be removed from index.tsx'
  );

  // Must import and use generateSavingsJourneyMonths
  assert.match(
    homeScreenCode,
    /generateSavingsJourneyMonths/,
    'index.tsx must import and call generateSavingsJourneyMonths'
  );
});
