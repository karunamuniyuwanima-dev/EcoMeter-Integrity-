'use strict';
// EcoMeter Integrity API — Node.js/Express
// Group 24 | CSG3101 | Edith Cowan University
console.log('>>> LOADING ECOMETER SERVER.JS <<<');

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const nodemailer   = require('nodemailer');
const rateLimit    = require('express-rate-limit');
const { Pool }     = require('pg');
const axios        = require('axios');

const SALT_ROUNDS = 10;

// ── Email transporter (optional — set EMAIL_USER + EMAIL_PASS in .env) ─────────
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const emailTransporter = EMAIL_USER && EMAIL_PASS
    ? nodemailer.createTransport({
          service: 'gmail',
          auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      })
    : null;

async function sendOtpEmail(toEmail, otp, name) {
    if (!emailTransporter) return false;
    try {
        await emailTransporter.sendMail({
            from:    `"EcoMeter System" <${EMAIL_USER}>`,
            to:      toEmail,
            subject: 'EcoMeter — Your Password Reset OTP',
            html:    `<div style="font-family:sans-serif;max-width:480px">
                        <h2 style="color:#00a8ff">EcoMeter Integrity System</h2>
                        <p>Hi <strong>${name}</strong>,</p>
                        <p>Your one-time password (OTP) for resetting your password is:</p>
                        <div style="font-size:2rem;font-weight:bold;letter-spacing:8px;color:#00e5ff;padding:16px;background:#0a1628;border-radius:8px;text-align:center">${otp}</div>
                        <p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
                        <p style="color:#999;font-size:0.85rem">Group 24 | CSG3101 | Edith Cowan University</p>
                      </div>`,
        });
        return true;
    } catch (e) {
        console.log(`[EMAIL] Send failed: ${e.message}`);
        return false;
    }
}

// ── OTP Store ─────────────────────────────────────────────────────────────────
const otpStore = {}; // { email: { otp, expires, name } }

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.set('trust proxy', 1);

// ── Config ─────────────────────────────────────────────────────────────────────
const PORT       = process.env.PORT        || 5000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'ecometer-secret-change-this';

const ABUSEIPDB_KEY             = process.env.ABUSEIPDB_KEY             || '';
const HUGGINGFACE_KEY           = process.env.HUGGINGFACE_KEY           || '';
const ANOMALY_DETECTOR_KEY      = process.env.ANOMALY_DETECTOR_KEY      || '';
const ANOMALY_DETECTOR_ENDPOINT = (process.env.ANOMALY_DETECTOR_ENDPOINT || '').replace(/\/$/, '');

// ── Database Pool ──────────────────────────────────────────────────────────────
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    database: process.env.DB_NAME     || 'ecometer',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'ecometer123',
    port:     parseInt(process.env.DB_PORT || '5432'),
    max:      10,
    ssl:      process.env.DB_HOST?.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function dbQuery(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}

// ── Rate Limiters ──────────────────────────────────────────────────────────────
const makeLimiter = (max, windowSec = 60) => rateLimit({
    windowMs: windowSec * 1000,
    max,
    standardHeaders: true,
    legacyHeaders:   false,
    handler: (req, res) => res.status(429).json({ error: 'Too many requests', retry_after: windowSec }),
});

const lim60  = makeLimiter(60);
const lim30  = makeLimiter(30);
const lim20  = makeLimiter(20);
const lim10  = makeLimiter(10);

// ── Brute Force Tracker ────────────────────────────────────────────────────────
const bfTracker = {};
const BF_MAX     = 5;
const BF_WINDOW  = 300;
const BF_LOCKOUT = 600;

// ── Security Event Log ─────────────────────────────────────────────────────────
const securityEvents = [];

function logEvent(ip, attackType, detail, blocked, path) {
    const ev = {
        timestamp:   new Date().toISOString().replace('T', ' ').slice(0, 19),
        ip, attack_type: attackType, detail, blocked, endpoint: path,
    };
    securityEvents.push(ev);
    console.log(`[SECURITY] ${attackType} | IP=${ip} | blocked=${blocked} | ${detail}`);
}

