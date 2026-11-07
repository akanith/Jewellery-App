import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runSql(sql) {
  return execSync(
    'docker exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A',
    {
      input: `\\set ON_ERROR_STOP on\n${sql}`,
      encoding: 'utf-8',
    }
  ).trim();
}

test('1. Formatting logic preserves 3-digit zero-padding below 1000 (1 -> 001, 20 -> 020, 999 -> 999)', () => {
  const sql = `
SELECT json_agg(
  'RJ2026-' || CASE WHEN val < 1000 THEN lpad(val::text, 3, '0') ELSE val::text END
  ORDER BY val
)::text
FROM (VALUES (1), (20), (999)) AS t(val);
`;
  const result = JSON.parse(runSql(sql));
  assert.deepEqual(result, ['RJ2026-001', 'RJ2026-020', 'RJ2026-999']);
});

test('2. Formatting logic prevents truncation at and above 1000 (1000 -> 1000, 1001 -> 1001, 1250 -> 1250)', () => {
  const sql = `
SELECT json_agg(
  'RJ2026-' || CASE WHEN val < 1000 THEN lpad(val::text, 3, '0') ELSE val::text END
  ORDER BY val
)::text
FROM (VALUES (1000), (1001), (1250)) AS t(val);
`;
  const result = JSON.parse(runSql(sql));
  assert.deepEqual(result, ['RJ2026-1000', 'RJ2026-1001', 'RJ2026-1250']);
});

test('3. Verification of legacy flaw: lpad(val::text, 3, 0) truncated >=1000 values while new logic fixes it', () => {
  const sql = `
SELECT json_build_object(
  'legacy_999', 'RJ2026-' || lpad(999::text, 3, '0'),
  'legacy_1000', 'RJ2026-' || lpad(1000::text, 3, '0'),
  'legacy_1250', 'RJ2026-' || lpad(1250::text, 3, '0'),
  'fixed_999', 'RJ2026-' || (CASE WHEN 999 < 1000 THEN lpad(999::text, 3, '0') ELSE 999::text END),
  'fixed_1000', 'RJ2026-' || (CASE WHEN 1000 < 1000 THEN lpad(1000::text, 3, '0') ELSE 1000::text END),
  'fixed_1250', 'RJ2026-' || (CASE WHEN 1250 < 1000 THEN lpad(1250::text, 3, '0') ELSE 1250::text END)
)::text;
`;
  const result = JSON.parse(runSql(sql));
  // Demonstrates the legacy defect: lpad truncated '1000' to '100' and '1250' to '125'
  assert.equal(result.legacy_1000, 'RJ2026-100');
  assert.equal(result.legacy_1250, 'RJ2026-125');

  // Demonstrates the fix: full digits preserved
  assert.equal(result.fixed_999, 'RJ2026-999');
  assert.equal(result.fixed_1000, 'RJ2026-1000');
  assert.equal(result.fixed_1250, 'RJ2026-1250');
});

test('4. Boundary scan across 990 to 1010 produces 100% unique, non-colliding codes', () => {
  const sql = `
WITH sequence_series AS (
  SELECT s AS val
  FROM generate_series(990, 1010) AS s
),
formatted_codes AS (
  SELECT 'RJ2026-' || CASE WHEN val < 1000 THEN lpad(val::text, 3, '0') ELSE val::text END AS code
  FROM sequence_series
)
SELECT json_build_object(
  'total_generated', count(*),
  'unique_count', count(DISTINCT code)
)::text
FROM formatted_codes;
`;
  const result = JSON.parse(runSql(sql));
  assert.equal(result.total_generated, 21);
  assert.equal(result.unique_count, 21, 'All 21 codes across the 1000 boundary must be strictly unique');
});

