/**
 * schematic_generator.js
 * Programmatically generates flyback converter schematics for all IC families.
 * Uses svg-schematic-js for proper electronic component symbols.
 */

import {
  Schematic, Wire,
  Resistor, Capacitor, Inductor, Diode, Ground,
  Box, Pin, Dot, Label,
  shift,
} from './svg_schematic.js';

// ── helpers ───────────────────────────────────────────────────────────────────
function bbox(tile) {
  return { x: tile.center[0] - tile.size[0]/2, y: tile.center[1] - tile.size[1]/2, w: tile.size[0], h: tile.size[1] };
}

function wire(...pts)      { return new Wire(pts); }
function wireH(p1, p2)    { return new Wire([p1, [p2[0], p1[1]]]); }  // force horizontal
function wireV(p1, p2)    { return new Wire([p1, [p1[0], p2[1]]]); }  // force vertical
function dot(C)            { return new Dot({ C }); }
function gnd(t)            { return new Ground({ t }); }

function cv(comps, ref, field) {
  return comps?.[ref]?.[field] ?? null;
}

// Draw inline transformer symbol (two coupled inductors inside a box)
function drawTransformer(sch, cx, cy, boxW, boxH, Np, Ns, Nb, color_p='#0066A6', color_s='#27ae60', color_b='#e67e22') {
  const g = sch.g({});
  const lw = sch.line_width;
  const x0 = cx - boxW/2, y0 = cy - boxH/2;

  // Box outline
  g.add(sch.rect({ insert:[x0,y0], size:[boxW, boxH], fill:'#faf5ff', stroke:'#9b59b6', stroke_width:lw*1.5, rx:4 }));

  // Core bars
  const coreX = cx - 6;
  g.add(sch.line({ start:[coreX, y0+10], end:[coreX, y0+boxH-10], stroke:'#9b59b6', stroke_width:4, stroke_linecap:'round' }));
  g.add(sch.line({ start:[coreX+12, y0+10], end:[coreX+12, y0+boxH-10], stroke:'#9b59b6', stroke_width:4, stroke_linecap:'round' }));

  // Primary winding (left of core)
  const turns_p = Math.min(Np||4, 7);
  const pX = coreX - 18;
  const pY0 = cy - turns_p*11;
  for (let i = 0; i < turns_p; i++) {
    const yc = pY0 + i*22 + 11;
    const arc = sch.path({ fill:'none', stroke:color_p, stroke_width:lw*1.8 });
    arc.push('M', [pX, yc-10]);
    arc.push('A', [10, 10, 0, 0, 1, pX, yc+10]);
    g.add(arc);
  }
  // Primary leads
  g.add(sch.line({ start:[x0, pY0+11], end:[pX, pY0+11], stroke:color_p, stroke_width:lw }));
  g.add(sch.line({ start:[x0, pY0+(turns_p-1)*22+11], end:[pX, pY0+(turns_p-1)*22+11], stroke:color_p, stroke_width:lw }));
  // Polarity dot
  g.add(sch.circle({ center:[x0+6, pY0+7], r:3.5, fill:color_p }));

  // Secondary winding (right of core)
  const turns_s = Math.min(Ns||2, 5);
  const sX = coreX + 12 + 18;
  const sY0 = cy - turns_s*11;
  for (let i = 0; i < turns_s; i++) {
    const yc = sY0 + i*22 + 11;
    const arc = sch.path({ fill:'none', stroke:color_s, stroke_width:lw*1.8 });
    arc.push('M', [sX, yc-10]);
    arc.push('A', [10, 10, 0, 0, 0, sX, yc+10]);
    g.add(arc);
  }
  g.add(sch.line({ start:[x0+boxW, sY0+11], end:[sX, sY0+11], stroke:color_s, stroke_width:lw }));
  g.add(sch.line({ start:[x0+boxW, sY0+(turns_s-1)*22+11], end:[sX, sY0+(turns_s-1)*22+11], stroke:color_s, stroke_width:lw }));
  g.add(sch.circle({ center:[x0+boxW-6, sY0+7], r:3.5, fill:color_s }));

  // Bias winding (only if Nb > 0)
  if ((Nb||0) > 0) {
    const turns_b = Math.min(Nb, 3);
    const bY0 = sY0 + (turns_s)*22 + 8;
    for (let i = 0; i < turns_b; i++) {
      const yc = bY0 + i*18 + 9;
      const arc = sch.path({ fill:'none', stroke:color_b, stroke_width:lw*1.5 });
      arc.push('M', [sX, yc-8]);
      arc.push('A', [8, 8, 0, 0, 0, sX, yc+8]);
      g.add(arc);
    }
    g.add(sch.line({ start:[x0+boxW, bY0+9], end:[sX, bY0+9], stroke:color_b, stroke_width:lw }));
    g.add(sch.line({ start:[x0+boxW, bY0+(turns_b-1)*18+9], end:[sX, bY0+(turns_b-1)*18+9], stroke:color_b, stroke_width:lw }));
  }

  // Label
  g.add(sch.text('T1', { insert:[x0+7, y0+15], font_family:'Arial,sans-serif', font_size:11, font_weight:'700', fill:'#7c3aed' }));

  // Pin labels
  const fs = 8.5;
  g.add(sch.text(`Np=${Np||'?'}T`, { insert:[x0+4, y0+boxH-8], font_family:'Arial,sans-serif', font_size:fs, fill:color_p }));
  g.add(sch.text(`Ns=${Ns||'?'}T`, { insert:[cx+8,  y0+boxH-8], font_family:'Arial,sans-serif', font_size:fs, fill:color_s }));
  if ((Nb||0) > 0) {
    g.add(sch.text(`Nb=${Nb}T`, { insert:[cx+8, y0+boxH-20], font_family:'Arial,sans-serif', font_size:fs, fill:color_b }));
  }

  sch.add(g);
  sch._update_bounds(x0, y0, x0+boxW, y0+boxH);

  // Return lead attachment points
  return {
    prim_top: [x0, cy - (turns_p-1)*11],
    prim_bot: [x0, cy + (turns_p-1)*11],
    sec_top:  [x0+boxW, cy - (turns_s-1)*11],
    sec_bot:  [x0+boxW, cy + (turns_s-1)*11],
  };
}

