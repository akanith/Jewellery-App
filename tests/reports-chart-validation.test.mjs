import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Reports & Business Intelligence - Collection Overview Graph Validation', () => {
  const reportsPagePath = path.resolve(process.cwd(), 'admin-web/src/app/(dashboard)/reports/page.tsx');
  const fileContent = fs.readFileSync(reportsPagePath, 'utf8');

  it('reports/page.tsx exists and is readable', () => {
    assert.ok(fs.existsSync(reportsPagePath), 'reports/page.tsx must exist');
    assert.ok(fileContent.length > 500, 'reports/page.tsx must contain code');
  });

  it('guarantees non-collapsing fixed pixel bar heights to eliminate 0px height bug', () => {
    // Check for fixed pixel heights rather than purely percentage heights inside auto-height flex items
    assert.ok(
      fileContent.includes("style={{ height: '160px' }}") || fileContent.includes('style={{ height: `${CHART_TRACK_HEIGHT}px` }}'),
      'Chart track must define a guaranteed fixed pixel container height'
    );
    assert.ok(
      fileContent.includes("style={{ height: '128px' }}") || fileContent.includes('style={{ height: `${BAR_MAX_HEIGHT}px` }}'),
      'Bar slot must define a guaranteed fixed pixel slot height'
    );
    assert.ok(
      fileContent.includes('Math.round((b.amount / maxChartAmount) * 128)') || fileContent.includes('barHeightPx'),
      'Bar fill must calculate explicit pixel heights based on collection amounts'
    );
  });

  it('initializes chart bars so tracks and labels appear immediately without blank flash', () => {
    assert.ok(
      fileContent.includes('MONTH_NAMES.map') && fileContent.includes('useState<ChartBarItem[]>(() =>'),
      'chartBars must be initialized with month tracks on first render'
    );
  });

  it('renders Y-Axis reference scale values aligning with horizontal reference lines', () => {
    assert.ok(fileContent.includes('formatCurrency(maxChartAmount)'), 'Must render top scale value');
    assert.ok(fileContent.includes('formatCurrency(Math.round(maxChartAmount / 2))'), 'Must render mid scale value');
    assert.ok(fileContent.includes('text-slate-500 font-semibold">₹0</span>'), 'Must render ₹0 baseline value');
  });

  it('renders both active collection bars and inactive baseline anchors', () => {
    assert.ok(
      fileContent.includes('bg-gradient-to-t from-[#0d52bd] via-blue-600 to-amber-400'),
      'Active bars must render brand royal blue to gold gradient'
    );
    assert.ok(
      fileContent.includes('bg-slate-200/70'),
      'Inactive months must render a subtle baseline anchor pill'
    );
  });

  it('renders floating currency amount badge above active collection bars', () => {
    assert.ok(
      fileContent.includes('{formatCurrency(b.amount)}'),
      'Must render formatted currency amount badge above active bars'
    );
  });

  it('supports Week, Month, and Multi-Year time periods', () => {
    assert.ok(fileContent.includes("period === 'Week'"), 'Must support Week breakdown');
    assert.ok(fileContent.includes("period === 'Year'"), 'Must support Year breakdown');
    assert.ok(fileContent.includes('DAY_NAMES'), 'Must include day names');
    assert.ok(fileContent.includes('MONTH_NAMES'), 'Must include month names');
  });

  it('attributes payments by actual_payment_date (historical) or system payment_date (regular)', () => {
    assert.ok(
      fileContent.includes('const effectiveStr = p.actual_payment_date || p.payment_date;'),
      'Payment allocation must honor actual_payment_date for genuine historical collections'
    );
  });
});
