'use strict';
// JavaScript port of https://github.com/KenKundert/svg_schematic
// Original: Copyright (C) 2018-2023 Kenneth S. Kundert (GPLv3+)
// JS port by melvin-akino — https://github.com/melvin-akino/svg-schematic-js

function fmt(n) {
  if (typeof n !== 'number') return String(n);
  return parseFloat(n.toFixed(3));
}
function escapeXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shift(p, dx, dy)    { return [p[0]+dx, p[1]+dy]; }
function shift_x(p, dx)      { return [p[0]+dx, p[1]]; }
function shift_y(p, dy)      { return [p[0], p[1]+dy]; }
function with_x(p1, a2)      { return [Array.isArray(a2) ? a2[0] : a2, p1[1]]; }
function with_y(p1, a2)      { return [p1[0], Array.isArray(a2) ? a2[1] : a2]; }
function midpoint(p1, p2)    { return [(p1[0]+p2[0])/2, (p1[1]+p2[1])/2]; }
function midpoint_x(p1, p2)  { return [(p1[0]+p2[0])/2, p1[1]]; }
function midpoint_y(p1, p2)  { return [p1[0], (p1[1]+p2[1])/2]; }

class SVGElement {
  constructor(tag, attrs={}) {
    this.tag = tag; this.attrs = attrs;
    this.children = []; this._transforms = []; this._text = undefined;
  }
  add(child) { this.children.push(child); return child; }
  translate(x_or_pt, y) {
    if (Array.isArray(x_or_pt)) [x_or_pt, y] = x_or_pt;
    this._transforms.push(`translate(${fmt(x_or_pt)},${fmt(y)})`); return this;
  }
  scale(sx, sy) {
    this._transforms.push(`scale(${fmt(sx)},${fmt(sy===undefined?sx:sy)})`); return this;
  }
  rotate(angle, center) {
    if (center) this._transforms.push(`rotate(${fmt(angle)},${fmt(center[0])},${fmt(center[1])})`);
    else        this._transforms.push(`rotate(${fmt(angle)})`);
    return this;
  }
  _attrStr() {
    const all = {...this.attrs};
    if (this._transforms.length) all.transform = this._transforms.join(' ');
    const parts = Object.entries(all).map(([k,v]) => `${k.replace(/_/g,'-')}="${fmt(v)}"`);
    return parts.length ? ' '+parts.join(' ') : '';
  }
  render(ind='') {
    const a = this._attrStr();
    if (this._text !== undefined) return `${ind}<${this.tag}${a}>${escapeXml(this._text)}</${this.tag}>\n`;
    if (!this.children.length)   return `${ind}<${this.tag}${a}/>\n`;
    const inner = this.children.map(c=>c.render(ind+'  ')).join('');
    return `${ind}<${this.tag}${a}>\n${inner}${ind}</${this.tag}>\n`;
  }
}

class SVGRaw extends SVGElement {
  constructor(raw) { super('g'); this._raw = raw; }
  render(ind='') { return ind + this._raw + '\n'; }
}

class SVGPath extends SVGElement {
  constructor(attrs={}) { super('path', attrs); this._d=[]; }
  push(cmd, args) {
    if (!Array.isArray(args)) {
      this._d.push(`${cmd} ${fmt(args[0])},${fmt(args[1])}`);
    } else if (args.length && !Array.isArray(args[0])) {
      this._d.push(`${cmd} ${args.map(fmt).join(' ')}`);
    } else {
      this._d.push(`${cmd} ${args.map(p=>`${fmt(p[0])},${fmt(p[1])}`).join(' ')}`);
    }
    return this;
  }
  _attrStr() { this.attrs.d = this._d.join(' '); return super._attrStr(); }
}

function nvl(v, d) { return (v !== null && v !== undefined) ? v : d; }

class Schematic {
  constructor(filename, opts) {
    filename = nvl(filename, 'schematic.svg');
    opts = nvl(opts, {});
    this.filename    = filename;
    this.line_width  = nvl(opts.line_width,  1);
    this.font_size   = nvl(opts.font_size,   14);
    this.font_family = nvl(opts.font_family, 'Arial,sans-serif');
    this.dot_radius  = nvl(opts.dot_radius,  3.5);
    this.background  = nvl(opts.background,  'white');
    this.outline     = nvl(opts.outline,     'none');
    const pad = nvl(opts.pad, 0);
    this.left_pad   = nvl(opts.left_pad,   0) + pad;
    this.right_pad  = nvl(opts.right_pad,  0) + pad;
    this.top_pad    = nvl(opts.top_pad,    0) + pad;
    this.bottom_pad = nvl(opts.bottom_pad, 0) + pad;
    this._min_x=9999; this._min_y=9999; this._max_x=-9999; this._max_y=-9999;
    this._elements = [];
    this._viewbox  = null;
    Schematic._current = this;
    if (this.background !== 'none' || this.outline !== 'none') {
      this._bg_group = new SVGElement('g', {id:'bkgnd'});
      this._elements.push(this._bg_group);
    }
  }
  static get current() { return Schematic._current; }