// ── Users (in-memory, bcrypt-hashed passwords) ────────────────────────────────
const _hash = p => bcrypt.hashSync(p, SALT_ROUNDS);
const USERS = [
    { bill: 'BILL-2026-001', password: _hash('ecometer123'), name: 'Shehani Navodya',     role: 'admin',   email: 'sanduelecu@gmail.com' },
    { bill: 'BILL-2026-002', password: _hash('ecometer123'), name: 'Yuwanima Ransini',    role: 'analyst', email: '' },
    { bill: 'BILL-2026-003', password: _hash('ecometer123'), name: 'Verginiya Narathota', role: 'analyst', email: '' },
    { bill: 'BILL-2026-004', password: _hash('ecometer123'), name: 'Treveen Manisha',     role: 'analyst', email: '' },
    { bill: 'BILL-2026-005', password: _hash('ecometer123'), name: 'Thisari Chamathka',   role: 'analyst', email: '' },
];

// ── Auth Helpers ───────────────────────────────────────────────────────────────
function getIp(req) {
    const remote = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const clean  = remote.replace('::ffff:', '');
    if (clean === '127.0.0.1' || clean === '::1') {
        const fwd = req.headers['x-forwarded-for'];
        if (fwd) return fwd.split(',')[0].trim();
    }
    return clean;
}

function optionalJwt(req, res, next) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); } catch (_) {}
    }
    next();
}

function requireJwt(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Authorization token required' });
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        next();
    } catch (_) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ── AbuseIPDB ─────────────────────────────────────────────────────────────────
async function checkAbuseipdb(ip) {
    if (!ABUSEIPDB_KEY) return 0;
    try {
        const r = await axios.get('https://api.abuseipdb.com/api/v2/check', {
            headers: { Key: ABUSEIPDB_KEY, Accept: 'application/json' },
            params:  { ipAddress: ip, maxAgeInDays: 90 },
            timeout: 3000,
        });
        const score = r.data?.data?.abuseConfidenceScore || 0;
        console.log(`[ABUSEIPDB] IP=${ip} score=${score}`);
        return score;
    } catch (e) {
        console.log(`[ABUSEIPDB] Error checking ${ip}: ${e.message}`);
        return 0;
    }
}

// ── FDIA Detection Logic ───────────────────────────────────────────────────────
async function computeBaselineStats(meter_id = null) {
    let sql    = 'SELECT energy_kwh, voltage, current, power_factor, temperature FROM meter_data WHERE is_attack = false';
    let params = [];
    if (meter_id) { sql += ' AND meter_id = $1'; params = [meter_id]; }

    let rows = await dbQuery(sql, params);
    if (rows.length < 10 && meter_id)
        rows = await dbQuery('SELECT energy_kwh, voltage, current, power_factor, temperature FROM meter_data WHERE is_attack = false');
    if (!rows.length) return {};

    const fields = ['energy_kwh', 'voltage', 'current', 'power_factor', 'temperature'];
    const stats  = {};
    for (const f of fields) {
        const vals = rows.map(r => parseFloat(r[f])).filter(v => !isNaN(v)).sort((a, b) => a - b);
        if (!vals.length) continue;
        const n    = vals.length;
        const mean = vals.reduce((s, v) => s + v, 0) / n;
        const std  = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
        const q1   = vals[Math.floor(n / 4)];
        const q3   = vals[Math.floor(3 * n / 4)];
        stats[f]   = {
            mean: +mean.toFixed(4), std: +std.toFixed(4),
            min:  +vals[0].toFixed(4), max: +vals[n - 1].toFixed(4),
            q1:   +q1.toFixed(4), q3: +q3.toFixed(4), iqr: +(q3 - q1).toFixed(4),
        };
    }
    return stats;
}