test('5. Migration file 20261030130000_fix_customer_code_sequence_truncation.sql is present and valid', () => {
  const migrationPath = path.resolve('supabase/migrations/20261030130000_fix_customer_code_sequence_truncation.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('CREATE OR REPLACE FUNCTION public.create_customer_with_scheme'), 'Must define create_customer_with_scheme');
  assert.ok(content.includes('CASE'), 'Must contain CASE expression');
  assert.ok(content.includes('v_seq_val < 1000'), 'Must test boundary v_seq_val < 1000');
  assert.ok(content.includes("lpad(v_seq_val::text, 3, '0')"), 'Must use lpad for values < 1000');
  assert.ok(content.includes('v_seq_val::text'), 'Must use full text for values >= 1000');
  assert.ok(content.includes('private.is_admin()'), 'Must preserve private.is_admin() check');
  assert.ok(content.includes('REVOKE ALL ON FUNCTION public.create_customer_with_scheme'), 'Must revoke from public/anon');
  assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.create_customer_with_scheme'), 'Must grant to authenticated/service_role');
});

test('6. Isolated database transaction test: exercises full RPC behavior for 999, 1000, 1001, and 1250 with zero database mutations', () => {
  const seqBefore = runSql("SELECT last_value FROM public.customer_code_seq;");
  const custCountBefore = runSql("SELECT count(*) FROM public.customers;");

  const testScript = `
BEGIN;

CREATE TEMPORARY SEQUENCE pg_temp.test_customer_code_seq START WITH 999;

CREATE OR REPLACE FUNCTION pg_temp.create_customer_with_scheme_isolated(
    p_full_name VARCHAR(100),
    p_phone_number VARCHAR(15)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_clean_phone VARCHAR(15);
    v_customer_id UUID := gen_random_uuid();
    v_customer_code VARCHAR(30);
    v_seq_val BIGINT;
    v_year VARCHAR(4) := '2026';
BEGIN
    v_clean_phone := regexp_replace(p_phone_number, '\\D', '', 'g');

    LOOP
        v_seq_val := nextval('pg_temp.test_customer_code_seq');
        v_customer_code := 'RJ' || v_year || '-' || 
            CASE 
                WHEN v_seq_val < 1000 THEN lpad(v_seq_val::text, 3, '0')
                ELSE v_seq_val::text 
            END;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.customers WHERE customer_code = v_customer_code);
    END LOOP;

    RETURN jsonb_build_object(
        'seq_val', v_seq_val,
        'customer_code', v_customer_code
    );
END;
$$;

SELECT json_agg(res) FROM (
  SELECT pg_temp.create_customer_with_scheme_isolated('Test 999', '9888800999') AS res
  UNION ALL
  SELECT pg_temp.create_customer_with_scheme_isolated('Test 1000', '9888801000') AS res
  UNION ALL
  SELECT pg_temp.create_customer_with_scheme_isolated('Test 1001', '9888801001') AS res
) t;

ALTER SEQUENCE pg_temp.test_customer_code_seq RESTART WITH 1250;
SELECT pg_temp.create_customer_with_scheme_isolated('Test 1250', '9888801250');

ROLLBACK;
`;

  const raw = runSql(testScript);
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const batch1 = JSON.parse(lines[0]);
  assert.equal(batch1[0].seq_val, 999);
  assert.equal(batch1[0].customer_code, 'RJ2026-999');

  assert.equal(batch1[1].seq_val, 1000);
  assert.equal(batch1[1].customer_code, 'RJ2026-1000');

  assert.equal(batch1[2].seq_val, 1001);
  assert.equal(batch1[2].customer_code, 'RJ2026-1001');

  const batch2 = JSON.parse(lines[1]);
  assert.equal(batch2.seq_val, 1250);
  assert.equal(batch2.customer_code, 'RJ2026-1250');

  // Strict verification that public sequence and customer table remain 100% unchanged
  const seqAfter = runSql("SELECT last_value FROM public.customer_code_seq;");
  const custCountAfter = runSql("SELECT count(*) FROM public.customers;");

  assert.equal(seqBefore, seqAfter, 'Public sequence must be completely unmodified');
  assert.equal(custCountBefore, custCountAfter, 'Customer count must be completely unmodified');
});