  _update_bounds(x0,y0,x1,y1) {
    if (this._min_x>x0) this._min_x=x0;
    if (this._min_y>y0) this._min_y=y0;
    if (this._max_x<x1) this._max_x=x1;
    if (this._max_y<y1) this._max_y=y1;
  }

  g(attrs={})              { return new SVGElement('g', attrs); }
  raw(str)                 { return new SVGRaw(str); }
  rect({insert,size,...a}) { return new SVGElement('rect',   {x:insert[0],y:insert[1],width:size[0],height:size[1],...a}); }
  line({start,end,...a})   { return new SVGElement('line',   {x1:start[0],y1:start[1],x2:end[0],y2:end[1],...a}); }
  circle({center,r,...a})  { return new SVGElement('circle', {cx:center[0],cy:center[1],r,...a}); }
  polyline(pts, a={})      { return new SVGElement('polyline',{points:pts.map(p=>`${fmt(p[0])},${fmt(p[1])}`).join(' '),...a}); }
  polygon(pts, a={})       { return new SVGElement('polygon', {points:pts.map(p=>`${fmt(p[0])},${fmt(p[1])}`).join(' '),...a}); }
  path(a={})               { return new SVGPath(a); }
  text(content, {insert,...a}) { const el=new SVGElement('text',{x:insert[0],y:insert[1],...a}); el._text=content; return el; }
  add(el)                  { this._elements.push(el); return el; }

  close() {
    const lw = this.line_width;
    const min_x  = this._min_x - this.left_pad   - lw;
    const min_y  = this._min_y - this.top_pad     - lw;
    const width  = this._max_x + this.right_pad   - min_x + 2*lw;
    const height = this._max_y + this.bottom_pad  - min_y + 2*lw;
    if (this._bg_group) {
      this._bg_group.add(this.rect({
        insert:[min_x,min_y], size:[width,height],
        fill:this.background, stroke:this.outline, stroke_width:1,
      }));
    }
    this._viewbox = [min_x, min_y, width, height];
    const svg = this.toSVG();
    Schematic._current = null;
    return svg;
  }

  toSVG() {
    const [vx,vy,vw,vh] = nvl(this._viewbox, [0,0,100,100]);
    const inner = this._elements.map(el=>el.render('  ')).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(vx)} ${fmt(vy)} ${fmt(vw)} ${fmt(vh)}" width="${fmt(vw)}" height="${fmt(vh)}">\n${inner}</svg>`;
  }
}
Schematic._current = null;

class Wire {
  constructor(points, {kind='plain', line_width=null, color='#444', ...extra}={}) {
    const sch = Schematic.current;
    if (!sch) throw new Error('no active schematic');
    const lw = nvl(line_width, sch.line_width);
    for (const [x,y] of points) sch._update_bounds(x,y,x,y);
    this.b = points[0]; this.e = points[points.length-1];
    this.m = midpoint(this.b, this.e);
    if (kind !== 'plain') {
      let prev = points[0], newPts=[prev];
      for (const p of points.slice(1)) {
        if (p[0]!==prev[0] && p[1]!==prev[1]) {
          if (kind==='|-')  newPts.push([prev[0], p[1]]);
          else if (kind==='-|') newPts.push([p[0], prev[1]]);
        }
        newPts.push(p); prev=p;
      }
      points = newPts;
    }
    const wire = sch.g({});
    wire.add(sch.polyline(points,{fill:'none',stroke_width:lw,stroke:color,stroke_linecap:'round',...extra}));
    sch.add(wire);
  }
}

const UNIT_WIDTH=50, UNIT_HEIGHT=50;
const COORD_OFFSETS = {
  C:[0,0], N:[0,-1/2], NW:[-1/2,-1/2], W:[-1/2,0], SW:[-1/2,1/2],
  S:[0,1/2], SE:[1/2,1/2], E:[1/2,0], NE:[1/2,-1/2],
};