// Draw IC box with left/right pin labels
function drawIC(sch, cx, cy, bw, bh, ref, label, leftPins, rightPins, bg='#e8f5ff', border='#0D7377') {
  const g = sch.g({});
  const lw = sch.line_width;
  const x0=cx-bw/2, y0=cy-bh/2;
  const pinSpacing = bh / (Math.max(leftPins.length, rightPins.length) + 1);
  const fs = 8.5;
  const pinLen = 20;

  g.add(sch.rect({ insert:[x0,y0], size:[bw,bh], fill:bg, stroke:border, stroke_width:lw*1.5, rx:4 }));
  g.add(sch.text(ref,   { insert:[cx, y0+13], font_family:'Arial,sans-serif', font_size:10, font_weight:'700', fill:border, text_anchor:'middle' }));
  g.add(sch.text(label, { insert:[cx, y0+24], font_family:'Arial,sans-serif', font_size:8,  fill:'#555', text_anchor:'middle' }));

  const leftPts = {}, rightPts = {};
  leftPins.forEach((name, i) => {
    const py = y0 + pinSpacing*(i+1);
    g.add(sch.line({ start:[x0-pinLen, py], end:[x0, py], stroke:'#555', stroke_width:lw }));
    g.add(sch.text(name, { insert:[x0+4, py+fs*0.35], font_family:'Arial,sans-serif', font_size:fs, fill:'#333' }));
    leftPts[name] = [x0-pinLen, py];
  });
  rightPins.forEach((name, i) => {
    const py = y0 + pinSpacing*(i+1);
    g.add(sch.line({ start:[x0+bw, py], end:[x0+bw+pinLen, py], stroke:'#555', stroke_width:lw }));
    g.add(sch.text(name, { insert:[x0+bw-4, py+fs*0.35], font_family:'Arial,sans-serif', font_size:fs, fill:'#333', text_anchor:'end' }));
    rightPts[name] = [x0+bw+pinLen, py];
  });

  sch.add(g);
  sch._update_bounds(x0-pinLen, y0, x0+bw+pinLen, y0+bh);
  return { center:[cx,cy], size:[bw+2*pinLen,bh], x0, y0, bw, bh, pins: { ...leftPts, ...rightPts } };
}

// ── Main generator ────────────────────────────────────────────────────────────
export function generateSchematic(type, uds) {
  const comps   = uds?.components ?? {};
  const result  = uds?.result     ?? {};
  const meta    = uds?.meta       ?? {};
  const hitBoxes = {};

  // Choose topology renderer
  if (type === 'ifc')  return _genIFC(uds, comps, result, meta, hitBoxes);
  if (type === 'lpfc1' || type === 'lpfc2') return _genLPFC(uds, comps, result, meta, hitBoxes, type);
  if (type.startsWith('psc')) return _genPSC(uds, comps, result, meta, hitBoxes, type);
  return _genHPFC(uds, comps, result, meta, hitBoxes);  // default HPFC
}

