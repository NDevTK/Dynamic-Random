// Run every *_test.mjs in this directory in its own Node process.
// Zero dependencies; Node 18+. Usage: node tests/run_all.mjs
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';

const dir = new URL('.', import.meta.url).pathname;
const suites = readdirSync(dir).filter((f) => f.endsWith('_test.mjs')).sort();

let failed = 0;
for (const f of suites) {
    const r = spawnSync(process.execPath, [dir + f], { encoding: 'utf8' });
    const ok = r.status === 0;
    if (!ok) failed++;
    console.log(`${ok ? '✓ PASS' : '✗ FAIL'}  ${f}`);
    if (!ok) process.stdout.write(r.stdout + r.stderr);
}
console.log(failed ? `\n${failed} suite(s) failed` : `\nAll ${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