class Tile {
  get _coordOffsets() { return COORD_OFFSETS; }
  _update_bounds(x0,y0,x1,y1) { Schematic.current._update_bounds(x0,y0,x1,y1); }
  _init_tile() {
    const sch = Schematic.current;
    if (!sch) throw new Error('no active schematic');
    const [w,h] = this.size, [x0,y0] = this.center;
    this._update_bounds(x0-w/2, y0-h/2, x0+w/2, y0+h/2);
    this.symbol = sch.g({});
    this.symbol.add(sch.rect({insert:[-w/2,-h/2],size:[w,h],stroke:'none',fill:'none'}));
    sch.add(this.symbol);
    this.textLayer = sch.g({});
    sch.add(this.textLayer);
  }
  add_text(content, position, alignment) {
    const sch = Schematic.current;
    const [v,h] = alignment;
    let [px,py] = position;
    const yOff = {u:0.8, m:0.4, l:0}[v];
    if (yOff !== undefined) py += yOff * sch.font_size;
    const anchor = {l:'start', m:'middle', r:'end'}[h];
    const el = sch.text(String(content), {
      insert:[px,py],
      font_family: sch.font_family,
      font_size:   sch.font_size,
      fill:'#222',
      ...(anchor ? {text_anchor:anchor} : {}),
    });
    this.textLayer.add(el);
  }
  set_coordinates(kwargs, pins={}, orient='', rotate='', h=2, w=2, extra=false) {
    w *= UNIT_WIDTH; h *= UNIT_HEIGHT;
    this.size = [w, h];
    const scaledPins={};
    for (const [k,v] of Object.entries(pins)) scaledPins[k]=[w*v[0], h*v[1]];
    this.pins = {...scaledPins};
    const rotPins={};
    for (const [name,[px,py]] of Object.entries(scaledPins)) {
      let x=px, y=py;
      if (rotate && orient.includes(rotate)) [x,y]=[y,-x];
      if (orient.includes('|')) x=-x;
      if (orient.includes('-')) y=-y;
      rotPins[name]=[x,y];
    }
    const offsets={};
    for (const [k,v] of Object.entries(this._coordOffsets)) offsets[k]=[w*v[0],h*v[1]];
    Object.assign(offsets, rotPins);
    let x0=0, y0=0;
    const locKey = Object.keys(offsets).find(k => k in kwargs);
    if (locKey) {
      const off=offsets[locKey], loc=kwargs[locKey];
      delete kwargs[locKey];
      x0=loc[0]-off[0]; y0=loc[1]-off[1];
    }
    if ('off' in kwargs) { x0+=kwargs.off[0]; y0+=kwargs.off[1]; delete kwargs.off; }
    else { x0+=nvl(kwargs.xoff,0); y0+=nvl(kwargs.yoff,0); delete kwargs.xoff; delete kwargs.yoff; }
    this.center=[x0,y0];
    for (const [k,v] of Object.entries(offsets)) this[k]=[v[0]+x0,v[1]+y0];
    if (extra) return kwargs;
  }
}

class Resistor extends Tile {
  constructor({orient='h', name=null, value=null, nudge=4, ...kwargs}={}) {
    super();
    this.set_coordinates(kwargs,{p:[1/2,0],n:[-1/2,0]},orient,'v');
    this._init_tile();
    const sch=Schematic.current, [w,h]=this.size, lw=sch.line_width;
    const dr=Math.max(2*lw,sch.dot_radius), dx=5, dy=9, N=6;
    const p=this.pins.p, n=this.pins.n;
    this.symbol.add(sch.rect({insert:[-w/2+dr,-2*lw],size:[w-2*dr,4*lw],stroke:'none',fill:sch.background}));
    const path=[n];
    let x=-dx*N;
    for (let i=0;i<N;i++) {
      path.push([x,0],[x+dx,(i%2?dy:-dy)]);
      x+=2*dx; path.push([x,0]);
    }
    path.push(p);
    this.symbol.add(sch.polyline(path,{fill:'none',stroke_width:lw,stroke:'#333',stroke_linecap:'round'}));
    this.symbol.translate(this.center);
    if (orient.includes('|')) this.symbol.scale(-1,1);
    if (orient.includes('-')) this.symbol.scale(1,-1);
    if (orient.includes('v')) this.symbol.rotate(-90);
    if (orient.includes('v')) {
      if (name)  this.add_text(name,  shift(this.center,1.5*dy+nudge,-nudge),'ll');
      if (value) this.add_text(value, shift(this.center,1.5*dy+nudge, nudge),'ul');
    } else {
      if (name)  this.add_text(name,  shift(this.center,0,-2*dy-nudge),'lm');
      if (value) this.add_text(value, shift(this.center,0, 2*dy+nudge),'um');
    }
  }
}