// ── HPFC — High-Power Flyback Controller ──────────────────────────────────────
function _genHPFC(uds, comps, result, meta, hitBoxes) {
  const sch = new Schematic('hpfc.svg', { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  // ── Layout constants ──
  const Y_TOP = 120;   // HV+ rail
  const Y_RTN = 580;   // RTN/GND rail
  const Y_MID = 350;   // center of most components
  const Y_OUT = 185;   // secondary output rail

  // ── AC Input ──
  const xAC = 60;
  sch.add(sch.circle({ center:[xAC, Y_MID-90], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[xAC, Y_MID+90], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265', { insert:[xAC-28, Y_MID-84], font_family:'Arial,sans-serif', font_size:8.5, fill:'#444' }));
  sch.add(sch.text('VAC',    { insert:[xAC-22, Y_MID-72], font_family:'Arial,sans-serif', font_size:8.5, fill:'#444' }));
  sch._update_bounds(xAC-30, Y_MID-120, xAC+10, Y_MID+140);

  // ── F1 Fuse ──
  const f1 = new Box({ orient:'h', C:[180, Y_TOP], name:'F1', value: cv(comps,'F1','value')||'1.25A', w:1.2, h:0.6,
    background:'#fffbf0', border:'#888' });
  hitBoxes['F1'] = bbox(f1);

  // ── RT1 NTC ──
  const rt1 = new Resistor({ orient:'h', n: shift(f1.p, 20, 0), name:'RT1', value: cv(comps,'RT1','value')||'8Ω NTC' });
  hitBoxes['RT1'] = bbox(rt1);

  // ── L1 EMI Choke ──
  const l1 = new Inductor({ orient:'h', n: shift(rt1.p, 20, 0), name:'L1', value: cv(comps,'L1','value')||'6mH' });
  hitBoxes['L1'] = bbox(l1);

  // ── BR1 Bridge Rectifier ──
  const brCX = l1.p[0] + 90;
  const br1_box = drawIC(sch, brCX, Y_MID, 70, 200, 'BR1', cv(comps,'BR1','part')||'DF1506S',
    ['AC1','−'], ['AC2','+'], '#f5f8ff', '#888');
  hitBoxes['BR1'] = { x: br1_box.x0, y: br1_box.y0, w: br1_box.bw, h: br1_box.bh };

  // Wire: top rail → F1 → RT1 → L1 → BR1 AC1
  wire([xAC, Y_MID-90], [xAC, Y_TOP]);
  wire([xAC, Y_TOP], [f1.n[0], Y_TOP]);
  // f1 is at Y_TOP already, connect n→f1 left and f1 right → rt1
  wire([rt1.p[0], Y_TOP], [br1_box.pins['AC1'][0], Y_TOP]);
  wire(br1_box.pins['AC1'], [br1_box.pins['AC1'][0], Y_TOP]);

  // Bottom AC rail
  wire([xAC, Y_MID+90], [xAC, Y_RTN]);
  const brAC2x = br1_box.pins['AC2'][0];
  wire([xAC, Y_RTN], [brAC2x, Y_RTN]);
  wire(br1_box.pins['AC2'], [brAC2x, Y_RTN]);

  // BR1 DC+ ('+') → HV+ rail
  const brDCplus = br1_box.pins['+'];
  wire(brDCplus, [brDCplus[0], Y_TOP]);
  dot([brDCplus[0], Y_TOP]);

  // BR1 DC- ('−') → RTN rail
  const brDCminus = br1_box.pins['−'];
  wire(brDCminus, [brDCminus[0], Y_RTN]);
  dot([brDCminus[0], Y_RTN]);

  const xBulk = brDCplus[0] + 70;

  // ── C2 Bulk Cap (vertical) ──
  const c2 = new Capacitor({ orient:'v', C:[xBulk, Y_MID], name:'C2',
    value:(cv(comps,'C2','value')||'150µF') + '\n' + (cv(comps,'C2','voltage')||'400V') });
  hitBoxes['C2'] = bbox(c2);
  wire([xBulk, Y_TOP], c2.p);
  wire(c2.n, [xBulk, Y_RTN]);
  dot([xBulk, Y_TOP]);
  dot([xBulk, Y_RTN]);

  // ── Transformer ──
  const xT1 = xBulk + 160;
  const t1H = 260, t1W = 130;
  const t1Leads = drawTransformer(sch, xT1, Y_MID, t1W, t1H,
    result.Np, result.Ns, result.Nb);
  hitBoxes['T1'] = { x: xT1-t1W/2, y: Y_MID-t1H/2, w: t1W, h: t1H };

  // HV+ → T1 primary top
  wire([xBulk, Y_TOP], [xT1-t1W/2, Y_TOP]);
  wire([xT1-t1W/2, Y_TOP], t1Leads.prim_top);

  // ── VR1 Clamp (TVS) ──
  const vr1_x = xT1 - t1W/2 - 50;
  const vr1 = new Diode({ orient:'v', C:[vr1_x, Y_MID-60], name:'VR1',
    value: cv(comps,'VR1','voltage')||'160V', color:'#c0392b' });
  hitBoxes['VR1'] = bbox(vr1);

  // ── RCD Clamp: D2, R10, C_clamp ──
  const xClamp = vr1_x - 60;
  const d2 = new Diode({ orient:'v', C:[xClamp, Y_MID-90], name:'D2', color:'#e67e22' });
  hitBoxes['D2'] = bbox(d2);
  const c3 = new Capacitor({ orient:'v', C:[xClamp, Y_MID+30], name:'C3',
    value: cv(comps,'C3','value')||'3.9nF' });
  hitBoxes['C3'] = bbox(c3);
  const r10 = new Resistor({ orient:'v', C:[xClamp, Y_MID+140], name:'R10',
    value: cv(comps,'R10','value')||'100kΩ' });

  // Snubber rail
  const xSnub = xT1 - t1W/2;
  wire([xSnub, Y_TOP], [xClamp, Y_TOP]);
  wire([xClamp, Y_TOP], d2.a);
  wire(d2.c, c3.p);
  wire(c3.n, r10.p);
  wire(r10.n, [xClamp, Y_RTN]);

  // ── U1 Controller IC ──
  const xU1 = xT1 + 30;
  const u1Family = meta.family || 'HPFC-1';
  const u1Part   = cv(comps,'U1','part') || u1Family;
  const u1 = drawIC(sch, xU1, Y_MID+160, 110, 140, 'U1', u1Part,
    ['D','V','F'], ['S','X','FB'], '#e8f5ff', '#0D7377');
  hitBoxes['U1'] = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  // T1 primary bot → U1 D pin
  const u1_D = u1.pins['D'];
  wire(t1Leads.prim_bot, [xT1-t1W/2, t1Leads.prim_bot[1]]);
  wire([xT1-t1W/2, t1Leads.prim_bot[1]], [u1_D[0], t1Leads.prim_bot[1]]);
  wire([u1_D[0], t1Leads.prim_bot[1]], u1_D);

  // U1 S → R9 (current sense) → RTN
  const u1_S = u1.pins['S'];
  const xCS = u1_S[0] + 50;
  const r9 = new Resistor({ orient:'v', C:[xCS, Y_RTN-40], name:'R9',
    value: cv(comps,'R9','value')||'0.5Ω' });
  wire(u1_S, [xCS, u1_S[1]]);
  wire([xCS, u1_S[1]], r9.p);
  wire(r9.n, [xCS, Y_RTN]);
  dot([xCS, Y_RTN]);
  gnd([xCS, Y_RTN]);

  // ── Secondary side ──
  const xSec = xT1 + t1W/2;
  const xD3  = xSec + 70;

  // D3 Output diode
  const d3 = new Diode({ orient:'h', C:[xD3, Y_OUT], name:'D3',
    value: cv(comps,'D3','value')||'Schottky', color:'#27ae60' });
  hitBoxes['D3'] = bbox(d3);
  wire(t1Leads.sec_top, [xSec, Y_OUT]);
  wire([xSec, Y_OUT], d3.a);

  // C_out output capacitor
  const xCout = d3.c[0] + 80;
  const c_out = new Capacitor({ orient:'v', C:[xCout, Y_OUT + 70], name:'Co',
    value: cv(comps,'Co','value')||'100µF' });
  hitBoxes['Co'] = bbox(c_out);
  wire(d3.c, [xCout, Y_OUT]);
  wire([xCout, Y_OUT], c_out.p);

  // Secondary RTN
  const xSecRTN = xSec;
  wire(t1Leads.sec_bot, [xSecRTN, Y_OUT+140]);
  wire([xSecRTN, Y_OUT+140], [xCout, Y_OUT+140]);
  wire(c_out.n, [xCout, Y_OUT+140]);
  gnd([xCout, Y_OUT+140]);

  // ── Vout pin ──
  const xVout = xCout + 60;
  new Pin({ kind:'out', t:[xVout, Y_OUT], name:'Vout' });
  wire([xCout, Y_OUT], [xVout-8, Y_OUT]);
  dot([xCout, Y_OUT]);

  // ── Feedback: R11 / R12 / U2 opto / U3 TL431 ──
  const xFB = xVout + 80;

  // Voltage divider R11 (top) + R12 (bottom)
  const r11 = new Resistor({ orient:'v', C:[xFB, Y_OUT + 60], name:'R11',
    value: cv(comps,'R11','value')||'6.19kΩ' });
  hitBoxes['R11'] = bbox(r11);
  const r12 = new Resistor({ orient:'v', C:[xFB, r11.n[1] + 60], name:'R12',
    value: cv(comps,'R12','value')||'698Ω' });
  hitBoxes['R12'] = bbox(r12);
  wire([xFB, Y_OUT], r11.p);
  wire(r11.n, r12.p);
  wire(r12.n, [xFB, r12.n[1]+30]);
  gnd([xFB, r12.n[1]+30]);

  // U3 TL431 shunt ref
  const xU3 = xFB + 100;
  const u3 = drawIC(sch, xU3, r11.n[1]+10, 70, 80, 'U3',
    cv(comps,'U3','part')||'TL431', ['A'], ['K','R'], '#fff8ee', '#d97706');
  hitBoxes['U3'] = { x: u3.x0, y: u3.y0, w: u3.bw, h: u3.bh };
  wire([xFB, r11.n[1]], [u3.pins['R'][0], r11.n[1]]);  // R pin ← divider midpoint
  wire(u3.pins['K'], [u3.pins['K'][0], Y_OUT]);          // K → Vout rail
  wire([u3.pins['K'][0], Y_OUT], [xFB, Y_OUT]);
  dot([xFB, Y_OUT]);
  wire(u3.pins['A'], [u3.pins['A'][0], u3.pins['A'][1]+30]);
  gnd([u3.pins['A'][0], u3.pins['A'][1]+30]);

  // U2 Optocoupler
  const xU2 = xFB + 100;
  const u2 = drawIC(sch, xU2, Y_OUT-60, 70, 80, 'U2',
    cv(comps,'U2A','part')||'LTV-817', ['A','K'], ['C','E'], '#f0f4ff', '#5b6ab0');
  hitBoxes['U2A'] = { x: u2.x0, y: u2.y0, w: u2.bw, h: u2.bh };

  // R13 drive resistor for opto LED
  const r13 = new Resistor({ orient:'h', C:[xFB+50, u3.pins['K'][1]-30], name:'R13',
    value: cv(comps,'R13','value')||'1kΩ' });
  hitBoxes['R13'] = bbox(r13);

  // U1 FB pin ← U2 collector
  const u1_FB = u1.pins['FB'];
  if (u1_FB) {
    wire(u2.pins['C'], [u2.pins['C'][0], u1_FB[1]]);
    wire([u2.pins['C'][0], u1_FB[1]], u1_FB);
  }

  // U1 X pin → RTN
  const u1_X = u1.pins['X'];
  if (u1_X) {
    wire(u1_X, [u1_X[0]+30, u1_X[1]]);
    gnd([u1_X[0]+30, u1_X[1]]);
  }

  // ── Title block ──
  _titleBlock(sch, meta, 'HPFC Flyback Converter');

  const svgStr = sch.close();
  return { svg: svgStr, hitBoxes, viewBox: sch._viewbox };
}

// ── IFC — Integrated Flyback Controller ───────────────────────────────────────
function _genIFC(uds, comps, result, meta, hitBoxes) {
  const sch = new Schematic('ifc.svg', { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  const Y_TOP = 120, Y_RTN = 540, Y_MID = 330, Y_OUT = 175;

  // AC Input
  sch.add(sch.circle({ center:[60, Y_MID-80], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[60, Y_MID+80], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265VAC', { insert:[20, Y_MID-64], font_family:'Arial,sans-serif', font_size:8, fill:'#444' }));
  sch._update_bounds(20, Y_MID-100, 70, Y_MID+100);

  // F1 Fuse
  const f1 = new Box({ orient:'h', C:[165, Y_TOP], name:'F1', value: cv(comps,'F1','value')||'1A', w:1.1, h:0.55, background:'#fffbf0', border:'#888' });
  hitBoxes['F1'] = bbox(f1);

  // L1 EMI
  const l1 = new Inductor({ orient:'h', n: shift(f1.p, 20, 0), name:'L1', value: cv(comps,'L1','value')||'4mH' });
  hitBoxes['L1'] = bbox(l1);

  // BR1
  const brCX = l1.p[0] + 80;
  const br1_box = drawIC(sch, brCX, Y_MID, 60, 180, 'BR1', cv(comps,'BR1','part')||'DF1506',
    ['AC1','−'], ['AC2','+'], '#f5f8ff', '#888');
  hitBoxes['BR1'] = { x: br1_box.x0, y: br1_box.y0, w: br1_box.bw, h: br1_box.bh };

  wire([60, Y_MID-80], [60, Y_TOP]);
  wire([60, Y_TOP], [f1.n[0], Y_TOP]);
  wire([l1.p[0], Y_TOP], [br1_box.pins['AC1'][0], Y_TOP]);
  wire(br1_box.pins['AC1'], [br1_box.pins['AC1'][0], Y_TOP]);
  wire([60, Y_MID+80], [60, Y_RTN]);
  wire([60, Y_RTN], [br1_box.pins['AC2'][0], Y_RTN]);
  wire(br1_box.pins['AC2'], [br1_box.pins['AC2'][0], Y_RTN]);

  const brPlus = br1_box.pins['+'];
  wire(brPlus, [brPlus[0], Y_TOP]);
  dot([brPlus[0], Y_TOP]);
  const brMinus = br1_box.pins['−'];
  wire(brMinus, [brMinus[0], Y_RTN]);
  dot([brMinus[0], Y_RTN]);

  const xBulk = brPlus[0] + 65;
  const c2 = new Capacitor({ orient:'v', C:[xBulk, Y_MID], name:'C1', value: cv(comps,'C2','value')||'100µF/400V' });
  hitBoxes['C2'] = bbox(c2);
  wire([xBulk, Y_TOP], c2.p); wire(c2.n, [xBulk, Y_RTN]);
  dot([xBulk, Y_TOP]); dot([xBulk, Y_RTN]);

  // IFC IC (U1) — primary+secondary integrated
  const xU1 = xBulk + 200;
  const u1 = drawIC(sch, xU1, Y_MID, 120, 200, 'U1',
    cv(comps,'U1','part')||'IFC-CE',
    ['D','V','BP/M','−−−','SR','FB','S'],
    [], '#e8f9f0', '#27ae60');
  hitBoxes['U1'] = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  // Transformer (inside the IC package, show simplified)
  const xT1 = xU1 - 40;
  const t1 = drawTransformer(sch, xT1, Y_MID-50, 100, 180,
    result.Np, result.Ns, result.Nb);
  hitBoxes['T1'] = { x: xT1-50, y: Y_MID-50-90, w: 100, h: 180 };

  // HV+ → T1 primary
  wire([xBulk, Y_TOP], [xT1-50, Y_TOP]);
  wire([xT1-50, Y_TOP], t1.prim_top);
  wire(t1.prim_bot, u1.pins['D'] || [u1.x0, Y_MID]);

  // Secondary: T1 sec → output
  const xD3 = xU1 + u1.bw/2 + 100;
  const d3 = new Diode({ orient:'h', C:[xD3, Y_OUT], name:'D3', color:'#27ae60',
    value: cv(comps,'D3','value')||'Schottky' });
  hitBoxes['D3'] = bbox(d3);

  wire(t1.sec_top, [xT1+50, Y_OUT]);
  wire([xT1+50, Y_OUT], d3.a);

  const xCout = d3.c[0] + 80;
  const c_out = new Capacitor({ orient:'v', C:[xCout, Y_OUT+60], name:'Co', value: cv(comps,'Co','value')||'47µF' });
  hitBoxes['Co'] = bbox(c_out);
  wire(d3.c, [xCout, Y_OUT]); wire([xCout, Y_OUT], c_out.p);
  wire(c_out.n, [xCout, Y_OUT+120]); gnd([xCout, Y_OUT+120]);

  new Pin({ kind:'out', t:[xCout+60, Y_OUT], name:'Vout' });
  wire([xCout, Y_OUT], [xCout+52, Y_OUT]); dot([xCout, Y_OUT]);

  // RTN
  wire([xBulk, Y_RTN], [u1.x0, Y_RTN]);
  gnd([u1.x0, Y_RTN]);
  wire(t1.sec_bot, [xT1+50, Y_OUT+120]);
  wire([xT1+50, Y_OUT+120], [xCout, Y_OUT+120]);

  _titleBlock(sch, meta, 'IFC Integrated Flyback');
  const svgStr = sch.close();
  return { svg: svgStr, hitBoxes, viewBox: sch._viewbox };
}

// ── LPFC — Low-Power Flyback Controller ───────────────────────────────────────
function _genLPFC(uds, comps, result, meta, hitBoxes, type) {
  const sch = new Schematic('lpfc.svg', { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  const Y_TOP = 100, Y_RTN = 500, Y_MID = 300, Y_OUT = 160;
  const labelType = type === 'lpfc2' ? 'LPFC-2 (Ultra-low power)' : 'LPFC-1 Low-Power Flyback';

  // AC & F1
  sch.add(sch.circle({ center:[60, Y_MID-80], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[60, Y_MID+80], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265VAC', { insert:[18, Y_MID-68], font_family:'Arial,sans-serif', font_size:8, fill:'#444' }));
  sch._update_bounds(15, Y_MID-110, 70, Y_MID+110);

  const f1 = new Box({ orient:'h', C:[160, Y_TOP], name:'F1', value: cv(comps,'F1','value')||'0.5A', w:1, h:0.55, background:'#fffbf0', border:'#888' });
  hitBoxes['F1'] = bbox(f1);

  const br1_box = drawIC(sch, f1.p[0]+100, Y_MID, 60, 170, 'BR1', cv(comps,'BR1','part')||'MB6S',
    ['AC1','−'], ['AC2','+'], '#f5f8ff', '#888');
  hitBoxes['BR1'] = { x: br1_box.x0, y: br1_box.y0, w: br1_box.bw, h: br1_box.bh };

  wire([60, Y_MID-80], [60, Y_TOP]); wire([60, Y_TOP], [f1.n[0], Y_TOP]);
  wire([f1.p[0], Y_TOP], [br1_box.pins['AC1'][0], Y_TOP]);
  wire(br1_box.pins['AC1'], [br1_box.pins['AC1'][0], Y_TOP]);
  wire([60, Y_MID+80], [60, Y_RTN]);
  wire([60, Y_RTN], [br1_box.pins['AC2'][0], Y_RTN]);
  wire(br1_box.pins['AC2'], [br1_box.pins['AC2'][0], Y_RTN]);

  const brPlus = br1_box.pins['+'];
  wire(brPlus, [brPlus[0], Y_TOP]); dot([brPlus[0], Y_TOP]);
  const brMinus = br1_box.pins['−'];
  wire(brMinus, [brMinus[0], Y_RTN]); dot([brMinus[0], Y_RTN]);

  const xBulk = brPlus[0] + 60;
  const c2 = new Capacitor({ orient:'v', C:[xBulk, Y_MID], name:'C2', value: cv(comps,'C2','value')||'10µF/400V' });
  hitBoxes['C2'] = bbox(c2);
  wire([xBulk, Y_TOP], c2.p); wire(c2.n, [xBulk, Y_RTN]);
  dot([xBulk, Y_TOP]); dot([xBulk, Y_RTN]);

  // T1 Transformer
  const xT1 = xBulk + 130;
  const t1 = drawTransformer(sch, xT1, Y_MID, 100, 200, result.Np, result.Ns, result.Nb);
  hitBoxes['T1'] = { x: xT1-50, y: Y_MID-100, w: 100, h: 200 };

  wire([xBulk, Y_TOP], [xT1-50, Y_TOP]); wire([xT1-50, Y_TOP], t1.prim_top);

  // U1 LPFC IC
  const xU1 = xT1 + 20;
  const pinName = type === 'lpfc2' ? 'LPFC-2' : 'LPFC-1';
  const u1 = drawIC(sch, xU1, Y_MID+150, 90, 110, 'U1',
    cv(comps,'U1','part')||pinName, ['D','EN/UV'], ['S','BYP'], '#fff8ee', '#d97706');
  hitBoxes['U1'] = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  wire(t1.prim_bot, [xT1-50, t1.prim_bot[1]]);
  wire([xT1-50, t1.prim_bot[1]], u1.pins['D']);

  wire(u1.pins['S'], [u1.pins['S'][0]+40, u1.pins['S'][1]]);
  gnd([u1.pins['S'][0]+40, u1.pins['S'][1]]);

  // Output side
  const xD3 = xT1 + 50 + 70;
  const d3 = new Diode({ orient:'h', C:[xD3, Y_OUT], name:'D3', color:'#27ae60',
    value: cv(comps,'D3','value')||'Schottky' });
  hitBoxes['D3'] = bbox(d3);
  wire(t1.sec_top, [xT1+50, Y_OUT]); wire([xT1+50, Y_OUT], d3.a);

  const xCout = d3.c[0] + 80;
  const c_out = new Capacitor({ orient:'v', C:[xCout, Y_OUT+60], name:'Co', value: cv(comps,'Co','value')||'47µF' });
  hitBoxes['Co'] = bbox(c_out);
  wire(d3.c, [xCout, Y_OUT]); wire([xCout, Y_OUT], c_out.p);
  wire(c_out.n, [xCout, Y_OUT+120]); gnd([xCout, Y_OUT+120]);

  new Pin({ kind:'out', t:[xCout+60, Y_OUT], name:'Vout' });
  wire([xCout, Y_OUT], [xCout+52, Y_OUT]); dot([xCout, Y_OUT]);

  wire([xBulk, Y_RTN], [u1.x0, Y_RTN]);
  gnd([u1.x0, Y_RTN]);

  // EN/UV pin - connect to HV divider R7/R8
  const u1_EN = u1.pins['EN/UV'];
  if (u1_EN) {
    const r7 = new Resistor({ orient:'v', C:[u1_EN[0]-60, u1_EN[1]-50], name:'R7', value: cv(comps,'R7','value')||'2MΩ' });
    const r8 = new Resistor({ orient:'v', C:[u1_EN[0]-60, u1_EN[1]+50], name:'R8', value: cv(comps,'R8','value')||'100kΩ' });
    hitBoxes['R7'] = bbox(r7); hitBoxes['R8'] = bbox(r8);
    wire([u1_EN[0]-60, Y_TOP], r7.p);
    wire(r7.n, r8.p); wire(r8.n, [u1_EN[0]-60, Y_RTN]);
    wire(r7.n, u1_EN); dot(r7.n);
  }

  _titleBlock(sch, meta, labelType);
  const svgStr = sch.close();
  return { svg: svgStr, hitBoxes, viewBox: sch._viewbox };
}

// ── PSC — Primary-Side Controller ─────────────────────────────────────────────
function _genPSC(uds, comps, result, meta, hitBoxes, type) {
  const sch = new Schematic('psc.svg', { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  const Y_TOP = 100, Y_RTN = 520, Y_MID = 310, Y_OUT = 165;
  const isBuck = type === 'psctn';
  const topLabel = isBuck ? 'PSC-TN Buck/Flyback (no optocoupler)' : 'PSC-XT Isolated Flyback';

  sch.add(sch.circle({ center:[60, Y_MID-80], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[60, Y_MID+80], r:4, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265VAC', { insert:[18, Y_MID-68], font_family:'Arial,sans-serif', font_size:8, fill:'#444' }));
  sch._update_bounds(15, Y_MID-110, 70, Y_MID+110);

  const f1 = new Box({ orient:'h', C:[155, Y_TOP], name:'F1', value: cv(comps,'F1','value')||'0.3A', w:1, h:0.55, background:'#fffbf0', border:'#888' });
  hitBoxes['F1'] = bbox(f1);

  const br1_box = drawIC(sch, f1.p[0]+90, Y_MID, 60, 165, 'BR1', 'MB2S',
    ['AC1','−'], ['AC2','+'], '#f5f8ff', '#888');
  hitBoxes['BR1'] = { x: br1_box.x0, y: br1_box.y0, w: br1_box.bw, h: br1_box.bh };

  wire([60, Y_MID-80], [60, Y_TOP]); wire([60, Y_TOP], [f1.n[0], Y_TOP]);
  wire([f1.p[0], Y_TOP], [br1_box.pins['AC1'][0], Y_TOP]);
  wire(br1_box.pins['AC1'], [br1_box.pins['AC1'][0], Y_TOP]);
  wire([60, Y_MID+80], [60, Y_RTN]);
  wire([60, Y_RTN], [br1_box.pins['AC2'][0], Y_RTN]);
  wire(br1_box.pins['AC2'], [br1_box.pins['AC2'][0], Y_RTN]);

  const brPlus = br1_box.pins['+'];
  wire(brPlus, [brPlus[0], Y_TOP]); dot([brPlus[0], Y_TOP]);
  const brMinus = br1_box.pins['−'];
  wire(brMinus, [brMinus[0], Y_RTN]); dot([brMinus[0], Y_RTN]);

  const xBulk = brPlus[0] + 60;
  const c2 = new Capacitor({ orient:'v', C:[xBulk, Y_MID], name:'C2', value: cv(comps,'C2','value')||'4.7µF/400V' });
  hitBoxes['C2'] = bbox(c2);
  wire([xBulk, Y_TOP], c2.p); wire(c2.n, [xBulk, Y_RTN]);
  dot([xBulk, Y_TOP]); dot([xBulk, Y_RTN]);

  // T1 (or L1 for buck)
  const xT1 = xBulk + 110;
  const t1 = drawTransformer(sch, xT1, Y_MID-30, 100, 190, result.Np||3, result.Ns||2, 0);
  hitBoxes['T1'] = { x: xT1-50, y: Y_MID-30-95, w: 100, h: 190 };

  wire([xBulk, Y_TOP], [xT1-50, Y_TOP]); wire([xT1-50, Y_TOP], t1.prim_top);

  // U1 PSC IC
  const xU1 = xT1 + 30;
  const pscPins = type === 'psctn'
    ? { left:['D'], right:['S','BP'] }
    : type === 'pscxt'
    ? { left:['D','EN/UV'], right:['S','BP'] }
    : { left:['D','V'], right:['S','X'] };

  const u1 = drawIC(sch, xU1, Y_MID+150, 90, 100, 'U1',
    cv(comps,'U1','part')||type.toUpperCase(), pscPins.left, pscPins.right, '#ede9fe', '#7c3aed');
  hitBoxes['U1'] = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  wire(t1.prim_bot, [xT1-50, t1.prim_bot[1]]);
  wire([xT1-50, t1.prim_bot[1]], u1.pins['D']);
  wire(u1.pins['S'], [u1.pins['S'][0]+40, u1.pins['S'][1]]); gnd([u1.pins['S'][0]+40, u1.pins['S'][1]]);

  // BP bypass
  const u1_BP = u1.pins['BP'];
  if (u1_BP) {
    const cbp = new Capacitor({ orient:'v', C:[u1_BP[0]+50, u1_BP[1]], name:'Cbp', value:'10µF' });
    wire(u1_BP, cbp.p); wire(cbp.n, [u1_BP[0]+50, u1_BP[1]+60]); gnd([u1_BP[0]+50, u1_BP[1]+60]);
  }

  // Output (secondary side — PSC uses primary-side sensing, no opto needed)
  const xD3 = xT1 + 50 + 70;
  const d3 = new Diode({ orient:'h', C:[xD3, Y_OUT], name:'D3', color:'#27ae60',
    value: cv(comps,'D3','value')||'Schottky' });
  hitBoxes['D3'] = bbox(d3);
  wire(t1.sec_top, [xT1+50, Y_OUT]); wire([xT1+50, Y_OUT], d3.a);

  const xCout = d3.c[0] + 80;
  const c_out = new Capacitor({ orient:'v', C:[xCout, Y_OUT+55], name:'Co', value:'22µF' });
  hitBoxes['Co'] = bbox(c_out);
  wire(d3.c, [xCout, Y_OUT]); wire([xCout, Y_OUT], c_out.p);
  wire(c_out.n, [xCout, Y_OUT+110]); gnd([xCout, Y_OUT+110]);

  new Pin({ kind:'out', t:[xCout+60, Y_OUT], name:'Vout' });
  wire([xCout, Y_OUT], [xCout+52, Y_OUT]); dot([xCout, Y_OUT]);

  wire([xBulk, Y_RTN], [u1.x0, Y_RTN]); gnd([u1.x0, Y_RTN]);
  wire(t1.sec_bot, [xT1+50, Y_OUT+110]); wire([xT1+50, Y_OUT+110], [xCout, Y_OUT+110]);

  // PSC note (primary-side sensing — no opto)
  if (isBuck) {
    const noteX = xCout + 20, noteY = Y_OUT + 140;
    sch.add(sch.text('Primary-side sensing', { insert:[noteX, noteY], font_family:'Arial,sans-serif', font_size:9, fill:'#7c3aed', font_style:'italic' }));
    sch.add(sch.text('No optocoupler required', { insert:[noteX, noteY+13], font_family:'Arial,sans-serif', font_size:9, fill:'#7c3aed', font_style:'italic' }));
    sch._update_bounds(noteX, noteY, noteX+160, noteY+20);
  }

  _titleBlock(sch, meta, topLabel);
  const svgStr = sch.close();
  return { svg: svgStr, hitBoxes, viewBox: sch._viewbox };
}

// ── Title block (shared) ──────────────────────────────────────────────────────
function _titleBlock(sch, meta, topologyLabel) {
  const lw = sch.line_width;
  const minX = sch._min_x - 10, maxY = sch._max_y + 10;
  const tbX = minX + 20, tbY = maxY + 20;
  const tbW = 340, tbH = 60;

  const g = sch.g({});
  g.add(sch.rect({ insert:[tbX, tbY], size:[tbW, tbH], fill:'#f8f9fb', stroke:'#ccc', stroke_width:lw, rx:3 }));
  g.add(sch.text(meta.fileName ? meta.fileName + '.uds' : 'Untitled Design',
    { insert:[tbX+8, tbY+16], font_family:'Arial,sans-serif', font_size:10, font_weight:'700', fill:'#0D7377' }));
  g.add(sch.text(`Topology: ${meta.topology||'—'}  |  Family: ${meta.family||'—'}`,
    { insert:[tbX+8, tbY+30], font_family:'Arial,sans-serif', font_size:8.5, fill:'#555' }));
  g.add(sch.text(`Input: ${meta.inputSpec||'—'}  |  Power: ${(meta.totalPower||0).toFixed(1)}W`,
    { insert:[tbX+8, tbY+44], font_family:'Arial,sans-serif', font_size:8.5, fill:'#555' }));
  g.add(sch.text(topologyLabel,
    { insert:[tbX+8, tbY+56], font_family:'Arial,sans-serif', font_size:7.5, fill:'#999', font_style:'italic' }));
  sch.add(g);
  sch._update_bounds(tbX, tbY, tbX+tbW, tbY+tbH);
}
