/**
 * schematic_generator.js
 * Generates flyback converter schematics using svg-schematic-js.
 * Each topology function returns { svg, hitBoxes, viewBox }.
 */

import {
  Schematic, Wire,
  Resistor, Capacitor, Inductor, Diode, Ground,
  Box, Pin, Dot,
  shift,
} from './svg_schematic.js';

// ── helpers ───────────────────────────────────────────────────────────────────
function bbox(tile) {
  const [w, h] = tile.size, [cx, cy] = tile.center;
  return { x: cx - w/2, y: cy - h/2, w, h };
}

// Wire through a list of points (polyline)
function wire(...pts) { return new Wire(pts); }

// Junction dot
function dot(C) { return new Dot({ C }); }

// Ground symbol
function gnd(t) { return new Ground({ t }); }

// Read component override or fall back to default
function cv(comps, ref, field) { return comps?.[ref]?.[field] ?? null; }

// ── Transformer symbol (two coupled inductors + core bars inside a box) ────────
function drawTransformer(sch, cx, cy, bW, bH, Np, Ns, Nb,
  cp='#0066A6', cs='#27ae60', cb='#e67e22') {

  const lw  = sch.line_width;
  const x0  = cx - bW/2, y0 = cy - bH/2;

  // Outline
  const g = sch.g({});
  g.add(sch.rect({ insert:[x0,y0], size:[bW,bH],
    fill:'#faf5ff', stroke:'#9b59b6', stroke_width:lw*1.5, rx:4 }));

  // Core bars (vertical, centre of box)
  const cX = cx - 5;
  g.add(sch.line({ start:[cX,   y0+12], end:[cX,   y0+bH-12], stroke:'#9b59b6', stroke_width:4, stroke_linecap:'round' }));
  g.add(sch.line({ start:[cX+10,y0+12], end:[cX+10,y0+bH-12], stroke:'#9b59b6', stroke_width:4, stroke_linecap:'round' }));

  // Primary winding (left of core) — up to 7 arcs
  const tP = Math.min(Np || 4, 7);
  const pX = cX - 16, pitch = 22;
  const pY0 = cy - (tP * pitch) / 2 + pitch/2;
  for (let i = 0; i < tP; i++) {
    const yc = pY0 + i * pitch;
    const arc = sch.path({ fill:'none', stroke:cp, stroke_width:lw*1.8, stroke_linecap:'round' });
    arc.push('M', [pX, yc - 10]);
    arc.push('A', [10, 10, 0, 0, 1, pX, yc + 10]);
    g.add(arc);
  }
  // Primary leads (attach to box left edge)
  const pLead_top = [x0, pY0 - 10];
  const pLead_bot = [x0, pY0 + (tP-1)*pitch + 10];
  g.add(sch.line({ start:pLead_top, end:[pX, pY0-10], stroke:cp, stroke_width:lw, stroke_linecap:'round' }));
  g.add(sch.line({ start:pLead_bot, end:[pX, pY0+(tP-1)*pitch+10], stroke:cp, stroke_width:lw, stroke_linecap:'round' }));
  // Polarity dot
  g.add(sch.circle({ center:[x0+5, pY0-6], r:3.5, fill:cp }));
  // Label
  g.add(sch.text(`Np=${Np||'?'}T`, { insert:[x0+3, y0+bH-6],
    font_family:'Arial,sans-serif', font_size:8, fill:cp }));

  // Secondary winding (right of core)
  const tS = Math.min(Ns || 2, 5);
  const sX = cX + 10 + 16;
  const sY0 = cy - (tS * pitch) / 2 + pitch/2;
  for (let i = 0; i < tS; i++) {
    const yc = sY0 + i * pitch;
    const arc = sch.path({ fill:'none', stroke:cs, stroke_width:lw*1.8, stroke_linecap:'round' });
    arc.push('M', [sX, yc - 10]);
    arc.push('A', [10, 10, 0, 0, 0, sX, yc + 10]);
    g.add(arc);
  }
  const sLead_top = [x0+bW, sY0 - 10];
  const sLead_bot = [x0+bW, sY0 + (tS-1)*pitch + 10];
  g.add(sch.line({ start:sLead_top, end:[sX, sY0-10], stroke:cs, stroke_width:lw, stroke_linecap:'round' }));
  g.add(sch.line({ start:sLead_bot, end:[sX, sY0+(tS-1)*pitch+10], stroke:cs, stroke_width:lw, stroke_linecap:'round' }));
  g.add(sch.circle({ center:[x0+bW-5, sY0-6], r:3.5, fill:cs }));
  g.add(sch.text(`Ns=${Ns||'?'}T`, { insert:[cx+8, y0+bH-6],
    font_family:'Arial,sans-serif', font_size:8, fill:cs }));

  // Bias winding (below secondary)
  if ((Nb || 0) > 0) {
    const tB  = Math.min(Nb, 3), bp = 18;
    const bY0 = sY0 + (tS-1)*pitch + 10 + 20;
    for (let i = 0; i < tB; i++) {
      const yc = bY0 + i * bp;
      const arc = sch.path({ fill:'none', stroke:cb, stroke_width:lw*1.5, stroke_linecap:'round' });
      arc.push('M', [sX, yc - 8]);
      arc.push('A', [8, 8, 0, 0, 0, sX, yc + 8]);
      g.add(arc);
    }
    const bLead_top = [x0+bW, bY0 - 8];
    const bLead_bot = [x0+bW, bY0 + (tB-1)*bp + 8];
    g.add(sch.line({ start:bLead_top, end:[sX, bY0-8], stroke:cb, stroke_width:lw, stroke_linecap:'round' }));
    g.add(sch.line({ start:bLead_bot, end:[sX, bY0+(tB-1)*bp+8], stroke:cb, stroke_width:lw, stroke_linecap:'round' }));
    g.add(sch.text(`Nb=${Nb}T`, { insert:[cx+8, y0+bH-18],
      font_family:'Arial,sans-serif', font_size:8, fill:cb }));
  }

  // T1 ref label
  g.add(sch.text('T1', { insert:[x0+5, y0+13],
    font_family:'Arial,sans-serif', font_size:11, font_weight:'700', fill:'#7c3aed' }));

  sch.add(g);
  sch._update_bounds(x0, y0, x0+bW, y0+bH);

  return { prim_top: pLead_top, prim_bot: pLead_bot, sec_top: sLead_top, sec_bot: sLead_bot };
}

