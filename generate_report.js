// generate_report.js — EcoMeter Backend & Dashboard Documentation (Node.js version)
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, UnderlineType
} = require('docx');

// ── Colour palette ────────────────────────────────────────────────────────────
const BLUE  = '1F4E79';
const LBLUE = '2E75B6';
const WHITE = 'FFFFFF';
const LGRAY = 'F2F2F2';
const DGRAY = '404040';

// ── Text helpers ──────────────────────────────────────────────────────────────
const bold   = (t, sz=22, color='000000') => new TextRun({ text:t, bold:true,  size:sz, color });
const normal = (t, sz=22, color='000000') => new TextRun({ text:t, bold:false, size:sz, color });
const italic = (t, sz=22, color='505050') => new TextRun({ text:t, italics:true, size:sz, color });
const code   = (t, sz=20, color='1F3864') => new TextRun({ text:t, font:'Courier New', size:sz, color });

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing:{before:400,after:160}, run:{color:LBLUE,bold:true} });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing:{before:320,after:120}, run:{color:LBLUE} });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing:{before:240,after:100}, run:{color:DGRAY} });
}
function p(runs, spacing={before:80,after:80}) {
  return new Paragraph({ children: Array.isArray(runs)?runs:[runs], spacing });
}
function bullet(text, sz=20) {
  return new Paragraph({ children:[new TextRun({text,size:sz})], bullet:{level:0}, spacing:{before:60,after:60} });
}
function subbullet(text, sz=20) {
  return new Paragraph({ children:[new TextRun({text,size:sz})], bullet:{level:1}, spacing:{before:40,after:40} });
}
function mono(text) {
  return new Paragraph({ children:[code(text)], spacing:{before:60,after:60} });
}
function pageBreak() {
  return new Paragraph({ children:[new PageBreak()] });
}
function spacer(n=1) {
  return new Paragraph({ children:[new TextRun('')], spacing:{before:n*80,after:n*80} });
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function hCell(text, width=2000, colspan=1) {
  return new TableCell({
    children:[new Paragraph({ children:[bold(text,20,WHITE)], alignment:AlignmentType.LEFT, spacing:{before:80,after:80} })],
    shading:{ type:ShadingType.SOLID, color:LBLUE, fill:LBLUE },
    columnSpan: colspan,
    width:{ size:width, type:WidthType.DXA },
    margins:{ top:80, bottom:80, left:120, right:120 }
  });
}
function dCell(text, width=2000, shade=false, isBold=false) {
  return new TableCell({
    children:[new Paragraph({ children:[isBold ? bold(text,20) : normal(text,20)], spacing:{before:80,after:80} })],
    shading: shade ? { type:ShadingType.SOLID, color:LGRAY, fill:LGRAY } : undefined,
    width:{ size:width, type:WidthType.DXA },
    margins:{ top:80, bottom:80, left:120, right:120 }
  });
}
function codeCell(text, width=2000, shade=false) {
  return new TableCell({
    children:[new Paragraph({ children:[code(text,18)], spacing:{before:80,after:80} })],
    shading: shade ? { type:ShadingType.SOLID, color:LGRAY, fill:LGRAY } : undefined,
    width:{ size:width, type:WidthType.DXA },
    margins:{ top:80, bottom:80, left:120, right:120 }
  });
}
function mkTable(rows, widths, totalWidth=9000) {
  return new Table({
    rows,
    width:{ size:totalWidth, type:WidthType.DXA },
    margins:{ top:80, bottom:80, left:120, right:120 }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT BUILD
// ═══════════════════════════════════════════════════════════════════════════════
const sections = [];

// ── COVER PAGE ───────────────────────────────────────────────────────────────
sections.push(
  new Paragraph({
    children:[bold('EcoMeter Integrity — Backend API and Dashboard Documentation', 40, BLUE)],
    alignment: AlignmentType.CENTER, spacing:{before:800,after:200}
  }),
  new Paragraph({
    children:[italic('Group 24 | CSG3101 | Edith Cowan University', 26)],
    alignment: AlignmentType.CENTER, spacing:{before:0,after:600}
  }),
  new Paragraph({
    children:[italic('Backend API and Dashboard Module', 28)],
    alignment: AlignmentType.CENTER, spacing:{before:0,after:80}
  }),
  new Paragraph({
    children:[italic('server.js + login.html + dashboard HTML pages — Module Documentation', 24)],
    alignment: AlignmentType.CENTER, spacing:{before:0,after:600}
  }),
  new Paragraph({
    children:[normal('Group 24 | CSG3101 Applied Project | Edith Cowan University', 22)],
    alignment: AlignmentType.CENTER, spacing:{before:0,after:60}
  }),
  new Paragraph({
    children:[normal('Supervisor: Dr. Jude Mayuran | Unit Lead: Miss Jethendri', 22)],
    alignment: AlignmentType.CENTER, spacing:{before:0,after:60}
  }),
  new Paragraph({
    children:[normal('May 2026', 22)],
    alignment: AlignmentType.CENTER, spacing:{before:0,after:400}
  }),
  spacer(1),

  mkTable([
    new TableRow({ children:[hCell('Field',3000), hCell('Detail',6000)] }),
    new TableRow({ children:[dCell('Document Title',3000,true,true), dCell('Backend API and Dashboard Module',6000,false)] }),
    new TableRow({ children:[dCell('Module',3000,false,true), dCell('Backend/server.js + dashboard HTML pages',6000,true)] }),
    new TableRow({ children:[dCell('Owner',3000,true,true), dCell('Shehani Navodya',6000,false)] }),
    new TableRow({ children:[dCell('Role',3000,false,true), dCell('Frontend & Backend Developer',6000,false)] }),
    new TableRow({ children:[dCell('Student ID',3000,true,true), dCell('10712335',6000,false)] }),
    new TableRow({ children:[dCell('Version',3000,false,true), dCell('2.0 | May 2026',6000,false)] }),
  ], [3000,6000], 9000),

  pageBreak()
);

// ── SECTION 1 — MODULE OVERVIEW ───────────────────────────────────────────────
sections.push(
  h1('1. Module Overview'),
  p([normal(
    'The Backend API and Dashboard Module is the integration module of the EcoMeter Integrity system. ' +
    'It consists of two parts: a Node.js/Express REST API (server.js) that connects to the PostgreSQL database ' +
    'and serves all the front-end pages, and a 7-page web dashboard for security analysts to view smart meter ' +
    'readings, detect FDIA attacks, view anomaly alerts, view risk values, manage users, and modify system settings.'
  )]),
  spacer(),
  p([normal('Designed by Shehani Navodya. Meets the following requirements of the project proposal:')]),
  spacer(),

  mkTable([
    new TableRow({ children:[hCell('FR',1500), hCell('Requirement',3000), hCell('How This Module Satisfies It',4500)] }),
    new TableRow({ children:[
      dCell('FR6',1500,true,true),
      dCell('Store energy data and anomaly results in a database',3000,true),
      dCell('Node.js API connects to PostgreSQL via pg connection pool. Three tables: meter_data, attacked_meter_data, detection_results. Data loaded via import_data.py.',4500,true)
    ]}),
    new TableRow({ children:[
      dCell('FR7',1500,false,true),
      dCell('Provide a web dashboard for energy trends and anomaly alerts',3000,false),
      dCell('7-page dashboard with Chart.js charts: energy line chart, risk doughnut, anomaly feed, analytics, reports, user management. Real-time data from Node.js API.',4500,false)
    ]}),
    new TableRow({ children:[
      dCell('FR8',1500,true,true),
      dCell('Allow viewing of historical energy data and past anomalies',3000,true),
      dCell('GET /api/detection-results supports risk_level and meter_id filters. alert_history.html has filter dropdowns and CSV export. reports.html has date-range and meter-ID filtering.',4500,true)
    ]}),
  ], [1500,3000,4500], 9000),

  spacer(),
  h2('1.1 Architecture Position'),
  p([normal('This is the middle module of a five-module pipeline. It receives data processed by the other modules and displays it on the dashboard.')]),
  spacer(),
  mono('Simulator -> Attack Module -> Detection Engine -> [Backend API + Dashboard]'),
  mono('(Verginiya)   (Treveen)       (Thisari)           (Shehani)'),
  spacer(),

  pageBreak()
);

// ── SECTION 2 — TECHNOLOGY STACK ─────────────────────────────────────────────
sections.push(
  h1('2. Technology Stack'),
  p([normal(
    'All package versions are from package.json. The .env file (loaded by dotenv) contains keys for external ' +
    'APIs and database credentials. The project was migrated from Python/Flask to Node.js/Express for ' +
    'cloud deployment on Railway.'
  )]),
  spacer(),

  mkTable([
    new TableRow({ children:[hCell('Technology',2200), hCell('Version',1200), hCell('Purpose and Justification',5600)] }),
    new TableRow({ children:[
      dCell('Node.js',2200,true,true),
      dCell('18+',1200,true),
      dCell('Core runtime — replaces Python. Same JavaScript used in the frontend, reducing context switching. Native async/await support for concurrent DB queries.',5600,true)
    ]}),
    new TableRow({ children:[
      dCell('Express',2200,false,true),
      dCell('4.19.2',1200,false),
      dCell('Lightweight REST API framework. Chosen for its simplicity, middleware ecosystem, and railway compatibility. app.use(), app.get(), app.post() pattern familiar to the team.',5600,false)
    ]}),
    new TableRow({ children:[
      dCell('cors',2200,true,true),
      dCell('2.8.5',1200,true),
      dCell('Cross-Origin Resource Sharing. Netlify frontend must call Railway backend across origins. origin:true, credentials:true allows JWT Authorization header to pass through.',5600,true)
    ]}),
    new TableRow({ children:[
      dCell('jsonwebtoken',2200,false,true),
      dCell('9.0.2',1200,false),
      dCell('JWT authentication. Signs 1-hour tokens on login. optionalJwt middleware on data endpoints. requireJwt middleware on admin endpoints. jwt.verify() validates all tokens.',5600,false)
    ]}),
    new TableRow({ children:[
      dCell('bcryptjs',2200,true,true),
      dCell('3.0.3',1200,true),
      dCell('Password hashing. bcrypt.hashSync() hashes all 5 user passwords at startup with SALT_ROUNDS=10. bcrypt.compareSync() validates login credentials. Pure JS — no native bindings needed.',5600,true)
    ]}),
    new TableRow({ children:[
      dCell('express-rate-limit',2200,false,true),
      dCell('7.3.1',1200,false),
      dCell('DoS rate limiting. Returns 429 Too Many Requests automatically. Applied via middleware: lim60 (data), lim30 (FDIA), lim20 (login/external), lim10 (admin/OTP). In-memory counters.',5600,false)
    ]}),
    new TableRow({ children:[
      dCell('pg',2200,true,true),
      dCell('8.12.0',1200,true),
      dCell('PostgreSQL client for Node.js (node-postgres). Pool with max:10 connections. SSL auto-enabled for Supabase hosts. pool.query() used via dbQuery() helper for all SQL.',5600,true)
    ]}),
    new TableRow({ children:[
      dCell('dotenv',2200,false,true),
      dCell('16.4.5',1200,false),
      dCell('Loads environment variables from .env file at startup. Keeps API keys (AbuseIPDB, HuggingFace, Azure, JWT secret) and database credentials out of source code.',5600,false)
    ]}),
    new TableRow({ children:[
      dCell('nodemailer',2200,true,true),
      dCell('8.0.7',1200,true),
      dCell('Email transport for OTP password reset. Configured with Gmail service using EMAIL_USER and EMAIL_PASS from .env. Sends styled HTML OTP emails to registered user addresses.',5600,true)
    ]}),
    new TableRow({ children:[
      dCell('axios',2200,false,true),
      dCell('1.7.2',1200,false),
      dCell('HTTP client used by checkAbuseipdb(), /api/detect-fdia (HuggingFace), and /api/azure-anomaly to call external APIs. Supports timeout configuration.',5600,false)
    ]}),
    new TableRow({ children:[
      dCell('HTML/CSS/JavaScript',2200,true,true),
      dCell('ES6+',1200,true),
      dCell('Frontend dashboard — 7 pages. Vanilla JS with fetch() and Promise.all(). No framework needed. Chart.js from CDN for visualisation. Role-based access via sessionStorage.',5600,true)
    ]}),
    new TableRow({ children:[
      dCell('Chart.js',2200,false,true),
      dCell('CDN 4.x',1200,false),
      dCell('Data visualisation library. Line charts (energy comparison), doughnut chart (risk distribution), bar charts (attack types, analytics). Loaded from jsdelivr CDN.',5600,false)
    ]}),
    new TableRow({ children:[
      dCell('AbuseIPDB API',2200,true,true),
      dCell('v2 (free)',1200,true),
      dCell('External IP threat intelligence. checkAbuseipdb() checks login source IPs. Score >= 80 blocks with 403. Free tier: 1,000 checks/day. API key in .env as ABUSEIPDB_KEY.',5600,true)
    ]}),
  ], [2200,1200,5600], 9000),

  spacer(),
  h2('2.1 Deployment Stack'),
  spacer(),

  mkTable([
    new TableRow({ children:[hCell('Component',2500), hCell('Platform',2000), hCell('URL / Detail',4500)] }),
    new TableRow({ children:[
      dCell('Backend API (server.js)',2500,true,true),
      dCell('Railway',2000,true),
      dCell('https://ecometer-integrity-production.up.railway.app',4500,true)
    ]}),
    new TableRow({ children:[
      dCell('Frontend (7 HTML pages)',2500,false,true),
      dCell('Netlify',2000,false),
      dCell('Deployed via drag-and-drop. HTTPS provided automatically.',4500,false)
    ]}),
    new TableRow({ children:[
      dCell('Database (PostgreSQL)',2500,true,true),
      dCell('Supabase',2000,true),
      dCell('Free shared PostgreSQL instance. SSL connection from Railway.',4500,true)
    ]}),
  ], [2500,2000,4500], 9000),

  pageBreak()
);

// ── SECTION 3 — DATABASE DESIGN ───────────────────────────────────────────────
sections.push(
  h1('3. Database Design'),
  h2('3.1 Database Change from Proposal'),
  p([normal(
    'The proposal called for MySQL. As implemented, the team used PostgreSQL hosted on Supabase ' +
    '(and locally on localhost for development). The database URL is constructed in server.js from .env variables.'
  )]),
  spacer(),
  mono('postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'),
  spacer(),

  mkTable([
    new TableRow({ children:[hCell('Reason',2500), hCell('Detail',6500)] }),
    new TableRow({ children:[
      dCell('Managed cloud hosting',2500,true,true),
      dCell('Supabase provides a free shared PostgreSQL instance — no local install needed on each team member\'s machine.',6500,true)
    ]}),
    new TableRow({ children:[
      dCell('DECIMAL precision',2500,false,true),
      dCell('DECIMAL(10,4) gives 4 decimal places for kWh values — important for accurate anomaly detection thresholds.',6500,false)
    ]}),
    new TableRow({ children:[
      dCell('STRING_AGG function',2500,true,true),
      dCell('Used in /api/fdia/by-meter to concatenate distinct attack types per meter. Not available in MySQL without workarounds.',6500,true)
    ]}),
    new TableRow({ children:[
      dCell('FILTER clause',2500,false,true),
      dCell('PostgreSQL supports COUNT(*) FILTER (WHERE detected=1) for clean conditional aggregation used in analytics queries.',6500,false)
    ]}),
    new TableRow({ children:[
      dCell('Schema unchanged',2500,true,true),
      dCell('Only the database engine changed. Table names, column names, and data types remained as originally designed.',6500,true)
    ]}),
    new TableRow({ children:[
      dCell('Node.js SSL',2500,false,true),
      dCell('pg Pool auto-enables SSL when DB_HOST contains "supabase". rejectUnauthorized:false used for Supabase\'s shared certificate.',6500,false)
    ]}),
  ], [2500,6500], 9000),

  spacer(),
  h2('3.2 Three-Table Schema'),
  p([normal('There are three tables, one for each stage of the data pipeline. Data is imported from CSV files created by upstream modules by import_data.py.')]),
  spacer(),

  p([bold('Table 1 — meter_data', 22)]),
  p([italic('Clean simulator output. Baseline for detection experiments. Deleted and re-inserted on each run of import_data.py.', 20)]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Column',2200), hCell('Type',1800), hCell('Constraint',1600), hCell('Description',3400)] }),
    new TableRow({ children:[codeCell('meter_id',2200,true), dCell('VARCHAR(10)',1800,true), dCell('NOT NULL',1600,true), dCell('Meter identifier — M001 to M005',3400,true)] }),
    new TableRow({ children:[codeCell('timestamp',2200), dCell('TIMESTAMP',1800), dCell('NOT NULL',1600), dCell('Reading datetime at 15-minute intervals',3400)] }),
    new TableRow({ children:[codeCell('energy_kwh',2200,true), dCell('DECIMAL(10,4)',1800,true), dCell('NOT NULL',1600,true), dCell('Energy in kWh — clean simulator value',3400,true)] }),
    new TableRow({ children:[codeCell('voltage',2200), dCell('DECIMAL(8,2)',1800), dCell('NULL',1600), dCell('Voltage reading (approx 230V nominal)',3400)] }),
    new TableRow({ children:[codeCell('current',2200,true), dCell('DECIMAL(8,3)',1800,true), dCell('NULL',1600,true), dCell('Current in amperes',3400,true)] }),
    new TableRow({ children:[codeCell('power_factor',2200), dCell('DECIMAL(5,3)',1800), dCell('NULL',1600), dCell('Power factor (0.85 to 0.98 range)',3400)] }),
    new TableRow({ children:[codeCell('temperature',2200,true), dCell('DECIMAL(5,1)',1800,true), dCell('NULL',1600,true), dCell('Ambient temperature in Celsius',3400,true)] }),
    new TableRow({ children:[codeCell('status',2200), dCell('VARCHAR(20)',1800), dCell('NULL',1600), dCell('Meter status flag',3400)] }),
    new TableRow({ children:[codeCell('is_attack',2200,true), dCell('BOOLEAN',1800,true), dCell('DEFAULT FALSE',1600,true), dCell('Always False in this table',3400,true)] }),
    new TableRow({ children:[codeCell('attack_type',2200), dCell('VARCHAR(30)',1800), dCell('NULL',1600), dCell('Always NULL in this table',3400)] }),
  ], [2200,1800,1600,3400], 9000),

  spacer(),
  p([bold('Table 2 — attacked_meter_data', 22)]),
  p([italic('FDIA-altered readings created by Treveen\'s attack module. Includes all columns from meter_data plus:', 20)]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Extra Column',2200), hCell('Type',1800), hCell('Constraint',1600), hCell('Description',3400)] }),
    new TableRow({ children:[codeCell('attacked_kwh',2200,true), dCell('DECIMAL(10,4)',1800,true), dCell('NOT NULL',1600,true), dCell('The FDIA-modified energy value injected by the attack module',3400,true)] }),
    new TableRow({ children:[codeCell('diff_pct',2200), dCell('DECIMAL(8,2)',1800), dCell('NOT NULL',1600), dCell('Percentage difference between energy_kwh and attacked_kwh. Positive = spike attack. Negative = stealth underreporting.',3400)] }),
  ], [2200,1800,1600,3400], 9000),

  spacer(),
  p([bold('Table 3 — detection_results', 22)]),
  p([italic('Results of Thisari\'s anomaly detection algorithm. APPENDED on each run — never removed — to preserve alert history.', 20)]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Column',2200), hCell('Type',1800), hCell('Constraint',1600), hCell('Description',3400)] }),
    new TableRow({ children:[codeCell('meter_id',2200,true), dCell('VARCHAR(10)',1800,true), dCell('NOT NULL',1600,true), dCell('Which meter this reading came from',3400,true)] }),
    new TableRow({ children:[codeCell('timestamp',2200), dCell('TIMESTAMP',1800), dCell('NOT NULL',1600), dCell('When the reading was recorded',3400)] }),
    new TableRow({ children:[codeCell('energy_kwh',2200,true), dCell('DECIMAL(10,4)',1800,true), dCell('NOT NULL',1600,true), dCell('Real energy value from meter_data (ground truth)',3400,true)] }),
    new TableRow({ children:[codeCell('reading_kwh',2200), dCell('DECIMAL(10,4)',1800), dCell('NOT NULL',1600), dCell('The submitted reading — may be the attacked value',3400)] }),
    new TableRow({ children:[codeCell('detected',2200,true), dCell('INTEGER',1800,true), dCell('NOT NULL',1600,true), dCell('1 = flagged as anomaly by detection engine. 0 = normal.',3400,true)] }),
    new TableRow({ children:[codeCell('risk_score',2200), dCell('DECIMAL(5,2)',1800), dCell('NOT NULL',1600), dCell('Numeric risk score 0 to 100 from detection engine',3400)] }),
    new TableRow({ children:[codeCell('risk_level',2200,true), dCell('VARCHAR(20)',1800,true), dCell('NOT NULL',1600,true), dCell('NORMAL / LOW / MEDIUM / HIGH / CRITICAL',3400,true)] }),
    new TableRow({ children:[codeCell('rule_triggered',2200), dCell('VARCHAR(100)',1800), dCell('NULL',1600), dCell('Which detection rules fired — e.g. energy_spike_gap+zscore_outlier',3400)] }),
    new TableRow({ children:[codeCell('attack_type',2200,true), dCell('VARCHAR(30)',1800,true), dCell('NULL',1600,true), dCell('spike / stealth_reduce / noise / none',3400,true)] }),
    new TableRow({ children:[codeCell('ground_truth',2200), dCell('INTEGER',1800), dCell('NOT NULL',1600), dCell('1 = was actually attacked. 0 = genuine normal reading. Compared with detected to produce confusion matrix.',3400)] }),
    new TableRow({ children:[codeCell('detection_time',2200,true), dCell('VARCHAR(20)',1800,true), dCell('NULL',1600,true), dCell('Processing duration recorded by the detection engine',3400,true)] }),
  ], [2200,1800,1600,3400], 9000),

  spacer(),
  h2('3.3 import_data.py Behaviour'),
  p([normal('import_data.py is used to bulk load CSV data from the Database folder into PostgreSQL. It has an intentional unbalanced approach for the three tables:')]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Table',2500), hCell('Action on Run',2500), hCell('Reason',4000)] }),
    new TableRow({ children:[codeCell('meter_data',2500,true), dCell('DELETE all rows, then INSERT all from CSV',2500,true), dCell('Raw simulator input. Always re-imported clean. No history needed.',4000,true)] }),
    new TableRow({ children:[codeCell('attacked_meter_data',2500), dCell('DELETE all rows, then INSERT all from CSV',2500), dCell('Raw attack module output. Re-imported alongside meter_data.',4000)] }),
    new TableRow({ children:[codeCell('detection_results',2500,true), dCell('APPEND only (no delete). Duplicate-check before each INSERT.',2500,true), dCell('Alert history must be preserved. Clearing it would lose all past detections. New records are added; existing records are skipped.',4000,true)] }),
  ], [2500,2500,4000], 9000),

  pageBreak()
);

