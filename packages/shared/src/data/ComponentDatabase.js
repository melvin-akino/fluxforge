export const COMPONENT_DB = {
  capacitors: {
    bulk_electrolytic: [
      { part:'UHE2G470MPD', mfr:'Nichicon', value:'47µF', voltage:'400V', type:'Electrolytic', esr:'0.85Ω', temp:'105°C', size:'16×25mm', cost:1.20 },
      { part:'UHE2G100MPD', mfr:'Nichicon', value:'10µF', voltage:'400V', type:'Electrolytic', esr:'2.1Ω',  temp:'105°C', size:'8×15mm',  cost:0.55 },
      { part:'EEU-EB2G470', mfr:'Panasonic', value:'47µF', voltage:'400V', type:'Electrolytic', esr:'0.78Ω', temp:'105°C', size:'16×25mm', cost:1.35 },
      { part:'ECA-2GHG101', mfr:'Panasonic', value:'100µF', voltage:'400V', type:'Electrolytic', esr:'0.55Ω', temp:'105°C', size:'18×35mm', cost:2.10 },
      { part:'EKXG401ELL470', mfr:'United Chem-Con', value:'47µF', voltage:'400V', type:'Electrolytic', esr:'0.72Ω', temp:'105°C', size:'16×25mm', cost:1.05 },
    ],
    output_electrolytic: [
      { part:'UPS1E471MED', mfr:'Nichicon', value:'470µF', voltage:'25V', type:'Electrolytic', esr:'0.045Ω', temp:'105°C', size:'10×16mm', cost:0.45 },
      { part:'UPS1V101MED', mfr:'Nichicon', value:'100µF', voltage:'35V', type:'Electrolytic', esr:'0.09Ω',  temp:'105°C', size:'8×12mm',  cost:0.28 },
      { part:'EEE-FK1E221P', mfr:'Panasonic', value:'220µF', voltage:'25V', type:'Electrolytic Low-ESR', esr:'0.032Ω', temp:'105°C', size:'8×10mm', cost:0.38 },
      { part:'EEE-FK1V470P', mfr:'Panasonic', value:'47µF',  voltage:'35V', type:'Electrolytic Low-ESR', esr:'0.048Ω', temp:'105°C', size:'6×8mm',  cost:0.25 },
      { part:'EMVK160ARA471MF61G', mfr:'United Chem-Con', value:'470µF', voltage:'16V', type:'Electrolytic', esr:'0.038Ω', temp:'105°C', size:'10×16mm', cost:0.40 },
    ],
    ceramic: [
      { part:'C1608X7R1H104K', mfr:'TDK', value:'100nF', voltage:'50V',  type:'MLCC X7R', package:'0603', cost:0.01 },
      { part:'C2012X7R2A104K', mfr:'TDK', value:'100nF', voltage:'100V', type:'MLCC X7R', package:'0805', cost:0.02 },
      { part:'GRM188R71H104KA93', mfr:'Murata', value:'100nF', voltage:'50V', type:'MLCC X7R', package:'0603', cost:0.01 },
      { part:'C3216X7R2J104K', mfr:'TDK', value:'100nF', voltage:'630V', type:'MLCC X7R High-V', package:'1206', cost:0.08 },
      { part:'GRM188R71H473KA01', mfr:'Murata', value:'47nF', voltage:'50V', type:'MLCC X7R', package:'0603', cost:0.01 },
    ],
    snubber: [
      { part:'ECQ-E6474KF', mfr:'Panasonic', value:'470nF', voltage:'250V', type:'Film PET', package:'Radial', cost:0.18 },
      { part:'B32521C3104K', mfr:'TDK', value:'100nF', voltage:'305V', type:'Film X2', package:'Radial', cost:0.22 },
      { part:'ECW-F2475JB', mfr:'Panasonic', value:'4.7µF', voltage:'250V', type:'Film PP', package:'Radial', cost:0.85 },
    ],
  },
  resistors: {
    current_sense: [
      { part:'WSL2512R1000FEA', mfr:'Vishay', value:'0.1Ω', power:'1W', tol:'1%', package:'2512', cost:0.08 },
      { part:'WSL2512R0500FEA', mfr:'Vishay', value:'0.05Ω',power:'1W', tol:'1%', package:'2512', cost:0.10 },
    ],
    feedback: [
      { part:'RC0805FR-0710KL', mfr:'Yageo', value:'10kΩ',  power:'0.125W', tol:'1%', package:'0805', cost:0.02 },
      { part:'RC0805FR-072K2L', mfr:'Yageo', value:'2.2kΩ', power:'0.125W', tol:'1%', package:'0805', cost:0.02 },
      { part:'RC0805FR-0747KL', mfr:'Yageo', value:'47kΩ',  power:'0.125W', tol:'1%', package:'0805', cost:0.02 },
      { part:'RC0805FR-07100KL',mfr:'Yageo', value:'100kΩ', power:'0.125W', tol:'1%', package:'0805', cost:0.02 },
    ],
    startup: [
      { part:'RC1210FR-071ML',  mfr:'Yageo', value:'1MΩ',   power:'0.5W', tol:'1%', package:'1210', cost:0.05 },
      { part:'RC1210FR-072M2L', mfr:'Yageo', value:'2.2MΩ', power:'0.5W', tol:'1%', package:'1210', cost:0.05 },
    ],
  },
  diodes: {
    output_schottky: [
      { part:'SB1045',     mfr:'Vishay',    voltage:'45V',  current:'10A', vf:'0.45V', type:'Schottky',     package:'DO-201AD', cost:0.45 },
      { part:'MBRS340',    mfr:'ON Semi',   voltage:'40V',  current:'3A',  vf:'0.42V', type:'Schottky SMD', package:'DO-214AB', cost:0.28 },
      { part:'SS34',       mfr:'Vishay',    voltage:'40V',  current:'3A',  vf:'0.40V', type:'Schottky SMD', package:'DO-214AC', cost:0.12 },
      { part:'B5819W',     mfr:'Diodes Inc',voltage:'40V',  current:'1A',  vf:'0.36V', type:'Schottky SMD', package:'SOD-123',  cost:0.04 },
      { part:'STPS10H100CG',mfr:'STMicro', voltage:'100V', current:'10A', vf:'0.68V', type:'Schottky',     package:'TO-220AB', cost:0.88 },
    ],
    clamp: [
      { part:'UF4007', mfr:'Vishay', voltage:'1000V', current:'1A', vf:'1.7V', type:'Ultrafast', package:'DO-41',   cost:0.08 },
      { part:'BYV26C', mfr:'NXP',   voltage:'600V',  current:'1A', vf:'1.5V', type:'Ultrafast', package:'DO-35',   cost:0.12 },
      { part:'SMBJ5.0A',mfr:'Vishay',voltage:'5V',   power:'600W',            type:'TVS',       package:'DO-214AA',cost:0.18 },
    ],
    bridge_rectifier: [
      { part:'DF1005S', mfr:'Diodes Inc', voltage:'50V',   current:'1A',  type:'Bridge', package:'SOP-4', cost:0.15 },
      { part:'MB6S',    mfr:'Diodes Inc', voltage:'600V',  current:'0.5A',type:'Bridge', package:'MBS',   cost:0.18 },
      { part:'GBU606',  mfr:'ON Semi',    voltage:'600V',  current:'6A',  type:'Bridge', package:'GBU',   cost:0.55 },
      { part:'KBP310',  mfr:'Fairchild',  voltage:'1000V', current:'3A',  type:'Bridge', package:'KBP',   cost:0.42 },
    ],
  },
  inductors: {
    emi_filter: [
      { part:'ACM7060-301-2PL', mfr:'TDK',      value:'300µH', current:'0.5A', type:'Common Mode', dcr:'0.8Ω',  package:'SMD 7060', cost:0.55 },
      { part:'ACM2012-900-2P',  mfr:'TDK',      value:'90µH',  current:'0.3A', type:'Common Mode', dcr:'1.8Ω',  package:'SMD 2012', cost:0.25 },
      { part:'LPD4012-103MRB',  mfr:'Coilcraft', value:'10µH', current:'2.1A', type:'Power',       dcr:'0.05Ω', package:'4012',     cost:0.35 },
    ],
    transformer_cores: [
      { part:'EE19/8/5',   mfr:'TDK/Ferroxcube', ae:'0.238cm²', le:'3.94cm', material:'N87/3F3', cost:0.45 },
      { part:'EE25/13/7',  mfr:'TDK/Ferroxcube', ae:'0.519cm²', le:'5.65cm', material:'N87/3F3', cost:0.72 },
      { part:'EE30/15/7',  mfr:'TDK/Ferroxcube', ae:'0.600cm²', le:'6.72cm', material:'N87/3F3', cost:0.95 },
      { part:'EE40/20/15', mfr:'TDK/Ferroxcube', ae:'1.60cm²',  le:'7.70cm', material:'N87/3F3', cost:1.65 },
      { part:'EE55/28/21', mfr:'TDK/Ferroxcube', ae:'4.20cm²',  le:'10.3cm', material:'N87/3F3', cost:3.20 },
      { part:'PQ20/16',    mfr:'TDK',             ae:'0.620cm²', le:'3.74cm', material:'N87',     cost:0.88 },
      { part:'PQ32/20',    mfr:'TDK',             ae:'1.47cm²',  le:'5.55cm', material:'N87',     cost:1.45 },
    ],
  },
  ics: {
    hpfc: [
      { part:'TOP246YN', mfr:'Generic', family:'HPFC-1', power:'18W',  pkg:'TO-220-7C',    freq:'132kHz', cost:2.45 },
      { part:'TOP248YN', mfr:'Generic', family:'HPFC-1', power:'27W',  pkg:'TO-220-7C',    freq:'132kHz', cost:2.75 },
      { part:'TOP252YN', mfr:'Generic', family:'HPFC-1', power:'40W',  pkg:'TO-220-7C',    freq:'132kHz', cost:3.10 },
      { part:'TOP256EG', mfr:'Generic', family:'HPFC-1', power:'65W',  pkg:'EG (eSIP-7C)', freq:'132kHz', cost:3.55 },
      { part:'TOP258EG', mfr:'Generic', family:'HPFC-1', power:'80W',  pkg:'EG (eSIP-7C)', freq:'132kHz', cost:3.90 },
      { part:'TOP262EG', mfr:'Generic', family:'HPFC-1', power:'105W', pkg:'EG (eSIP-7C)', freq:'132kHz', cost:4.30 },
      { part:'TOP266EG', mfr:'Generic', family:'HPFC-1', power:'150W', pkg:'EG (eSIP-7C)', freq:'132kHz', cost:4.80 },
    ],
    lpfc: [
      { part:'TNY274PN', mfr:'Generic', family:'LPFC-1', power:'5.5W', pkg:'DIP-8B', freq:'132kHz', cost:1.25 },
      { part:'TNY276PN', mfr:'Generic', family:'LPFC-1', power:'10W',  pkg:'DIP-8B', freq:'132kHz', cost:1.55 },
      { part:'TNY278GN', mfr:'Generic', family:'LPFC-1', power:'13W',  pkg:'SO-8',   freq:'132kHz', cost:1.80 },
    ],
    optocoupler: [
      { part:'PC817C',   mfr:'Sharp',     ctr:'200%', vce:'35V', package:'DIP-4', cost:0.12 },
      { part:'LTV-817D', mfr:'Lite-On',   ctr:'200%', vce:'35V', package:'DIP-4', cost:0.12 },
      { part:'PS2801-1', mfr:'NEC',       ctr:'100%', vce:'55V', package:'DIP-4', cost:0.22 },
      { part:'FOD817C',  mfr:'ON Semi',   ctr:'200%', vce:'35V', package:'DIP-4', cost:0.15 },
    ],
    tl431: [
      { part:'TL431ACLP', mfr:'TI',        vref:'2.495V', ika:'100mA', tol:'0.5%', package:'TO-92',  cost:0.08 },
      { part:'TL431AIDR', mfr:'TI',        vref:'2.495V', ika:'100mA', tol:'0.5%', package:'SOT-23', cost:0.06 },
      { part:'KA431AZ',   mfr:'Fairchild', vref:'2.495V', ika:'100mA', tol:'1%',   package:'TO-92',  cost:0.05 },
    ],
  },
  fuses: [
    { part:'BEL-5HT 1-R',  mfr:'Bel Fuse',   rating:'1A',    voltage:'250V', type:'Slow-Blow', size:'5×20mm', cost:0.22 },
    { part:'BEL-5HT 2-R',  mfr:'Bel Fuse',   rating:'2A',    voltage:'250V', type:'Slow-Blow', size:'5×20mm', cost:0.22 },
    { part:'0312.250MXP',  mfr:'Littelfuse', rating:'250mA', voltage:'250V', type:'Slow-Blow SMD', size:'1206', cost:0.12 },
    { part:'0452.500MR',   mfr:'Littelfuse', rating:'500mA', voltage:'125V', type:'Fast-Blow SMD', size:'1206', cost:0.10 },
  ],
  varistors: [
    { part:'B72210S0271K101', mfr:'TDK/EPCOS', vaclamp:'270V', energy:'0.2J', imax:'1500A', diameter:'10mm', cost:0.28 },
    { part:'B72220S0271K101', mfr:'TDK/EPCOS', vaclamp:'270V', energy:'0.5J', imax:'4500A', diameter:'20mm', cost:0.55 },
    { part:'V20K275',         mfr:'Vishay',     vaclamp:'275V', energy:'0.3J', imax:'4000A', diameter:'20mm', cost:0.48 },
  ],
  emi: {
    x_caps: [
      { part:'ECQ-U(F)2A223ML', mfr:'Panasonic', value:'22nF',   voltage:'275VAC', type:'X2 Film', cost:0.25 },
      { part:'B32922C3104K',    mfr:'TDK',        value:'0.1µF',  voltage:'305VAC', type:'X2 Film', cost:0.32 },
      { part:'F1772-422-2P2',   mfr:'KEMET',      value:'0.22µF', voltage:'275VAC', type:'X2 Film', cost:0.38 },
    ],
    y_caps: [
      { part:'DE2E3KH471MA3B', mfr:'Murata',     value:'470pF', voltage:'250VAC', type:'Y2 Ceramic', cost:0.18 },
      { part:'SA305E104MAR',   mfr:'KEMET',       value:'100nF', voltage:'250VAC', type:'Y2 Film',    cost:0.28 },
      { part:'222237431220',   mfr:'TDK/EPCOS',   value:'2.2nF', voltage:'300VAC', type:'Y1 Ceramic', cost:0.22 },
    ],
  },
};

