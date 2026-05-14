'use strict';
// test_attacks.js — EcoMeter FDIA Attack Detection Test
// Run: node test_attacks.js

const API = 'https://ecometer-integrity-production.up.railway.app';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const pass = (msg) => console.log(`  ${GREEN}[PASS]${RESET} ${msg}`);
const fail = (msg) => console.log(`  ${RED}[FAIL]${RESET} ${msg}`);
const info = (msg) => console.log(`  ${CYAN}[INFO]${RESET} ${msg}`);
const line = ()    => console.log(`  ${YELLOW}${'─'.repeat(60)}${RESET}`);

let passed = 0, failed = 0;

async function testFdia(label, body, expectAttack, expectType, expectLevel) {
    try {
        const res  = await fetch(`${API}/api/fdia/analyze`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });
        const data = await res.json();

        const attackedOk  = data.attack_detected === expectAttack;
        const typeOk      = expectType  ? data.attack_type  === expectType  : true;
        const levelOk     = expectLevel ? data.risk_level   === expectLevel : true;
        const allOk       = attackedOk && typeOk && levelOk;

        if (allOk) {
            pass(`${label}`);
            passed++;
        } else {
            fail(`${label}`);
            failed++;
        }

        console.log(`         attack_detected : ${data.attack_detected === true ? RED+'TRUE'+RESET : GREEN+'false'+RESET}`);
        console.log(`         attack_type     : ${CYAN}${data.attack_type}${RESET}`);
        console.log(`         risk_level      : ${BOLD}${data.risk_level}${RESET}  (score: ${data.risk_score})`);
        console.log(`         rules_triggered : ${data.rules_triggered}`);
        console.log(`         diff_pct        : ${data.diff_pct}%`);

        if (!attackedOk)  console.log(`         ${RED}✗ expected attack_detected=${expectAttack}${RESET}`);
        if (!typeOk)      console.log(`         ${RED}✗ expected attack_type=${expectType}, got ${data.attack_type}${RESET}`);
        if (!levelOk)     console.log(`         ${RED}✗ expected risk_level=${expectLevel}, got ${data.risk_level}${RESET}`);

    } catch(e) {
        fail(`${label} — ERROR: ${e.message}`);
        failed++;
    }
}

async function testEndpoint(label, url) {
    try {
        const res = await fetch(`${API}${url}`);
        if (res.ok) { pass(`${label} → ${res.status} OK`); passed++; }
        else        { fail(`${label} → ${res.status}`);    failed++; }
    } catch(e) {
        fail(`${label} — ERROR: ${e.message}`);
        failed++;
    }
}