// ── SECTION 4 — API ENDPOINTS ─────────────────────────────────────────────────
sections.push(
  h1('4. Node.js API Endpoints'),
  p([normal(
    'server.js provides 22 endpoints in 7 categories. All return JSON. GET / provides a real-time endpoint map. ' +
    'All SQL queries use parameterised inputs ($1, $2, ...) via pg\'s pool.query() for SQL injection protection.'
  )]),
  spacer(),
  new Paragraph({
    children:[
      bold('dbQuery() helper — '),
      normal('All SELECT queries use the async dbQuery(sql, params) helper which draws a connection from the pg Pool, executes the query with parameterised inputs, and returns result.rows directly.', 22)
    ],
    spacing:{before:80,after:80}
  }),

  spacer(),
  h2('4.1 Authentication'),
  mkTable([
    new TableRow({ children:[hCell('Method',1200), hCell('Endpoint',2500), hCell('Rate Limit',1300), hCell('Description',4000)] }),
    new TableRow({ children:[
      dCell('POST',1200,true,true), codeCell('/api/login',2500,true), dCell('20 / min',1300,true),
      dCell('Validates bill number + bcrypt password from USERS array. Step 1: AbuseIPDB check (score >= 80 = 403). Step 2: Brute force lockout check (429 if locked). Step 3: bcrypt.compareSync() credential match. Step 4: Issue JWT or increment fail counter. 5 fails in 300s = locked 600s.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('POST',1200,false,true), codeCell('/api/register',2500,false), dCell('10 / min',1300,false),
      dCell('Creates a new analyst account. Validates name, bill, email, password. Checks for duplicate bill and email. Hashes password with bcryptjs. Returns JWT on success. New users are always assigned analyst role.',4000,false)
    ]}),
  ], [1200,2500,1300,4000], 9000),

  spacer(),
  h2('4.2 Password Reset (OTP Flow)'),
  p([normal('Three-step OTP email password reset flow. OTPs are stored in server memory and expire after 5 minutes.')]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Method',1200), hCell('Endpoint',2500), hCell('Rate Limit',1300), hCell('Description',4000)] }),
    new TableRow({ children:[
      dCell('POST',1200,true,true), codeCell('/api/send-otp',2500,true), dCell('10 / min',1300,true),
      dCell('Step 1: Looks up user by email address. Generates 6-digit OTP. Stores {otp, expires, name} in otpStore keyed by email. Sends HTML email via nodemailer/Gmail if EMAIL_USER+EMAIL_PASS are set. Returns demo_otp in response if email is not configured.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('POST',1200,false,true), codeCell('/api/verify-otp',2500,false), dCell('10 / min',1300,false),
      dCell('Step 2: Verifies the OTP entered by the user matches otpStore and is not expired. Returns success/failure without changing the password.',4000,false)
    ]}),
    new TableRow({ children:[
      dCell('POST',1200,true,true), codeCell('/api/reset-password',2500,true), dCell('10 / min',1300,true),
      dCell('Step 3: Re-verifies OTP then updates the user\'s bcrypt-hashed password. Deletes OTP from otpStore after successful reset. Requires new password to be at least 6 characters.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('POST',1200,false,true), codeCell('/api/change-password',2500,false), dCell('10 / min',1300,false),
      dCell('Authenticated password change. Requires valid JWT + current password verification with bcrypt.compareSync(). User can only change their own password (bill number matched against JWT). Minimum 6 characters.',4000,false)
    ]}),
  ], [1200,2500,1300,4000], 9000),

  spacer(),
  h2('4.3 Data Retrieval'),
  mkTable([
    new TableRow({ children:[hCell('Method',1200), hCell('Endpoint',2500), hCell('Rate Limit',1300), hCell('Description',4000)] }),
    new TableRow({ children:[
      dCell('GET',1200,true,true), codeCell('/api/meter-data',2500,true), dCell('60 / min',1300,true),
      dCell('Normal smart meter readings from meter_data table. Supports ?limit (max 500) and ?offset for pagination. Used by index.html and analytics.html.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,false,true), codeCell('/api/attacked-data',2500,false), dCell('60 / min',1300,false),
      dCell('FDIA-modified readings from attacked_meter_data. Includes attacked_kwh and diff_pct. Used by index.html for the red attacked line on the energy chart.',4000,false)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,true,true), codeCell('/api/detection-results',2500,true), dCell('60 / min',1300,true),
      dCell('All detection results. Optional filters: ?risk_level=HIGH and ?meter_id=M001. Uses WHERE 1=1 dynamic SQL so filters can be combined freely. Used by all data pages.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,false,true), codeCell('/api/anomalies',2500,false), dCell('60 / min',1300,false),
      dCell('Detected anomalies only (WHERE detected=1) sorted by risk_score DESC. Used by the Anomaly Alerts feed on the dashboard.',4000,false)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,true,true), codeCell('/api/risk-summary',2500,true), dCell('30 / min',1300,true),
      dCell('MAX and AVG risk score per meter via GROUP BY meter_id, sorted by max_risk DESC. Used by risk summary cards.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,false,true), codeCell('/api/stats',2500,false), dCell('30 / min',1300,false),
      dCell('5 dashboard stat card values: total_readings (COUNT meter_data), total_detections (COUNT detected=1), avg_risk_score (AVG risk_score), total_attacks (COUNT is_attack=true), total_meters (COUNT DISTINCT meter_id). Uses Promise.all() for parallel queries.',4000,false)
    ]}),
  ], [1200,2500,1300,4000], 9000),

  spacer(),
  h2('4.4 FDIA Analysis'),
  mkTable([
    new TableRow({ children:[hCell('Method',1200), hCell('Endpoint',2500), hCell('Rate Limit',1300), hCell('Description',4000)] }),
    new TableRow({ children:[
      dCell('POST',1200,true,true), codeCell('/api/fdia/analyze',2500,true), dCell('30 / min',1300,true),
      dCell('Real-time FDIA detection on one submitted reading. Calls computeBaselineStats(meter_id) then classifyFdia(). Returns attack_type, risk_level, risk_score, rules_triggered, diff_pct, baseline_stats.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,false,true), codeCell('/api/fdia/summary',2500,false), dCell('30 / min',1300,false),
      dCell('Full FDIA stats: total_records, total_detected, detection_rate_pct, by_attack_type, by_risk_level, top_meters (top 10), by_rule (top 10). Uses Promise.all() for parallel queries.',4000,false)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,true,true), codeCell('/api/fdia/by-meter',2500,true), dCell('30 / min',1300,true),
      dCell('Per-meter breakdown. Uses PostgreSQL STRING_AGG(DISTINCT attack_type) FILTER (WHERE detected=1) to show all attack types seen per meter. Returns total_readings, detections, avg_risk, max_risk, worst_risk_level.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,false,true), codeCell('/api/fdia/timeline',2500,false), dCell('30 / min',1300,false),
      dCell('FDIA detections grouped by DATE(timestamp). Returns day, total, detected count, max_risk per day. Optional ?meter_id filter for single-meter view.',4000,false)
    ]}),
  ], [1200,2500,1300,4000], 9000),

  spacer(),
  h2('4.5 External API Integration (Optional)'),
  mkTable([
    new TableRow({ children:[hCell('Method',1200), hCell('Endpoint',2500), hCell('Rate Limit',1300), hCell('Description',4000)] }),
    new TableRow({ children:[
      dCell('POST',1200,true,true), codeCell('/api/detect-fdia',2500,true), dCell('20 / min',1300,true),
      dCell('Forwards readings to HuggingFace Inference API. Requires HUGGINGFACE_KEY in .env. Body: {readings: [[energy_kwh, voltage, current, power_factor, temperature], ...]}. Returns graceful 503 error if key not configured.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('POST',1200,false,true), codeCell('/api/azure-anomaly',2500,false), dCell('20 / min',1300,false),
      dCell('Microsoft Azure Anomaly Detector. Supports Option A (full series with timestamps) or Option B (plain float array, server auto-generates timestamps). Minimum 12 data points. Requires ANOMALY_DETECTOR_KEY and ANOMALY_DETECTOR_ENDPOINT in .env.',4000,false)
    ]}),
  ], [1200,2500,1300,4000], 9000),

  spacer(),
  h2('4.6 Security Monitoring'),
  mkTable([
    new TableRow({ children:[hCell('Method',1200), hCell('Endpoint',2500), hCell('Rate Limit',1300), hCell('Description',4000)] }),
    new TableRow({ children:[
      dCell('GET',1200,true,true), codeCell('/api/attack-overview',2500,true), dCell('30 / min',1300,true),
      dCell('Combined summary: FDIA counts from PostgreSQL + Brute Force and DoS counts from in-memory securityEvents array. Shows attack_breakdown, blocked counts, attacker IPs, and active attack types.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,false,true), codeCell('/api/security-events',2500,false), dCell('30 / min',1300,false),
      dCell('In-memory log of all security events since server started. Each event: timestamp, ip, attack_type, detail, blocked (bool), endpoint. Reset on server restart.',4000,false)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,true,true), codeCell('/api/blocked-ips',2500,true), dCell('30 / min',1300,true),
      dCell('Currently locked IPs from bfTracker object. Shows locked_until (ISO timestamp) and remaining_seconds. Returns empty object if no IPs are currently locked.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('POST',1200,false,true), codeCell('/api/admin/unblock/:ip',2500,false), dCell('10 / min',1300,false),
      dCell('requireJwt + role check — admin only. Removes IP from bfTracker using delete. Logs ADMIN_UNBLOCK event to securityEvents. Returns 403 if non-admin token used.',4000,false)
    ]}),
  ], [1200,2500,1300,4000], 9000),

  spacer(),
  h2('4.7 Utility'),
  mkTable([
    new TableRow({ children:[hCell('Method',1200), hCell('Endpoint',2500), hCell('Rate Limit',1300), hCell('Description',4000)] }),
    new TableRow({ children:[
      dCell('GET',1200,true,true), codeCell('/api/ping',2500,true), dCell('60 / min',1300,true),
      dCell('Health check. Returns {status: ok, timestamp}. Uses optionalJwt — works with or without token. Called by frontend to verify backend connectivity.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('GET',1200,false,true), codeCell('/',2500,false), dCell('—',1300,false),
      dCell('API info page. Returns full endpoint map, attack_detection config, and external_apis status (configured/not configured) for AbuseIPDB, HuggingFace, and Azure.',4000,false)
    ]}),
  ], [1200,2500,1300,4000], 9000),

  pageBreak()
);

// ── SECTION 5 — SECURITY ARCHITECTURE ────────────────────────────────────────
sections.push(
  h1('5. Security Architecture'),
  p([normal(
    'The backend has three distinct security measures in server.js. They are applied serially at the login ' +
    'endpoint, and independently at the data endpoints.'
  )]),
  spacer(),

  h2('5.1 Three-Layer Security Model'),
  mkTable([
    new TableRow({ children:[hCell('Layer',1000), hCell('Technology',2000), hCell('Attack Prevented',2000), hCell('Exact Configuration from server.js',4000)] }),
    new TableRow({ children:[
      dCell('Layer 1',1000,true,true), dCell('AbuseIPDB API',2000,true,true), dCell('Known malicious IPs',2000,true),
      dCell('ABUSEIPDB_KEY from .env. Calls api.abuseipdb.com/api/v2/check with caller IP, maxAgeInDays=90, timeout:3000ms. Score >= 80 = 403 + MALICIOUS_IP event. Returns 0 (safe default) if key not set.',4000,true)
    ]}),
    new TableRow({ children:[
      dCell('Layer 2',1000,false,true), dCell('bfTracker object',2000,false,true), dCell('Brute force / password guessing',2000,false),
      dCell('BF_MAX=5, BF_WINDOW=300s, BF_LOCKOUT=600s. Tracks per-IP. 5 fails in 5 min = 429 + Retry-After header + BRUTE_FORCE_DETECTED event.',4000,false)
    ]}),
    new TableRow({ children:[
      dCell('Layer 3',1000,true,true), dCell('express-rate-limit',2000,true,true), dCell('DoS flooding',2000,true),
      dCell('lim60: data endpoints. lim30: FDIA endpoints. lim20: login + external APIs. lim10: admin + OTP endpoints. In-memory counters reset on server restart.',4000,true)
    ]}),
  ], [1000,2000,2000,4000], 9000),

  spacer(),
  h2('5.2 Login Flow — Exact Steps from server.js'),
  mkTable([
    new TableRow({ children:[hCell('Step',800), hCell('Action',3000), hCell('On Fail',2600), hCell('On Pass',2600)] }),
    new TableRow({ children:[
      dCell('1',800,true,true), dCell('checkAbuseipdb(ip) — query AbuseIPDB external API',3000,true),
      dCell('403 Forbidden. logEvent MALICIOUS_IP. Return immediately.',2600,true),
      dCell('Continue to step 2',2600,true)
    ]}),
    new TableRow({ children:[
      dCell('2',800,false,true), dCell('Check bfTracker[ip].locked_until > now',3000,false),
      dCell('429 Too Many Requests. Retry-After header. logEvent BRUTE_FORCE_BLOCKED.',2600,false),
      dCell('Continue to step 3',2600,false)
    ]}),
    new TableRow({ children:[
      dCell('3',800,true,true), dCell('Reset window if (now - first) > BF_WINDOW (300s)',3000,true),
      dCell('N/A',2600,true),
      dCell('Window reset if expired, continue',2600,true)
    ]}),
    new TableRow({ children:[
      dCell('4',800,false,true), dCell('Match bill in USERS array, then bcrypt.compareSync(password, hash)',3000,false),
      dCell('Increment count. If count >= 5: set locked_until = now+600, log BRUTE_FORCE_DETECTED, return 429.',2600,false),
      dCell('Continue to step 5',2600,false)
    ]}),
    new TableRow({ children:[
      dCell('5',800,true,true), dCell('jwt.sign({bill, role, name}, JWT_SECRET, {expiresIn:\'1h\'})',3000,true),
      dCell('N/A',2600,true),
      dCell('Return 200 with token, name, role, bill. Reset bfTracker[ip] to zeros.',2600,true)
    ]}),
  ], [800,3000,2600,2600], 9000),

  spacer(),
  h2('5.3 JWT Configuration'),
  mkTable([
    new TableRow({ children:[hCell('Setting',3500), hCell('Value',5500)] }),
    new TableRow({ children:[dCell('JWT_ACCESS_TOKEN_EXPIRES',3500,true,true), dCell('3600 seconds (1 hour). Set as expiresIn in jwt.sign() options.',5500,true)] }),
    new TableRow({ children:[dCell('JWT_SECRET_KEY',3500,false,true), dCell('From .env as JWT_SECRET_KEY. Default: \'ecometer-secret-change-this\' if not set.',5500,false)] }),
    new TableRow({ children:[dCell('optionalJwt middleware',3500,true,true), dCell('@jwt_required(optional=True) equivalent. Works with or without token. Used on all data endpoints. Avoids breaking dashboard if token expires.',5500,true)] }),
    new TableRow({ children:[dCell('requireJwt middleware',3500,false,true), dCell('Mandatory token check. /api/admin/unblock/:ip requires valid JWT. Returns 401 without one. Also checks role===\'admin\' inside the handler.',5500,false)] }),
    new TableRow({ children:[dCell('CORS configuration',3500,true,true), dCell('origin:true, credentials:true in cors() config. Without credentials:true the browser strips the Authorization header on cross-origin requests from Netlify to Railway.',5500,true)] }),
  ], [3500,5500], 9000),

  spacer(),
  h2('5.4 Security Event Types Logged'),
  p([normal('All security events are added to the in-memory array securityEvents with logEvent(ip, attackType, detail, blocked, path).')]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('attack_type',2500), hCell('Trigger',4500), hCell('blocked',2000)] }),
    new TableRow({ children:[codeCell('MALICIOUS_IP',2500,true), dCell('AbuseIPDB score >= 80',4500,true), dCell('True',2000,true)] }),
    new TableRow({ children:[codeCell('BRUTE_FORCE_ATTEMPT',2500), dCell('Failed login, counter not yet at max',4500), dCell('False',2000)] }),
    new TableRow({ children:[codeCell('BRUTE_FORCE_DETECTED',2500,true), dCell('5th failed login — IP now locked',4500,true), dCell('True',2000,true)] }),
    new TableRow({ children:[codeCell('BRUTE_FORCE_BLOCKED',2500), dCell('Login attempt while IP is in lockout period',4500), dCell('True',2000)] }),
    new TableRow({ children:[codeCell('ADMIN_UNBLOCK',2500,true), dCell('Admin manually unblocked an IP via POST /api/admin/unblock/:ip',4500,true), dCell('False',2000,true)] }),
  ], [2500,4500,2000], 9000),

  pageBreak()
);

// ── SECTION 6 — FDIA DETECTION LOGIC ─────────────────────────────────────────
sections.push(
  h1('6. FDIA Detection Logic'),
  p([normal(
    'The FDIA detection takes place in two JavaScript functions in server.js. They are invoked via ' +
    'POST /api/fdia/analyze, as well as being used internally to calculate baseline statistics for the dashboard analytics. ' +
    'The algorithm is identical to the original Python implementation — only the language changed.'
  )]),
  spacer(),

  h2('6.1 computeBaselineStats(meter_id)'),
  p([normal(
    'Gets all rows (WHERE is_attack = false) in meter_data for the specified meter. If there are fewer than 10 rows ' +
    'for that meter, then reads all meters. Calculates statistical properties on 5 fields: energy_kwh, voltage, current, ' +
    'power_factor, temperature.'
  )]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Statistic',2000), hCell('How it is Calculated',7000)] }),
    new TableRow({ children:[codeCell('mean',2000,true), dCell('sum(vals) / n — average of all non-attack readings for this meter',7000,true)] }),
    new TableRow({ children:[codeCell('std',2000), dCell('sqrt(sum((v - mean)^2) / n) — standard deviation measuring spread of normal values',7000)] }),
    new TableRow({ children:[codeCell('q1',2000,true), dCell('vals_sorted[Math.floor(n/4)] — 25th percentile value',7000,true)] }),
    new TableRow({ children:[codeCell('q3',2000), dCell('vals_sorted[Math.floor(3*n/4)] — 75th percentile value',7000)] }),
    new TableRow({ children:[codeCell('iqr',2000,true), dCell('q3 - q1 (Interquartile Range)',7000,true)] }),
    new TableRow({ children:[codeCell('iqr_fence_high',2000), dCell('q3 + 1.5 * iqr — upper boundary of normal range (calculated in classifyFdia)',7000)] }),
    new TableRow({ children:[codeCell('iqr_fence_low',2000,true), dCell('q1 - 1.5 * iqr — lower boundary of normal range (calculated in classifyFdia)',7000,true)] }),
  ], [2000,7000], 9000),

  spacer(),
  h2('6.2 classifyFdia(energy_kwh, reading_kwh, stats) — Six Rules'),
  p([normal(
    'Gets the real meter value (energy_kwh) and submitted value (reading_kwh). Computes z_base (number of standard ' +
    'deviations from the mean) and diff_pct (difference between real and submitted). Then evaluates six rules:'
  )]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Rule Name',2500), hCell('Condition',3500), hCell('Attack Type Set',3000)] }),
    new TableRow({ children:[codeCell('zscore_outlier',2500,true), dCell('z_base > 2.0 (z_base = abs(energy_kwh - mean) / std)',3500,true), dCell('General anomaly flag',3000,true)] }),
    new TableRow({ children:[codeCell('energy_spike_gap',2500), dCell('diff_pct > 15% OR reading_kwh > iqr_fence_high',3500), dCell('attack_type = \'spike\'',3000)] }),
    new TableRow({ children:[codeCell('baseline_spike',2500,true), dCell('energy_kwh > iqr_fence_high',3500,true), dCell('Adds to rules list',3000,true)] }),
    new TableRow({ children:[codeCell('energy_drop_gap',2500), dCell('diff_pct < -10% OR reading_kwh < iqr_fence_low',3500), dCell('attack_type = \'stealth_reduce\'',3000)] }),
    new TableRow({ children:[codeCell('baseline_drop',2500,true), dCell('energy_kwh < iqr_fence_low',3500,true), dCell('Adds to rules list',3000,true)] }),
    new TableRow({ children:[codeCell('noise_pattern',2500), dCell('abs(diff_pct) > 3% AND z_base < 2.0 AND attack_type still \'none\'',3500), dCell('attack_type = \'noise\'',3000)] }),
  ], [2500,3500,3000], 9000),

  spacer(),
  h2('6.3 Risk Score Formula'),
  p([italic('z_score_max = Math.max(z_base, Math.abs(diff_pct) / 10). Both metrics used — the larger drives the score.', 20)]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Risk Level',1500), hCell('Condition',3500), hCell('Score Formula (exact from server.js)',4000)] }),
    new TableRow({ children:[dCell('CRITICAL',1500,true,true), dCell('z_score_max >= 4 OR abs(diff_pct) >= 40%',3500,true), codeCell('Math.min(100, Math.floor(60 + z_max * 5))',4000,true)] }),
    new TableRow({ children:[dCell('HIGH',1500,false,true), dCell('z_score_max >= 2.5 OR abs(diff_pct) >= 20%',3500,false), codeCell('Math.min(89,  Math.floor(45 + z_max * 5))',4000,false)] }),
    new TableRow({ children:[dCell('MEDIUM',1500,true,true), dCell('z_score_max >= 1.5 OR abs(diff_pct) >= 10%',3500,true), codeCell('Math.min(64,  Math.floor(30 + z_max * 5))',4000,true)] }),
    new TableRow({ children:[dCell('LOW',1500,false,true), dCell('attack_type !== \'none\' (but below MEDIUM thresholds)',3500,false), codeCell('Math.min(44,  Math.floor(20 + z_max * 5))',4000,false)] }),
    new TableRow({ children:[dCell('NORMAL',1500,true,true), dCell('No rules triggered',3500,true), codeCell('Math.max(0,   Math.floor(30 - z_max * 5))',4000,true)] }),
  ], [1500,3500,4000], 9000),

  pageBreak()
);