function classifyFdia(energy_kwh, reading_kwh, stats) {
    if (!stats || !stats.energy_kwh)
        return { attack_type: 'unknown', risk_level: 'UNKNOWN', risk_score: 0, rules: 'none' };

    const s   = stats.energy_kwh;
    const std = s.std > 0 ? s.std : 0.0001;
    const z_base   = Math.abs(energy_kwh - s.mean) / std;
    const diff_pct = energy_kwh > 0 ? ((reading_kwh - energy_kwh) / energy_kwh * 100) : 0;
    const iqr_fence_high = s.q3 + 1.5 * s.iqr;
    const iqr_fence_low  = s.q1 - 1.5 * s.iqr;

    const rules = [];
    let attack_type = 'none';

    if (z_base > 2.0) rules.push('zscore_outlier');
    if (diff_pct > 15 || reading_kwh > iqr_fence_high) { rules.push('energy_spike_gap'); attack_type = 'spike'; }
    if (energy_kwh > iqr_fence_high) rules.push('baseline_spike');
    if (diff_pct < -10 || reading_kwh < iqr_fence_low) { rules.push('energy_drop_gap'); attack_type = 'stealth_reduce'; }
    if (energy_kwh < iqr_fence_low) rules.push('baseline_drop');
    if (attack_type === 'none' && Math.abs(diff_pct) > 3 && z_base < 2.0) { rules.push('noise_pattern'); attack_type = 'noise'; }

    const z_max = Math.max(z_base, Math.abs(diff_pct) / 10);
    let risk_level, risk_score;
    if      (z_max >= 4 || Math.abs(diff_pct) >= 40) { risk_level = 'CRITICAL'; risk_score = Math.min(100, Math.floor(60 + z_max * 5)); }
    else if (z_max >= 2.5 || Math.abs(diff_pct) >= 20) { risk_level = 'HIGH';   risk_score = Math.min(89,  Math.floor(45 + z_max * 5)); }
    else if (z_max >= 1.5 || Math.abs(diff_pct) >= 10) { risk_level = 'MEDIUM'; risk_score = Math.min(64,  Math.floor(30 + z_max * 5)); }
    else if (attack_type !== 'none')                    { risk_level = 'LOW';    risk_score = Math.min(44,  Math.floor(20 + z_max * 5)); }
    else                                                 { risk_level = 'NORMAL'; risk_score = Math.max(0,  Math.floor(30 - z_max * 5)); }

    return { attack_type, risk_level, risk_score, rules: rules.join('+') || 'none' };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /
app.get('/', optionalJwt, (req, res) => {
    res.json({
        status: 'EcoMeter API v3.1 (Node.js)', version: '3.1',
        endpoints: {
            login:             'POST /api/login',
            meter_data:        'GET  /api/meter-data         ?limit=500&offset=0',
            attacked_data:     'GET  /api/attacked-data      ?limit=500&offset=0',
            detection_results: 'GET  /api/detection-results  ?limit=500&risk_level=HIGH&meter_id=M001',
            anomalies:         'GET  /api/anomalies           ?limit=500',
            risk_summary:      'GET  /api/risk-summary',
            stats:             'GET  /api/stats',
            fdia_analyze:      'POST /api/fdia/analyze',
            fdia_summary:      'GET  /api/fdia/summary',
            fdia_by_meter:     'GET  /api/fdia/by-meter',
            fdia_timeline:     'GET  /api/fdia/timeline       ?meter_id=M001',
            attack_overview:   'GET  /api/attack-overview',
            security_events:   'GET  /api/security-events',
            blocked_ips:       'GET  /api/blocked-ips',
            unblock_ip:        'POST /api/admin/unblock/:ip',
            ping:              'GET  /api/ping',
        },
        attack_detection: {
            brute_force: 'locked after 5 failed logins per IP — 10 min lockout',
            dos:         '60 req/min rate limiting on all data endpoints',
            fdia:        'data-driven z-score + IQR — no hardcoded thresholds',
        },
        external_apis: {
            abuseipdb:   ABUSEIPDB_KEY             ? 'configured' : 'not configured (optional)',
            huggingface: HUGGINGFACE_KEY           ? 'configured' : 'not configured (optional)',
            azure_anomaly: ANOMALY_DETECTOR_KEY    ? 'configured' : 'not configured (optional)',
        },
    });
});

// GET /api/ping
app.get('/api/ping', lim60, optionalJwt, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) });
});