class Capacitor extends Tile {
  constructor({orient='v', name=null, value=null, nudge=4, ...kwargs}={}) {
    super();
    this.set_coordinates(kwargs,{p:[0,-1/2],n:[0,1/2]},orient,'h');
    this._init_tile();
    const sch=Schematic.current, [w,h]=this.size, lw=sch.line_width;
    const dr=Math.max(2*lw,sch.dot_radius), gap=14, dgap=4, cw=36;
    const p=this.pins.p, n=this.pins.n;
    this.symbol.add(sch.rect({insert:[-2*lw,-h/2+dr],size:[4*lw,w-2*dr],stroke:'none',fill:sch.background}));
    this.symbol.add(sch.line({start:p, end:[0,-gap/2], fill:'none',stroke_width:lw,stroke:'#333',stroke_linecap:'round'}));
    this.symbol.add(sch.line({start:[0,gap/2-dgap],end:n, fill:'none',stroke_width:lw,stroke:'#333',stroke_linecap:'round'}));
    this.symbol.add(sch.line({start:[-cw/2,-gap/2],end:[cw/2,-gap/2], fill:'none',stroke_width:lw*2,stroke:'#333',stroke_linecap:'round'}));
    const bp=sch.path({fill:'none',stroke_width:lw*2,stroke:'#333',stroke_linecap:'round'});
    bp.push('M',[-cw/2,+gap/2]);
    bp.push('c',[[cw/4,-1.5*dgap],[3*cw/4,-1.5*dgap],[cw,0]]);
    this.symbol.add(bp);
    this.symbol.translate(this.center);
    if (orient.includes('|')) this.symbol.scale(-1,1);
    if (orient.includes('-')) this.symbol.scale(1,-1);
    if (orient.includes('h')) this.symbol.rotate(-90);
    if (orient.includes('h')) {
      if (name)  this.add_text(name,  shift(this.center, gap+nudge,-nudge),'ll');
      if (value) this.add_text(value, shift(this.center, gap+nudge, nudge),'ul');
    } else {
      if (name)  this.add_text(name,  shift(this.center, nudge,-gap),'ll');
      if (value) this.add_text(value, shift(this.center, nudge, gap),'ul');
    }
  }
}

class Inductor extends Tile {
  constructor({orient='h', name=null, value=null, nudge=4, ...kwargs}={}) {
    super();
    this.set_coordinates(kwargs,{p:[1/2,0],n:[-1/2,0]},orient,'v');
    this._init_tile();
    const sch=Schematic.current, [w,h]=this.size, lw=sch.line_width;
    const dr=Math.max(2*lw,sch.dot_radius);
    const xinc=18, xdec=-4, ypeak=13, ytrough=-8, N=4, dy=5;
    const p=this.pins.p, n=this.pins.n;
    this.symbol.add(sch.rect({insert:[-w/2+dr,-2*lw],size:[w-2*dr,4*lw],stroke:'none',fill:sch.background}));
    let cx=-xinc*(N/2-0.5);
    const coil=sch.path({fill:'none',stroke_width:lw,stroke:'#333',stroke_linecap:'round'});
    coil.push('M',n);
    coil.push('L',[cx,0]);
    const curve=[];
    for (let i=0;i<N;i++) {
      curve.push(cx,-ypeak, cx+xinc,-ypeak, cx+xinc,0, cx+xinc,-ytrough, cx+xinc+xdec,-ytrough, cx+xinc+xdec,0);
      cx+=xinc+xdec;
    }
    coil.push('C',curve.slice(0,-6));
    coil.push('L',p);
    this.symbol.add(coil);
    this.symbol.translate(this.center);
    if (orient.includes('|')) this.symbol.scale(-1,1);
    if (orient.includes('-')) this.symbol.scale(1,-1);
    if (orient.includes('v')) this.symbol.rotate(-90);
    if (orient.includes('v')) {
      const [just,xn]=orient.includes('|') ? ['r',ytrough-nudge] : ['l',-ytrough+nudge];
      if (name)  this.add_text(name,  shift(this.center,xn,-nudge),'l'+just);
      if (value) this.add_text(value, shift(this.center,xn, nudge),'u'+just);
    } else {
      if (name)  this.add_text(name,  shift(this.center,0,-ypeak-dy-nudge),'lm');
      if (value) this.add_text(value, shift(this.center,0, ypeak+dy+nudge),'um');
    }
  }
}