// ── IC box with named left/right pins ─────────────────────────────────────────
function drawIC(sch, cx, cy, bw, bh, ref, label, leftPins, rightPins,
  bg='#e8f5ff', border='#0D7377') {

  const lw = sch.line_width, fs = 8.5, pinLen = 22;
  const x0 = cx - bw/2, y0 = cy - bh/2;
  const nL = leftPins.length, nR = rightPins.length;
  const spL = bh / (nL + 1), spR = bh / (nR + 1);

  const g = sch.g({});
  g.add(sch.rect({ insert:[x0,y0], size:[bw,bh], fill:bg, stroke:border, stroke_width:lw*1.5, rx:4 }));
  g.add(sch.text(ref,   { insert:[cx, y0+13], font_family:'Arial,sans-serif', font_size:10, font_weight:'700', fill:border, text_anchor:'middle' }));
  g.add(sch.text(label, { insert:[cx, y0+24], font_family:'Arial,sans-serif', font_size:7.5, fill:'#555', text_anchor:'middle' }));

  const pins = {};
  leftPins.forEach((name, i) => {
    const py = y0 + spL * (i + 1);
    g.add(sch.line({ start:[x0 - pinLen, py], end:[x0, py], stroke:'#666', stroke_width:lw }));
    g.add(sch.text(name, { insert:[x0 + 4, py + fs*0.38],
      font_family:'Arial,sans-serif', font_size:fs, fill:'#333' }));
    pins[name] = [x0 - pinLen, py];
  });
  rightPins.forEach((name, i) => {
    const py = y0 + spR * (i + 1);
    g.add(sch.line({ start:[x0 + bw, py], end:[x0 + bw + pinLen, py], stroke:'#666', stroke_width:lw }));
    g.add(sch.text(name, { insert:[x0 + bw - 4, py + fs*0.38],
      font_family:'Arial,sans-serif', font_size:fs, fill:'#333', text_anchor:'end' }));
    pins[name] = [x0 + bw + pinLen, py];
  });

  sch.add(g);
  sch._update_bounds(x0 - pinLen, y0, x0 + bw + pinLen, y0 + bh);
  return { cx, cy, x0, y0, bw, bh, pins };
}

// ── Title block ───────────────────────────────────────────────────────────────
function titleBlock(sch, meta, topLabel) {
  const lw = sch.line_width;
  const tbX = sch._min_x + 10, tbY = sch._max_y + 18;
  const g = sch.g({});
  g.add(sch.rect({ insert:[tbX, tbY], size:[360, 56], fill:'#f8f9fb', stroke:'#ccc', stroke_width:lw, rx:3 }));
  g.add(sch.text(meta.fileName ? meta.fileName+'.uds' : 'Untitled',
    { insert:[tbX+8, tbY+15], font_family:'Arial,sans-serif', font_size:10, font_weight:'700', fill:'#0D7377' }));
  g.add(sch.text(`Topology: ${meta.topology||'—'}  |  Family: ${meta.family||'—'}`,
    { insert:[tbX+8, tbY+29], font_family:'Arial,sans-serif', font_size:8.5, fill:'#555' }));
  g.add(sch.text(`Input: ${meta.inputSpec||'—'}  |  Power: ${(meta.totalPower||0).toFixed(1)}W`,
    { insert:[tbX+8, tbY+42], font_family:'Arial,sans-serif', font_size:8.5, fill:'#555' }));
  g.add(sch.text(topLabel,
    { insert:[tbX+8, tbY+53], font_family:'Arial,sans-serif', font_size:7.5, fill:'#999', font_style:'italic' }));
  sch.add(g);
  sch._update_bounds(tbX, tbY, tbX+360, tbY+56);
}