export const DESIGN_TREE = [
  { id:'specifications', label:'Specifications', icon:'📋', children:[
    { id:'spec-input',  label:'Input',  icon:'⚡', dialog:'InputSpec' },
    { id:'spec-output', label:'Outputs', icon:'⚡', dialog:'OutputSpec' },
    { id:'spec-safety', label:'Safety and Thermal', icon:'🌡', dialog:'SafetyThermal' },
  ]},
  { id:'design', label:'Design', icon:'⚙️', children:[
    { id:'design-options',    label:'Options',        icon:'⚙️', dialog:'DesignOptions' },
    { id:'design-key-params', label:'Key Parameters', icon:'🔑', dialog:'KeyParams' },
  ]},
  { id:'input-section', label:'Input Section', icon:'🔌', children:[
    { id:'input-rectifier', label:'Rectifier, Fuse, Surge', icon:'⚡', dialog:'Rectifier', dbKey:'diodes.bridge_rectifier' },
    { id:'input-caps',      label:'Capacitors',             icon:'🔋', dialog:'InputCaps',  dbKey:'capacitors.bulk_electrolytic' },
    { id:'input-emi',       label:'EMI Filter',             icon:'📡', dialog:'EMIFilter',  dbKey:'emi' },
  ]},
  { id:'controller-ic', label:'Controller IC', icon:'🔬', children:[
    { id:'ic-selection', label:'Selection',  icon:'✅', dialog:'ICSelection', dbKey:'ics.hpfc' },
    { id:'ic-uvov',      label:'UV/OV',      icon:'⚠️', dialog:'UVOV' },
    { id:'ic-heatsink',  label:'Heatsinks',  icon:'🌡', dialog:'Heatsink' },
    { id:'ic-ilim',      label:'ILIM/PLIM',  icon:'📊', dialog:'ILIM' },
    { id:'ic-ovp',       label:'Output OVP', icon:'🛡', dialog:'OutputOVP' },
  ]},
  { id:'transformer', label:'Transformer', icon:'🔄', children:[
    { id:'xfmr-core',   label:'Core Selection',       icon:'⬜', dialog:'CoreSelection', dbKey:'inductors.transformer_cores' },
    { id:'xfmr-bobbin', label:'Bobbin Selection',     icon:'🪱', dialog:'BobbinSelection' },
    { id:'xfmr-reqs',   label:'Requirements and Test',icon:'🧪', dialog:'XfmrRequirements' },
  ]},
  { id:'winding', label:'Winding Construction', icon:'🪛', children:[
    { id:'wind-primary',   label:'Primary and Bias', icon:'〰', dialog:'PrimaryWinding' },
    { id:'wind-secondary', label:'Secondaries',      icon:'〰', dialog:'SecondaryWinding' },
    { id:'wind-shields',   label:'Shields',          icon:'🛡', dialog:'Shields' },
    { id:'wind-materials', label:'Materials',        icon:'📦', dialog:'WindingMaterials' },
    { id:'wind-comments',  label:'Comments',         icon:'💬', dialog:'WindingComments' },
    { id:'wind-pin-alloc', label:'Pin Allocation',   icon:'📌', dialog:'PinAllocation' },
    { id:'wind-defaults',  label:'Defaults',         icon:'⚙️', dialog:'WindingDefaults' },
  ]},
  { id:'output-stage', label:'Output Stage', icon:'📤', children:[
    { id:'out-diodes',     label:'Diodes',       icon:'➡', dialog:'OutputDiodes',   dbKey:'diodes.output_schottky' },
    { id:'out-heatsinks',  label:'Heatsinks',    icon:'🌡', dialog:'OutputHeatsink' },
    { id:'out-caps',       label:'Capacitors',   icon:'🔋', dialog:'OutputCaps',     dbKey:'capacitors.output_electrolytic' },
    { id:'out-snubbers',   label:'Snubbers',     icon:'🔇', dialog:'Snubbers',       dbKey:'capacitors.snubber' },
    { id:'out-postfilter', label:'Post Filters', icon:'📡', dialog:'PostFilters' },
  ]},
  { id:'feedback', label:'Feedback', icon:'↩', children:[
    { id:'fb-bias',    label:'Bias',         icon:'⚡', dialog:'FeedbackBias' },
    { id:'fb-snubber', label:'Bias Snubber', icon:'🔇', dialog:'BiasSnubber' },
    { id:'fb-comps',   label:'Components',   icon:'🔌', dialog:'FeedbackComponents', dbKey:'ics.optocoupler' },
  ]},
  { id:'clamp', label:'Clamp', icon:'🔒', children:[
    { id:'clamp-comps', label:'Components', icon:'🔌', dialog:'ClampComponents', dbKey:'diodes.clamp' },
  ]},
  { id:'design-settings', label:'Design Settings', icon:'⚙️', children:[
    { id:'ds-defaults', label:'Defaults', icon:'⚙️', dialog:'DesignDefaults' },
  ]},
  { id:'audit', label:'Audit', icon:'🔍', children:[
    { id:'audit-results', label:'Results', icon:'⚠️', dialog:'AuditResults' },
  ]},
];