// POST /api/login
app.post('/api/login', lim20, async (req, res) => {
    const ip   = getIp(req);
    const now  = Date.now() / 1000;
    const { bill = '', password = '' } = req.body || {};

    // AbuseIPDB check
    const abuseScore = await checkAbuseipdb(ip);
    if (abuseScore >= 80) {
        logEvent(ip, 'MALICIOUS_IP', `AbuseIPDB score=${abuseScore} — blocked`, true, req.path);
        return res.status(403).json({ success: false, error: 'Access denied: your IP is flagged as malicious.', attack_detected: 'MALICIOUS_IP', abuse_score: abuseScore });
    }

    // Brute force — check lockout
    if (!bfTracker[ip]) bfTracker[ip] = { count: 0, first: 0, locked_until: 0 };
    const t = bfTracker[ip];

    if (t.locked_until > now) {
        const remaining = Math.ceil(t.locked_until - now);
        logEvent(ip, 'BRUTE_FORCE_BLOCKED', `Login attempt while locked (${remaining}s remaining)`, true, req.path);
        res.set('Retry-After', String(remaining));
        return res.status(429).json({ success: false, error: `Account locked. Try again in ${remaining} seconds.`, attack_detected: 'BRUTE_FORCE', locked_for_seconds: remaining });
    }

    if (t.first > 0 && (now - t.first) > BF_WINDOW) { t.count = 0; t.first = 0; }

    // Validate credentials (bcrypt compare)
    const cleanBill = bill.trim().toUpperCase();
    const found = USERS.find(u => u.bill.toUpperCase() === cleanBill);
    const user  = found && bcrypt.compareSync(password, found.password) ? found : null;

    if (user) {
        bfTracker[ip] = { count: 0, first: 0, locked_until: 0 };
        const token = jwt.sign({ bill: user.bill, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ success: true, name: user.name, role: user.role, bill: user.bill, token, access_token: token });
    }

    // Failed — increment counter
    if (t.count === 0) t.first = now;
    t.count += 1;

    if (t.count >= BF_MAX) {
        t.locked_until = now + BF_LOCKOUT;
        logEvent(ip, 'BRUTE_FORCE_DETECTED', `${t.count} failed logins — IP locked ${BF_LOCKOUT}s`, true, req.path);
        res.set('Retry-After', String(BF_LOCKOUT));
        return res.status(429).json({ success: false, error: `Too many failed attempts. IP locked for ${BF_LOCKOUT / 60} minutes.`, attack_detected: 'BRUTE_FORCE', locked_for_seconds: BF_LOCKOUT });
    }

    const remaining_attempts = BF_MAX - t.count;
    logEvent(ip, 'BRUTE_FORCE_ATTEMPT', `Failed login bill='${cleanBill}' (${t.count} attempts, ${remaining_attempts} left)`, false, req.path);
    return res.status(401).json({ success: false, error: 'Invalid bill number or password.', attempts_remaining: remaining_attempts });
});

// POST /api/register
app.post('/api/register', lim10, (req, res) => {
    const { name = '', bill = '', email = '', password = '' } = req.body || {};
    const cleanName  = name.trim();
    const cleanBill  = bill.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !cleanBill || !cleanEmail || !password)
        return res.status(400).json({ success: false, error: 'Name, bill number, email and password are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    if (password.length < 6)
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    if (USERS.find(u => u.bill.toUpperCase() === cleanBill))
        return res.status(409).json({ success: false, error: `Bill number ${cleanBill} is already registered.` });
    if (USERS.find(u => u.email && u.email.toLowerCase() === cleanEmail))
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    const hashed = bcrypt.hashSync(password, SALT_ROUNDS);
    USERS.push({ bill: cleanBill, password: hashed, name: cleanName, role: 'analyst', email: cleanEmail });
    const token = jwt.sign({ bill: cleanBill, role: 'analyst', name: cleanName }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ success: true, token, name: cleanName, role: 'analyst', bill: cleanBill });
});

// POST /api/send-otp  — step 1 of forgot password: find by email, send OTP
app.post('/api/send-otp', lim10, async (req, res) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, error: 'Email address is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });

    const user = USERS.find(u => u.email && u.email.toLowerCase() === email);
    if (!user) return res.status(404).json({ success: false, error: 'No account found with this email address.' });

    const otp = generateOtp();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000, name: user.name };

    const sent = await sendOtpEmail(email, otp, user.name);

    if (sent) {
        console.log(`[OTP] Sent to ${email}`);
        return res.json({ success: true, message: `OTP sent to ${email}` });
    } else {
        // Demo mode — return OTP in response when email is not configured
        console.log(`[OTP] Demo mode — OTP for ${email}: ${otp}`);
        return res.json({ success: true, message: `OTP generated for ${user.name}`, demo_otp: otp });
    }
});