async function testBruteForce() {
    console.log(`\n  ${BOLD}Test 5 — Brute Force Detection${RESET}`);
    info('Sending 5 wrong login attempts...');
    let blocked = false;
    for (let i = 1; i <= 6; i++) {
        const res  = await fetch(`${API}/api/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ bill: 'BILL-2026-001', password: 'wrongpassword123' })
        });
        const data = await res.json();
        if (res.status === 429) {
            pass(`Brute force blocked on attempt ${i} (status=429, attack_detected=${data.attack_detected})`);
            console.log(`         locked_for_seconds: ${data.locked_for_seconds}s`);
            passed++;
            blocked = true;
            break;
        }
        console.log(`         Attempt ${i}: status=${res.status}, attempts_remaining=${data.attempts_remaining ?? 'N/A'}`);
    }
    if (!blocked) { fail('Brute force was NOT triggered after 6 attempts'); failed++; }
}

async function testDoS() {
    console.log(`\n  ${BOLD}Test 6 — DoS Rate Limit${RESET}`);
    info('Sending 70 rapid requests to /api/ping...');
    const results = await Promise.all(
        Array.from({length: 70}, () =>
            fetch(`${API}/api/ping`).then(r => r.status).catch(() => 0)
        )
    );
    const ok429 = results.filter(s => s === 429).length;
    const ok200 = results.filter(s => s === 200).length;
    if (ok429 > 0) {
        pass(`DoS rate limiting triggered — ${ok429}/70 requests blocked with 429`);
        console.log(`         OK responses: ${ok200} | Blocked: ${ok429}`);
        passed++;
    } else {
        fail(`DoS rate limiting did NOT trigger (all ${ok200} requests passed)`);
        failed++;
    }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
(async () => {
    console.log(`\n${BOLD}${CYAN}  EcoMeter Integrity — Attack Detection Test Suite${RESET}`);
    console.log(`  API: ${API}\n`);

    // ── Test 0: Health check
    line();
    console.log(`  ${BOLD}Test 0 — Health Check${RESET}`);
    await testEndpoint('Backend is reachable', '/api/ping');
    await testEndpoint('API root returns endpoint map', '/');

    // ── Test 1: Spike Attack
    line();
    console.log(`  ${BOLD}Test 1 — Spike Attack (energy_kwh=0.045, reading_kwh=5.80)${RESET}`);
    info('Submitted reading is 128x higher than real value — should trigger spike');
    await testFdia(
        'FDIA spike attack detected',
        { meter_id: 'M001', energy_kwh: 0.045, reading_kwh: 5.80 },
        true, 'spike', null
    );

    // ── Test 2: Stealth Reduce (energy theft)
    line();
    console.log(`  ${BOLD}Test 2 — Stealth Reduce / Energy Theft (energy_kwh=0.45, reading_kwh=0.001)${RESET}`);
    info('Submitted reading is near-zero — underreporting energy use');
    await testFdia(
        'FDIA stealth_reduce attack detected',
        { meter_id: 'M001', energy_kwh: 0.45, reading_kwh: 0.001 },
        true, 'stealth_reduce', null
    );

    // ── Test 3: Noise Pattern
    line();
    console.log(`  ${BOLD}Test 3 — Noise Pattern (energy_kwh=0.300, reading_kwh=0.315)${RESET}`);
    info('5% difference, z-score low — should trigger noise pattern');
    await testFdia(
        'FDIA noise pattern detected',
        { meter_id: 'M001', energy_kwh: 0.300, reading_kwh: 0.315 },
        true, 'noise', null
    );

    // ── Test 4: Normal Reading (no false positive)
    line();
    console.log(`  ${BOLD}Test 4 — Normal Reading (energy_kwh=0.045, reading_kwh=0.046)${RESET}`);
    info('Only 2% difference — should NOT be flagged');
    await testFdia(
        'Normal reading not falsely flagged',
        { meter_id: 'M001', energy_kwh: 0.045, reading_kwh: 0.046 },
        false, 'none', null
    );

    // ── Test 5: Brute Force
    line();
    await testBruteForce();

    // ── Test 6: DoS Rate Limit
    line();
    await testDoS();

    // ── Test 7: Security events logged
    line();
    console.log(`  ${BOLD}Test 7 — Security Events Log${RESET}`);
    try {
        const res  = await fetch(`${API}/api/security-events`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            pass(`Security event log working — ${data.length} events captured`);
            const types = [...new Set(data.map(e => e.attack_type))];
            console.log(`         Event types logged: ${types.join(', ')}`);
            passed++;
        } else {
            fail('Security event log is empty');
            failed++;
        }
    } catch(e) { fail(`Security events — ERROR: ${e.message}`); failed++; }

    // ── Test 8: FDIA database summary
    line();
    console.log(`  ${BOLD}Test 8 — FDIA Database Summary${RESET}`);
    try {
        const res  = await fetch(`${API}/api/fdia/summary`);
        const data = await res.json();
        if (data.total_detected > 0) {
            pass(`FDIA database detections confirmed — ${data.total_detected} records flagged`);
            console.log(`         detection_rate_pct: ${data.detection_rate_pct}%`);
            console.log(`         attack types in DB: ${data.by_attack_type.map(t=>`${t.type}(${t.count})`).join(', ')}`);
            passed++;
        } else {
            fail('No FDIA detections found in database');
            failed++;
        }
    } catch(e) { fail(`FDIA summary — ERROR: ${e.message}`); failed++; }

    // ── Results
    line();
    const total = passed + failed;
    console.log(`\n  ${BOLD}Results:  Total: ${total}  |  ${GREEN}Passed: ${passed}${RESET}  |  ${failed > 0 ? RED : GREEN}Failed: ${failed}${RESET}${BOLD}${RESET}`);
    if (failed === 0) {
        console.log(`\n  ${GREEN}${BOLD}All tests passed! Attack detection is working correctly.${RESET}\n`);
    } else {
        console.log(`\n  ${YELLOW}${failed} test(s) need attention. Check output above.${RESET}\n`);
    }
})();