// ── Main entry point ──────────────────────────────────────────────────────────
export function generateSchematic(type, uds) {
  const comps  = uds?.components ?? {};
  const result = uds?.result     ?? {};
  const meta   = uds?.meta       ?? {};
  const hb     = {};
  if (type === 'ifc')  return _genIFC(uds, comps, result, meta, hb);
  if (type === 'lpfc1' || type === 'lpfc2') return _genLPFC(uds, comps, result, meta, hb, type);
  if (type.startsWith('psc')) return _genPSC(uds, comps, result, meta, hb, type);
  return _genHPFC(uds, comps, result, meta, hb);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HPFC — High-Power Flyback Controller
// Layout (all px):
//   Top rail (HV+):  Y=80
//   Bottom rail GND: Y=600
//   Transformer ctr: Y=340  X=840
//   Secondary out:   Y=165
//   Controller IC:   Y=490  X=860
// ═══════════════════════════════════════════════════════════════════════════════
function _genHPFC(uds, comps, result, meta, hb) {
  const sch = new Schematic('hpfc.svg',
    { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  // ── Rails ──
  const Y_HVP  = 80;   // HV+ primary rail
  const Y_GND  = 600;  // Primary GND rail
  const Y_OUT  = 165;  // Secondary output
  const Y_SGND = 480;  // Secondary GND

  // ── AC source symbol ──
  const X_AC = 55;
  sch.add(sch.circle({ center:[X_AC, 260], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[X_AC, 420], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265', { insert:[X_AC-28, 244], font_family:'Arial,sans-serif', font_size:8, fill:'#444' }));
  sch.add(sch.text('VAC',    { insert:[X_AC-20, 256], font_family:'Arial,sans-serif', font_size:8, fill:'#444' }));
  sch._update_bounds(X_AC-35, 230, X_AC+10, 440);

  // AC Line (top) rises to HV+ rail
  wire([X_AC, 260], [X_AC, Y_HVP]);

  // ── F1 Fuse (Box on HV+ rail) ──
  const f1 = new Box({ orient:'h', C:[185, Y_HVP],
    name:'F1', value: cv(comps,'F1','value')||'1.25A',
    w:1.2, h:0.6, background:'#fffbf0', border:'#888' });
  hb.F1 = bbox(f1);

  // AC_L → F1.i
  wire([X_AC, Y_HVP], f1.i);

  // ── RT1 NTC Thermistor ──
  const rt1 = new Resistor({ orient:'h', C:[320, Y_HVP],
    name:'RT1', value: cv(comps,'RT1','value')||'8Ω NTC' });
  hb.RT1 = bbox(rt1);
  wire(f1.o, rt1.n);     // F1.o → RT1.n (left of resistor)

  // ── L1 EMI Filter Choke ──
  const l1 = new Inductor({ orient:'h', C:[465, Y_HVP],
    name:'L1', value: cv(comps,'L1','value')||'6mH' });
  hb.L1 = bbox(l1);
  wire(rt1.p, l1.n);     // RT1.p → L1.n

  // ── BR1 Bridge Rectifier ──
  // Left pins: both AC inputs; Right pins: DC+ (top), DC− (bottom)
  const BR_CX = 610, BR_CY = 340;
  const br1 = drawIC(sch, BR_CX, BR_CY, 75, 210, 'BR1',
    cv(comps,'BR1','part')||'DF1506S',
    ['AC1', 'AC2'], ['DC+', 'DC−'],
    '#f5f8ff', '#6B7280');
  hb.BR1 = { x: br1.x0, y: br1.y0, w: br1.bw, h: br1.bh };

  // L1.p → junction above BR1.AC1 → down to AC1
  const xBR_left = br1.pins['AC1'][0];
  wire(l1.p, [xBR_left, Y_HVP], [xBR_left, br1.pins['AC1'][1]]);
  dot([xBR_left, Y_HVP]);

  // AC neutral → bottom rail → up to BR1.AC2
  wire([X_AC, 420], [X_AC, Y_GND]);
  wire([X_AC, Y_GND], [xBR_left, Y_GND], [xBR_left, br1.pins['AC2'][1]]);
  dot([X_AC, Y_GND]);

  // BR1.DC+ → up to HV+ rail
  const xBR_right = br1.pins['DC+'][0];
  wire(br1.pins['DC+'], [xBR_right, Y_HVP]);
  dot([xBR_right, Y_HVP]);

  // BR1.DC− → down to GND rail
  wire(br1.pins['DC−'], [xBR_right, Y_GND]);
  dot([xBR_right, Y_GND]);

  // ── C1 X2 Safety Cap (across AC line) ──
  const c1 = new Capacitor({ orient:'v', C:[xBR_left - 40, BR_CY],
    name:'C1', value: cv(comps,'C1','value')||'100nF X2' });
  hb.C1 = bbox(c1);
  wire([c1.center[0], Y_HVP], c1.p);
  wire(c1.n, [c1.center[0], Y_GND]);

  // ── C2 Bulk Electrolytic ──
  const X_BULK = xBR_right + 70;
  const c2 = new Capacitor({ orient:'v', C:[X_BULK, BR_CY],
    name:'C2', value: (cv(comps,'C2','value')||'150µF') + '/' + (cv(comps,'C2','voltage')||'400V') });
  hb.C2 = bbox(c2);
  wire([xBR_right, Y_HVP], [X_BULK, Y_HVP]);   // HV+ rail segment
  wire([X_BULK, Y_HVP], c2.p);
  wire(c2.n, [X_BULK, Y_GND]);
  dot([X_BULK, Y_HVP]);
  dot([X_BULK, Y_GND]);

  // ── T1 Flyback Transformer ──
  const X_T1 = 840, T1W = 130, T1H = 260;
  const t1 = drawTransformer(sch, X_T1, BR_CY, T1W, T1H, result.Np, result.Ns, result.Nb);
  hb.T1 = { x: X_T1 - T1W/2, y: BR_CY - T1H/2, w: T1W, h: T1H };

  // HV+ rail → T1 primary top
  wire([X_BULK, Y_HVP], [t1.prim_top[0], Y_HVP]);
  wire([t1.prim_top[0], Y_HVP], t1.prim_top);
  dot([t1.prim_top[0], Y_HVP]);

  // ── RCD Clamp: D2 + C7 + R10 (across primary, left of T1) ──
  const X_CLAMP = X_T1 - T1W/2 - 60;
  const d2 = new Diode({ orient:'v', C:[X_CLAMP, BR_CY - 70],
    name:'D2', color:'#e67e22' });
  hb.D2 = bbox(d2);
  const c7 = new Capacitor({ orient:'v', C:[X_CLAMP, d2.c[1] + 55],
    name:'C7', value: cv(comps,'C7','value')||'3.9nF' });
  hb.C7 = bbox(c7);
  const r10 = new Resistor({ orient:'v', C:[X_CLAMP, c7.n[1] + 55],
    name:'R10', value: cv(comps,'R10','value')||'100kΩ' });
  hb.R10 = bbox(r10);

  // Snubber rail: from HV+ rail node (at T1 left edge) down through D2→C7→R10→GND
  wire([t1.prim_top[0], Y_HVP], [X_CLAMP, Y_HVP], [X_CLAMP, d2.a[1]]);
  wire(d2.c, c7.p);
  wire(c7.n, r10.p);
  wire(r10.n, [X_CLAMP, Y_GND]);
  dot([t1.prim_top[0], Y_HVP]);

  // ── U1 Controller IC ──
  const X_U1 = 870, Y_U1 = 490;
  const u1 = drawIC(sch, X_U1, Y_U1, 110, 140, 'U1',
    cv(comps,'U1','part') || (meta.family || 'HPFC'),
    ['D', 'V', 'F'], ['S', 'X', 'FB'],
    '#e8f5ff', '#0D7377');
  hb.U1 = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  // T1 primary bottom → U1 Drain
  wire(t1.prim_bot, [t1.prim_bot[0], u1.pins['D'][1]], u1.pins['D']);
  dot([t1.prim_bot[0], u1.pins['D'][1]]);

  // U1.V (VCC) bypass cap
  const u1_V = u1.pins['V'];
  const cv_byp = new Capacitor({ orient:'v', C:[u1_V[0] - 40, u1_V[1]],
    name:'C4', value: cv(comps,'C4','value')||'10µF' });
  hb.C4 = bbox(cv_byp);
  wire(u1_V, cv_byp.p);
  wire(cv_byp.n, [cv_byp.center[0], Y_GND]);

  // U1.S → R9 current sense → GND rail
  const u1_S = u1.pins['S'];
  const X_R9 = u1_S[0] + 55;
  const r9 = new Resistor({ orient:'v', C:[X_R9, Y_GND - 45],
    name:'R9', value: cv(comps,'R9','value')||'0.5Ω' });
  hb.R9 = bbox(r9);
  wire(u1_S, [X_R9, u1_S[1]], r9.p);
  wire(r9.n, [X_R9, Y_GND]);
  gnd([X_R9, Y_GND]);
  dot([X_R9, Y_GND]);

  // GND rail left end → U1 bottom
  wire([X_BULK, Y_GND], [X_CLAMP, Y_GND]);
  wire([X_CLAMP, Y_GND], [X_R9, Y_GND]);
  dot([X_CLAMP, Y_GND]);

  // U1.X → GND
  const u1_X = u1.pins['X'];
  if (u1_X) { wire(u1_X, [u1_X[0] + 30, u1_X[1]]); gnd([u1_X[0] + 30, u1_X[1]]); }

  // ── Secondary side ──
  const X_D3   = X_T1 + T1W/2 + 80;
  const X_CO   = X_D3 + 110;
  const X_VOUT = X_CO + 70;

  // D3 output rectifier
  const d3 = new Diode({ orient:'h', C:[X_D3, Y_OUT],
    name:'D3', color:'#27ae60',
    value: cv(comps,'D3','value')||'Schottky' });
  hb.D3 = bbox(d3);
  wire(t1.sec_top, [t1.sec_top[0], Y_OUT], d3.a);

  // Co output capacitor
  const co = new Capacitor({ orient:'v', C:[X_CO, Y_OUT + 80],
    name:'Co', value: cv(comps,'Co','value')||'100µF' });
  hb.Co = bbox(co);
  wire(d3.c, [X_CO, Y_OUT], co.p);
  dot([X_CO, Y_OUT]);

  // Vout terminal
  new Pin({ kind:'out', t:[X_VOUT, Y_OUT], name:'Vout' });
  wire([X_CO, Y_OUT], [X_VOUT - 8, Y_OUT]);

  // Secondary GND
  wire(co.n, [X_CO, Y_SGND]);
  wire(t1.sec_bot, [t1.sec_bot[0], Y_SGND], [X_CO, Y_SGND]);
  gnd([X_CO, Y_SGND]);
  dot([X_CO, Y_SGND]);

  // ── Feedback: R11/R12 voltage divider + U3 TL431 + U2 opto ──
  const X_DIV = X_VOUT + 70;
  const r11 = new Resistor({ orient:'v', C:[X_DIV, Y_OUT + 65],
    name:'R11', value: cv(comps,'R11','value')||'6.19kΩ' });
  hb.R11 = bbox(r11);
  const r12 = new Resistor({ orient:'v', C:[X_DIV, r11.n[1] + 60],
    name:'R12', value: cv(comps,'R12','value')||'698Ω' });
  hb.R12 = bbox(r12);

  wire([X_VOUT - 8, Y_OUT], [X_DIV, Y_OUT], r11.p);
  dot([X_DIV, Y_OUT]);
  wire(r11.n, r12.p);
  wire(r12.n, [X_DIV, Y_SGND]);
  gnd([X_DIV, Y_SGND + 10]);

  // U3 TL431
  const X_U3 = X_DIV + 95;
  const Y_U3 = r11.n[1] + 5;
  const u3 = drawIC(sch, X_U3, Y_U3, 68, 78, 'U3',
    cv(comps,'U3','part')||'TL431', ['A'], ['K','R'], '#fff8ee', '#d97706');
  hb.U3 = { x: u3.x0, y: u3.y0, w: u3.bw, h: u3.bh };
  wire(r11.n, [X_U3 - u3.bw/2 - 22, r11.n[1]], u3.pins['R']);
  dot(r11.n);
  wire(u3.pins['K'], [u3.pins['K'][0], Y_OUT], [X_DIV, Y_OUT]);
  wire(u3.pins['A'], [u3.pins['A'][0], Y_SGND]);
  gnd([u3.pins['A'][0], Y_SGND]);

  // U2 Optocoupler
  const X_U2 = X_U3;
  const Y_U2 = Y_OUT - 60;
  const u2 = drawIC(sch, X_U2, Y_U2, 68, 76, 'U2A',
    cv(comps,'U2A','part')||'LTV-817', ['A','K'], ['C','E'], '#f0f4ff', '#5b6ab0');
  hb.U2A = { x: u2.x0, y: u2.y0, w: u2.bw, h: u2.bh };

  // R13 opto drive resistor
  const r13 = new Resistor({ orient:'h', C:[X_DIV + 45, u3.pins['K'][1] - 25],
    name:'R13', value: cv(comps,'R13','value')||'1kΩ' });
  hb.R13 = bbox(r13);
  wire([u3.pins['K'][0], Y_OUT], [r13.n[0], Y_OUT], r13.n);
  wire(r13.p, u2.pins['A'] || [u2.x0 - 22, u2.y0 + 25]);

  // U2.C → U1.FB
  const u1_FB = u1.pins['FB'];
  if (u1_FB) {
    wire(u2.pins['C'], [u2.pins['C'][0], u1_FB[1]], u1_FB);
  }
  // U2.E → secondary GND
  if (u2.pins['E']) { wire(u2.pins['E'], [u2.pins['E'][0], Y_SGND]); gnd([u2.pins['E'][0], Y_SGND]); }

  titleBlock(sch, meta, 'HPFC Flyback Converter');
  const svg = sch.close();
  return { svg, hitBoxes: hb, viewBox: sch._viewbox };
}

// ═══════════════════════════════════════════════════════════════════════════════
// IFC — Integrated Flyback Controller (MOSFET integrated into IC)
// ═══════════════════════════════════════════════════════════════════════════════
function _genIFC(uds, comps, result, meta, hb) {
  const sch = new Schematic('ifc.svg',
    { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  const Y_HVP = 80, Y_GND = 580, Y_OUT = 165, Y_SGND = 460;

  // AC source
  const X_AC = 55;
  sch.add(sch.circle({ center:[X_AC, 255], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[X_AC, 405], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265VAC', { insert:[X_AC-28, 238], font_family:'Arial,sans-serif', font_size:7.5, fill:'#444' }));
  sch._update_bounds(X_AC-35, 225, X_AC+10, 425);
  wire([X_AC, 255], [X_AC, Y_HVP]);

  // F1
  const f1 = new Box({ orient:'h', C:[185, Y_HVP],
    name:'F1', value: cv(comps,'F1','value')||'1A',
    w:1.1, h:0.55, background:'#fffbf0', border:'#888' });
  hb.F1 = bbox(f1);
  wire([X_AC, Y_HVP], f1.i);

  // L1 EMI choke
  const l1 = new Inductor({ orient:'h', C:[320, Y_HVP],
    name:'L1', value: cv(comps,'L1','value')||'4mH' });
  hb.L1 = bbox(l1);
  wire(f1.o, l1.n);

  // BR1 Bridge rect
  const BR_CX = 460, BR_CY = 330;
  const br1 = drawIC(sch, BR_CX, BR_CY, 70, 200, 'BR1',
    cv(comps,'BR1','part')||'DF1506',
    ['AC1','AC2'], ['DC+','DC−'], '#f5f8ff', '#6B7280');
  hb.BR1 = { x: br1.x0, y: br1.y0, w: br1.bw, h: br1.bh };

  const xBL = br1.pins['AC1'][0];
  wire(l1.p, [xBL, Y_HVP], [xBL, br1.pins['AC1'][1]]);
  dot([xBL, Y_HVP]);
  wire([X_AC, 405], [X_AC, Y_GND]);
  wire([X_AC, Y_GND], [xBL, Y_GND], [xBL, br1.pins['AC2'][1]]);
  dot([X_AC, Y_GND]);

  const xBR = br1.pins['DC+'][0];
  wire(br1.pins['DC+'], [xBR, Y_HVP]);  dot([xBR, Y_HVP]);
  wire(br1.pins['DC−'], [xBR, Y_GND]);  dot([xBR, Y_GND]);

  // C2 Bulk cap
  const X_BULK = xBR + 65;
  const c2 = new Capacitor({ orient:'v', C:[X_BULK, BR_CY],
    name:'C2', value: (cv(comps,'C2','value')||'100µF') + '/' + (cv(comps,'C2','voltage')||'400V') });
  hb.C2 = bbox(c2);
  wire([xBR, Y_HVP], [X_BULK, Y_HVP]); wire([X_BULK, Y_HVP], c2.p);
  wire(c2.n, [X_BULK, Y_GND]);
  dot([X_BULK, Y_HVP]); dot([X_BULK, Y_GND]);

  // T1 Transformer
  const X_T1 = X_BULK + 170, T1W = 120, T1H = 240;
  const t1 = drawTransformer(sch, X_T1, BR_CY, T1W, T1H, result.Np, result.Ns, result.Nb);
  hb.T1 = { x: X_T1-T1W/2, y: BR_CY-T1H/2, w: T1W, h: T1H };
  wire([X_BULK, Y_HVP], [t1.prim_top[0], Y_HVP], t1.prim_top);

  // U1 IFC IC (drain connects to T1 primary bottom)
  const X_U1 = X_T1 + 15, Y_U1 = 470;
  const u1 = drawIC(sch, X_U1, Y_U1, 120, 180, 'U1',
    cv(comps,'U1','part')||'IFC-CE',
    ['D','V','BP','SR','FB','S'], [],
    '#e8f9f0', '#27ae60');
  hb.U1 = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  wire(t1.prim_bot, [t1.prim_bot[0], u1.pins['D'][1]], u1.pins['D']);

  // U1.S → GND
  const u1_S = u1.pins['S'];
  wire(u1_S, [u1_S[0] - 30, u1_S[1]]); gnd([u1_S[0] - 30, u1_S[1]]);
  wire([X_BULK, Y_GND], [u1_S[0] - 30, Y_GND]);

  // BP bypass
  const u1_BP = u1.pins['BP'];
  if (u1_BP) {
    const cbp = new Capacitor({ orient:'v', C:[u1_BP[0] - 40, u1_BP[1]] });
    wire(u1_BP, cbp.p); wire(cbp.n, [cbp.center[0], Y_GND]); gnd([cbp.center[0], Y_GND]);
  }

  // Secondary
  const X_D3  = X_T1 + T1W/2 + 70, X_CO = X_D3 + 100, X_VOUT = X_CO + 65;
  const d3 = new Diode({ orient:'h', C:[X_D3, Y_OUT],
    name:'D3', color:'#27ae60', value: cv(comps,'D3','value')||'Schottky' });
  hb.D3 = bbox(d3);
  wire(t1.sec_top, [t1.sec_top[0], Y_OUT], d3.a);

  const co = new Capacitor({ orient:'v', C:[X_CO, Y_OUT + 70],
    name:'Co', value: cv(comps,'Co','value')||'47µF' });
  hb.Co = bbox(co);
  wire(d3.c, [X_CO, Y_OUT], co.p); dot([X_CO, Y_OUT]);
  wire(co.n, [X_CO, Y_SGND]);
  wire(t1.sec_bot, [t1.sec_bot[0], Y_SGND], [X_CO, Y_SGND]);
  gnd([X_CO, Y_SGND]); dot([X_CO, Y_SGND]);

  new Pin({ kind:'out', t:[X_VOUT, Y_OUT], name:'Vout' });
  wire([X_CO, Y_OUT], [X_VOUT - 8, Y_OUT]);

  // Feedback to U1.FB (secondary-side sensing via SR pin in IFC)
  const X_DIV = X_VOUT + 60;
  const r11 = new Resistor({ orient:'v', C:[X_DIV, Y_OUT + 60],
    name:'R11', value: cv(comps,'R11','value')||'6.19kΩ' });
  hb.R11 = bbox(r11);
  const r12 = new Resistor({ orient:'v', C:[X_DIV, r11.n[1] + 55],
    name:'R12', value: cv(comps,'R12','value')||'698Ω' });
  hb.R12 = bbox(r12);
  wire([X_VOUT-8, Y_OUT], [X_DIV, Y_OUT], r11.p); dot([X_DIV, Y_OUT]);
  wire(r11.n, r12.p);
  wire(r12.n, [X_DIV, Y_SGND]); gnd([X_DIV, Y_SGND + 10]);

  titleBlock(sch, meta, 'IFC Integrated Flyback Controller');
  const svg = sch.close();
  return { svg, hitBoxes: hb, viewBox: sch._viewbox };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LPFC — Low-Power Flyback Controller (no bridge, direct cap input or half-wave)
// ═══════════════════════════════════════════════════════════════════════════════
function _genLPFC(uds, comps, result, meta, hb, type) {
  const sch = new Schematic('lpfc.svg',
    { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  const isLPFC2 = type === 'lpfc2';
  const Y_HVP = 80, Y_GND = 560, Y_OUT = 155, Y_SGND = 440;

  // AC source
  const X_AC = 55;
  sch.add(sch.circle({ center:[X_AC, 240], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[X_AC, 390], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265VAC', { insert:[X_AC-28, 224], font_family:'Arial,sans-serif', font_size:7.5, fill:'#444' }));
  sch._update_bounds(X_AC-35, 210, X_AC+10, 410);
  wire([X_AC, 240], [X_AC, Y_HVP]);

  // F1 Fuse
  const f1 = new Box({ orient:'h', C:[185, Y_HVP],
    name:'F1', value: cv(comps,'F1','value')||(isLPFC2?'0.3A':'0.5A'),
    w:1.0, h:0.55, background:'#fffbf0', border:'#888' });
  hb.F1 = bbox(f1);
  wire([X_AC, Y_HVP], f1.i);

  // BR1 Bridge rect (LPFC still uses a bridge for the rectified DC)
  const BR_CX = 360, BR_CY = 315;
  const br1 = drawIC(sch, BR_CX, BR_CY, 70, 190, 'BR1',
    cv(comps,'BR1','part')||(isLPFC2?'MB2S':'MB6S'),
    ['AC1','AC2'], ['DC+','DC−'], '#f5f8ff', '#6B7280');
  hb.BR1 = { x: br1.x0, y: br1.y0, w: br1.bw, h: br1.bh };

  const xBL = br1.pins['AC1'][0];
  wire(f1.o, [xBL, Y_HVP], [xBL, br1.pins['AC1'][1]]);
  dot([xBL, Y_HVP]);
  wire([X_AC, 390], [X_AC, Y_GND]);
  wire([X_AC, Y_GND], [xBL, Y_GND], [xBL, br1.pins['AC2'][1]]);
  dot([X_AC, Y_GND]);

  const xBR = br1.pins['DC+'][0];
  wire(br1.pins['DC+'], [xBR, Y_HVP]); dot([xBR, Y_HVP]);
  wire(br1.pins['DC−'], [xBR, Y_GND]); dot([xBR, Y_GND]);

  // C2 Bulk cap (smaller for low power)
  const X_BULK = xBR + 60;
  const c2 = new Capacitor({ orient:'v', C:[X_BULK, BR_CY],
    name:'C2', value: (cv(comps,'C2','value')||(isLPFC2?'4.7µF':'10µF')) + '/400V' });
  hb.C2 = bbox(c2);
  wire([xBR, Y_HVP], [X_BULK, Y_HVP]); wire([X_BULK, Y_HVP], c2.p);
  wire(c2.n, [X_BULK, Y_GND]);
  dot([X_BULK, Y_HVP]); dot([X_BULK, Y_GND]);

  // T1 Transformer
  const X_T1 = X_BULK + 150, T1W = 110, T1H = 220;
  const t1 = drawTransformer(sch, X_T1, BR_CY, T1W, T1H, result.Np, result.Ns, result.Nb);
  hb.T1 = { x: X_T1-T1W/2, y: BR_CY-T1H/2, w: T1W, h: T1H };
  wire([X_BULK, Y_HVP], [t1.prim_top[0], Y_HVP], t1.prim_top);

  // U1 LPFC IC (with EN/UV undervoltage pin)
  const X_U1 = X_T1 + 10, Y_U1 = 455;
  const u1Pins = isLPFC2 ? ['D','EN'] : ['D','EN/UV'];
  const u1 = drawIC(sch, X_U1, Y_U1, 95, 110, 'U1',
    cv(comps,'U1','part')||(isLPFC2?'LPFC-2':'LPFC-1'),
    u1Pins, ['S','BYP'], '#fff8ee', '#d97706');
  hb.U1 = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  wire(t1.prim_bot, [t1.prim_bot[0], u1.pins['D'][1]], u1.pins['D']);

  // EN/UV high-voltage divider
  const u1_EN = u1.pins[u1Pins[1]];
  if (u1_EN) {
    const X_DIV_HV = u1_EN[0] - 55;
    const r7 = new Resistor({ orient:'v', C:[X_DIV_HV, Y_HVP + 80],
      name:'R7', value: cv(comps,'R7','value')||'2MΩ' });
    const r8 = new Resistor({ orient:'v', C:[X_DIV_HV, r7.n[1] + 60],
      name:'R8', value: cv(comps,'R8','value')||'100kΩ' });
    hb.R7 = bbox(r7); hb.R8 = bbox(r8);
    wire([X_DIV_HV, Y_HVP], r7.p);
    wire(r7.n, r8.p); wire(r8.n, [X_DIV_HV, Y_GND]);
    wire(r7.n, u1_EN); dot(r7.n);
  }

  // U1.S → GND
  wire(u1.pins['S'], [u1.pins['S'][0] + 35, u1.pins['S'][1]]);
  gnd([u1.pins['S'][0] + 35, u1.pins['S'][1]]);
  wire([X_BULK, Y_GND], [u1.pins['S'][0] + 35, Y_GND]);

  // BYP cap
  const u1_BYP = u1.pins['BYP'];
  if (u1_BYP) {
    const cbp = new Capacitor({ orient:'v', C:[u1_BYP[0] + 40, u1_BYP[1]] });
    wire(u1_BYP, cbp.p); wire(cbp.n, [cbp.center[0], Y_GND]); gnd([cbp.center[0], Y_GND]);
  }

  // Secondary
  const X_D3 = X_T1 + T1W/2 + 65, X_CO = X_D3 + 95, X_VOUT = X_CO + 60;
  const d3 = new Diode({ orient:'h', C:[X_D3, Y_OUT],
    name:'D3', color:'#27ae60', value: cv(comps,'D3','value')||'Schottky' });
  hb.D3 = bbox(d3);
  wire(t1.sec_top, [t1.sec_top[0], Y_OUT], d3.a);

  const co = new Capacitor({ orient:'v', C:[X_CO, Y_OUT + 65],
    name:'Co', value: cv(comps,'Co','value')||'47µF' });
  hb.Co = bbox(co);
  wire(d3.c, [X_CO, Y_OUT], co.p); dot([X_CO, Y_OUT]);
  wire(co.n, [X_CO, Y_SGND]);
  wire(t1.sec_bot, [t1.sec_bot[0], Y_SGND], [X_CO, Y_SGND]);
  gnd([X_CO, Y_SGND]); dot([X_CO, Y_SGND]);

  new Pin({ kind:'out', t:[X_VOUT, Y_OUT], name:'Vout' });
  wire([X_CO, Y_OUT], [X_VOUT - 8, Y_OUT]);

  titleBlock(sch, meta, isLPFC2 ? 'LPFC-2 Ultra-Low Power Flyback' : 'LPFC-1 Low-Power Flyback');
  const svg = sch.close();
  return { svg, hitBoxes: hb, viewBox: sch._viewbox };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PSC — Primary-Side Controller (no optocoupler, uses winding voltage sensing)
// ═══════════════════════════════════════════════════════════════════════════════
function _genPSC(uds, comps, result, meta, hb, type) {
  const sch = new Schematic('psc.svg',
    { pad:50, background:'#fff', line_width:1.5, font_size:11, dot_radius:3.5 });

  const isTN = type === 'psctn', isXT = type === 'pscxt';
  const Y_HVP = 80, Y_GND = 560, Y_OUT = 155, Y_SGND = 430;

  // AC source
  const X_AC = 55;
  sch.add(sch.circle({ center:[X_AC, 235], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.circle({ center:[X_AC, 385], r:5, fill:'none', stroke:'#555', stroke_width:1.5 }));
  sch.add(sch.text('85–265VAC', { insert:[X_AC-28, 218], font_family:'Arial,sans-serif', font_size:7.5, fill:'#444' }));
  sch._update_bounds(X_AC-35, 205, X_AC+10, 405);
  wire([X_AC, 235], [X_AC, Y_HVP]);

  // F1 Fuse
  const f1 = new Box({ orient:'h', C:[185, Y_HVP],
    name:'F1', value: cv(comps,'F1','value')||'0.3A',
    w:1.0, h:0.55, background:'#fffbf0', border:'#888' });
  hb.F1 = bbox(f1);
  wire([X_AC, Y_HVP], f1.i);

  // BR1
  const BR_CX = 355, BR_CY = 315;
  const br1 = drawIC(sch, BR_CX, BR_CY, 68, 185, 'BR1',
    cv(comps,'BR1','part')||'MB2S',
    ['AC1','AC2'], ['DC+','DC−'], '#f5f8ff', '#6B7280');
  hb.BR1 = { x: br1.x0, y: br1.y0, w: br1.bw, h: br1.bh };

  const xBL = br1.pins['AC1'][0];
  wire(f1.o, [xBL, Y_HVP], [xBL, br1.pins['AC1'][1]]);
  dot([xBL, Y_HVP]);
  wire([X_AC, 385], [X_AC, Y_GND]);
  wire([X_AC, Y_GND], [xBL, Y_GND], [xBL, br1.pins['AC2'][1]]);
  dot([X_AC, Y_GND]);

  const xBR = br1.pins['DC+'][0];
  wire(br1.pins['DC+'], [xBR, Y_HVP]); dot([xBR, Y_HVP]);
  wire(br1.pins['DC−'], [xBR, Y_GND]); dot([xBR, Y_GND]);

  // C2 Bulk cap
  const X_BULK = xBR + 58;
  const c2 = new Capacitor({ orient:'v', C:[X_BULK, BR_CY],
    name:'C2', value: (cv(comps,'C2','value')||'4.7µF') + '/400V' });
  hb.C2 = bbox(c2);
  wire([xBR, Y_HVP], [X_BULK, Y_HVP]); wire([X_BULK, Y_HVP], c2.p);
  wire(c2.n, [X_BULK, Y_GND]);
  dot([X_BULK, Y_HVP]); dot([X_BULK, Y_GND]);

  // T1 (with bias/auxiliary winding for PSC sensing)
  const X_T1 = X_BULK + 145, T1W = 110, T1H = 210;
  const t1 = drawTransformer(sch, X_T1, BR_CY, T1W, T1H,
    result.Np||3, result.Ns||2, result.Nb||1);
  hb.T1 = { x: X_T1-T1W/2, y: BR_CY-T1H/2, w: T1W, h: T1H };
  wire([X_BULK, Y_HVP], [t1.prim_top[0], Y_HVP], t1.prim_top);

  // U1 PSC IC — pin set depends on sub-type
  const X_U1 = X_T1 + 10, Y_U1 = 448;
  const leftPins  = isTN ? ['D'] : isXT ? ['D','EN/UV'] : ['D','V'];
  const rightPins = isTN ? ['S','BP'] : isXT ? ['S','BP'] : ['S','X'];
  const u1Color   = '#7c3aed';
  const u1 = drawIC(sch, X_U1, Y_U1, 95, 105, 'U1',
    cv(comps,'U1','part')||type.toUpperCase(),
    leftPins, rightPins, '#ede9fe', u1Color);
  hb.U1 = { x: u1.x0, y: u1.y0, w: u1.bw, h: u1.bh };

  wire(t1.prim_bot, [t1.prim_bot[0], u1.pins['D'][1]], u1.pins['D']);

  // S → GND
  const u1_S = u1.pins['S'];
  wire(u1_S, [u1_S[0] + 35, u1_S[1]]); gnd([u1_S[0] + 35, u1_S[1]]);
  wire([X_BULK, Y_GND], [u1_S[0] + 35, Y_GND]);

  // BP/X bypass or decoupling cap
  const bpPin = u1.pins['BP'] || u1.pins['X'];
  if (bpPin) {
    const cbp = new Capacitor({ orient:'v', C:[bpPin[0] + 38, bpPin[1]] });
    wire(bpPin, cbp.p); wire(cbp.n, [cbp.center[0], Y_GND]); gnd([cbp.center[0], Y_GND]);
  }

  // Note: PSC uses bias winding for output sensing — no optocoupler
  const noteX = X_T1 + T1W/2 + 10, noteY = Y_GND - 40;
  sch.add(sch.text('Primary-side sensing — no optocoupler',
    { insert:[noteX, noteY], font_family:'Arial,sans-serif', font_size:8.5, fill:u1Color, font_style:'italic' }));
  sch._update_bounds(noteX, noteY-10, noteX + 240, noteY + 10);

  // Secondary
  const X_D3 = X_T1 + T1W/2 + 65, X_CO = X_D3 + 90, X_VOUT = X_CO + 60;
  const d3 = new Diode({ orient:'h', C:[X_D3, Y_OUT],
    name:'D3', color:'#27ae60', value: cv(comps,'D3','value')||'Schottky' });
  hb.D3 = bbox(d3);
  wire(t1.sec_top, [t1.sec_top[0], Y_OUT], d3.a);

  const co = new Capacitor({ orient:'v', C:[X_CO, Y_OUT + 62],
    name:'Co', value: cv(comps,'Co','value')||'22µF' });
  hb.Co = bbox(co);
  wire(d3.c, [X_CO, Y_OUT], co.p); dot([X_CO, Y_OUT]);
  wire(co.n, [X_CO, Y_SGND]);
  wire(t1.sec_bot, [t1.sec_bot[0], Y_SGND], [X_CO, Y_SGND]);
  gnd([X_CO, Y_SGND]); dot([X_CO, Y_SGND]);

  new Pin({ kind:'out', t:[X_VOUT, Y_OUT], name:'Vout' });
  wire([X_CO, Y_OUT], [X_VOUT - 8, Y_OUT]);

  // Output voltage divider for PSC sensing
  const X_DIV = X_VOUT + 60;
  const r7 = new Resistor({ orient:'v', C:[X_DIV, Y_OUT + 60],
    name:'R7', value: cv(comps,'R7','value')||'100kΩ' });
  hb.R7 = bbox(r7);
  const r8 = new Resistor({ orient:'v', C:[X_DIV, r7.n[1] + 55],
    name:'R8', value: cv(comps,'R8','value')||'10kΩ' });
  hb.R8 = bbox(r8);
  wire([X_VOUT-8, Y_OUT], [X_DIV, Y_OUT], r7.p); dot([X_DIV, Y_OUT]);
  wire(r7.n, r8.p);
  wire(r8.n, [X_DIV, Y_SGND]); gnd([X_DIV, Y_SGND + 10]);

  const topLabel = isTN ? 'PSC-TN Primary-Side Controller'
    : isXT ? 'PSC-XT Primary-Side Controller'
    : 'PSC-HP High-Power Primary-Side Controller';
  titleBlock(sch, meta, topLabel);
  const svg = sch.close();
  return { svg, hitBoxes: hb, viewBox: sch._viewbox };
}