// ── SECTION 7 — DASHBOARD PAGES ───────────────────────────────────────────────
sections.push(
  h1('7. Dashboard Pages'),
  p([normal(
    '7 HTML pages. All use pure JavaScript with fetch() and async/await. Chart.js from CDN. State stored in ' +
    'browser sessionStorage. API URL set to Railway backend:'
  )]),
  mono("const API = 'https://ecometer-integrity-production.up.railway.app';"),
  p([normal('Role-based access: the User Management tab is hidden for analyst role users via sessionStorage check. Navigating to user_management.html directly while not admin redirects to index.html.')]),
  spacer(),

  h2('7.1 login.html'),
  p([normal('Authentication page. Calls the real backend POST /api/login endpoint with bcrypt password validation.')]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Function',3000), hCell('What it does',6000)] }),
    new TableRow({ children:[codeCell('login()',3000,true), dCell('Calls POST /api/login with bill + password. On success: stores {name, role, bill, token, loginTime} in sessionStorage as ecometer_user and ecometer_token. Redirects to index.html after 1.5 seconds.',6000,true)] }),
    new TableRow({ children:[codeCell('selectRole(role)',3000,false), dCell('Updates the selected role (Admin / Analyst) displayed before login form submission.',6000,false)] }),
    new TableRow({ children:[codeCell('fillDemo(bill,pass,role)',3000,true), dCell('Pre-fills login form with demo credentials for fast demonstration access.',6000,true)] }),
    new TableRow({ children:[codeCell('togglePassword()',3000,false), dCell('Toggles password field between type=password and type=text.',6000,false)] }),
    new TableRow({ children:[codeCell('createParticles()',3000,true), dCell('Generates animated floating particle background on the login page.',6000,true)] }),
    new TableRow({ children:[
      dCell('Users (in server.js)',3000,false,true),
      dCell('BILL-2026-001 Shehani Navodya (admin), BILL-2026-002 Yuwanima Ransini (analyst), BILL-2026-003 Verginiya Narathota (analyst), BILL-2026-004 Treveen Manisha (analyst), BILL-2026-005 Thisari Chamathka (analyst). Password: ecometer123 for all. All have registered email addresses for OTP reset.',6000,false)
    ]}),
  ], [3000,6000], 9000),

  spacer(),
  h2('7.2 index.html — Main Dashboard'),
  p([normal('Primary monitoring page. 7 visuals with 4 parallel API requests using Promise.all().')]),
  spacer(),
  new Paragraph({
    children:[bold('load() function — ', 22), normal('Uses Promise.all([meter-data?limit=500, attacked-data?limit=500, detection-results?limit=500, attack-overview]). All 4 fetch calls run in parallel — total load time equals slowest single request, not the sum of all four.', 22)],
    spacing:{before:80,after:80}
  }),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Component / Function',3000), hCell('API Source',2500), hCell('Description',3500)] }),
    new TableRow({ children:[codeCell('5 Stat Cards (s1-s5)',3000,true), codeCell('/api/stats',2500,true), dCell('s1: total_readings. s2: total_attacks. s3: total_detections. s4: avg_risk_score. s5: detection rate = (detections/attacks)*100 calculated in JS.',3500,true)] }),
    new TableRow({ children:[codeCell('Energy Line Chart (energyChart)',3000), codeCell('/api/meter-data + /api/attacked-data',2500), dCell('Chart.js line chart. Blue line = energy_kwh (normal). Red line = attacked_kwh. x-axis: timestamps sliced to HH:MM. Attack spikes visible as dramatic red peaks.',3500)] }),
    new TableRow({ children:[codeCell('Risk Distribution (pieChart)',3000,true), codeCell('/api/detection-results',2500,true), dCell('Chart.js doughnut. Counts NORMAL/LOW/MEDIUM/HIGH/CRITICAL from risk_level field. cutout: 65%. Colour-coded per level.',3500,true)] }),
    new TableRow({ children:[codeCell('Anomaly Alerts feed',3000), codeCell('/api/anomalies',2500), dCell('Live list of detected attacks with meter ID, timestamp, risk level badge, attack type.',3500)] }),
    new TableRow({ children:[codeCell('Risk Indicator grid',3000,true), codeCell('/api/attack-overview',2500,true), dCell('HIGH/MEDIUM/LOW/NORMAL counts from the combined attack overview response.',3500,true)] }),
    new TableRow({ children:[codeCell('Attack Types chart',3000), codeCell('/api/attack-overview',2500), dCell('Bar chart: FDIA subtypes (spike, stealth_reduce, noise) + brute_force.total_events + dos.total_events.',3500)] }),
    new TableRow({ children:[codeCell('Energy Data Table',3000,true), codeCell('/api/meter-data + /api/detection-results',2500,true), dCell('Latest 50 records. Rows colour-coded by risk level using getNotes() labels.',3500,true)] }),
    new TableRow({ children:[codeCell('logout()',3000), dCell('sessionStorage',2500), dCell('Removes ecometer_user and ecometer_token from sessionStorage. Redirects to login.html.',3500)] }),
  ], [3000,2500,3500], 9000),

  spacer(),
  h2('7.3 alert_history.html'),
  mkTable([
    new TableRow({ children:[hCell('Function',3000), hCell('What it does',6000)] }),
    new TableRow({ children:[codeCell('init()',3000,true), dCell('Promise.all([/api/detection-results?limit=500, /api/security-events]). Loads both DB anomalies and in-memory security events simultaneously.',6000,true)] }),
    new TableRow({ children:[codeCell('setRiskFilter(btn,level)',3000,false), dCell('Filters alert display to ALL / CRITICAL / HIGH / MEDIUM / LOW. Updates active button state.',6000,false)] }),
    new TableRow({ children:[codeCell('applyFilters()',3000,true), dCell('Applies current risk filter and attack type dropdown to loaded data array.',6000,true)] }),
    new TableRow({ children:[codeCell('renderAll()',3000,false), dCell('Calls renderStats(), renderTimeline(), renderCharts(), renderFeed(), renderTable() in sequence.',6000,false)] }),
    new TableRow({ children:[codeCell('renderStats()',3000,true), dCell('Updates 4 summary stat cards: total alerts, critical count, high count, detection rate.',6000,true)] }),
    new TableRow({ children:[codeCell('renderTimeline()',3000,false), dCell('Draws detection frequency timeline chart (Chart.js).',6000,false)] }),
    new TableRow({ children:[codeCell('renderCharts()',3000,true), dCell('Draws bar and line charts for alert analysis.',6000,true)] }),
    new TableRow({ children:[codeCell('renderFeed()',3000,false), dCell('Builds scrolling live alert feed list with timestamp, meter, risk badge, attack type.',6000,false)] }),
    new TableRow({ children:[codeCell('renderTable()',3000,true), dCell('Builds full alert data table with risk-level colour coding per row.',6000,true)] }),
    new TableRow({ children:[codeCell('exportCSV()',3000,false), dCell('Downloads current filtered alert data as a CSV file. Used for offline reporting and audit trails.',6000,false)] }),
    new TableRow({ children:[
      dCell('Attack Type Filter',3000,true,true),
      dCell('Dropdown always shows all 4 known attack types: spike (Energy Spike), stealth_reduce (Stealth Reduction), noise (Noise Pattern), none (No Attack). Plus any additional types found in the data.',6000,true)
    ]}),
  ], [3000,6000], 9000),

  spacer(),
  h2('7.4 analytics.html'),
  mkTable([
    new TableRow({ children:[hCell('Function / Component',3000), hCell('What it does',6000)] }),
    new TableRow({ children:[codeCell('init()',3000,true), dCell('Promise.all([/api/meter-data?limit=500, /api/attacked-data?limit=500, /api/detection-results?limit=500]).',6000,true)] }),
    new TableRow({ children:[codeCell('filterMeter(btn,meter)',3000,false), dCell('Filters all analytics charts and table to a specific meter ID or ALL.',6000,false)] }),
    new TableRow({ children:[codeCell('getFilteredData()',3000,true), dCell('Returns the data array filtered to the current meter selection.',6000,true)] }),
    new TableRow({ children:[codeCell('destroyChart(chart)',3000,false), dCell('Destroys an existing Chart.js instance before re-drawing to prevent canvas reuse errors.',6000,false)] }),
    new TableRow({ children:[codeCell('renderCharts()',3000,true), dCell('Draws: True Positive vs False Negative chart, Risk Score Distribution, Attack Type Comparison (spike vs stealth_reduce vs noise), Rule Trigger Frequency chart.',6000,true)] }),
    new TableRow({ children:[dCell('Detection Accuracy card',3000,false,true), dCell('Calculates overall accuracy: (TP + TN) / total. Uses ground_truth vs detected fields.',6000,false)] }),
    new TableRow({ children:[dCell('Confusion Matrix',3000,true,true), dCell('Counts TP (ground_truth=1 AND detected=1), FN (ground_truth=1 AND detected=0), TN (ground_truth=0 AND detected=0), FP (ground_truth=0 AND detected=1).',6000,true)] }),
    new TableRow({ children:[dCell('Per-meter table',3000,false,true), dCell('Shows each meter with detection count, avg risk, max risk, attack types seen.',6000,false)] }),
  ], [3000,6000], 9000),

  spacer(),
  h2('7.5 reports.html'),
  mkTable([
    new TableRow({ children:[hCell('Function / Component',3000), hCell('What it does',6000)] }),
    new TableRow({ children:[codeCell('init()',3000,true), dCell('Promise.all([/api/meter-data?limit=500, /api/attacked-data?limit=500, /api/detection-results?limit=500]).',6000,true)] }),
    new TableRow({ children:[codeCell('filterMeter(btn,meter)',3000,false), dCell('Filters report data to a specific meter or ALL meters.',6000,false)] }),
    new TableRow({ children:[codeCell('getFilteredData()',3000,true), dCell('Returns data filtered by the current meter selection.',6000,true)] }),
    new TableRow({ children:[codeCell('loadReports()',3000,false), dCell('Builds all 5 report charts with filtered data.',6000,false)] }),
    new TableRow({ children:[dCell('Meter ID Dropdown',3000,true,true), dCell('Select dropdown populated dynamically from /api/fdia/by-meter endpoint on page load. Falls back to unique meter IDs from loaded data if API call fails.',6000,true)] }),
    new TableRow({ children:[dCell('5 Report Charts',3000,false,true), dCell('Energy Consumption over time, Attack Frequency, Detection Accuracy, Risk Score Trend, Attack Type Breakdown.',6000,false)] }),
    new TableRow({ children:[dCell('Full Report Table',3000,true,true), dCell('All matching records with meter_id, timestamp, energy_kwh, attacked_kwh, diff_pct, risk_level columns.',6000,true)] }),
    new TableRow({ children:[codeCell('exportCSV()',3000,false), dCell('Downloads current report data as a CSV file.',6000,false)] }),
  ], [3000,6000], 9000),

  spacer(),
  h2('7.6 user_management.html'),
  p([normal('Admin-only page for viewing and managing registered user accounts. Inaccessible to analyst role users.')]),
  spacer(),
  mkTable([
    new TableRow({ children:[hCell('Function / Component',3000), hCell('What it does',6000)] }),
    new TableRow({ children:[
      dCell('Admin access guard',3000,true,true),
      dCell('Inline script at top of <head> reads ecometer_user from sessionStorage. If role !== \'admin\', immediately redirects to index.html before the page loads.',6000,true)
    ]}),
    new TableRow({ children:[
      dCell('Nav tab visibility',3000,false,true),
      dCell('The User Management nav button is hidden via JavaScript on all pages for analyst role users. Admin users see the full navigation including the User Management tab.',6000,false)
    ]}),
    new TableRow({ children:[
      dCell('User list display',3000,true,true),
      dCell('Shows all registered users with their bill number, name, role badge, and registration status.',6000,true)
    ]}),
  ], [3000,6000], 9000),

  spacer(),
  h2('7.7 settings.html'),
  mkTable([
    new TableRow({ children:[hCell('Function / Component',3000), hCell('What it does',6000)] }),
    new TableRow({ children:[codeCell('updateSlider(sliderId,valId,suffix)',3000,true), dCell('Live-updates the displayed value as sliders are moved in Detection Thresholds card.',6000,true)] }),
    new TableRow({ children:[codeCell('saveThresholds()',3000,false), dCell('Saves threshold slider values to sessionStorage (client-side persistence).',6000,false)] }),
    new TableRow({ children:[codeCell('resetThresholds()',3000,true), dCell('Resets threshold sliders to default values.',6000,true)] }),
    new TableRow({ children:[codeCell('saveNotifications()',3000,false), dCell('Saves notification preferences (client-side only).',6000,false)] }),
    new TableRow({ children:[codeCell('testConnection()',3000,true), dCell('Calls GET /api/ping — if response is 200 shows connected status. Verifies Railway backend is reachable.',6000,true)] }),
    new TableRow({ children:[codeCell('showToast(msg,isError)',3000,false), dCell('Displays a toast notification in the corner. isError=true shows red, false shows green.',6000,false)] }),
    new TableRow({ children:[dCell('Detection Thresholds card',3000,true,true), dCell('Configurable sliders: Z-score threshold, IQR multiplier, energy spike gap %, energy drop gap %.',6000,true)] }),
    new TableRow({ children:[
      dCell('Help Center card',3000,false,true),
      dCell('Replaces the old System Information and API Configuration sections. Contains: Page Guide, Attack Types reference, FAQ section with 6 expandable questions, Contact Support section with support email she234na@gmail.com.',6000,false)
    ]}),
  ], [3000,6000], 9000),

  pageBreak()
);