// POST /api/verify-otp  — step 2: verify OTP is correct
app.post('/api/verify-otp', lim10, (req, res) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    const otp   = (req.body?.otp   || '').trim();
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required.' });

    const stored = otpStore[email];
    if (!stored)                       return res.status(400).json({ success: false, error: 'No OTP requested for this email. Please request a new one.' });
    if (stored.expires < Date.now())   return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' });
    if (stored.otp !== otp)            return res.status(400).json({ success: false, error: 'Incorrect OTP. Please check and try again.' });

    return res.json({ success: true, message: 'OTP verified successfully.' });
});

// POST /api/change-password  — requires JWT + current password verification
app.post('/api/change-password', lim10, requireJwt, (req, res) => {
    const bill             = (req.body?.bill             || '').trim().toUpperCase();
    const current_password = (req.body?.current_password || '');
    const new_password     = (req.body?.new_password     || '');
    if (!bill || !current_password || !new_password)
        return res.status(400).json({ success: false, error: 'Bill number, current password and new password are required.' });
    if (new_password.length < 6)
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    if (req.user.bill.toUpperCase() !== bill)
        return res.status(403).json({ success: false, error: 'You can only change your own password.' });
    const user = USERS.find(u => u.bill.toUpperCase() === bill);
    if (!user) return res.status(404).json({ success: false, error: 'Account not found.' });
    if (!bcrypt.compareSync(current_password, user.password))
        return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    user.password = bcrypt.hashSync(new_password, SALT_ROUNDS);
    return res.json({ success: true, message: `Password updated for ${user.name}` });
});

// POST /api/reset-password  — step 3: OTP verified, set new password
app.post('/api/reset-password', lim10, (req, res) => {
    const email        = (req.body?.email        || '').trim().toLowerCase();
    const otp          = (req.body?.otp          || '').trim();
    const new_password = (req.body?.new_password || '');
    if (!email || !otp || !new_password)
        return res.status(400).json({ success: false, error: 'Email, OTP and new password are required.' });
    if (new_password.length < 6)
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });

    const stored = otpStore[email];
    if (!stored || stored.expires < Date.now())
        return res.status(400).json({ success: false, error: 'OTP expired. Please start over.' });
    if (stored.otp !== otp)
        return res.status(400).json({ success: false, error: 'Invalid OTP.' });

    const user = USERS.find(u => u.email && u.email.toLowerCase() === email);
    if (!user) return res.status(404).json({ success: false, error: 'Account not found.' });

    user.password = bcrypt.hashSync(new_password, SALT_ROUNDS);
    delete otpStore[email];
    return res.json({ success: true, message: `Password reset successfully for ${user.name}` });
});

