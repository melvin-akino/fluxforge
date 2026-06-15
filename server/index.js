'use strict';

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const crypto    = require('crypto');
const initSqlJs = require('sql.js');
const multer    = require('multer');

const PORT       = process.env.PORT       || 8081;
const DB_PATH    = process.env.DB_PATH    || path.join(__dirname, 'fluxforge.db');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file,  cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

async function bootstrap() {
  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('Loaded: ' + DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('Created: ' + DB_PATH);
  }
  const save = () => fs.writeFileSync(DB_PATH, Buffer.from(db.export()));

  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT, size INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password TEXT NOT NULL, salt TEXT NOT NULL,
    token TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS components (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    library       TEXT DEFAULT 'Default',
    qualification TEXT DEFAULT 'CE',
    type          TEXT NOT NULL,
    subtype       TEXT,
    part          TEXT NOT NULL,
    mfr           TEXT,
    value         REAL,  unit TEXT,
    mount_type    TEXT,
    capacitance   REAL,
    uom           TEXT,
    tol           REAL,
    rated_voltage REAL,  voltage_ac REAL,
    ripple        REAL,
    esr           REAL,  dcr  REAL,
    rated_life    REAL,
    temp_coeff    TEXT,
    temp_min      REAL,  rated_temp REAL,
    size_l        REAL,  size_w REAL,
    package       TEXT,
    current       REAL,  power REAL,
    freq          TEXT,
    family        TEXT,  ctr TEXT,
    vf            REAL,  vce REAL,  vref TEXT,
    ae            REAL,  le REAL,   al REAL,
    material      TEXT,
    voltage       REAL,
    rating        REAL,
    vaclamp       REAL,  energy REAL,  imax REAL,
    cost          REAL,
    notes         TEXT
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS component_sets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    topology    TEXT,
    created_at  TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now'))
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS set_components (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id       INTEGER NOT NULL REFERENCES component_sets(id) ON DELETE CASCADE,
    component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    role         TEXT,
    UNIQUE(set_id, component_id)
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS compatible_components (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    comp_id   INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    compat_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    reason    TEXT,
    UNIQUE(comp_id, compat_id)
  );`);

  // ── Magnetics DB tables ───────────────────────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS mag_cores (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    library        TEXT DEFAULT 'Default',
    planar         INTEGER DEFAULT 0,
    core_pn        TEXT NOT NULL,
    material       TEXT,
    series         TEXT,
    core_name      TEXT,
    name1          TEXT,
    ae_mm2         REAL,
    ae_min_mm2     REAL,
    le_mm          REAL,
    al_nh          REAL,
    sa_mm2         REAL,
    ve_mm3         REAL,
    default_bobbin TEXT,
    a_mm           REAL,
    apos_mm        REAL,
    aneg_mm        REAL,
    b_mm           REAL,
    c_mm           REAL,
    d_mm           REAL,
    e_mm           REAL,
    f_mm           REAL,
    h_mm           REAL,
    mfr            TEXT,
    notes          TEXT
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS mag_bobbins (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    library     TEXT DEFAULT 'Default',
    bobbin_pn   TEXT NOT NULL,
    core_name   TEXT,
    winding_area_mm2 REAL,
    num_slots   INTEGER,
    creepage_mm REAL,
    clearance_mm REAL,
    mfr         TEXT,
    notes       TEXT
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS mag_materials (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    library      TEXT DEFAULT 'Default',
    material     TEXT NOT NULL,
    bmax_100c    REAL,
    bmax_25c     REAL,
    mu_i         REAL,
    mu_tol       REAL,
    loss_coeff_a REAL,
    loss_coeff_b REAL,
    loss_coeff_c REAL,
    freq_min_khz REAL,
    freq_max_khz REAL,
    temp_max_c   REAL,
    mfr          TEXT,
    comment      TEXT
  );`);
  db.run(`CREATE TABLE IF NOT EXISTS mag_accessories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    library      TEXT DEFAULT 'Default',
    part_number  TEXT NOT NULL,
    ordering_code TEXT,
    type         TEXT,
    parts_num    INTEGER,
    for_core     TEXT,
    mfr          TEXT,
    notes        TEXT
  );`);
  save();

  // Seed components if empty
  const _cc = db.exec('SELECT COUNT(*) as n FROM components');
  if (!_cc.length || _cc[0].values[0][0] === 0) {
    // library, qualification, type, subtype, part, mfr, value, unit, mount_type, capacitance, uom, tol,
    // rated_voltage, voltage_ac, ripple, esr, dcr, rated_life, temp_coeff, temp_min, rated_temp,
    // size_l, size_w, package, current, power, freq, family, ctr, vf, vce, vref,
    // ae, le, al, material, voltage, rating, vaclamp, energy, imax, cost, notes
    const ins = `INSERT INTO components
      (library,qualification,type,subtype,part,mfr,value,unit,mount_type,capacitance,uom,tol,
       rated_voltage,voltage_ac,ripple,esr,dcr,rated_life,temp_coeff,temp_min,rated_temp,
       size_l,size_w,package,current,power,freq,family,ctr,vf,vce,vref,
       ae,le,al,material,voltage,rating,vaclamp,energy,imax,cost,notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const N=null;
    const D='Default', CE='CE';
    // Shorthand: D,CE, type, subtype, part, mfr, value, unit, mount, cap, uom, tol, Vrated, Vac, ripple, ESR, DCR, life, Tcoeff, Tmin, Tmax, L, W, pkg, I, P, freq, family, ctr, Vf, Vce, Vref, Ae, Le, Al, mat, V, rating, vaclamp, energy, imax, cost, notes
    const rows = [

      // ════════════════════════════════════════════════════════════════════════
      // CAPACITORS — Super Low ESR (Aluminium Electrolytic Output)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'capacitor','electrolytic_output','EEEFK1E391SP','Panasonic',390,'µF','Surface Mount',390,'µF',20, 25,N, 2100,0.014,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'FM Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.85,'Super Low ESR'],
      [D,CE,'capacitor','electrolytic_output','EEEFP1H221AP','Panasonic',220,'µF','Surface Mount',220,'µF',20, 50,N, 1450,0.030,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'FP Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.05,'Super Low ESR'],
      [D,CE,'capacitor','electrolytic_output','PCR1E471MCL1GS','Nichicon',470,'µF','Surface Mount',470,'µF',20, 25,N, 2650,0.012,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'PCR Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.95,'Super Low ESR'],
      [D,CE,'capacitor','electrolytic_output','EEE-TK1E681AM','Panasonic',680,'µF','Surface Mount',680,'µF',20, 25,N, 3100,0.010,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'TK Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.25,'Super Low ESR'],
      [D,CE,'capacitor','electrolytic_output','EKZE100ELL102MJ16S','United Chemi-Con',1000,'µF','Through Hole',1000,'µF',20, 10,N, 3850,0.009,N,2000,'N/A',-40,105, 10,16,'Radial 10x16', N,N,N,'KZE Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.15,'Low ESR, Long Life'],
      [D,CE,'capacitor','electrolytic_output','EEE-FK1C681AP','Panasonic',680,'µF','Surface Mount',680,'µF',20, 16,N, 2800,0.011,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'FK Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.10,'Super Low ESR'],
      [D,CE,'capacitor','electrolytic_output','UCL1A102MNL1GS','Nichicon',1000,'µF','Surface Mount',1000,'µF',20, 10,N, 4200,0.008,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'UCL Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.45,'Ultra-Low ESR'],
      [D,CE,'capacitor','electrolytic_output','UCZ1V122MNQ1MS','Nichicon',1200,'µF','Surface Mount',1200,'µF',20, 35,N, 4800,0.007,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'UCZ Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.65,'Super Low ESR 35V'],
      [D,CE,'capacitor','electrolytic_output','EEV-FK1E152M','Panasonic',1500,'µF','Surface Mount',1500,'µF',20, 25,N, 5200,0.006,N,2000,'N/A',-40,105, 12.5,14,'SMD 12.5x14',N,N,N,'FK Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.05,'Super Low ESR'],
      [D,CE,'capacitor','electrolytic_output','EKZE100ELL222MK20S','United Chemi-Con',2200,'µF','Through Hole',2200,'µF',20, 10,N, 7000,0.006,N,2000,'N/A',-40,105, 12.5,20,'Radial 12.5x20',N,N,N,'KZE Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.80,'Low ESR Long Life'],
      [D,CE,'capacitor','electrolytic_output','EEV-FK1C332M','Panasonic',3300,'µF','Surface Mount',3300,'µF',20, 16,N, 8500,0.005,N,2000,'N/A',-40,105, 16,16,'SMD 16x16', N,N,N,'FK Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 3.20,'Super Low ESR'],
      [D,CE,'capacitor','electrolytic_output','EKZE500ELL121MH15D','United Chemi-Con',120,'µF','Through Hole',120,'µF',20, 50,N, 1200,0.022,N,2000,'N/A',-40,105, 8,15,'Radial 8x15',  N,N,N,'KZE Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.75,''],
      [D,CE,'capacitor','electrolytic_output','EMZ250ADA331MHA0G','United Chemi-Con',330,'µF','Surface Mount',330,'µF',20, 25,N, 2200,0.013,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'EMZ Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.35,''],
      [D,CE,'capacitor','electrolytic_output','EEEFP1C471AP','Panasonic',470,'µF','Surface Mount',470,'µF',20, 16,N, 2650,0.012,N,2000,'N/A',-40,105, 10,10,'SMD 10x10', N,N,N,'FP Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.00,''],

      // ════════════════════════════════════════════════════════════════════════
      // CAPACITORS — Electrolytic Bulk (High Voltage Input)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'capacitor','electrolytic_bulk','UHE2G470MPD','Nichicon',47,'µF','Through Hole',47,'µF',20, 400,N, 530,0.85,N,2000,'N/A',-40,105, 16,25,'Radial 16x25',  N,N,N,'UHE Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.20,'Input bulk HV'],
      [D,CE,'capacitor','electrolytic_bulk','UHE2G100MPD','Nichicon',10,'µF','Through Hole',10,'µF',20,  400,N, 285,2.10,N,2000,'N/A',-40,105, 8,15, 'Radial 8x15',   N,N,N,'UHE Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.55,''],
      [D,CE,'capacitor','electrolytic_bulk','EEU-EB2G470','Panasonic',47,'µF','Through Hole',47,'µF',20,  400,N, 490,0.78,N,2000,'N/A',-40,105, 16,25,'Radial 16x25',  N,N,N,'EB Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.35,''],
      [D,CE,'capacitor','electrolytic_bulk','ECA-2GHG101','Panasonic',100,'µF','Through Hole',100,'µF',20, 400,N, 700,0.55,N,2000,'N/A',-40,105, 18,35,'Radial 18x35',  N,N,N,'ECA Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.10,''],
      [D,CE,'capacitor','electrolytic_bulk','EKXG401ELL470','United Chemi-Con',47,'µF','Through Hole',47,'µF',20,400,N, 520,0.72,N,2000,'N/A',-40,105, 16,25,'Radial 16x25', N,N,N,'KXG Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.05,''],
      [D,CE,'capacitor','electrolytic_bulk','ALS30A471DF400','Vishay',470,'µF','Through Hole',470,'µF',20, 400,N,1300,0.38,N,2000,'N/A',-40,85,  35,50,'Radial 35x50',  N,N,N,'ALS30 Series',N,N,N,N,N,N,N,N, N,N,N,N,N, 8.50,'Large form, 85°C'],
      [D,CE,'capacitor','electrolytic_bulk','LGY2G100MELB25','Nichicon',10,'µF','Through Hole',10,'µF',20,  400,N, 265,1.90,N,2000,'N/A',-40,85,  10,20,'Radial 10x20',  N,N,N,'LGY Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.65,''],
      [D,CE,'capacitor','electrolytic_bulk','EEUFM1V102','Panasonic',1000,'µF','Through Hole',1000,'µF',20,35,N, 3800,0.014,N,5000,'N/A',-40,105, 16,25,'Radial 16x25',  N,N,N,'FM Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.45,'Long life 5000h'],

      // ════════════════════════════════════════════════════════════════════════
      // CAPACITORS — Ceramic (MLCC)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'capacitor','ceramic','C1608X7R1H104K','TDK',100,'nF','Surface Mount',100,'nF',10, 50,N, N,N,N,N,'X7R',-55,125, 1.6,0.8,'0603', N,N,N,'C Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.05,'Bypass, X7R 50V'],
      [D,CE,'capacitor','ceramic','CGA3E2X7R1H104K','TDK',100,'nF','Surface Mount',100,'nF',10, 50,N, N,N,N,N,'X7R',-55,125, 1.6,0.8,'0603', N,N,N,'CGA Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.06,''],
      [D,CE,'capacitor','ceramic','GRM188R71H104KA93D','Murata',100,'nF','Surface Mount',100,'nF',10, 50,N, N,N,N,N,'X7R',-55,125, 1.6,0.8,'0603', N,N,N,'GRM Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.07,''],
      [D,CE,'capacitor','ceramic','C1608X7R2A102K080AA','TDK',1,'nF','Surface Mount',1,'nF',10,   100,N, N,N,N,N,'X7R',-55,125, 1.6,0.8,'0603', N,N,N,'C Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.04,'Snubber'],
      [D,CE,'capacitor','ceramic','GRM31CR71E106KA12L','Murata',10,'µF','Surface Mount',10,'µF',10,  25,N, N,N,N,N,'X7R',-55,125, 3.2,1.6,'1210', N,N,N,'GRM Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.18,'Decoupling'],
      [D,CE,'capacitor','ceramic','EMK325AB7226MM-T','Taiyo Yuden',22,'µF','Surface Mount',22,'µF',20,  25,N, N,N,N,N,'X7R',-55,125, 3.2,2.5,'1210', N,N,N,'EMK Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.32,''],
      [D,CE,'capacitor','ceramic','C3216X7S2A106M160AC','TDK',10,'µF','Surface Mount',10,'µF',20, 100,N, N,N,N,N,'X7S',-55,125, 3.2,1.6,'1206', N,N,N,'C Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.28,'100V X7S'],

      // ════════════════════════════════════════════════════════════════════════
      // CAPACITORS — Film / Snubber
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'capacitor','film_snubber','ECQ-U2A223ML','Panasonic',22,'nF','Through Hole',22,'nF',20,  100,N, N,N,N,N,'N/A',-40,85,  7.5,4.5,'Radial',         N,N,N,'ECQ-U Series',N,N,N,N,N,N,N,N, N,N,N,N,N, 0.18,'X2 EMI cap'],
      [D,CE,'capacitor','film_snubber','B32922C3104K','EPCOS',100,'nF','Through Hole',100,'nF',10, 305,N, N,N,N,N,'N/A',-40,110, 13,6,  'Radial',         N,N,N,'B329 Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.35,'X2 305Vac'],
      [D,CE,'capacitor','film_snubber','MKP1848C61060JP4','Vishay',100,'nF','Through Hole',100,'nF',5,  630,N, N,N,N,N,'N/A',-40,100, 13,6,  'Radial',         N,N,N,'MKP Series',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.45,'Snubber 630V'],
      [D,CE,'capacitor','film_snubber','PHE450SB5470JR06L2','Vishay',47,'nF','Through Hole',47,'nF',5,   250,N, N,N,N,N,'N/A',-40,85,  7.5,4.5,'Radial',         N,N,N,'PHE450 Series',N,N,N,N,N,N,N,N,N,N,N,N,0.28,'Y2 class'],

      // ════════════════════════════════════════════════════════════════════════
      // DIODES — Schottky Output
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'diode','schottky_output','V10D60C','Vishay',N,N,'Through Hole',N,N,N, 60,N, N,N,N,N,'N/A',-65,150, 8.0,4.5,'DO-201AD',      10,N,N,'V-Series',N,0.55,N,N, N,N,N,N, N,N,N,N,N, 0.45,'10A 60V Schottky'],
      [D,CE,'diode','schottky_output','STPS10H100CG','STMicro',N,N,'Through Hole',N,N,N,100,N, N,N,N,N,'N/A',-65,150, 8.0,4.5,'TO-220AC',      10,N,N,N,N,0.65,N,N, N,N,N,N, N,N,N,N,N, 0.85,'10A 100V Schottky'],
      [D,CE,'diode','schottky_output','MBRS340','ON Semi',N,N,'Surface Mount',N,N,N,  40,N, N,N,N,N,'N/A',-65,125, 6.1,2.65,'SMC (DO-214AB)',  3,N,N,N,N,0.50,N,N, N,N,N,N, N,N,N,N,N, 0.22,'3A 40V SMD Schottky'],
      [D,CE,'diode','schottky_output','SS34','Rectron',N,N,'Surface Mount',N,N,N,     40,N, N,N,N,N,'N/A',-65,125, 5.2,2.7,'SMA (DO-214AC)',  3,N,N,N,N,0.55,N,N, N,N,N,N, N,N,N,N,N, 0.12,'3A 40V SMA Schottky'],
      [D,CE,'diode','schottky_output','SB1045','Vishay',N,N,'Through Hole',N,N,N,    45,N, N,N,N,N,'N/A',-65,150, 8.0,4.5,'DO-201AD',      10,N,N,N,N,0.58,N,N, N,N,N,N, N,N,N,N,N, 0.38,'10A 45V Schottky'],
      [D,CE,'diode','schottky_output','MBR20100CTG','ON Semi',N,N,'Through Hole',N,N,N,100,N, N,N,N,N,'N/A',-65,125,10.0,4.5,'TO-220AB',      20,N,N,N,N,0.70,N,N, N,N,N,N, N,N,N,N,N, 1.10,'20A 100V Dual Schottky'],
      [D,CE,'diode','schottky_output','VS-10BQ040PBF','Vishay',N,N,'Surface Mount',N,N,N, 40,N, N,N,N,N,'N/A',-65,125, 5.5,3.0,'SMD',            1,N,N,N,N,0.40,N,N, N,N,N,N, N,N,N,N,N, 0.15,'1A 40V SMD'],
      [D,CE,'diode','schottky_output','B5819W','Diodes Inc',N,N,'Surface Mount',N,N,N,  40,N, N,N,N,N,'N/A',-65,125, 2.7,1.35,'SOD-123',        1,N,N,N,N,0.45,N,N, N,N,N,N, N,N,N,N,N, 0.08,'1A 40V SOD-123'],
      [D,CE,'diode','schottky_output','STPS3L60U','STMicro',N,N,'Surface Mount',N,N,N,  60,N, N,N,N,N,'N/A',-65,125, 5.0,2.65,'SMC (DO-214AB)',  3,N,N,N,N,0.50,N,N, N,N,N,N, N,N,N,N,N, 0.28,'3A 60V SMD'],

      // ════════════════════════════════════════════════════════════════════════
      // DIODES — Ultrafast / Clamp
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'diode','clamp','UF4007','Vishay',N,N,'Through Hole',N,N,N,       1000,N, N,N,N,N,'N/A',-65,150, 2.0,1.2,'DO-41',          1,N,N,N,N,1.70,N,N, N,N,N,N, N,N,N,N,N, 0.10,'1A 1kV Ultrafast'],
      [D,CE,'diode','clamp','HER107','Taiwan Semi',N,N,'Through Hole',N,N,N,  1000,N, N,N,N,N,'N/A',-65,150, 2.0,1.2,'DO-41',          1,N,N,N,N,1.70,N,N, N,N,N,N, N,N,N,N,N, 0.08,'1A 1kV HER'],
      [D,CE,'diode','clamp','ES1J','Rectron',N,N,'Surface Mount',N,N,N,       600,N,  N,N,N,N,'N/A',-65,150, 5.2,2.7,'SMA (DO-214AC)',  1,N,N,N,N,1.30,N,N, N,N,N,N, N,N,N,N,N, 0.12,'1A 600V SMA Ultrafast'],
      [D,CE,'diode','clamp','BYV26C','Vishay',N,N,'Through Hole',N,N,N,       600,N,  N,N,N,N,'N/A',-65,150, 2.0,1.2,'DO-41',          1,N,N,N,N,1.30,N,N, N,N,N,N, N,N,N,N,N, 0.12,'1A 600V Ultrafast'],
      [D,CE,'diode','clamp','FDLL4448','ON Semi',N,N,'Surface Mount',N,N,N,   100,N,  N,N,N,N,'N/A',-65,150, 2.7,1.35,'SOD-80 (LL34)',   0.15,N,N,N,N,0.72,N,N, N,N,N,N, N,N,N,N,N, 0.08,'150mA 100V switching'],

      // ════════════════════════════════════════════════════════════════════════
      // DIODES — Zeners / TVS
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'diode','tvs','SMBJ160A','Vishay',N,N,'Surface Mount',N,N,N,      160,N,  N,N,N,N,'N/A',-65,150, 5.2,2.7,'SMB (DO-214AA)',  N,N,N,N,N,N,N,'160V', N,N,N,N, N,N,N,N,N, 0.22,'TVS 160V 600W'],
      [D,CE,'diode','tvs','SMBJ18A','Vishay',N,N,'Surface Mount',N,N,N,        18,N,  N,N,N,N,'N/A',-65,150, 5.2,2.7,'SMB (DO-214AA)',  N,N,N,N,N,N,N,'18V',  N,N,N,N, N,N,N,N,N, 0.18,'TVS 18V 600W'],
      [D,CE,'diode','tvs','P6KE200A','STMicro',N,N,'Through Hole',N,N,N,       200,N, N,N,N,N,'N/A',-65,150, 9.0,5.4,'DO-204AC (P600)', N,N,N,N,N,N,N,'200V', N,N,N,N, N,N,N,N,N, 0.45,'TVS 200V 600W THT'],
      [D,CE,'diode','zener','BZX84C5V1','Nexperia',N,N,'Surface Mount',N,N,N,    5.1,N, N,N,N,N,'N/A',-55,125, 2.9,1.6,'SOT-23',         N,0.35,N,N,N,N,'5.1V', N,N,N,N, N,N,N,N,N, 0.08,'5.1V Zener 300mW'],
      [D,CE,'diode','zener','1N4744A','ON Semi',N,N,'Through Hole',N,N,N,       15,N,  N,N,N,N,'N/A',-65,200, 4.1,2.7,'DO-41',           N,1.0,N,N,N,N,'15V',  N,N,N,N, N,N,N,N,N, 0.10,'15V Zener 1W'],

      // ════════════════════════════════════════════════════════════════════════
      // DIODES — Bridge Rectifiers
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'diode','bridge','DF1506S','Diodes Inc',N,N,'Surface Mount',N,N,N, 600,N, N,N,N,N,'N/A',-55,150, 8.8,5.5,'SOP-4 (DF)',       1.5,N,N,N,N,1.10,N,N, N,N,N,N, N,N,N,N,N, 0.25,'1.5A 600V SMD Bridge'],
      [D,CE,'diode','bridge','MB6S','Rectron',N,N,'Surface Mount',N,N,N,        600,N, N,N,N,N,'N/A',-55,125, 5.0,3.5,'MBS (SOIC)',       0.5,N,N,N,N,1.10,N,N, N,N,N,N, N,N,N,N,N, 0.18,'0.5A 600V SOIC'],
      [D,CE,'diode','bridge','DF04S','Rectron',N,N,'Surface Mount',N,N,N,       400,N, N,N,N,N,'N/A',-55,125, 5.0,3.5,'SOP-4',            1,N,N,N,N,1.10,N,N, N,N,N,N, N,N,N,N,N, 0.20,'1A 400V SOP-4'],
      [D,CE,'diode','bridge','GBU606','Vishay',N,N,'Through Hole',N,N,N,        600,N, N,N,N,N,'N/A',-55,150,17.5,10.6,'GBU (WOB)',        6,N,N,N,N,1.10,N,N, N,N,N,N, N,N,N,N,N, 0.55,'6A 600V GBU Package'],
      [D,CE,'diode','bridge','KBP310','Diotec',N,N,'Through Hole',N,N,N,        1000,N,N,N,N,N,'N/A',-55,125,13.5,8.5,'KBP',              3,N,N,N,N,1.10,N,N, N,N,N,N, N,N,N,N,N, 0.38,'3A 1000V KBP Package'],

      // ════════════════════════════════════════════════════════════════════════
      // ICs — HPFC-1 (High-Power Flyback Controller)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'ic','hpfc','TOP246YN','Generic',N,N,'Through Hole',N,N,N, N,N, N,N,N,N,'N/A',-40,150, 10.2,5.1,'TO-220-7C',     N,30,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.85,'18W, TO-220-7C'],
      [D,CE,'ic','hpfc','TOP248YN','Generic',N,N,'Through Hole',N,N,N, N,N, N,N,N,N,'N/A',-40,150, 10.2,5.1,'TO-220-7C',     N,45,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.95,'45W, TO-220-7C'],
      [D,CE,'ic','hpfc','TOP252YN','Generic',N,N,'Through Hole',N,N,N, N,N, N,N,N,N,'N/A',-40,150, 10.2,5.1,'TO-220-7C',     N,65,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.05,'65W, TO-220-7C'],
      [D,CE,'ic','hpfc','TOP256EG','Generic',N,N,'Surface Mount',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 9.0,9.0,'eSIP-7C (EG)',   N,65,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.15,'65W eSIP-7C'],
      [D,CE,'ic','hpfc','TOP258EG','Generic',N,N,'Surface Mount',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 9.0,9.0,'eSIP-7C (EG)',   N,85,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.25,'85W eSIP-7C'],
      [D,CE,'ic','hpfc','TOP262EG','Generic',N,N,'Surface Mount',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 9.0,9.0,'eSIP-7C (EG)',   N,105,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.45,'105W eSIP-7C'],
      [D,CE,'ic','hpfc','TOP266EG','Generic',N,N,'Surface Mount',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 9.0,9.0,'eSIP-7C (EG)',   N,135,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.65,'135W eSIP-7C'],
      [D,CE,'ic','hpfc','TOP268EG','Generic',N,N,'Surface Mount',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 9.0,9.0,'eSIP-7C (EG)',   N,160,N,'HPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 2.85,'160W eSIP-7C'],

      // ════════════════════════════════════════════════════════════════════════
      // ICs — LPFC-1 (Low-Power Flyback Controller)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'ic','lpfc','TNY274PN','Generic',N,N,'Through Hole',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 10.2,5.1,'DIP-7',          N,5,N,'LPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.95,'5W DIP-7'],
      [D,CE,'ic','lpfc','TNY276PN','Generic',N,N,'Through Hole',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 10.2,5.1,'DIP-7',          N,8,N,'LPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.05,'8W DIP-7'],
      [D,CE,'ic','lpfc','TNY278GN','Generic',N,N,'Surface Mount',N,N,N,N,N, N,N,N,N,'N/A',-40,150, 6.0,5.0,'SMD-8B (SO-8)',  N,12,N,'LPFC-1',N,N,N,N, N,N,N,N, N,N,N,N,N, 1.15,'12W SO-8'],

      // ════════════════════════════════════════════════════════════════════════
      // ICs — Optocouplers
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'ic','optocoupler','PC817C','Sharp',N,N,'Through Hole',N,N,N,        N,N, N,N,N,N,'N/A',-30,110, 4.5,3.7,'DIP-4',          N,N,N,N,100,N,N,N, N,N,N,N, N,N,N,N,N, 0.15,'CTR 100-300%'],
      [D,CE,'ic','optocoupler','LTV-817D','Lite-On',N,N,'Through Hole',N,N,N,    N,N, N,N,N,N,'N/A',-30,110, 4.5,3.7,'DIP-4',          N,N,N,N,100,N,N,N, N,N,N,N, N,N,N,N,N, 0.18,'CTR 100-300%'],
      [D,CE,'ic','optocoupler','FOD817C','ON Semi',N,N,'Through Hole',N,N,N,     N,N, N,N,N,N,'N/A',-30,110, 4.5,3.7,'DIP-4',          N,N,N,N,100,N,N,N, N,N,N,N, N,N,N,N,N, 0.20,'CTR 100-300%'],
      [D,CE,'ic','optocoupler','PS2801-1','NEC',N,N,'Through Hole',N,N,N,        N,N, N,N,N,N,'N/A',-30,100, 4.5,3.7,'DIP-4',          N,N,N,N,80,N,N,N, N,N,N,N, N,N,N,N,N, 0.22,'CTR 80-600%'],
      [D,CE,'ic','optocoupler','HCPL-817-000E','Broadcom',N,N,'Through Hole',N,N,N,N,N, N,N,N,N,'N/A',-30,110, 4.5,3.7,'DIP-4',         N,N,N,N,100,N,N,N, N,N,N,N, N,N,N,N,N, 0.35,'CTR 100-300%'],

      // ════════════════════════════════════════════════════════════════════════
      // ICs — Voltage References (TL431 / Shunt Regulators)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'ic','tl431','TL431ACLP','TI',N,N,'Through Hole',N,N,N,             N,N, N,N,N,N,'N/A',-40,125, 3.7,1.5,'TO-92',          N,0.1,N,'TL431',N,N,N,'2.495', N,N,N,N, N,N,N,N,N, 0.18,'TL431 TO-92 1%'],
      [D,CE,'ic','tl431','TL431AIDR','TI',N,N,'Surface Mount',N,N,N,            N,N, N,N,N,N,'N/A',-40,125, 2.9,1.6,'SOT-23',         N,0.1,N,'TL431',N,N,N,'2.495', N,N,N,N, N,N,N,N,N, 0.12,'TL431 SOT-23 1%'],
      [D,CE,'ic','tl431','TL431CD','TI',N,N,'Surface Mount',N,N,N,              N,N, N,N,N,N,'N/A',-40,125, 4.9,3.9,'SOT-23-5 / SO-8',N,0.1,N,'TL431',N,N,N,'2.495', N,N,N,N, N,N,N,N,N, 0.22,'TL431 SO-8 1%'],
      [D,CE,'ic','tl431','KA431AZ','Fairchild',N,N,'Through Hole',N,N,N,        N,N, N,N,N,N,'N/A',-40,125, 3.7,1.5,'TO-92',          N,0.1,N,'KA431',N,N,N,'2.495', N,N,N,N, N,N,N,N,N, 0.10,'TL431 equiv 1%'],
      [D,CE,'ic','tl431','TL431ACDR','TI',N,N,'Surface Mount',N,N,N,            N,N, N,N,N,N,'N/A',-40,125, 3.0,1.75,'SOIC-8',        N,0.1,N,'TL431',N,N,N,'2.495', N,N,N,N, N,N,N,N,N, 0.25,'TL431 SOIC-8 1%'],

      // ════════════════════════════════════════════════════════════════════════
      // INDUCTORS — EMI Common Mode Chokes
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'inductor','emi_common_mode','ACM7060-301-2PL','TDK',300,'µH','Surface Mount',N,N,N, N,N, N,N,N,N,'N/A',-25,125, 7.0,6.0,'SMD 7x6',      3,N,'50Hz',N,N,N,N,N, N,N,N,N, N,N,N,N,N, 1.25,'300µH 3A CMC'],
      [D,CE,'inductor','emi_common_mode','ACM2012-900-2P','TDK',90,'µH','Surface Mount',N,N,N,  N,N, N,N,N,N,'N/A',-25,125, 2.0,1.25,'SMD 2x1.25',  0.6,N,'50Hz',N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.45,'90µH 600mA CMC'],
      [D,CE,'inductor','emi_common_mode','LPF3225V6R8MF','TDK',6.8,'µH','Surface Mount',N,N,N,  N,N, N,N,N,N,'N/A',-40,125, 3.2,2.5,'SMD 3.2x2.5',  2.5,N,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.65,'6.8µH 2.5A differential'],
      [D,CE,'inductor','emi_common_mode','SRR1260-6R0Y','Bourns',6,'µH','Through Hole',N,N,N,   N,N, N,N,N,N,'N/A',-40,125,12.7,12.7,'Radial 12.7',   4,N,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 1.85,'6µH 4A differential'],

      // ════════════════════════════════════════════════════════════════════════
      // INDUCTORS — Transformer Cores (Ferrite)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'inductor','transformer_core','EFD30/15/9','TDK',N,'H','Through Hole',N,N,N,  N,N, N,N,N,N,'N/A',-40,200, 30,15,'EFD30',         N,N,N,'N97',N,N,N,N, 60,46,120,'Mn-Zn', N,N,N,N,N, 2.50,'Ae=60mm², Le=46mm, Al=120nH/N²'],
      [D,CE,'inductor','transformer_core','EE30/15/7','Ferroxcube',N,'H','Through Hole',N,N,N,N,N, N,N,N,N,'N/A',-40,200, 30,15,'EE30',          N,N,N,'3C95',N,N,N,N, 60,52,92,'Mn-Zn',  N,N,N,N,N, 2.20,'Ae=60mm², Le=52mm'],
      [D,CE,'inductor','transformer_core','EE40/20/15','TDK',N,'H','Through Hole',N,N,N,  N,N, N,N,N,N,'N/A',-40,200, 40,20,'EE40',          N,N,N,'N87',N,N,N,N, 148,77,230,'Mn-Zn', N,N,N,N,N, 3.50,'Ae=148mm², 105W class'],
      [D,CE,'inductor','transformer_core','EE19/8/5','Ferroxcube',N,'H','Through Hole',N,N,N, N,N, N,N,N,N,'N/A',-40,200, 19,8, 'EE19',          N,N,N,'3C95',N,N,N,N, 22,39,59,'Mn-Zn',  N,N,N,N,N, 0.85,'Small EE19, <20W'],
      [D,CE,'inductor','transformer_core','PQ20/16','TDK',N,'H','Through Hole',N,N,N,     N,N, N,N,N,N,'N/A',-40,200, 20,20,'PQ20/16',       N,N,N,'N97',N,N,N,N, 62,37,170,'Mn-Zn', N,N,N,N,N, 1.95,'PQ form, 60W class'],
      [D,CE,'inductor','transformer_core','PQ32/20','TDK',N,'H','Through Hole',N,N,N,     N,N, N,N,N,N,'N/A',-40,200, 32,20,'PQ32/20',       N,N,N,'N97',N,N,N,N, 160,56,285,'Mn-Zn', N,N,N,N,N, 3.20,'PQ form, 105W class'],
      [D,CE,'inductor','transformer_core','EE55/28/21','TDK',N,'H','Through Hole',N,N,N,  N,N, N,N,N,N,'N/A',-40,200, 55,28,'EE55',          N,N,N,'N87',N,N,N,N, 420,123,330,'Mn-Zn', N,N,N,N,N, 6.50,'Large EE55, 200W+'],

      // ════════════════════════════════════════════════════════════════════════
      // RESISTORS — Startup / Bias
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'resistor','startup','RC2010FK-073M9L','Yageo',3.9,'MΩ','Surface Mount',N,N,1,  N,N, N,N,N,N,'N/A',-55,155, 5.0,2.5,'2010',          N,0.75,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.12,'3.9MΩ 750mW 1%'],
      [D,CE,'resistor','startup','RC2010FK-077M32L','Yageo',7.32,'MΩ','Surface Mount',N,N,1, N,N, N,N,N,N,'N/A',-55,155, 5.0,2.5,'2010',         N,0.75,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.12,'7.32MΩ 750mW 1%'],
      [D,CE,'resistor','startup','RC1210FR-072M2L','Yageo',2.2,'MΩ','Surface Mount',N,N,1,   N,N, N,N,N,N,'N/A',-55,155, 3.2,2.5,'1210',         N,0.50,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.10,'2.2MΩ 500mW 1%'],
      [D,CE,'resistor','startup','RC1210FR-071ML','Yageo',1,'MΩ','Surface Mount',N,N,1,       N,N, N,N,N,N,'N/A',-55,155, 3.2,2.5,'1210',         N,0.50,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.10,'1MΩ 500mW 1%'],

      // ════════════════════════════════════════════════════════════════════════
      // RESISTORS — Feedback / Current Sense
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'resistor','feedback','RK73H2ATTD4991F','KOA',4990,'Ω','Surface Mount',N,N,1,   N,N, N,N,N,N,'±50ppm',-55,155, 3.2,1.6,'1206',        N,0.25,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.08,'4.99kΩ 250mW 1%'],
      [D,CE,'resistor','feedback','RC0805FR-071KL','Yageo',1000,'Ω','Surface Mount',N,N,1,   N,N, N,N,N,N,'±100ppm',-55,155,2.0,1.25,'0805',       N,0.125,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N,0.05,'1kΩ 125mW 1%'],
      [D,CE,'resistor','feedback','CRCW08054K70FKEA','Vishay',4700,'Ω','Surface Mount',N,N,1,N,N, N,N,N,N,'±100ppm',-55,155,2.0,1.25,'0805',       N,0.125,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N,0.06,'4.7kΩ 125mW 1%'],
      [D,CE,'resistor','current_sense','WSBS2010R0100FEB','Vishay',0.01,'Ω','Surface Mount',N,N,1,N,N, N,N,N,N,'±75ppm',-55,155, 5.0,2.5,'2010',   N,2.0,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.45,'10mΩ 2W current sense'],
      [D,CE,'resistor','current_sense','LVK12R010FER','Vishay',0.01,'Ω','Surface Mount',N,N,1,N,N,  N,N,N,N,'±75ppm',-55,155, 3.2,1.6,'1206',      N,0.5,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.38,'10mΩ 500mW sense'],
      [D,CE,'resistor','general','CRCW0805100RFKEA','Vishay',100,'Ω','Surface Mount',N,N,1,  N,N, N,N,N,N,'±100ppm',-55,155, 2.0,1.25,'0805',      N,0.125,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N,0.05,'100Ω 125mW 1%'],
      [D,CE,'resistor','general','CRCW08051K00FKEA','Vishay',1000,'Ω','Surface Mount',N,N,1, N,N, N,N,N,N,'±100ppm',-55,155, 2.0,1.25,'0805',      N,0.125,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N,0.05,'1kΩ 125mW 1%'],
      [D,CE,'resistor','general','CRCW08054K70FKEA','Vishay',4700,'Ω','Surface Mount',N,N,1, N,N, N,N,N,N,'±100ppm',-55,155, 2.0,1.25,'0805',      N,0.125,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N,0.05,'4.7kΩ 125mW 1%'],

      // ════════════════════════════════════════════════════════════════════════
      // RESISTORS — Thermistors (NTC)
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'resistor','thermistor','NTCLE101E3103JB0','Vishay',10000,'Ω','Through Hole',N,N,1, N,N, N,N,N,N,'N/A',-40,125, 3.5,1.8,'Radial 3.5mm', N,N,N,'NTCLE101',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.25,'10kΩ NTC Inrush Limiter'],
      [D,CE,'resistor','thermistor','B57232V2472J060','EPCOS',4700,'Ω','Through Hole',N,N,5,  N,N, N,N,N,N,'N/A',-40,125, 5.0,3.0,'Radial 5mm',    N,N,N,'B57232',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.35,'4.7kΩ NTC 2.4A'],
      [D,CE,'resistor','thermistor','B57861S0103A040','TDK',10000,'Ω','Through Hole',N,N,1,   N,N, N,N,N,N,'N/A',-40,125, 7.5,4.0,'Radial 7.5mm',  N,N,N,'B57861',N,N,N,N, N,N,N,N, N,N,N,N,N, 0.42,'10kΩ NTC, 4A'],

      // ════════════════════════════════════════════════════════════════════════
      // FUSES / PROTECTION
      // ════════════════════════════════════════════════════════════════════════
      [D,CE,'fuse','fuse','BEL-5HT 1-R','Bel Fuse',1,'A','Through Hole',N,N,N,   250,250,N,N,N,N,'N/A',-55,125, 25.4,5.3,'5x20mm',       N,N,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.28,'1A 250V Slow Blow 5x20'],
      [D,CE,'fuse','fuse','BEL-5HT 2-R','Bel Fuse',2,'A','Through Hole',N,N,N,   250,250,N,N,N,N,'N/A',-55,125, 25.4,5.3,'5x20mm',       N,N,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.28,'2A 250V Slow Blow 5x20'],
      [D,CE,'fuse','fuse','0312.250MXP','Littelfuse',0.25,'A','Surface Mount',N,N,N,125,N,N,N,N,N,'N/A',-55,125,  9.5,3.8,'SMD 3812',     N,N,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.22,'250mA 125V SMD SB'],
      [D,CE,'fuse','fuse','0452.500MR','Littelfuse',0.5,'A','Surface Mount',N,N,N, 125,N,N,N,N,N,'N/A',-55,125,  4.6,1.9,'SMD 0452',     N,N,N,N,N,N,N,N, N,N,N,N, N,N,N,N,N, 0.18,'500mA 125V SMD'],
      [D,CE,'fuse','varistor','B72210S0271K101','EPCOS',N,N,'Through Hole',N,N,N,  N,275,N,N,N,N,'N/A',-40,85,  10.5,3.5,'Radial 10mm',  N,N,N,'B72210',N,N,N,N, N,N,275,0.1,4000, 0.32,'275VAC, 0.1J, 4kA MOV'],
      [D,CE,'fuse','varistor','B72220S0271K101','EPCOS',N,N,'Through Hole',N,N,N,  N,275,N,N,N,N,'N/A',-40,85,  14,4.5, 'Radial 14mm',  N,N,N,'B72220',N,N,N,N, N,N,275,0.2,6000, 0.45,'275VAC, 0.2J, 6kA MOV'],
      [D,CE,'fuse','varistor','V20K275','Vishay',N,N,'Through Hole',N,N,N,         N,275,N,N,N,N,'N/A',-40,85,  10.5,3.5,'Radial 10mm',  N,N,N,'V-K275',N,N,N,N, N,N,275,0.3,4000, 0.48,'275VAC MOV 4kA'],
    ];
    for (const row of rows) db.run(ins, row);
    save();
    console.log(`🌱 Seeded ${rows.length} components`);
  }
  // ── Seed Magnetics DB (once) ──────────────────────────────────────────────
  const _mc = db.exec('SELECT COUNT(*) as n FROM mag_cores');
  if (!_mc.length || _mc[0].values[0][0] === 0) {
    const N = null;
    // ── Magnetic Materials ──────────────────────────────────────────────────
    // library, material, bmax_100c, bmax_25c, mu_i, mu_tol, lca, lcb, lcc, fmin_khz, fmax_khz, tmax, mfr, comment
    const insM = `INSERT INTO mag_materials (library,material,bmax_100c,bmax_25c,mu_i,mu_tol,freq_min_khz,freq_max_khz,temp_max_c,mfr,comment) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
    const mats = [
      ['Default','PC95', 410,530, 3300,25,  70, 500,120,'TDK',      'High efficiency, low loss at 100kHz. Best for >65W flyback.'],
      ['Default','3F3',  440,520, 2000,25,  25, 500,120,'Ferroxcube','General purpose, very low loss 25-500kHz. Excellent for EE/EFD cores.'],
      ['Default','PC44', 390,510, 2400,25,  50, 500,120,'TDK',      'For Transformer and Choke (f>50kHz). Low Pcv at 100kHz.'],
      ['Default','PC40', 390,510, 2300,25,  25, 200,120,'TDK',      'Transformers, Power Inductors (25-200kHz). Classic workhorse.'],
      ['Default','3C95', 410,530, 3000,20,  50, 400,130,'Ferroxcube','Medium frequency. Flat power loss vs temperature. Excellent 50-400kHz.'],
      ['Default','NC2H', 370,500, 2300,25, 100,1000,130,'TDK',      'Medium lossy, high frequency (<1MHz). Good above 500kHz.'],
      ['Default','3C81', 360,450, 2000,20,  25, 200,130,'Ferroxcube','Low frequency, generic industrial. PQ/ETD cores.'],
      ['Default','3C90', 380,470, 2300,20,  25, 200,130,'Ferroxcube','Low frequency, generic industrial. Successor to 3C85.'],
      ['Default','N27',  380,500, 2000,25,  25, 200,130,'TDK (EPCOS)','Standard Mn-Zn ferrite. EFD/E/EE cores general purpose.'],
      ['Default','N87',  400,490, 2200,25,  25, 200,125,'TDK (EPCOS)','Optimised for 25-200kHz. Low loss power transformer material.'],
      ['Default','N97',  430,550, 3300,25,  70, 500,130,'TDK (EPCOS)','High permeability, ultra-low loss. Best-in-class for SMPS.'],
      ['Default','DMR50',420,540, 3300,20,  70, 500,130,'DMEGC',    'Chinese equiv to PC95/N97. High efficiency SMPS ferrite.'],
      ['Default','ML91S',400,490, 3000,20,  50, 400,125,'Hitachi Metals','Low loss 50-400kHz. Compatible with EE/EFD geometry.'],
      ['Default','T38',  380,480, 4300,25,  10,  50,120,'Ferroxcube','High permeability. Used for common mode chokes.'],
      ['Default','PC200',280,350, 1400,25, 300,3000,120,'TDK',      'Very high frequency >1MHz. GHz-range EMI suppression.'],
    ];
    for (const r of mats) db.run(insM, r);

    // ── Cores ───────────────────────────────────────────────────────────────
    // library,planar,core_pn,material,series,core_name,name1,ae_mm2,ae_min_mm2,le_mm,al_nh,sa_mm2,ve_mm3,default_bobbin,a_mm,apos_mm,aneg_mm,b_mm,c_mm,d_mm,e_mm,f_mm,h_mm,mfr,notes
    const insC = `INSERT INTO mag_cores (library,planar,core_pn,material,series,core_name,name1,ae_mm2,ae_min_mm2,le_mm,al_nh,sa_mm2,ve_mm3,default_bobbin,a_mm,apos_mm,aneg_mm,b_mm,c_mm,d_mm,e_mm,f_mm,h_mm,mfr,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const cores = [
      // ── EFD Series (Efficient Flat Design — flyback/forward) ──────────────
      ['Default',0,'B66305','N27','EF','EF12.6','E13/7/4',   12.4,12.2,29.6, 800, 762.80,367, 'EF12.6-1 (P4-S4)', 12.60,0.00,0.00,12.6,7.4, 4.1,4.0, 2.8,4.5,'TDK (EPCOS)','EFD12.6 — compact, up to 20W'],
      ['Default',0,'B66305','N87','EF','EF12.6','E13/7/4',   12.4,12.2,29.6, 850, 762.80,367, 'EF12.6-1 (P4-S4)', 12.60,0.00,0.00,12.6,7.4, 4.1,4.0, 2.8,4.5,'TDK (EPCOS)','EFD12.6 N87 variant'],
      ['Default',0,'PC40EF12.6-Z','PC40','EF','EF12.6',N,    13.0,13.0,29.6, 810, 753.52,385, 'EF12.6-1 (P4-S4)', 12.70,0.00,0.00,12.6,7.4, 4.1,4.0, 2.8,4.5,'TDK','EFD12.6 PC40'],
      ['Default',0,'PC47EF12.6-Z','PC47','EF','EF12.6',N,    13.0,13.0,29.6, 810, 753.52,385, 'EF12.6-1 (P4-S4)', 12.70,0.00,0.00,12.6,7.4, 4.1,4.0, 2.8,4.5,'TDK','EFD12.6 PC47'],
      ['Default',0,'PC40EE13-Z',  'PC40','EE','EE13',N,      17.1,17.1,30.2,1130, 914.50,517, 'EE13-1 (P5-S5)',   13.00,0.00,0.00,13.0,7.0, 5.0,5.0, N,  5.0,'TDK','EE13 standard'],
      ['Default',0,'PC47EE13-Z',  'PC47','EE','EE13',N,      17.1,17.1,30.2,1130, 914.50,517, 'EE13-1 (P5-S5)',   13.00,0.00,0.00,13.0,7.0, 5.0,5.0, N,  5.0,'TDK','EE13 high permeability'],
      ['Default',0,'PC47EE16-Z',  'PC47','EE','EE16',N,      19.0,19.0,34.5,1140,1132.08,656, 'EE16-1 (P4+S4)',   16.00,0.00,0.00,16.0,9.0, 6.0,6.0, N,  6.0,'TDK','EE16 standard'],
      ['Default',0,'PC40EE16-Z',  'PC40','EE','EE16',N,      19.0,19.0,34.5,1140,1132.08,656, 'EE16-1 (P4+S4)',   16.00,0.00,0.00,16.0,9.0, 6.0,6.0, N,  6.0,'TDK','EE16 PC40'],
      // ── EFD20, EFD25, EFD30 ───────────────────────────────────────────────
      ['Default',0,'B66358','N87','EFD','EFD20','EFD20/10/7', 31.0,30.1,42.0,1400,1500.00,1302,'EFD20-1',           20.00,0.00,0.00,20.0,10.0,7.0,6.6, 2.6,6.0,'TDK (EPCOS)','EFD20 — 30-50W flyback'],
      ['Default',0,'B66358','PC95','EFD','EFD20','EFD20/10/7',31.0,30.1,42.0,1450,1500.00,1302,'EFD20-1',           20.00,0.00,0.00,20.0,10.0,7.0,6.6, 2.6,6.0,'TDK (EPCOS)','EFD20 PC95 variant'],
      ['Default',0,'B66362','N87','EFD','EFD25','EFD25/13/9', 52.0,50.3,54.0,1900,2500.00,2808,'EFD25-1',           25.00,0.00,0.00,25.0,13.0,9.0,8.4, 3.4,8.0,'TDK (EPCOS)','EFD25 — 50-75W flyback'],
      ['Default',0,'B66371','N87','EFD','EFD30','EFD30/15/9', 60.0,58.1,46.5,1900,2600.00,2790,'EFD30-1',           30.00,0.00,0.00,30.0,15.0,9.0,8.4, 2.8,8.0,'TDK (EPCOS)','EFD30 — classic 65W flyback'],
      ['Default',0,'B66371','PC95','EFD','EFD30','EFD30/15/9',60.0,58.1,46.5,1950,2600.00,2790,'EFD30-1',           30.00,0.00,0.00,30.0,15.0,9.0,8.4, 2.8,8.0,'TDK (EPCOS)','EFD30 PC95 — ultra low loss 65W'],
      ['Default',0,'B66374','N97','EFD','EFD30','EFD30/15/9', 60.0,58.1,46.5,2000,2600.00,2790,'EFD30-1',           30.00,0.00,0.00,30.0,15.0,9.0,8.4, 2.8,8.0,'TDK (EPCOS)','EFD30 N97 — best efficiency'],
      // ── EE Series ─────────────────────────────────────────────────────────
      ['Default',0,'664-EE19','3F3','EE','EE19','EE19/8/5',   22.0,21.2,39.0, 590,1050.00, 858,'EE19-1',           19.00,0.00,0.00,19.0,8.5, 5.0,4.6, N,  4.5,'Ferroxcube','EE19 — up to 20W'],
      ['Default',0,'664-EE25','3F3','EE','EE25','EE25/13/7',  40.0,38.5,52.0, 950,1700.00,2080,'EE25-1',           25.00,0.00,0.00,25.0,13.0,7.0,6.5, N,  6.5,'Ferroxcube','EE25 — 30-50W'],
      ['Default',0,'664-EE30','3C95','EE','EE30','EE30/15/7', 60.0,58.0,52.0, 920,2200.00,3120,'EE30-1',           30.00,0.00,0.00,30.0,15.0,7.0,6.5, N,  7.0,'Ferroxcube','EE30 — 50-80W'],
      ['Default',0,'B66317','N87','EE','EE40','EE40/20/15',  148.0,142.0,77.0,2100,5500.00,11396,'EE40-1',          40.00,0.00,0.00,40.0,20.0,15.0,14.0,N, 15.0,'TDK (EPCOS)','EE40 — 80-120W'],
      ['Default',0,'B66317','PC95','EE','EE40','EE40/20/15', 148.0,142.0,77.0,2200,5500.00,11396,'EE40-1',          40.00,0.00,0.00,40.0,20.0,15.0,14.0,N, 15.0,'TDK (EPCOS)','EE40 PC95 — high efficiency 120W'],
      ['Default',0,'B66349','N87','EE','EE55','EE55/28/21',  420.0,408.0,123.0,2800,14000.0,51660,'EE55-1',         55.00,0.00,0.00,55.0,28.0,21.0,19.0,N, 21.0,'TDK (EPCOS)','EE55 — 200W+'],
      // ── ETD Series ────────────────────────────────────────────────────────
      ['Default',0,'B66359','3F3','ETD','ETD29','ETD29/16/10',76.0,74.1,72.0,1700,5800.00,5470,'ETD29-1',           29.00,0.00,0.00,29.0,16.0,10.0,9.4, N, 10.0,'Ferroxcube','ETD29 — 50-100W. Round centre post.'],
      ['Default',0,'B66414','3F3','ETD','ETD34','ETD34/17/11',97.0,94.6,78.6,1900,7600.00,7630,'ETD34-1',           34.00,0.00,0.00,34.0,17.0,11.0,10.3,N, 11.0,'Ferroxcube','ETD34 — 75-150W'],
      ['Default',0,'B66414','PC95','ETD','ETD34','ETD34/17/11',97.0,94.6,78.6,2000,7600.00,7630,'ETD34-1',          34.00,0.00,0.00,34.0,17.0,11.0,10.3,N, 11.0,'Ferroxcube','ETD34 PC95 — high efficiency'],
      ['Default',0,'B66414A7000X000','3C95','ETD','ETD39','ETD39/20/13',125.0,121.6,92.2,2200,10000.0,11500,'ETD39-1',39.00,0.00,0.00,39.0,20.0,13.0,12.1,N,13.0,'Ferroxcube','ETD39 — 100-200W'],
      ['Default',0,'B66432','N97','ETD','ETD44','ETD44/22/15',172.0,167.0,103.0,2300,12500.0,17700,'ETD44-1',        44.00,0.00,0.00,44.0,22.0,15.0,14.0,N, 15.0,'TDK (EPCOS)','ETD44 — 150-250W'],
      ['Default',0,'B66432','PC95','ETD','ETD44','ETD44/22/15',172.0,167.0,103.0,2400,12500.0,17700,'ETD44-1',       44.00,0.00,0.00,44.0,22.0,15.0,14.0,N, 15.0,'TDK (EPCOS)','ETD44 PC95 — ultra-low loss'],
      ['Default',0,'B66458','N97','ETD','ETD49','ETD49/25/16',211.0,205.0,114.0,2600,15000.0,24100,'ETD49-1',        49.00,0.00,0.00,49.0,25.0,16.0,14.9,N, 16.0,'TDK (EPCOS)','ETD49 — 200-350W'],
      // ── PQ Series ─────────────────────────────────────────────────────────
      ['Default',0,'PQ2016','PC95','PQ','PQ20/16','PQ20/16',  62.0,60.0,37.0,1700,1900.00,2294,'PQ20/16-1',         20.00,0.00,0.00,20.0,16.0,9.2, 8.6, N,  9.6,'TDK','PQ20/16 — 40-80W compact'],
      ['Default',0,'PQ2020','PC95','PQ','PQ20/20','PQ20/20',  62.0,60.0,45.5,2100,2200.00,2821,'PQ20/20-1',         20.00,0.00,0.00,20.0,20.0,11.3,10.6,N, 11.3,'TDK','PQ20/20 — 50-90W'],
      ['Default',0,'PQ3220','N97','PQ','PQ32/20','PQ32/20',  160.0,155.0,56.0,2800,5200.00,8960,'PQ32/20-1',        32.00,0.00,0.00,32.0,20.0,14.5,13.7,N, 14.5,'TDK','PQ32/20 — 100-150W'],
      ['Default',0,'PQ3535','N97','PQ','PQ35/35','PQ35/35',  256.0,248.0,74.0,3100,8400.00,18944,'PQ35/35-1',       35.00,0.00,0.00,35.0,35.0,19.0,18.0,N, 19.0,'TDK','PQ35/35 — 150-250W'],
      // ── RM / PM Series ────────────────────────────────────────────────────
      ['Default',0,'RM6','3F3','RM','RM6','RM6',             36.0,34.9,37.6,1250,1600.00,1354,'RM6-1',              11.0,0.00,0.00,11.0,11.0,7.7, 7.0, N,  7.0,'Ferroxcube','RM6 — 10-25W. Integrated base clips.'],
      ['Default',0,'RM8','3F3','RM','RM8','RM8',             60.1,58.3,45.7,1700,2700.00,2748,'RM8-1',              14.5,0.00,0.00,14.5,14.5,10.2,9.4, N,  9.4,'Ferroxcube','RM8 — 30-60W'],
      ['Default',0,'RM10','3C95','RM','RM10','RM10',         96.6,93.7,58.0,2400,4400.00,5603,'RM10-1',             17.8,0.00,0.00,17.8,17.8,12.5,11.5,N, 11.5,'Ferroxcube','RM10 — 60-100W'],
      ['Default',0,'RM12','N97','RM','RM12','RM12',          146.0,141.6,70.2,3000,6800.00,10249,'RM12-1',           22.0,0.00,0.00,22.0,22.0,15.0,13.8,N, 13.8,'Ferroxcube','RM12 — 80-130W'],
      // ── Toroid / Ring Cores ───────────────────────────────────────────────
      ['Default',0,'T106-2','Iron Powder','T','T106-2','T106-2',210.0,N,   99.0, 90,  N,    N,   N,               27.0,N,  N,  27.0,14.0,11.0,N,  N,   N,  'Micrometals','Iron powder T106. Low µ. Output chokes.'],
      ['Default',0,'T130-2','Iron Powder','T','T130-2','T130-2',320.0,N,  119.0, 80,  N,    N,   N,               33.0,N,  N,  33.0,19.0,14.0,N,  N,   N,  'Micrometals','Iron powder T130. Output filter choke.'],
      ['Default',0,'T157-2','Iron Powder','T','T157-2','T157-2',490.0,N,  141.0, 78,  N,    N,   N,               40.0,N,  N,  40.0,23.5,16.5,N,  N,   N,  'Micrometals','Iron powder T157. Large output choke.'],
      ['Default',0,'T60-Kool','Kool Mµ','T','T60-Kool','T60-Kool',78.0,N, 52.0,115,  N,    N,   N,               15.2,N,  N,  15.2,8.3, 5.8, N,  N,   N,  'Magnetics Inc','Kool Mµ toroid 60 size. PFC inductors.'],
      ['Default',0,'T80-Kool','Kool Mµ','T','T80-Kool','T80-Kool',134.0,N,67.0,125,  N,    N,   N,               20.2,N,  N,  20.2,12.0,8.0, N,  N,   N,  'Magnetics Inc','Kool Mµ toroid 80 size. High DC bias.'],
    ];
    for (const r of cores) db.run(insC, r);

    // ── Bobbins ─────────────────────────────────────────────────────────────
    const insB = `INSERT INTO mag_bobbins (library,bobbin_pn,core_name,winding_area_mm2,num_slots,creepage_mm,clearance_mm,mfr,notes) VALUES (?,?,?,?,?,?,?,?,?)`;
    const bobbins = [
      ['Default','EF12.6-1 (P4-S4)','EF12.6',  12.0,2,2.5,0.8,'TDK (EPCOS)','4+4 pin, vertical'],
      ['Default','EFD20-1',          'EFD20',   22.0,2,3.0,1.0,'TDK (EPCOS)','Horizontal EFD20'],
      ['Default','EFD25-1',          'EFD25',   38.0,2,3.2,1.0,'TDK (EPCOS)','Horizontal EFD25'],
      ['Default','EFD30-1',          'EFD30',   50.0,2,3.2,1.0,'TDK (EPCOS)','Horizontal EFD30 — 5+5 pin'],
      ['Default','EE13-1 (P5-S5)',   'EE13',    10.5,2,2.5,0.8,'TDK (EPCOS)','5+5 pin vertical'],
      ['Default','EE16-1 (P4+S4)',   'EE16',    15.0,2,2.8,0.8,'TDK (EPCOS)','4+4 pin'],
      ['Default','EE19-1',           'EE19',    18.5,2,3.0,1.0,'Ferroxcube','Horizontal 5+5 pin'],
      ['Default','EE25-1',           'EE25',    35.0,2,3.2,1.0,'Ferroxcube','Horizontal'],
      ['Default','EE30-1',           'EE30',    55.0,2,3.2,1.0,'Ferroxcube','Horizontal 6+6 pin'],
      ['Default','EE40-1',           'EE40',    100.0,2,4.0,1.2,'TDK (EPCOS)','Horizontal 7+7 pin'],
      ['Default','EE55-1',           'EE55',    195.0,2,5.0,1.5,'TDK (EPCOS)','Horizontal 9+9 pin'],
      ['Default','ETD29-1',          'ETD29',   68.0,2,3.5,1.0,'Ferroxcube','6+6 pin round post'],
      ['Default','ETD34-1',          'ETD34',   96.0,2,4.0,1.2,'Ferroxcube','7+7 pin'],
      ['Default','ETD39-1',          'ETD39',   126.0,2,4.0,1.2,'Ferroxcube','8+8 pin'],
      ['Default','ETD44-1',          'ETD44',   157.0,2,4.5,1.2,'TDK (EPCOS)','9+9 pin'],
      ['Default','ETD49-1',          'ETD49',   192.0,2,5.0,1.5,'TDK (EPCOS)','9+9 pin large'],
      ['Default','PQ20/16-1',        'PQ20/16', 45.0,2,3.2,1.0,'TDK','6+6 pin'],
      ['Default','PQ20/20-1',        'PQ20/20', 55.0,2,3.2,1.0,'TDK','6+6 pin tall'],
      ['Default','PQ32/20-1',        'PQ32/20', 110.0,2,4.0,1.2,'TDK','7+7 pin'],
      ['Default','PQ35/35-1',        'PQ35/35', 175.0,2,4.5,1.2,'TDK','8+8 pin'],
      ['Default','RM6-1',            'RM6',     21.0,2,3.0,1.0,'Ferroxcube','4+4 pin with PCB clips'],
      ['Default','RM8-1',            'RM8',     42.0,2,3.5,1.0,'Ferroxcube','5+5 pin'],
      ['Default','RM10-1',           'RM10',    72.0,2,4.0,1.2,'Ferroxcube','6+6 pin'],
      ['Default','RM12-1',           'RM12',    110.0,2,4.5,1.2,'Ferroxcube','7+7 pin'],
    ];
    for (const r of bobbins) db.run(insB, r);

    // ── Accessories ─────────────────────────────────────────────────────────
    const insA = `INSERT INTO mag_accessories (library,part_number,ordering_code,type,parts_num,for_core,mfr,notes) VALUES (?,?,?,?,?,?,?,?)`;
    const accs = [
      ['Default','EF16CLIPM-00','B66202A2010X000','Clip',1,'EF12.6/EFD20','TDK (EPCOS)','Spring steel mounting clip EFD/EF'],
      ['Default','B66359',      'B66359S2000X000','Yoke',2,'ETD29',        'Ferroxcube','ETD29 yoke set (2 halves)'],
      ['Default','B66414',      'B66414B2000X000','Yoke',2,'ETD34',        'Ferroxcube','ETD34 yoke set'],
      ['Default','B66414A',     'B66414A7000X000','Yoke',2,'ETD39',        'Ferroxcube','ETD39 yoke set'],
      ['Default','B66206',      'B66206A2010X000','Yoke',2,'RM6',          'Ferroxcube','RM6 yoke set'],
      ['Default','B66208',      'B66208A2010X000','Yoke',2,'RM8',          'Ferroxcube','RM8 yoke set'],
      ['Default','B66232',      'B66232A2010X000','Yoke',2,'RM12',         'Ferroxcube','RM12 yoke set'],
      ['Default','CLIP-EFD30',  'B66371A2010X000','Clip',1,'EFD30',        'TDK (EPCOS)','EFD30 mounting clip'],
      ['Default','CLIP-EFD25',  'B66362A2010X000','Clip',1,'EFD25',        'TDK (EPCOS)','EFD25 mounting clip'],
      ['Default','CLIP-EFD20',  'B66358A2010X000','Clip',1,'EFD20',        'TDK (EPCOS)','EFD20 mounting clip'],
      ['Default','TAPE-25UM',   'MAG-TAPE-25',    'Gap Tape',1,'Universal','Generic','25µm gap-setting tape'],
      ['Default','TAPE-50UM',   'MAG-TAPE-50',    'Gap Tape',1,'Universal','Generic','50µm gap-setting tape'],
      ['Default','TAPE-100UM',  'MAG-TAPE-100',   'Gap Tape',1,'Universal','Generic','100µm gap-setting tape'],
      ['Default','B66206CP',    'B66206C2000X000','Cover plate',1,'RM6',   'Ferroxcube','RM6 PCB cover plate'],
      ['Default','B66208CP',    'B66208C2000X000','Cover plate',1,'RM8',   'Ferroxcube','RM8 PCB cover plate'],
      ['Default','ETD29-CLIP',  'B66359C2000X000','Clip',2,'ETD29',        'Ferroxcube','ETD29 spring clips (pair)'],
      ['Default','ETD34-CLIP',  'B66414C2000X000','Clip',2,'ETD34',        'Ferroxcube','ETD34 spring clips (pair)'],
    ];
    for (const r of accs) db.run(insA, r);

    save();
    console.log('🌱 Seeded magnetics DB: cores, bobbins, materials, accessories');
  }

  // ── Seed component sets + compatible relationships (once) ──────────────────
  const setsCount = db.exec('SELECT COUNT(*) as n FROM component_sets');
  if (!setsCount.length || setsCount[0].values[0][0] === 0) {
    const getIds = (type, subtype) => {
      const r = db.exec(`SELECT id,part FROM components WHERE type=? AND subtype=?`,[type,subtype]);
      if (!r.length) return {};
      const {columns,values} = r[0];
      const map = {};
      values.forEach(row => { map[row[columns.indexOf('part')]] = row[columns.indexOf('id')]; });
      return map;
    };
    const getId = (part) => {
      const r = db.exec(`SELECT id FROM components WHERE part=?`,[part]);
      return r.length ? r[0].values[0][0] : null;
    };

    // ── Component Sets ────────────────────────────────────────────────────────
    const insertSet = (name, description, topology) => {
      db.run('INSERT INTO component_sets (name,description,topology) VALUES (?,?,?)',[name,description,topology]);
      const r = db.exec('SELECT last_insert_rowid() as id');
      return r[0].values[0][0];
    };
    const addToSet = (setId, part, role) => {
      const id = getId(part);
      if (id) db.run('INSERT OR IGNORE INTO set_components (set_id,component_id,role) VALUES (?,?,?)',[setId,id,role||null]);
    };
    const linkCompat = (partA, partB, reason) => {
      const idA = getId(partA), idB = getId(partB);
      if (idA && idB) {
        db.run('INSERT OR IGNORE INTO compatible_components (comp_id,compat_id,reason) VALUES (?,?,?)',[idA,idB,reason||null]);
        db.run('INSERT OR IGNORE INTO compatible_components (comp_id,compat_id,reason) VALUES (?,?,?)',[idB,idA,reason||null]);
      }
    };

    // Set 1 — Standard 65W Universal Input Flyback (HPFC-1)
    const s1 = insertSet('Standard 65W Flyback','Universal input 85–265VAC, 65W HPFC-1 flyback reference design','Flyback');
    addToSet(s1,'BEL-5HT 1-R','input_fuse');
    addToSet(s1,'NTCLE101E3103JB0','inrush_thermistor');
    addToSet(s1,'B72210S0271K101','input_varistor');
    addToSet(s1,'LPF3225V6R8MF','emi_choke');
    addToSet(s1,'DF1506S','bridge_rectifier');
    addToSet(s1,'UHE2G470MPD','input_bulk_cap');
    addToSet(s1,'EEU-EB2G470','bus_cap');
    addToSet(s1,'ECQ-U2A223ML','emi_x2_cap');
    addToSet(s1,'B72210S0271K101','varistor');
    addToSet(s1,'TOP256EG','pi_device');
    addToSet(s1,'RC2010FK-073M9L','startup_r4');
    addToSet(s1,'RC2010FK-077M32L','startup_r5');
    addToSet(s1,'RC0805FR-071KL','ilim_resistor');
    addToSet(s1,'C1608X7R1H104K','bypass_cap');
    addToSet(s1,'EFD30/15/9','transformer_core');
    addToSet(s1,'UF4007','clamp_diode');
    addToSet(s1,'V10D60C','output_diode');
    addToSet(s1,'FDLL4448','aux_diode');
    addToSet(s1,'UPS1E471MED','output_cap_c9');
    addToSet(s1,'UPS1E471MED','output_cap_c10');
    addToSet(s1,'UPS1V101MED','output_cap_c11');
    addToSet(s1,'TL431CD','voltage_reference');
    addToSet(s1,'LTV-817D','optocoupler');
    addToSet(s1,'RK73H2ATTD4991F','upper_fb_divider');
    addToSet(s1,'RC0805FR-071KL','lower_fb_divider');

    // Set 2 — High Efficiency 105W Flyback (TOP262EG)
    const s2 = insertSet('High Efficiency 105W Flyback','105W design with EE40 core, dual output caps, upgraded clamp','Flyback');
    addToSet(s2,'BEL-5HT 2-R','input_fuse');
    addToSet(s2,'NTCLE101E3103JB0','inrush_thermistor');
    addToSet(s2,'B72220S0271K101','input_varistor');
    addToSet(s2,'SRR1260-6R0Y','emi_choke');
    addToSet(s2,'GBU606','bridge_rectifier');
    addToSet(s2,'EKXG401ELL470','input_bulk_cap');
    addToSet(s2,'ALS30A471DF400','bus_cap');
    addToSet(s2,'B32922C3104K','emi_x2_cap');
    addToSet(s2,'TOP262EG','pi_device');
    addToSet(s2,'RC2010FK-073M9L','startup_r4');
    addToSet(s2,'RC2010FK-077M32L','startup_r5');
    addToSet(s2,'EE40/20/15','transformer_core');
    addToSet(s2,'HER107','clamp_diode');
    addToSet(s2,'STPS10H100CG','output_diode');
    addToSet(s2,'R507K-GS08','aux_diode');
    addToSet(s2,'EEUFM1V102','output_cap_c9');
    addToSet(s2,'EEUFM1V102','output_cap_c10');
    addToSet(s2,'EEE-FK1V470P','output_cap_c11');
    addToSet(s2,'TL431AIDR','voltage_reference');
    addToSet(s2,'LTV-817D','optocoupler');

    // Set 3 — Low Power 18W Adapter (TOP246YN, TO-220)
    const s3 = insertSet('Low Power 18W Adapter','18W compact adapter design, TO-220 package, single output','Flyback');
    addToSet(s3,'0312.250MXP','input_fuse');
    addToSet(s3,'NTCLE101E3103JB0','inrush_thermistor');
    addToSet(s3,'B72210S0271K101','input_varistor');
    addToSet(s3,'ACM2012-900-2P','emi_choke');
    addToSet(s3,'MB6S','bridge_rectifier');
    addToSet(s3,'LGY2G100MELB25','input_bulk_cap');
    addToSet(s3,'UHE2G100MPD','bus_cap');
    addToSet(s3,'ECQ-U2A223ML','emi_x2_cap');
    addToSet(s3,'TOP246YN','pi_device');
    addToSet(s3,'RC1210FR-072M2L','startup_r4');
    addToSet(s3,'RC1210FR-071ML','startup_r5');
    addToSet(s3,'EE19/8/5','transformer_core');
    addToSet(s3,'ES1J','clamp_diode');
    addToSet(s3,'MBRS340','output_diode');
    addToSet(s3,'B5819W','aux_diode');
    addToSet(s3,'UPS1V101MED','output_cap_c9');
    addToSet(s3,'EEE-FK1E221P','output_cap_c10');
    addToSet(s3,'TL431ACLP','voltage_reference');
    addToSet(s3,'PC817C','optocoupler');

    // Set 4 — LPFC-1 5W Phone Charger
    const s4 = insertSet('5W Phone Charger (LPFC-1)','Ultra-compact 5W USB charger design using LPFC-1','Flyback');
    addToSet(s4,'0312.250MXP','input_fuse');
    addToSet(s4,'B72210S0271K101','input_varistor');
    addToSet(s4,'MB6S','bridge_rectifier');
    addToSet(s4,'ECA-2GHG101','input_bulk_cap');
    addToSet(s4,'TNY274PN','pi_device');
    addToSet(s4,'RC1210FR-071ML','startup_resistor');
    addToSet(s4,'EE19/8/5','transformer_core');
    addToSet(s4,'SS34','output_diode');
    addToSet(s4,'EEE-FK1E221P','output_cap_c9');
    addToSet(s4,'TL431ACLP','voltage_reference');
    addToSet(s4,'PC817C','optocoupler');

    // ── Compatible Relationships ───────────────────────────────────────────────
    // Controller IC — HPFC family interchangeable
    linkCompat('TOP246YN','TOP248YN','Higher power HPFC-1, same pinout');
    linkCompat('TOP246YN','TOP252YN','Higher power HPFC-1, same pinout');
    linkCompat('TOP248YN','TOP252YN','HPFC-1 same footprint, higher power');
    linkCompat('TOP252YN','TOP256EG','Upgrade to EG package for better thermals');
    linkCompat('TOP256EG','TOP258EG','HPFC-1 EG, next power tier');
    linkCompat('TOP258EG','TOP262EG','HPFC-1 EG, next power tier');
    linkCompat('TOP262EG','TOP266EG','HPFC-1 EG, next power tier');
    linkCompat('TOP266EG','TOP268EG','HPFC-1 EG, highest power');
    linkCompat('TNY274PN','TNY276PN','LPFC-1, higher power same footprint');
    linkCompat('TNY276PN','TNY278GN','LPFC-1 upgrade to SO-8');

    // Optocouplers — drop-in compatible
    linkCompat('PC817C','LTV-817D','Drop-in replacement, identical specs');
    linkCompat('PC817C','FOD817C','Drop-in replacement, ON Semi');
    linkCompat('LTV-817D','FOD817C','Drop-in replacement');
    linkCompat('PC817C','HCPL-817-000E','Broadcom equivalent');
    linkCompat('PS2801-1','PC817C','Higher Vce version, compatible pinout');

    // TL431 voltage reference
    linkCompat('TL431ACLP','TL431AIDR','SMD version, equivalent electrical specs');
    linkCompat('TL431ACLP','TL431CD','SO-8 package, same reference voltage');
    linkCompat('TL431ACLP','KA431AZ','Fairchild equivalent, 1% tolerance');
    linkCompat('TL431AIDR','TL431CD','Different SMD packages, equivalent');

    // Bridge rectifiers
    linkCompat('DF1506S','MB6S','Same rating, different SMD footprint');
    linkCompat('DF1506S','KBP310','Through-hole alternative, higher voltage');
    linkCompat('MB6S','DF04S','Same SMD footprint, lower voltage rating');
    linkCompat('GBU606','KBP310','Similar through-hole bridges');
    linkCompat('DF1005S','MB6S','Lower voltage, same SOP-4 footprint');

    // Output Schottky diodes
    linkCompat('V10D60C','STPS10H100CG','Higher voltage, same current rating');
    linkCompat('V10D60C','MBR20100CTG','Higher current dual diode');
    linkCompat('MBRS340','SS34','Same rating, different SMD package');
    linkCompat('SS34','B5819W','Lower current version, SOD-123');
    linkCompat('SB1045','V10D60C','Similar DO-201AD Schottky');
    linkCompat('STPS10H100CG','VS-10BQ040PBF','Different package, similar specs');

    // Clamp diodes
    linkCompat('UF4007','HER107','Both ultrafast 1kV rectifiers');
    linkCompat('UF4007','ES1J','SMD alternative, same blocking voltage');
    linkCompat('ES1J','BYV26C','Similar ultrafast, different package');

    // Electrolytic caps — bulk input
    linkCompat('UHE2G470MPD','EEU-EB2G470','Same 47µF/400V, different mfr');
    linkCompat('UHE2G470MPD','EKXG401ELL470','United Chemi-Con equivalent');
    linkCompat('EEU-EB2G470','EKXG401ELL470','Compatible bulk electrolytic');
    linkCompat('ECA-2GHG101','ALS30A471DF400','Higher capacitance alternative');
    linkCompat('UHE2G100MPD','LGY2G100MELB25','Same 10µF/400V, different series');

    // Electrolytic caps — output
    linkCompat('UPS1E471MED','EMVK160ARA471','Same 470µF, different voltage');
    linkCompat('UPS1E471MED','EEE-FK1E221P','SMD vs radial, similar capacitance');
    linkCompat('UPS1V101MED','EEU-EB2G470','Different voltage rating, same series');
    linkCompat('EEE-FK1E221P','EEE-FK1V470P','Different capacitance, same series');
    linkCompat('EEUFM1V102','EEE-FK1V470P','Panasonic output electrolytic family');

    // Transformer cores
    linkCompat('EFD30/15/9','EE30/15/7','Similar Ae/Le, alternate core shape');
    linkCompat('EFD30/15/9','PQ20/16','PQ alternative for similar power level');
    linkCompat('EE40/20/15','PQ32/20','PQ equivalent for medium power');
    linkCompat('EE30/15/7','EFD30/15/9','EFD/EE alternative cores, same power');
    linkCompat('EE19/8/5','EFD30/15/9','Upgrade to higher power core');
    linkCompat('EE55/28/21','EE40/20/15','Step down to lower power');

    // EMI inductors
    linkCompat('LPF3225V6R8MF','SRR1260-6R0Y','Similar inductance, different footprint');
    linkCompat('ACM7060-301-2PL','ACM2012-900-2P','Same family, different inductance');

    // Varistors
    linkCompat('B72210S0271K101','B72220S0271K101','Same clamping voltage, higher energy');
    linkCompat('B72220S0271K101','V20K275','Vishay equivalent MOV');
    linkCompat('B72210S0271K101','V20K275','Similar 275VAC MOVs');

    // TVS
    linkCompat('SMBJ160A','P6KE200A','Similar TVS, different packages');
    linkCompat('SMBJ18A','SMBJ160A','Different voltages, same SMB package');

    // Fuses
    linkCompat('BEL-5HT 1-R','0312.250MXP','Through-hole vs SMD slow-blow');
    linkCompat('BEL-5HT 2-R','BEL-5HT 1-R','Higher rating, same form factor');
    linkCompat('0312.250MXP','0452.500MR','Different ratings, same SMD size');

    save();
    console.log('🌱 Seeded 4 component sets + compatible relationships');
  }

  const query    = (sql, p=[]) => { const r=db.exec(sql,p); if(!r.length) return []; const {columns,values}=r[0]; return values.map(row=>Object.fromEntries(columns.map((c,i)=>[c,row[i]]))); };
  const queryOne = (sql, p=[]) => query(sql,p)[0] ?? null;
  const run      = (sql, p=[]) => { db.run(sql,p); save(); return db.getRowsModified(); };
  const lastId   = ()          => queryOne('SELECT last_insert_rowid() as id').id;
  const hashPw   = (pw, salt)  => crypto.scryptSync(pw, salt, 64).toString('hex');
  const genToken = ()          => crypto.randomBytes(32).toString('hex');

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use((req,_,next) => { console.log(new Date().toISOString()+'  '+req.method.padEnd(7)+' '+req.path); next(); });
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/api/health', (_,res) => res.json({ status:'ok', files:queryOne('SELECT COUNT(*) as n FROM files').n, time:new Date().toISOString() }));

  // ── Components ──────────────────────────────────────────────────────────────
  app.get('/api/components', (req,res) => {
    try {
      const { type, subtype, q } = req.query;
      let sql = 'SELECT * FROM components WHERE 1=1';
      const p = [];
      if (type)    { sql += ' AND type=?';    p.push(type); }
      if (subtype) { sql += ' AND subtype=?'; p.push(subtype); }
      if (q)       { sql += ' AND (part LIKE ? OR mfr LIKE ? OR notes LIKE ?)'; const w='%'+q+'%'; p.push(w,w,w); }
      sql += ' ORDER BY type,subtype,part';
      res.json(query(sql, p));
    } catch(e) { res.status(500).json({error:e.message}); }
  });
  app.get('/api/components/types', (_,res) => {
    try { res.json(query('SELECT DISTINCT type,subtype FROM components ORDER BY type,subtype')); }
    catch(e) { res.status(500).json({error:e.message}); }
  });
  app.get('/api/components/:id', (req,res) => {
    const row = queryOne('SELECT * FROM components WHERE id=?',[Number(req.params.id)]);
    if(!row) return res.status(404).json({error:'Not found'});
    res.json(row);
  });

  // ── Components CRUD ────────────────────────────────────────────────────────
  app.post('/api/components', (req,res) => {
    const b = req.body || {};
    if (!b.type || !b.part) return res.status(400).json({error:'type and part are required'});
    const fields = ['library','qualification','type','subtype','part','mfr','value','unit','mount_type',
      'capacitance','uom','tol','rated_voltage','voltage_ac','ripple','esr','dcr','rated_life',
      'temp_coeff','temp_min','rated_temp','size_l','size_w','package','current','power','freq',
      'family','ctr','vf','vce','vref','ae','le','al','material','voltage','rating',
      'vaclamp','energy','imax','cost','notes'];
    const vals = fields.map(f => b[f] ?? null);
    try {
      run(`INSERT INTO components (${fields.join(',')}) VALUES (${fields.map(()=>'?').join(',')})`, vals);
      res.status(201).json(queryOne('SELECT * FROM components WHERE id=?',[lastId()]));
    } catch(e) { res.status(500).json({error:e.message}); }
  });
  app.put('/api/components/:id', (req,res) => {
    const id = Number(req.params.id);
    if (!queryOne('SELECT id FROM components WHERE id=?',[id])) return res.status(404).json({error:'Not found'});
    const b = req.body || {};
    const fields = ['library','qualification','type','subtype','part','mfr','value','unit','mount_type',
      'capacitance','uom','tol','rated_voltage','voltage_ac','ripple','esr','dcr','rated_life',
      'temp_coeff','temp_min','rated_temp','size_l','size_w','package','current','power','freq',
      'family','ctr','vf','vce','vref','ae','le','al','material','voltage','rating',
      'vaclamp','energy','imax','cost','notes'];
    const sets = fields.map(f=>`${f}=?`).join(',');
    const vals = [...fields.map(f=>b[f]??null), id];
    try { run(`UPDATE components SET ${sets} WHERE id=?`, vals); res.json(queryOne('SELECT * FROM components WHERE id=?',[id])); }
    catch(e) { res.status(500).json({error:e.message}); }
  });
  app.delete('/api/components/:id', (req,res) => {
    const id = Number(req.params.id);
    if (!queryOne('SELECT id FROM components WHERE id=?',[id])) return res.status(404).json({error:'Not found'});
    try { run('DELETE FROM components WHERE id=?',[id]); res.status(204).send(); }
    catch(e) { res.status(500).json({error:e.message}); }
  });

  // Compatible components
  app.get('/api/components/:id/compatible', (req,res) => {
    try {
      const id = Number(req.params.id);
      const rows = query(`SELECT c.*, cc.reason FROM components c
        JOIN compatible_components cc ON c.id = cc.compat_id
        WHERE cc.comp_id=?
        UNION
        SELECT c.*, cc.reason FROM components c
        JOIN compatible_components cc ON c.id = cc.comp_id
        WHERE cc.compat_id=?
        ORDER BY c.type, c.part`, [id, id]);
      res.json(rows);
    } catch(e) { res.status(500).json({error:e.message}); }
  });
  app.post('/api/components/:id/compatible', (req,res) => {
    const {compat_id, reason} = req.body || {};
    if (!compat_id) return res.status(400).json({error:'compat_id required'});
    try {
      run('INSERT OR IGNORE INTO compatible_components (comp_id,compat_id,reason) VALUES (?,?,?)',
        [Number(req.params.id), Number(compat_id), reason||null]);
      res.status(201).json({ok:true});
    } catch(e) { res.status(500).json({error:e.message}); }
  });
  app.delete('/api/components/:id/compatible/:cid', (req,res) => {
    const {id, cid} = req.params;
    try {
      run('DELETE FROM compatible_components WHERE (comp_id=? AND compat_id=?) OR (comp_id=? AND compat_id=?)',
        [id,cid,cid,id]);
      res.status(204).send();
    } catch(e) { res.status(500).json({error:e.message}); }
  });

  // ── Component Sets ───────────────────────────────────────────────────────────
  app.get('/api/component-sets', (_,res) => {
    try { res.json(query('SELECT * FROM component_sets ORDER BY id DESC')); }
    catch(e) { res.status(500).json({error:e.message}); }
  });
  app.get('/api/component-sets/:id', (req,res) => {
    const id = Number(req.params.id);
    const set = queryOne('SELECT * FROM component_sets WHERE id=?',[id]);
    if (!set) return res.status(404).json({error:'Not found'});
    const components = query(`SELECT c.*, sc.role FROM components c
      JOIN set_components sc ON c.id=sc.component_id WHERE sc.set_id=? ORDER BY c.type,c.part`,[id]);
    res.json({...set, components});
  });
  app.post('/api/component-sets', (req,res) => {
    const {name,description,topology} = req.body || {};
    if (!name) return res.status(400).json({error:'name required'});
    try {
      run('INSERT INTO component_sets (name,description,topology) VALUES (?,?,?)',[name,description||null,topology||null]);
      res.status(201).json(queryOne('SELECT * FROM component_sets WHERE id=?',[lastId()]));
    } catch(e) { res.status(500).json({error:e.message}); }
  });
  app.put('/api/component-sets/:id', (req,res) => {
    const id = Number(req.params.id);
    if (!queryOne('SELECT id FROM component_sets WHERE id=?',[id])) return res.status(404).json({error:'Not found'});
    const {name,description,topology} = req.body || {};
    try { run('UPDATE component_sets SET name=?,description=?,topology=? WHERE id=?',[name,description||null,topology||null,id]); res.json(queryOne('SELECT * FROM component_sets WHERE id=?',[id])); }
    catch(e) { res.status(500).json({error:e.message}); }
  });
  app.delete('/api/component-sets/:id', (req,res) => {
    const id = Number(req.params.id);
    if (!queryOne('SELECT id FROM component_sets WHERE id=?',[id])) return res.status(404).json({error:'Not found'});
    try { run('DELETE FROM component_sets WHERE id=?',[id]); res.status(204).send(); }
    catch(e) { res.status(500).json({error:e.message}); }
  });
  // Add/remove components from a set
  app.post('/api/component-sets/:id/components', (req,res) => {
    const {component_id, role} = req.body || {};
    if (!component_id) return res.status(400).json({error:'component_id required'});
    try {
      run('INSERT OR IGNORE INTO set_components (set_id,component_id,role) VALUES (?,?,?)',
        [Number(req.params.id), Number(component_id), role||null]);
      res.status(201).json({ok:true});
    } catch(e) { res.status(500).json({error:e.message}); }
  });
  app.delete('/api/component-sets/:id/components/:cid', (req,res) => {
    try { run('DELETE FROM set_components WHERE set_id=? AND component_id=?',[Number(req.params.id),Number(req.params.cid)]); res.status(204).send(); }
    catch(e) { res.status(500).json({error:e.message}); }
  });

  // ── Magnetics API ──────────────────────────────────────────────────────────
  app.get('/api/mag/cores', (req,res) => {
    try {
      const {series,material,q} = req.query;
      let sql = 'SELECT * FROM mag_cores WHERE 1=1';
      const p = [];
      if (series)   { sql += ' AND series=?';  p.push(series); }
      if (material) { sql += ' AND material=?';p.push(material); }
      if (q) { sql += ' AND (core_pn LIKE ? OR core_name LIKE ? OR notes LIKE ?)'; const w='%'+q+'%'; p.push(w,w,w); }
      sql += ' ORDER BY series,core_name,core_pn';
      res.json(query(sql,p));
    } catch(e){res.status(500).json({error:e.message});}
  });
  app.get('/api/mag/cores/:id', (req,res)=>{ const r=queryOne('SELECT * FROM mag_cores WHERE id=?',[Number(req.params.id)]); if(!r) return res.status(404).json({error:'Not found'}); res.json(r); });
  app.post('/api/mag/cores', (req,res)=>{ try { const f=['library','planar','core_pn','material','series','core_name','name1','ae_mm2','ae_min_mm2','le_mm','al_nh','sa_mm2','ve_mm3','default_bobbin','a_mm','apos_mm','aneg_mm','b_mm','c_mm','d_mm','e_mm','f_mm','h_mm','mfr','notes']; run(`INSERT INTO mag_cores (${f.join(',')}) VALUES (${f.map(()=>'?').join(',')})`,f.map(k=>req.body[k]??null)); res.status(201).json(queryOne('SELECT * FROM mag_cores WHERE id=?',[lastId()])); } catch(e){res.status(500).json({error:e.message});} });
  app.put('/api/mag/cores/:id', (req,res)=>{ try { const id=Number(req.params.id); const f=['library','planar','core_pn','material','series','core_name','name1','ae_mm2','ae_min_mm2','le_mm','al_nh','sa_mm2','ve_mm3','default_bobbin','a_mm','apos_mm','aneg_mm','b_mm','c_mm','d_mm','e_mm','f_mm','h_mm','mfr','notes']; run(`UPDATE mag_cores SET ${f.map(k=>k+'=?').join(',')} WHERE id=?`,[...f.map(k=>req.body[k]??null),id]); res.json(queryOne('SELECT * FROM mag_cores WHERE id=?',[id])); } catch(e){res.status(500).json({error:e.message});} });
  app.delete('/api/mag/cores/:id', (req,res)=>{ try { run('DELETE FROM mag_cores WHERE id=?',[Number(req.params.id)]); res.status(204).send(); } catch(e){res.status(500).json({error:e.message});} });

  app.get('/api/mag/bobbins', (req,res)=>{ try { res.json(query('SELECT * FROM mag_bobbins ORDER BY core_name,bobbin_pn')); } catch(e){res.status(500).json({error:e.message});} });
  app.get('/api/mag/bobbins/:id', (req,res)=>{ const r=queryOne('SELECT * FROM mag_bobbins WHERE id=?',[Number(req.params.id)]); if(!r) return res.status(404).json({error:'Not found'}); res.json(r); });
  app.post('/api/mag/bobbins',(req,res)=>{ try { const f=['library','bobbin_pn','core_name','winding_area_mm2','num_slots','creepage_mm','clearance_mm','mfr','notes']; run(`INSERT INTO mag_bobbins (${f.join(',')}) VALUES (${f.map(()=>'?').join(',')})`,f.map(k=>req.body[k]??null)); res.status(201).json(queryOne('SELECT * FROM mag_bobbins WHERE id=?',[lastId()])); } catch(e){res.status(500).json({error:e.message});} });
  app.put('/api/mag/bobbins/:id',(req,res)=>{ try { const id=Number(req.params.id); const f=['library','bobbin_pn','core_name','winding_area_mm2','num_slots','creepage_mm','clearance_mm','mfr','notes']; run(`UPDATE mag_bobbins SET ${f.map(k=>k+'=?').join(',')} WHERE id=?`,[...f.map(k=>req.body[k]??null),id]); res.json(queryOne('SELECT * FROM mag_bobbins WHERE id=?',[id])); } catch(e){res.status(500).json({error:e.message});} });
  app.delete('/api/mag/bobbins/:id',(req,res)=>{ try { run('DELETE FROM mag_bobbins WHERE id=?',[Number(req.params.id)]); res.status(204).send(); } catch(e){res.status(500).json({error:e.message});} });

  app.get('/api/mag/materials', (_,res)=>{ try { res.json(query('SELECT * FROM mag_materials ORDER BY material')); } catch(e){res.status(500).json({error:e.message});} });
  app.post('/api/mag/materials',(req,res)=>{ try { const f=['library','material','bmax_100c','bmax_25c','mu_i','mu_tol','freq_min_khz','freq_max_khz','temp_max_c','mfr','comment']; run(`INSERT INTO mag_materials (${f.join(',')}) VALUES (${f.map(()=>'?').join(',')})`,f.map(k=>req.body[k]??null)); res.status(201).json(queryOne('SELECT * FROM mag_materials WHERE id=?',[lastId()])); } catch(e){res.status(500).json({error:e.message});} });
  app.put('/api/mag/materials/:id',(req,res)=>{ try { const id=Number(req.params.id); const f=['library','material','bmax_100c','bmax_25c','mu_i','mu_tol','freq_min_khz','freq_max_khz','temp_max_c','mfr','comment']; run(`UPDATE mag_materials SET ${f.map(k=>k+'=?').join(',')} WHERE id=?`,[...f.map(k=>req.body[k]??null),id]); res.json(queryOne('SELECT * FROM mag_materials WHERE id=?',[id])); } catch(e){res.status(500).json({error:e.message});} });
  app.delete('/api/mag/materials/:id',(req,res)=>{ try { run('DELETE FROM mag_materials WHERE id=?',[Number(req.params.id)]); res.status(204).send(); } catch(e){res.status(500).json({error:e.message});} });

  app.get('/api/mag/accessories', (req,res)=>{ try { const {for_core}=req.query; let sql='SELECT * FROM mag_accessories WHERE 1=1'; const p=[]; if(for_core){sql+=' AND for_core LIKE ?';p.push('%'+for_core+'%');} sql+=' ORDER BY type,part_number'; res.json(query(sql,p)); } catch(e){res.status(500).json({error:e.message});} });
  app.post('/api/mag/accessories',(req,res)=>{ try { const f=['library','part_number','ordering_code','type','parts_num','for_core','mfr','notes']; run(`INSERT INTO mag_accessories (${f.join(',')}) VALUES (${f.map(()=>'?').join(',')})`,f.map(k=>req.body[k]??null)); res.status(201).json(queryOne('SELECT * FROM mag_accessories WHERE id=?',[lastId()])); } catch(e){res.status(500).json({error:e.message});} });
  app.delete('/api/mag/accessories/:id',(req,res)=>{ try { run('DELETE FROM mag_accessories WHERE id=?',[Number(req.params.id)]); res.status(204).send(); } catch(e){res.status(500).json({error:e.message});} });

  // ── Files ───────────────────────────────────────────────────────────────────
  app.get('/api/files', (_,res) => { try { res.json(query('SELECT * FROM files ORDER BY id DESC')); } catch(e){res.status(500).json({error:e.message});} });
  app.get('/api/files/:id', (req,res) => { const row=queryOne('SELECT * FROM files WHERE id=?',[Number(req.params.id)]); if(!row) return res.status(404).json({error:'Not found'}); res.json(row); });
  app.post('/api/files', upload.single('file'), (req,res) => {
    if(!req.file) return res.status(400).json({error:'No file uploaded'});
    try { run('INSERT INTO files (original_name,stored_name,mime_type,size) VALUES (?,?,?,?)',[req.file.originalname,req.file.filename,req.file.mimetype,req.file.size]); res.status(201).json(queryOne('SELECT * FROM files WHERE id=?',[lastId()])); } catch(e){res.status(500).json({error:e.message});}
  });
  app.post('/api/files/:id/copy', (req,res) => {
    const orig=queryOne('SELECT * FROM files WHERE id=?',[Number(req.params.id)]);
    if(!orig) return res.status(404).json({error:'Not found'});
    try {
      const ext=path.extname(orig.stored_name); const newName=Date.now()+'-'+Math.round(Math.random()*1e6)+ext;
      const src=path.join(UPLOAD_DIR,orig.stored_name); const dest=path.join(UPLOAD_DIR,newName);
      if(!fs.existsSync(src)) return res.status(404).json({error:'Physical file missing'});
      fs.copyFileSync(src,dest);
      run('INSERT INTO files (original_name,stored_name,mime_type,size,notes) VALUES (?,?,?,?,?)',[path.basename(orig.original_name,ext)+' (copy)'+ext,newName,orig.mime_type,fs.statSync(dest).size,orig.notes]);
      res.status(201).json(queryOne('SELECT * FROM files WHERE id=?',[lastId()]));
    } catch(e){res.status(500).json({error:e.message});}
  });
  app.patch('/api/files/:id/notes', (req,res) => {
    const id=Number(req.params.id);
    if(!queryOne('SELECT id FROM files WHERE id=?',[id])) return res.status(404).json({error:'Not found'});
    try { run('UPDATE files SET notes=? WHERE id=?',[req.body.notes??null,id]); res.json(queryOne('SELECT * FROM files WHERE id=?',[id])); } catch(e){res.status(500).json({error:e.message});}
  });
  app.delete('/api/files/:id', (req,res) => {
    const row=queryOne('SELECT * FROM files WHERE id=?',[Number(req.params.id)]);
    if(!row) return res.status(404).json({error:'Not found'});
    try { const fp=path.join(UPLOAD_DIR,row.stored_name); if(fs.existsSync(fp)) fs.unlinkSync(fp); run('DELETE FROM files WHERE id=?',[row.id]); res.status(204).send(); } catch(e){res.status(500).json({error:e.message});}
  });

  // ── Auth ────────────────────────────────────────────────────────────────────
  app.post('/api/auth/register', (req,res) => {
    const {email,name,password}=req.body||{};
    if(!email||!name||!password) return res.status(400).json({error:'email, name and password are required'});
    if(password.length<8) return res.status(400).json({error:'Password must be at least 8 characters'});
    if(queryOne('SELECT id FROM users WHERE email=?',[email.toLowerCase()])) return res.status(409).json({error:'An account with that email already exists'});
    try {
      const salt=crypto.randomBytes(16).toString('hex'); const token=genToken();
      run('INSERT INTO users (email,name,password,salt,token) VALUES (?,?,?,?,?)',[email.toLowerCase(),name.trim(),hashPw(password,salt),salt,token]);
      res.status(201).json({token,user:queryOne('SELECT id,email,name,created_at FROM users WHERE id=?',[lastId()])});
    } catch(e){res.status(500).json({error:e.message});}
  });
  app.post('/api/auth/login', (req,res) => {
    const {email,password}=req.body||{};
    if(!email||!password) return res.status(400).json({error:'email and password are required'});
    const row=queryOne('SELECT * FROM users WHERE email=?',[email.toLowerCase()]);
    if(!row||hashPw(password,row.salt)!==row.password) return res.status(401).json({error:'Invalid email or password'});
    const token=genToken(); run('UPDATE users SET token=? WHERE id=?',[token,row.id]);
    res.json({token,user:{id:row.id,email:row.email,name:row.name,created_at:row.created_at}});
  });
  app.get('/api/auth/me', (req,res) => {
    const token=(req.headers.authorization||'').replace('Bearer ','').trim()||null;
    if(!token) return res.status(401).json({error:'No token'});
    const row=queryOne('SELECT id,email,name,created_at FROM users WHERE token=?',[token]);
    if(!row) return res.status(401).json({error:'Invalid token'});
    res.json({user:row});
  });
  // Update profile
  app.put('/api/auth/me', (req,res) => {
    const auth = req.headers.authorization;
    const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      const { name, email, password } = req.body || {};
      const stmt = db.prepare('UPDATE users SET name=COALESCE(?,name), email=COALESCE(?,email) WHERE id=?');
      stmt.run(name||null, email||null, decoded.id);
      const user = db.prepare('SELECT id,email,name FROM users WHERE id=?').get(decoded.id);
      return res.json({ user });
    } catch(e) { return res.status(400).json({ error: e.message }); }
  });

  app.post('/api/auth/logout', (req,res) => {
    const token=(req.headers.authorization||'').replace('Bearer ','').trim()||null;
    if(token) run('UPDATE users SET token=NULL WHERE token=?',[token]);
    res.json({ok:true});
  });

  app.use((req,res) => res.status(404).json({error:req.method+' '+req.path+' not found'}));
  app.use((err,_req,res,_next) => res.status(500).json({error:err.message}));

  app.listen(PORT, () => {
    console.log('\n FluxForge API  →  http://localhost:'+PORT);
    console.log(' Database      →  '+DB_PATH);
    console.log(' Uploads       →  '+UPLOAD_DIR+'\n');
  });
  const shutdown = () => { save(); db.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => { console.error(err); process.exit(1); });