// ── SECTION 8 — TEST SUITE ────────────────────────────────────────────────────
sections.push(
  h1('8. Attack Detection Test Suite'),
  p([normal(
    'The backend can be tested using any HTTP client (Postman, curl, or a custom test script). ' +
    'The Railway deployment URL is used for production testing. For local testing, use http://127.0.0.1:5000.'
  )]),
  spacer(),

  mkTable([
    new TableRow({ children:[hCell('#',600), hCell('Test Name',2400), hCell('What it Tests',6000)] }),
    new TableRow({ children:[
      dCell('0',600,true,true), dCell('Health Check',2400,true),
      dCell('GET / — verifies Node.js server is running and shows AbuseIPDB/HuggingFace/Azure configuration status.',6000,true)
    ]}),
    new TableRow({ children:[
      dCell('1',600,false,true), dCell('Brute Force Detection',2400,false),
      dCell('Sends 5 wrong login attempts (0.3s apart). Verifies 6th attempt returns 429 with attack_detected=BRUTE_FORCE. Checks locked_for_seconds in response.',6000,false)
    ]}),
    new TableRow({ children:[
      dCell('1b',600,true,true), dCell('Blocked IPs List',2400,true),
      dCell('GET /api/blocked-ips after brute force test. Verifies locked IP appears in response with remaining_seconds.',6000,true)
    ]}),
    new TableRow({ children:[
      dCell('1c',600,false,true), dCell('Admin Unblock (JWT check)',2400,false),
      dCell('POST /api/admin/unblock/127.0.0.1 WITHOUT a token. Verifies 401 is returned — confirms endpoint correctly requires JWT.',6000,false)
    ]}),
    new TableRow({ children:[
      dCell('2',600,true,true), dCell('DoS Rate Limit',2400,true),
      dCell('Sends 70 rapid GET /api/ping requests. Verifies at least some return 429. Counts and reports ok vs rate-limited responses.',6000,true)
    ]}),
    new TableRow({ children:[
      dCell('3',600,false,true), dCell('FDIA Spike Attack',2400,false),
      dCell('POST /api/fdia/analyze with energy_kwh=0.045, reading_kwh=5.80 (massive spike). Verifies attack_detected=true and risk_level is CRITICAL or HIGH.',6000,false)
    ]}),
    new TableRow({ children:[
      dCell('4',600,true,true), dCell('FDIA Stealth Underreporting',2400,true),
      dCell('POST /api/fdia/analyze with energy_kwh=0.045, reading_kwh=0.001 (near-zero — energy theft). Verifies attack_detected=true.',6000,true)
    ]}),
    new TableRow({ children:[
      dCell('5',600,false,true), dCell('Normal Reading (no false positive)',2400,false),
      dCell('POST /api/fdia/analyze with energy_kwh=0.045, reading_kwh=0.046 (2% difference). Verifies attack_detected=false or risk_level NORMAL/LOW.',6000,false)
    ]}),
    new TableRow({ children:[
      dCell('6',600,true,true), dCell('Security Events Log',2400,true),
      dCell('GET /api/security-events. Verifies events were recorded. Shows count and breakdown by attack_type.',6000,true)
    ]}),
    new TableRow({ children:[
      dCell('7',600,false,true), dCell('FDIA Database Summary',2400,false),
      dCell('GET /api/fdia/summary. Verifies total_detected > 0. Shows detection_rate_pct and by_attack_type breakdown.',6000,false)
    ]}),
    new TableRow({ children:[
      dCell('8',600,true,true), dCell('OTP Password Reset',2400,true),
      dCell('POST /api/send-otp with registered email. Verifies OTP generated (demo_otp in response if email not configured). POST /api/verify-otp to confirm verification. POST /api/reset-password to change password.',6000,true)
    ]}),
  ], [600,2400,6000], 9000),

  spacer(),
  h2('8.1 Expected Test Output'),
  mono('[PASS] Backend is running — EcoMeter API v3.1 (Node.js)'),
  mono('[INFO] AbuseIPDB  : configured'),
  mono('[PASS] Brute force blocked after 5 attempts (status=429, attack_detected=BRUTE_FORCE)'),
  mono('[PASS] /api/blocked-ips shows 1 locked IP(s): [\'127.0.0.1\']'),
  mono('[PASS] Unblock endpoint correctly requires JWT (status=401)'),
  mono('[PASS] DoS rate limiting triggered — 10/70 requests blocked with 429'),
  mono('[PASS] FDIA spike detected — risk_level=CRITICAL, score=96'),
  mono('[PASS] FDIA stealth drop detected — risk_level=CRITICAL, score=98'),
  mono('[PASS] Normal reading correctly not flagged — risk_level=NORMAL'),
  mono('[PASS] Security event log working — 8 events captured'),
  mono('[PASS] FDIA database detections confirmed — 312 records flagged'),
  mono('[PASS] OTP generated for Shehani Navodya'),
  mono('Total : 11 | Passed : 11 | Failed : 0'),

  pageBreak()
);