// GET /api/meter-data
app.get('/api/meter-data', lim60, optionalJwt, async (req, res) => {
    const offset = parseInt(req.query.offset) || 0;
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    try {
        const rows = await dbQuery('SELECT * FROM meter_data ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attacked-data
app.get('/api/attacked-data', lim60, optionalJwt, async (req, res) => {
    const offset = parseInt(req.query.offset) || 0;
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    try {
        const rows = await dbQuery('SELECT * FROM attacked_meter_data ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/detection-results
app.get('/api/detection-results', lim60, optionalJwt, async (req, res) => {
    const offset     = parseInt(req.query.offset) || 0;
    const limit      = Math.min(parseInt(req.query.limit) || 100, 500);
    const risk_level = req.query.risk_level;
    const meter_id   = req.query.meter_id;
    try {
        let sql    = 'SELECT * FROM detection_results WHERE 1=1';
        const params = [];
        if (risk_level) { params.push(risk_level.toUpperCase()); sql += ` AND risk_level = $${params.length}`; }
        if (meter_id)   { params.push(meter_id);                 sql += ` AND meter_id = $${params.length}`; }
        params.push(limit);  sql += ` ORDER BY id LIMIT $${params.length}`;
        params.push(offset); sql += ` OFFSET $${params.length}`;
        const rows = await dbQuery(sql, params);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/anomalies
app.get('/api/anomalies', lim60, optionalJwt, async (req, res) => {
    const offset = parseInt(req.query.offset) || 0;
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    try {
        const rows = await dbQuery(
            'SELECT * FROM detection_results WHERE detected = 1 ORDER BY risk_score DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/risk-summary
app.get('/api/risk-summary', lim30, optionalJwt, async (req, res) => {
    try {
        const rows = await dbQuery(`
            SELECT meter_id,
                   MAX(risk_score)                    AS max_risk,
                   ROUND(AVG(risk_score)::numeric, 2) AS avg_risk,
                   MAX(risk_level)                    AS risk_level
            FROM detection_results
            GROUP BY meter_id
            ORDER BY max_risk DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats
app.get('/api/stats', lim30, optionalJwt, async (req, res) => {
    try {
        const [[tot], [det], [avg], [atk], [met]] = await Promise.all([
            dbQuery('SELECT COUNT(*) AS n FROM meter_data'),
            dbQuery('SELECT COUNT(*) AS n FROM detection_results WHERE detected = 1'),
            dbQuery('SELECT AVG(risk_score) AS n FROM detection_results'),
            dbQuery('SELECT COUNT(*) AS n FROM attacked_meter_data WHERE is_attack = true'),
            dbQuery('SELECT COUNT(DISTINCT meter_id) AS n FROM meter_data'),
        ]);
        res.json({
            total_readings:   parseInt(tot.n),
            total_detections: parseInt(det.n),
            avg_risk_score:   parseFloat((parseFloat(avg.n) || 0).toFixed(2)),
            total_attacks:    parseInt(atk.n),
            total_meters:     parseInt(met.n),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/fdia/analyze
app.post('/api/fdia/analyze', lim30, optionalJwt, async (req, res) => {
    const { meter_id, energy_kwh, reading_kwh } = req.body || {};
    if (energy_kwh == null || reading_kwh == null)
        return res.status(400).json({ error: 'energy_kwh and reading_kwh are required' });
    try {
        const stats = await computeBaselineStats(meter_id || null);
        const { attack_type, risk_level, risk_score, rules } = classifyFdia(
            parseFloat(energy_kwh), parseFloat(reading_kwh), stats
        );
        const diff_pct = energy_kwh > 0
            ? +((( parseFloat(reading_kwh) - parseFloat(energy_kwh)) / parseFloat(energy_kwh)) * 100).toFixed(2)
            : 0;
        res.json({
            meter_id, energy_kwh, reading_kwh, diff_pct,
            attack_detected: attack_type !== 'none',
            attack_type, risk_level, risk_score,
            rules_triggered: rules,
            baseline_stats:  stats.energy_kwh || {},
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fdia/summary
app.get('/api/fdia/summary', lim30, optionalJwt, async (req, res) => {
    try {
        const [[tot], [det], byType, byRisk, topMeters, byRule] = await Promise.all([
            dbQuery('SELECT COUNT(*) AS n FROM detection_results'),
            dbQuery("SELECT COUNT(*) AS n FROM detection_results WHERE detected = 1"),
            dbQuery("SELECT attack_type, COUNT(*) AS count FROM detection_results WHERE detected = 1 GROUP BY attack_type ORDER BY count DESC"),
            dbQuery("SELECT risk_level, COUNT(*) AS count FROM detection_results GROUP BY risk_level ORDER BY count DESC"),
            dbQuery(`SELECT meter_id,
                            COUNT(*) FILTER (WHERE detected = 1)  AS detections,
                            ROUND(MAX(risk_score)::numeric, 1)     AS max_risk,
                            MAX(risk_level)                        AS risk_level
                     FROM detection_results GROUP BY meter_id ORDER BY detections DESC LIMIT 10`),
            dbQuery(`SELECT rule_triggered, COUNT(*) AS count FROM detection_results WHERE detected = 1
                     GROUP BY rule_triggered ORDER BY count DESC LIMIT 10`),
        ]);
        const total     = parseInt(tot.n);
        const total_det = parseInt(det.n);
        res.json({
            total_records:      total,
            total_detected:     total_det,
            detection_rate_pct: total ? +((total_det / total * 100).toFixed(2)) : 0,
            by_attack_type:     byType.map(r => ({ type: r.attack_type, count: parseInt(r.count) })),
            by_risk_level:      byRisk.map(r => ({ level: r.risk_level, count: parseInt(r.count) })),
            top_meters:         topMeters.map(r => ({ meter_id: r.meter_id, detections: parseInt(r.detections), max_risk: parseFloat(r.max_risk), risk_level: r.risk_level })),
            by_rule:            byRule.map(r => ({ rule: r.rule_triggered, count: parseInt(r.count) })),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fdia/by-meter
app.get('/api/fdia/by-meter', lim30, optionalJwt, async (req, res) => {
    try {
        const rows = await dbQuery(`
            SELECT meter_id,
                   COUNT(*)                                      AS total_readings,
                   COUNT(*) FILTER (WHERE detected = 1)          AS detections,
                   ROUND(AVG(risk_score)::numeric, 2)            AS avg_risk,
                   ROUND(MAX(risk_score)::numeric, 2)            AS max_risk,
                   MAX(risk_level)                               AS worst_risk_level,
                   STRING_AGG(DISTINCT attack_type, ', ')
                       FILTER (WHERE detected = 1
                               AND attack_type != 'none')        AS attack_types_seen
            FROM detection_results
            GROUP BY meter_id
            ORDER BY detections DESC
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fdia/timeline
app.get('/api/fdia/timeline', lim30, optionalJwt, async (req, res) => {
    const meter_id = req.query.meter_id;
    try {
        let sql    = `SELECT DATE(timestamp) AS day, COUNT(*) AS total,
                             COUNT(*) FILTER (WHERE detected = 1) AS detected,
                             MAX(risk_score) AS max_risk
                      FROM detection_results WHERE 1=1`;
        const params = [];
        if (meter_id) { params.push(meter_id); sql += ` AND meter_id = $${params.length}`; }
        sql += ' GROUP BY DATE(timestamp) ORDER BY day';
        const rows = await dbQuery(sql, params);
        res.json(rows.map(r => ({ ...r, day: r.day ? String(r.day).slice(0, 10) : null })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attack-overview
app.get('/api/attack-overview', lim30, optionalJwt, async (req, res) => {
    try {
        const [[fdiaTotal], [fdiaCrit], [fdiaHigh], fdiaTypes] = await Promise.all([
            dbQuery("SELECT COUNT(*) AS n FROM detection_results WHERE detected = 1"),
            dbQuery("SELECT COUNT(*) AS n FROM detection_results WHERE risk_level = 'CRITICAL'"),
            dbQuery("SELECT COUNT(*) AS n FROM detection_results WHERE risk_level = 'HIGH'"),
            dbQuery("SELECT attack_type, COUNT(*) AS c FROM detection_results WHERE detected = 1 AND attack_type != 'none' GROUP BY attack_type ORDER BY c DESC"),
        ]);
        const bf_events  = securityEvents.filter(e => e.attack_type.includes('BRUTE_FORCE'));
        const dos_events = securityEvents.filter(e => e.attack_type.includes('DOS'));
        const bf_ips     = [...new Set(bf_events.map(e => e.ip))];
        const dos_ips    = [...new Set(dos_events.map(e => e.ip))];
        const total_fdia = parseInt(fdiaTotal.n);
        res.json({
            fdia: {
                total_detected:   total_fdia,
                critical:         parseInt(fdiaCrit.n),
                high:             parseInt(fdiaHigh.n),
                attack_breakdown: fdiaTypes.map(r => ({ type: r.attack_type, count: parseInt(r.c) })),
            },
            brute_force: {
                total_events: bf_events.length,
                blocked:      bf_events.filter(e => e.blocked).length,
                unique_ips:   bf_ips.length,
                attacker_ips: bf_ips.slice(0, 10),
            },
            dos: {
                total_events: dos_events.length,
                blocked:      dos_events.filter(e => e.blocked).length,
                unique_ips:   dos_ips.length,
                attacker_ips: dos_ips.slice(0, 10),
            },
            summary: {
                total_attack_events: total_fdia + bf_events.length + dos_events.length,
                attack_types_active: [
                    total_fdia      > 0 ? 'FDIA'        : null,
                    bf_events.length > 0 ? 'BRUTE_FORCE' : null,
                    dos_events.length > 0 ? 'DOS'        : null,
                ].filter(Boolean),
            },
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/detect-fdia  (HuggingFace — optional)
app.post('/api/detect-fdia', lim20, optionalJwt, async (req, res) => {
    const { readings = [] } = req.body || {};
    if (!readings.length)
        return res.status(400).json({ error: 'readings field is required — send list of [energy_kwh, voltage, current, power_factor, temperature]' });
    if (!HUGGINGFACE_KEY)
        return res.status(503).json({ error: 'HUGGINGFACE_KEY not set in .env — add it to enable HuggingFace detection' });
    try {
        const r = await axios.post(
            'https://api-inference.huggingface.co/models/keras-io/timeseries-anomaly-detection',
            { inputs: readings },
            { headers: { Authorization: `Bearer ${HUGGINGFACE_KEY}` }, timeout: 15000 }
        );
        res.json({ status_code: r.status, result: r.data });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/azure-anomaly  (Azure — optional)
app.post('/api/azure-anomaly', lim20, optionalJwt, async (req, res) => {
    if (!ANOMALY_DETECTOR_KEY || !ANOMALY_DETECTOR_ENDPOINT)
        return res.status(503).json({ error: 'Azure Anomaly Detector not configured — add ANOMALY_DETECTOR_KEY and ANOMALY_DETECTOR_ENDPOINT to .env' });
    const { granularity = 'minutely', sensitivity = 95 } = req.body || {};
    let series = req.body?.series;
    if (!series) {
        const readings = req.body?.readings || [];
        if (!readings.length)
            return res.status(400).json({ error: 'Provide either "series" or "readings"' });
        const base = new Date(Date.now() - readings.length * 60000);
        series = readings.map((v, i) => ({
            timestamp: new Date(base.getTime() + i * 60000).toISOString().replace('.000Z', 'Z'),
            value:     parseFloat(v),
        }));
    }
    if (series.length < 12)
        return res.status(400).json({ error: 'Azure Anomaly Detector requires at least 12 data points' });
    try {
        const r = await axios.post(
            `${ANOMALY_DETECTOR_ENDPOINT}/anomalydetector/v1.0/timeseries/entire/detect`,
            { series, granularity, sensitivity: parseInt(sensitivity) },
            { headers: { 'Ocp-Apim-Subscription-Key': ANOMALY_DETECTOR_KEY, 'Content-Type': 'application/json' }, timeout: 15000 }
        );
        const d = r.data;
        const idx = (d.isAnomaly || []).map((f, i) => f ? i : -1).filter(i => i >= 0);
        res.json({
            total_points: series.length, anomaly_count: idx.length, anomaly_indices: idx,
            is_anomaly: d.isAnomaly || [], is_positive_anomaly: d.isPositiveAnomaly || [],
            is_negative_anomaly: d.isNegativeAnomaly || [], expected_values: d.expectedValues || [],
            upper_margins: d.upperMargins || [], lower_margins: d.lowerMargins || [], period: d.period,
        });
    } catch (e) { res.status(502).json({ error: e.message }); }
});

// GET /api/security-events
app.get('/api/security-events', lim30, optionalJwt, (req, res) => {
    res.json(securityEvents);
});

// GET /api/blocked-ips
app.get('/api/blocked-ips', lim30, optionalJwt, (req, res) => {
    const now = Date.now() / 1000;
    const blocked = {};
    for (const [ip, t] of Object.entries(bfTracker)) {
        if (t.locked_until > now)
            blocked[ip] = { locked_until: new Date(t.locked_until * 1000).toISOString(), remaining_seconds: Math.ceil(t.locked_until - now) };
    }
    res.json(blocked);
});

// POST /api/admin/unblock/:ip  — admin role required
app.post('/api/admin/unblock/:ip', lim10, requireJwt, (req, res) => {
    if (req.user.role !== 'admin')
        return res.status(403).json({ error: 'Admin role required.' });
    const ip_addr = req.params.ip;
    delete bfTracker[ip_addr];
    logEvent(getIp(req), 'ADMIN_UNBLOCK', `Admin manually unblocked IP ${ip_addr}`, false, req.path);
    res.json({ unblocked: ip_addr, message: `IP ${ip_addr} has been unblocked` });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  EcoMeter API v3.1 (Node.js/Express)`);
    console.log(`  AbuseIPDB   : ${ABUSEIPDB_KEY ? 'configured [OK]' : 'NOT configured (optional)'}`);
    console.log(`  HuggingFace : ${HUGGINGFACE_KEY ? 'configured [OK]' : 'NOT configured (optional)'}`);
    console.log(`  Azure       : ${ANOMALY_DETECTOR_KEY ? 'configured [OK]' : 'NOT configured (optional)'}`);
    console.log(`  Database    : ${process.env.DB_NAME || 'ecometer'} @ ${process.env.DB_HOST || 'localhost'}`);
    console.log(`\n  Running on http://0.0.0.0:${PORT}`);
    console.log(`  Running on http://127.0.0.1:${PORT}`);
});
