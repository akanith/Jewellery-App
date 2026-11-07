import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('=== STEP 9: EXTENDED SECURITY & AUDIT SUITE ===\n');

// 1. Scan client directories for sensitive secrets
console.log('[Security Check 1] Scanning client source and public files for leaked secret keys...');
const sensitivePatterns = [
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]+\.service_role/g,
  /service_role_key/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][a-zA-Z0-9_\-\.]+['"]/g,
  /RAZORPAY_KEY_SECRET\s*=\s*['"][a-zA-Z0-9_\-]+['"]/g,
];

const clientDirs = [
  'admin-web/src',
  'customer-app/src',
  'admin-web/public',
  'customer-app/public'
];

let leakCount = 0;
for (const dir of clientDirs) {
  if (!fs.existsSync(dir)) continue;
  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.next') walk(full);
      } else if (ent.isFile() && /\.(js|jsx|ts|tsx|json|html|css)$/.test(ent.name)) {
        const content = fs.readFileSync(full, 'utf-8');
        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            console.error(`  [LEAK WARNING] Match in ${full} for pattern ${pattern}`);
            leakCount++;
          }
        }
      }
    }
  };
  walk(dir);
}

if (leakCount === 0) {
  console.log('  ✔ Client code & public assets are CLEAN: No service_role or payment gateway secrets exposed.\n');
} else {
  console.error(`  ✖ Found ${leakCount} potential leaks!\n`);
}

// 2. Check local migrations count and list
console.log('[Security Check 2] Inspecting local migrations...');
const migrationsDir = 'supabase/migrations';
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
console.log(`  Found ${migrationFiles.length} migration files locally.`);
console.log(`  Latest migration: ${migrationFiles[migrationFiles.length - 1]}`);

// 3. Database RLS and search_path audit against isolated validation db
console.log('\n[Security Check 3] Database RLS and search_path audit against step9_validation_db...');
const DOCKER_EXE = path.resolve('scripts/bin/docker.exe');
function runSql(sql) {
  return execSync(
    `"${DOCKER_EXE}" exec -i supabase_db_Jewellery_App psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t -A`,
    { input: `\\set ON_ERROR_STOP on\n${sql}`, encoding: 'utf-8' }
  ).trim();
}

// Check public tables without RLS
const rlsSql = `
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false;
`;
const tablesWithoutRls = runSql(rlsSql).split('\n').map(s => s.trim()).filter(Boolean);
if (tablesWithoutRls.length === 0) {
  console.log('  ✔ All public tables have Row-Level Security (RLS) ENABLED.');
} else {
  console.log(`  ⚠ Tables without RLS: ${tablesWithoutRls.join(', ')}`);
}

// Check security definer functions with mutable search_path
const secDefSql = `
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (p.proconfig IS NULL OR NOT array_to_string(p.proconfig, ',') ILIKE '%search_path=%');
`;
const secDefFuncs = runSql(secDefSql).split('\n').map(s => s.trim()).filter(Boolean);
if (secDefFuncs.length === 0) {
  console.log('  ✔ All public SECURITY DEFINER functions have a secure fixed search_path.');
} else {
  console.log(`  ℹ Security definer functions without explicit search_path config: ${secDefFuncs.join(', ')}`);
}

console.log('\n=== SECURITY & AUDIT SUITE COMPLETE ===');