// ── SECTION 9 — HOW TO RUN ────────────────────────────────────────────────────
sections.push(
  h1('9. How to Run'),

  h2('9.1 Prerequisites'),
  mkTable([
    new TableRow({ children:[hCell('Status',900), hCell('Requirement',8100)] }),
    new TableRow({ children:[dCell('OK',900,true,true), dCell('Node.js 18+ installed (node --version to verify)',8100,true)] }),
    new TableRow({ children:[dCell('OK',900,false,true), dCell('npm install (express, cors, jsonwebtoken, bcryptjs, express-rate-limit, pg, dotenv, nodemailer, axios)',8100,false)] }),
    new TableRow({ children:[dCell('OK',900,true,true), dCell('.env file created in Backend folder (see Section 9.2)',8100,true)] }),
    new TableRow({ children:[dCell('OK',900,false,true), dCell('PostgreSQL running locally OR Supabase cloud credentials configured in .env',8100,false)] }),
    new TableRow({ children:[dCell('OK',900,true,true), dCell('Database tables populated: python import_data.py (run after full pipeline)',8100,true)] }),
    new TableRow({ children:[dCell('Optional',900,false,true), dCell('ABUSEIPDB_KEY added to .env for IP threat protection — free at abuseipdb.com',8100,false)] }),
    new TableRow({ children:[dCell('Optional',900,true,true), dCell('EMAIL_USER + EMAIL_PASS added to .env for real OTP email sending (Gmail App Password)',8100,true)] }),
  ], [900,8100], 9000),

  spacer(),
  h2('9.2 The .env File'),
  p([normal('This file should be in the Backend folder (where server.js is). Do not commit to git.')]),
  spacer(),
  mono('# Backend/.env'),
  mono('DB_HOST=localhost'),
  mono('DB_NAME=ecometer'),
  mono('DB_USER=postgres'),
  mono('DB_PASSWORD=ecometer123'),
  mono('DB_PORT=5432'),
  mono('JWT_SECRET_KEY=ecometer-jwt-secret-change-this-2026'),
  mono('ABUSEIPDB_KEY=your_free_key_from_abuseipdb.com     # optional but recommended'),
  mono('EMAIL_USER=yourGmailAddress@gmail.com               # optional — for OTP emails'),
  mono('EMAIL_PASS=your_gmail_app_password                  # optional — Gmail App Password'),
  mono('HUGGINGFACE_KEY=                                    # optional'),
  mono('ANOMALY_DETECTOR_KEY=                               # optional'),
  mono('ANOMALY_DETECTOR_ENDPOINT=                          # optional'),

  spacer(),
  h2('9.3 Running the Node.js Backend Locally'),
  mono('cd EcoMeter-Project/Backend'),
  mono('npm install'),
  mono('node server.js'),
  spacer(),
  p([bold('Expected startup output:', 22)]),
  mono('>>> LOADING ECOMETER SERVER.JS <<<'),
  mono('  EcoMeter API v3.1 (Node.js/Express)'),
  mono('  AbuseIPDB   : configured [OK]'),
  mono('  HuggingFace : NOT configured (optional)'),
  mono('  Azure       : NOT configured (optional)'),
  mono('  Database    : ecometer @ localhost'),
  mono('  Running on http://0.0.0.0:5000'),
  mono('  Running on http://127.0.0.1:5000'),
  spacer(),
  p([normal('Verify by opening http://localhost:5000/ in a browser — returns the full live endpoint map.')]),

  spacer(),
  h2('9.4 Railway Deployment (Production)'),
  mkTable([
    new TableRow({ children:[hCell('Step',800), hCell('Action',8200)] }),
    new TableRow({ children:[dCell('1',800,true,true), dCell('Create new Railway project and connect GitHub repository.',8200,true)] }),
    new TableRow({ children:[dCell('2',800,false,true), dCell('Set Root Directory to "Backend" (without leading slash) in Railway Settings.',8200,false)] }),
    new TableRow({ children:[dCell('3',800,true,true), dCell('Set Start Command to "node server.js".',8200,true)] }),
    new TableRow({ children:[dCell('4',800,false,true), dCell('Add all environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, JWT_SECRET_KEY, ABUSEIPDB_KEY, etc.) in Railway Variables tab using the Raw Editor. Ensure no leading/trailing whitespace.',8200,false)] }),
    new TableRow({ children:[dCell('5',800,true,true), dCell('Deploy. Railway auto-detects Node.js via package.json and runs npm install then node server.js.',8200,true)] }),
    new TableRow({ children:[dCell('6',800,false,true), dCell('Backend available at: https://ecometer-integrity-production.up.railway.app (HTTPS provided automatically).',8200,false)] }),
  ], [800,8200], 9000),

  spacer(),
  h2('9.5 Opening the Dashboard Pages (Netlify Deployment)'),
  mkTable([
    new TableRow({ children:[hCell('Page',2500), hCell('Description',6500)] }),
    new TableRow({ children:[codeCell('login.html',2500,true), dCell('Start here. Login with BILL-2026-001 / ecometer123. Calls POST /api/login on Railway. Redirects to index.html.',6500,true)] }),
    new TableRow({ children:[codeCell('index.html',2500,false), dCell('Main dashboard: stat cards, energy chart, risk doughnut, alerts, attack types, data table.',6500,false)] }),
    new TableRow({ children:[codeCell('alert_history.html',2500,true), dCell('Full alert history with risk filters, attack type dropdown, timeline chart, alert feed, CSV export.',6500,true)] }),
    new TableRow({ children:[codeCell('analytics.html',2500,false), dCell('Detection accuracy, confusion matrix, per-meter analysis, rule frequency charts.',6500,false)] }),
    new TableRow({ children:[codeCell('reports.html',2500,true), dCell('Date-range and meter-ID filtered reports (dynamic dropdown from API) with 5 charts and full data table.',6500,true)] }),
    new TableRow({ children:[codeCell('user_management.html',2500,false), dCell('Admin-only user management page. Analyst users are redirected to index.html automatically.',6500,false)] }),
    new TableRow({ children:[codeCell('settings.html',2500,true), dCell('Detection threshold sliders, Help Center (FAQ + Contact Support), backend connection test.',6500,true)] }),
  ], [2500,6500], 9000),

  pageBreak()
);