class Diode extends Tile {
  constructor({orient='v', name=null, value=null, nudge=4, color='#333', ...kwargs}={}) {
    super();
    this.set_coordinates(kwargs,{a:[0,-1/2],c:[0,1/2]},orient,'h');
    this._init_tile();
    const sch=Schematic.current, [w,h]=this.size, lw=sch.line_width;
    const dr=Math.max(2*lw,sch.dot_radius), dh=30, dw=36;
    const a=this.pins.a, c=this.pins.c;
    this.symbol.add(sch.rect({insert:[-2*lw,-h/2+dr],size:[4*lw,w-2*dr],stroke:'none',fill:sch.background}));
    this.symbol.add(sch.line({start:a,end:[0,-dh/2],fill:'none',stroke_width:lw,stroke:color,stroke_linecap:'round'}));
    this.symbol.add(sch.line({start:[0,dh/2],end:c,fill:'none',stroke_width:lw,stroke:color,stroke_linecap:'round'}));
    this.symbol.add(sch.line({start:[-dw/2,dh/2],end:[dw/2,dh/2],fill:'none',stroke_width:lw*2,stroke:color,stroke_linecap:'round'}));
    this.symbol.add(sch.polygon([[0,dh/2],[-dw/2,-dh/2],[dw/2,-dh/2]],{fill:'none',stroke_width:lw,stroke:color,stroke_linecap:'round'}));
    this.symbol.translate(this.center);
    if (orient.includes('|')) this.symbol.scale(-1,1);
    if (orient.includes('-')) this.symbol.scale(1,-1);
    if (orient.includes('h')) this.symbol.rotate(-90);
    if (orient.includes('h')) {
      if (name)  this.add_text(name,  shift(this.center,dh/2+nudge,-nudge),'ll');
      if (value) this.add_text(value, shift(this.center,dh/2+nudge, nudge),'ul');
    } else {
      if (name)  this.add_text(name,  shift(this.center,nudge,-dh/2-nudge),'ll');
      if (value) this.add_text(value, shift(this.center,nudge, dh/2+nudge),'ul');
    }
  }
}

class Ground extends Tile {
  constructor({orient='v', name=null, nudge=4, ...kwargs}={}) {
    super();
    this.set_coordinates(kwargs,{t:[0,0]},orient,'h',1,1);
    this._init_tile();
    const sch=Schematic.current, [w,h]=this.size, lw=sch.line_width, sc=0.4;
    this.symbol.add(sch.polyline([[0,0],[sc*w,0],[0,sc*h],[-sc*w,0],[0,0]],
      {fill:sch.background,stroke_width:lw,stroke:'#333',stroke_linecap:'round'}));
    this.symbol.translate(this.center);
    if (orient.includes('|')) this.symbol.scale(-1,1);
    if (orient.includes('-')) this.symbol.scale(1,-1);
    if (orient.includes('h')) this.symbol.rotate(-90);
    if (name) {
      let xn=0,yn=0,just;
      if (orient.includes('h')) { xn=orient.includes('|')?-nudge:nudge; just=orient.includes('|')?'mr':'ml'; }
      else { yn=orient.includes('-')?-nudge:nudge; just=orient.includes('-')?'lm':'um'; }
      this.add_text(name,shift(this.center,xn,yn),just);
    }
  }
}

class Box extends Tile {
  constructor({orient='h', name=null, value=null, nudge=4, line_width=null, background=null,
               border=null, w=2, h=1.5, font_size=null, font_color='#222', ...kwargs}={}) {
    super();
    const pins={i:[-1/2,0],pi:[-1/2,-1/4],ni:[-1/2,1/4],o:[1/2,0],po:[1/2,-1/4],no:[1/2,1/4]};
    const extra=this.set_coordinates(kwargs,pins,orient,'v',h,w,true);
    this._init_tile();
    const sch=Schematic.current, [sw,sh]=this.size;
    const lw=nvl(line_width,sch.line_width);
    const fill=nvl(background,sch.background);
    const stroke=nvl(border,'#666');
    this.symbol.add(sch.rect({insert:[-sw/2,-sh/2],size:[sw,sh],fill,stroke_width:lw,stroke,...(extra||{})}));
    this.symbol.translate(this.center);
    if (orient.includes('|')) this.symbol.scale(-1,1);
    if (orient.includes('-')) this.symbol.scale(1,-1);
    if (orient.includes('v')) this.symbol.rotate(-90);
    const fs = nvl(font_size, sch.font_size);
    if (value) {
      if (name) {
        const el1=sch.text(String(name),{insert:[this.center[0],this.center[1]-nudge],font_family:sch.font_family,font_size:fs,fill:font_color,text_anchor:'middle'});
        const el2=sch.text(String(value),{insert:[this.center[0],this.center[1]+fs+nudge],font_family:sch.font_family,font_size:fs*0.85,fill:'#666',text_anchor:'middle'});
        this.textLayer.add(el1); this.textLayer.add(el2);
      } else {
        const el=sch.text(String(value),{insert:[this.center[0],this.center[1]+fs*0.4],font_family:sch.font_family,font_size:fs,fill:font_color,text_anchor:'middle'});
        this.textLayer.add(el);
      }
    } else if (name) {
      const el=sch.text(String(name),{insert:[this.center[0],this.center[1]+fs*0.4],font_family:sch.font_family,font_size:fs,fill:font_color,text_anchor:'middle'});
      this.textLayer.add(el);
    }
  }
}

class Pin extends Tile {
  constructor({kind=null, orient='v', name=null, value=null, w=1, h=1, color='#333', nudge=4, ...kwargs}={}) {
    super();
    if (kind===null) kind = nvl(new.target && new.target.DEFAULT_KIND, Pin.DEFAULT_KIND);
    this.set_coordinates(kwargs,{t:[0,0]},orient,'v',h,w);
    this._init_tile();
    const sch=Schematic.current, r=sch.dot_radius, lw=sch.line_width;
    if (kind!=='none') {
      const cx = kind==='in'?-r : kind==='out'?r : 0;
      this.symbol.add(sch.circle({center:[cx,0],r,
        fill:kind==='dot'?color:sch.background,stroke_width:lw,stroke:color}));
    }
    this.symbol.translate(this.center);
    const xn=r+nudge;
    if (kind==='out' && name)      this.add_text(name,shift(this.center,2*r+nudge,0),'ml');
    else if (kind==='in' && name)  this.add_text(name,shift(this.center,-(2*r+nudge),0),'mr');
    else {
      const [xk,just]=orient.includes('|')?[-xn,'r']:[xn,'l'];
      if (name)  this.add_text(name,  shift(this.center,xk,-nudge),'l'+just);
      if (value) this.add_text(value, shift(this.center,xk, nudge),'u'+just);
    }
  }
}
Pin.DEFAULT_KIND = 'out';

class Dot extends Pin {}
Dot.DEFAULT_KIND = 'dot';

class Label extends Tile {
  constructor({kind='plain', loc='c', orient='h', name=null, w=1, h=1, color='#333',
               font_size=null, nudge=4, ...kwargs}={}) {
    super();
    this.set_coordinates(kwargs,{},orient,'v',h,w);
    this._init_tile();
    const sch=Schematic.current, fs=nvl(font_size, sch.font_size);
    let xn=nudge, yn=nudge;
    this.symbol.translate(this.center);
    if (name) {
      const l=loc.toLowerCase();
      let dx=0,dy=0,vj='m',hj='m';
      if (l.includes('n')) { dy=-yn; vj='l'; }
      if (l.includes('s')) { dy= yn; vj='u'; }
      if (l.includes('e')) { dx= xn; hj='l'; }
      if (l.includes('w')) { dx=-xn; hj='r'; }
      const el=sch.text(String(name),{
        insert:[this.center[0]+dx, this.center[1]+dy + fs*0.4],
        font_family:sch.font_family, font_size:fs, fill:color, text_anchor:{l:'start',m:'middle',r:'end'}[hj]||'middle'
      });
      this.textLayer.add(el);
    }
  }
}

const exports_ = {
  Schematic, Wire,
  Resistor, Capacitor, Inductor, Diode, Ground,
  Box, Pin, Dot, Label,
  shift, shift_x, shift_y, with_x, with_y, midpoint, midpoint_x, midpoint_y,
};

export default exports_;
export { Schematic, Wire, Resistor, Capacitor, Inductor, Diode, Ground, Box, Pin, Dot, Label,
  shift, shift_x, shift_y, with_x, with_y, midpoint, midpoint_x, midpoint_y };