// ── SECTION 10 — KNOWN LIMITATIONS ───────────────────────────────────────────
sections.push(
  h1('10. Known Limitations'),
  p([normal('Documented constraints of the prototype. All are reasonable for an academic project. All have documented solutions.')]),
  spacer(),

  mkTable([
    new TableRow({ children:[hCell('Limitation',2200), hCell('Detail',3400), hCell('Planned Fix',3400)] }),
    new TableRow({ children:[
      dCell('sessionStorage risk',2200,true,true),
      dCell('User object and JWT token stored in sessionStorage are accessible to any JS on the same page. Not safe for production.',3400,true),
      dCell('Switch to httpOnly cookies set by the Node.js backend. Prevents JS access to session data.',3400,true)
    ]}),
    new TableRow({ children:[
      dCell('In-memory security events',2200,false,true),
      dCell('securityEvents array and bfTracker object are in RAM only. All data lost on server restart. Not persistent.',3400,false),
      dCell('Persist to a security_events PostgreSQL table. INSERT on every logEvent() call.',3400,false)
    ]}),
    new TableRow({ children:[
      dCell('Hardcoded USERS array',2200,true,true),
      dCell('5 users hardcoded in server.js. Adding a user requires editing source code and redeploying to Railway.',3400,true),
      dCell('Create a users table in PostgreSQL with bcrypt-hashed passwords. Admin API to manage users dynamically.',3400,true)
    ]}),
    new TableRow({ children:[
      dCell('Rate limits in memory',2200,false,true),
      dCell('express-rate-limit uses in-process memory, meaning rate limit counters reset on server restart. Not suitable for multi-worker deployment.',3400,false),
      dCell('Switch to Redis storage via rate-limit-redis package. Persistent and shared across workers.',3400,false)
    ]}),
    new TableRow({ children:[
      dCell('OTP email — demo mode',2200,true,true),
      dCell('When EMAIL_USER and EMAIL_PASS are not set in Railway Variables, the OTP is returned in the API response (demo_otp field) instead of being emailed. This is insecure for production.',3400,true),
      dCell('Set EMAIL_USER and EMAIL_PASS (Gmail App Password) as Railway environment variables so OTP emails are sent to registered addresses.',3400,true)
    ]}),
    new TableRow({ children:[
      dCell('No input validation on data endpoints',2200,false,true),
      dCell('GET /api/detection-results accepts any value for risk_level and meter_id. No whitelist validation.',3400,false),
      dCell('Add validation: risk_level must be in (NORMAL, LOW, MEDIUM, HIGH, CRITICAL). meter_id must match known meters.',3400,false)
    ]}),
    new TableRow({ children:[
      dCell('Default JWT secret',2200,true,true),
      dCell('Falls back to \'ecometer-secret-change-this\' if JWT_SECRET_KEY not in .env. Any tokens signed with this default are predictable.',3400,true),
      dCell('Always set a strong random JWT_SECRET_KEY in Railway Variables. Validate it is not the default on startup.',3400,true)
    ]}),
    new TableRow({ children:[
      dCell('500-row dashboard limit',2200,false,true),
      dCell('All dashboard pages request ?limit=500 records. If the database contains more than 500 records, older records are not shown without pagination controls.',3400,false),
      dCell('Implement server-side pagination with offset/limit controls in the dashboard UI.',3400,false)
    ]}),
  ], [2200,3400,3400], 9000),
);

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  sections:[{
    properties: {
      page: {
        margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 }
      }
    },
    children: sections
  }],
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22 }
      }
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 32, bold: true, color: LBLUE, font: 'Calibri' },
        paragraph: { spacing: { before: 400, after: 200 } }
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 26, bold: true, color: LBLUE, font: 'Calibri' },
        paragraph: { spacing: { before: 320, after: 160 } }
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: 24, bold: true, color: DGRAY, font: 'Calibri' },
        paragraph: { spacing: { before: 240, after: 120 } }
      }
    ]
  }
});

const outPath = 'C:\\Users\\User\\Desktop\\EcoMeter_Backend_Dashboard_Documentation_Updated.docx';
Packer.toBuffer(doc).then(buf => {
  require('fs').writeFileSync(outPath, buf);
  console.log('\n  Document generated successfully!');
  console.log(`  Saved to: ${outPath}`);
}).catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
