import { ref, computed, readonly } from 'vue';

// ── Translation catalogue ─────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // Menu
    'menu.file':            'File',
    'menu.edit':            'Edit',
    'menu.view':            'View',
    'menu.activeDesign':    'Active Design',
    'menu.tools':           'Tools',
    'menu.help':            'Help',
    // File menu
    'file.new':             'New Design',
    'file.open':            'Open Design…',
    'file.save':            'Save',
    'file.saveAs':          'Save As…',
    'file.export':          'Export…',
    'file.print':           'Print…',
    'file.recent':          'Recent Designs',
    'file.close':           'Close Design',
    'file.exit':            'Exit',
    // Edit menu
    'edit.undo':            'Undo',
    'edit.redo':            'Redo',
    'edit.cut':             'Cut',
    'edit.copy':            'Copy',
    'edit.paste':           'Paste',
    'edit.selectAll':       'Select All',
    'edit.exportAll':       'Export All Tabs to PDF',
    'edit.preferences':     'Preferences…',
    // View menu
    'view.schematic':       'Schematic',
    'view.designResults':   'Design Results',
    'view.bom':             'Bill of Materials',
    'view.boardLayout':     'Board Layout',
    'view.transformer':     'Transformer Construction',
    'view.notes':           'Design Notes',
    'view.zoomIn':          'Zoom In',
    'view.zoomOut':         'Zoom Out',
    'view.fitAll':          'Fit All',
    // Active Design menu
    'design.properties':    'Design Properties',
    'design.simulate':      'Run Simulation',
    'design.optimize':      'Optimize Design',
    'design.validate':      'Validate Design',
    'design.compare':       'Compare Variants',
    // Tools menu
    'tools.compDB':         'Component Database',
    'tools.compSets':       'Component Sets',
    'tools.magnetics':      'Magnetics Database',
    'tools.calcLp':         'Inductance Calculator',
    'tools.calcThermal':    'Thermal Calculator',
    'tools.calcEfficiency': 'Efficiency Estimator',
    'tools.settings':       'Settings',
    // Help menu
    'help.helpCenter':      'Help Center',
    'help.gettingStarted':  'Getting Started',
    'help.keyboardShortcuts':'Keyboard Shortcuts',
    'help.releaseNotes':    'Release Notes',
    'help.about':           'About FluxForge',
    'help.feedback':        'Send Feedback',
    'help.techSupport':     'Get Tech Support',
    // UI labels
    'ui.language':          'LANGUAGE',
    'ui.logout':            'LOGOUT',
    'ui.getTechSupport':    'GET TECH SUPPORT',
    'ui.designWarning':     'Design Warning',
    'ui.beta':              'Beta',
    'ui.newDesign':         'New Design',
    'ui.openDesign':        'Open Design',
    'ui.compLibrary':       'Component Library',
    'ui.helpDocs':          'Help & Documentation',
    'ui.welcome':           'Welcome to FluxForge',
  },

  // ── Filipino / Tagalog ──────────────────────────────────────────────────────
  tl: {
    'menu.file': 'File', 'menu.edit': 'I-edit', 'menu.view': 'Tingnan',
    'menu.activeDesign': 'Aktibong Disenyo', 'menu.tools': 'Mga Kasangkapan', 'menu.help': 'Tulong',
    'file.new': 'Bagong Disenyo', 'file.open': 'Buksan ang Disenyo…', 'file.save': 'I-save',
    'file.saveAs': 'I-save Bilang…', 'file.export': 'I-export…', 'file.print': 'I-print…',
    'file.recent': 'Mga Kamakailan', 'file.close': 'Isara ang Disenyo', 'file.exit': 'Lumabas',
    'edit.undo': 'I-undo', 'edit.redo': 'I-redo', 'edit.cut': 'Gupitin', 'edit.copy': 'Kopyahin',
    'edit.paste': 'I-paste', 'edit.selectAll': 'Piliin Lahat', 'edit.exportAll': 'I-export Lahat ng Tab sa PDF',
    'edit.preferences': 'Mga Kagustuhan…',
    'view.schematic': 'Eskematiko', 'view.designResults': 'Mga Resulta', 'view.bom': 'Listahan ng Materyales',
    'view.boardLayout': 'Layout ng Board', 'view.transformer': 'Konstruksiyon ng Transformer', 'view.notes': 'Mga Tala',
    'view.zoomIn': 'Palakihin', 'view.zoomOut': 'Paliitin', 'view.fitAll': 'Isiksik Lahat',
    'design.properties': 'Mga Katangian', 'design.simulate': 'Patakbuhin ang Simulation',
    'design.optimize': 'I-optimize', 'design.validate': 'I-validate', 'design.compare': 'Ikumpara',
    'tools.compDB': 'Database ng Bahagi', 'tools.compSets': 'Mga Set ng Bahagi',
    'tools.magnetics': 'Database ng Magnetics', 'tools.calcLp': 'Kalkulador ng Inductance',
    'tools.calcThermal': 'Kalkulador ng Thermal', 'tools.calcEfficiency': 'Estimator ng Kahusayan',
    'tools.settings': 'Mga Setting',
    'help.helpCenter': 'Sentro ng Tulong', 'help.gettingStarted': 'Pagsisimula',
    'help.about': 'Tungkol sa FluxForge', 'help.feedback': 'Magpadala ng Feedback',
    'help.techSupport': 'Makakuha ng Tech Support',
    'ui.language': 'WIKA', 'ui.logout': 'MAG-LOGOUT', 'ui.getTechSupport': 'MAKAKUHA NG SUPORTA',
    'ui.designWarning': 'Babala sa Disenyo', 'ui.beta': 'Beta',
    'ui.newDesign': 'Bagong Disenyo', 'ui.openDesign': 'Buksan ang Disenyo',
    'ui.compLibrary': 'Library ng Bahagi', 'ui.helpDocs': 'Tulong at Dokumentasyon',
    'ui.welcome': 'Maligayang Pagdating sa FluxForge',
  },

  // ── Japanese ────────────────────────────────────────────────────────────────
  ja: {
    'menu.file': 'ファイル', 'menu.edit': '編集', 'menu.view': '表示',
    'menu.activeDesign': 'アクティブデザイン', 'menu.tools': 'ツール', 'menu.help': 'ヘルプ',
    'file.new': '新規デザイン', 'file.open': 'デザインを開く…', 'file.save': '保存',
    'file.saveAs': '名前を付けて保存…', 'file.export': 'エクスポート…', 'file.print': '印刷…',
    'file.recent': '最近のデザイン', 'file.close': 'デザインを閉じる', 'file.exit': '終了',
    'edit.undo': '元に戻す', 'edit.redo': 'やり直す', 'edit.cut': '切り取り', 'edit.copy': 'コピー',
    'edit.paste': '貼り付け', 'edit.selectAll': 'すべて選択', 'edit.exportAll': 'すべてのタブをPDFへエクスポート',
    'edit.preferences': '設定…',
    'view.schematic': '回路図', 'view.designResults': 'デザイン結果', 'view.bom': '部品表',
    'view.boardLayout': '基板レイアウト', 'view.transformer': 'トランス構造', 'view.notes': 'デザインノート',
    'view.zoomIn': '拡大', 'view.zoomOut': '縮小', 'view.fitAll': '全体を表示',
    'design.properties': 'プロパティ', 'design.simulate': 'シミュレーション実行',
    'design.optimize': '最適化', 'design.validate': '検証', 'design.compare': 'バリアント比較',
    'tools.compDB': '部品データベース', 'tools.compSets': '部品セット',
    'tools.magnetics': 'マグネティクスDB', 'tools.calcLp': 'インダクタンス計算機',
    'tools.calcThermal': '熱計算機', 'tools.calcEfficiency': '効率推定器', 'tools.settings': '設定',
    'help.helpCenter': 'ヘルプセンター', 'help.gettingStarted': '入門ガイド',
    'help.about': 'FluxForgeについて', 'help.feedback': 'フィードバック送信',
    'help.techSupport': '技術サポートを受ける',
    'ui.language': '言語', 'ui.logout': 'ログアウト', 'ui.getTechSupport': '技術サポート',
    'ui.designWarning': 'デザイン警告', 'ui.beta': 'ベータ',
    'ui.newDesign': '新規デザイン', 'ui.openDesign': 'デザインを開く',
    'ui.compLibrary': '部品ライブラリ', 'ui.helpDocs': 'ヘルプと資料',
    'ui.welcome': 'FluxForgeへようこそ',
  },

  // ── Chinese (Simplified) ─────────────────────────────────────────────────────
  zh: {
    'menu.file': '文件', 'menu.edit': '编辑', 'menu.view': '视图',
    'menu.activeDesign': '活动设计', 'menu.tools': '工具', 'menu.help': '帮助',
    'file.new': '新建设计', 'file.open': '打开设计…', 'file.save': '保存',
    'file.saveAs': '另存为…', 'file.export': '导出…', 'file.print': '打印…',
    'file.recent': '最近的设计', 'file.close': '关闭设计', 'file.exit': '退出',
    'edit.undo': '撤销', 'edit.redo': '重做', 'edit.cut': '剪切', 'edit.copy': '复制',
    'edit.paste': '粘贴', 'edit.selectAll': '全选', 'edit.exportAll': '导出所有标签页为PDF',
    'edit.preferences': '首选项…',
    'view.schematic': '原理图', 'view.designResults': '设计结果', 'view.bom': '物料清单',
    'view.boardLayout': '电路板布局', 'view.transformer': '变压器结构', 'view.notes': '设计说明',
    'view.zoomIn': '放大', 'view.zoomOut': '缩小', 'view.fitAll': '适合全部',
    'design.properties': '设计属性', 'design.simulate': '运行仿真',
    'design.optimize': '优化设计', 'design.validate': '验证设计', 'design.compare': '比较变体',
    'tools.compDB': '元件数据库', 'tools.compSets': '元件集合',
    'tools.magnetics': '磁性数据库', 'tools.calcLp': '电感计算器',
    'tools.calcThermal': '热计算器', 'tools.calcEfficiency': '效率估算器', 'tools.settings': '设置',
    'help.helpCenter': '帮助中心', 'help.gettingStarted': '入门指南',
    'help.about': '关于FluxForge', 'help.feedback': '发送反馈',
    'help.techSupport': '获取技术支持',
    'ui.language': '语言', 'ui.logout': '退出登录', 'ui.getTechSupport': '技术支持',
    'ui.designWarning': '设计警告', 'ui.beta': '测试版',
    'ui.newDesign': '新建设计', 'ui.openDesign': '打开设计',
    'ui.compLibrary': '元件库', 'ui.helpDocs': '帮助与文档',
    'ui.welcome': '欢迎使用 FluxForge',
  },

  // ── German ────────────────────────────────────────────────────────────────────
  de: {
    'menu.file': 'Datei', 'menu.edit': 'Bearbeiten', 'menu.view': 'Ansicht',
    'menu.activeDesign': 'Aktives Design', 'menu.tools': 'Werkzeuge', 'menu.help': 'Hilfe',
    'file.new': 'Neues Design', 'file.open': 'Design öffnen…', 'file.save': 'Speichern',
    'file.saveAs': 'Speichern unter…', 'file.export': 'Exportieren…', 'file.print': 'Drucken…',
    'file.recent': 'Zuletzt verwendet', 'file.close': 'Design schließen', 'file.exit': 'Beenden',
    'edit.undo': 'Rückgängig', 'edit.redo': 'Wiederholen', 'edit.cut': 'Ausschneiden', 'edit.copy': 'Kopieren',
    'edit.paste': 'Einfügen', 'edit.selectAll': 'Alles auswählen', 'edit.exportAll': 'Alle Tabs als PDF exportieren',
    'edit.preferences': 'Einstellungen…',
    'view.schematic': 'Schaltplan', 'view.designResults': 'Designergebnisse', 'view.bom': 'Stückliste',
    'view.boardLayout': 'Platinenlayout', 'view.transformer': 'Transformatorkonstruktion', 'view.notes': 'Designnotizen',
    'view.zoomIn': 'Vergrößern', 'view.zoomOut': 'Verkleinern', 'view.fitAll': 'Alles einpassen',
    'design.properties': 'Eigenschaften', 'design.simulate': 'Simulation ausführen',
    'design.optimize': 'Optimieren', 'design.validate': 'Validieren', 'design.compare': 'Varianten vergleichen',
    'tools.compDB': 'Bauteil-Datenbank', 'tools.compSets': 'Bauteil-Sets',
    'tools.magnetics': 'Magnetics-Datenbank', 'tools.calcLp': 'Induktivitätsrechner',
    'tools.calcThermal': 'Wärmerechner', 'tools.calcEfficiency': 'Effizienzschätzer', 'tools.settings': 'Einstellungen',
    'help.helpCenter': 'Hilfezentrum', 'help.gettingStarted': 'Erste Schritte',
    'help.about': 'Über FluxForge', 'help.feedback': 'Feedback senden',
    'help.techSupport': 'Tech-Support erhalten',
    'ui.language': 'SPRACHE', 'ui.logout': 'ABMELDEN', 'ui.getTechSupport': 'TECH-SUPPORT',
    'ui.designWarning': 'Design-Warnung', 'ui.beta': 'Beta',
    'ui.newDesign': 'Neues Design', 'ui.openDesign': 'Design öffnen',
    'ui.compLibrary': 'Komponentenbibliothek', 'ui.helpDocs': 'Hilfe & Dokumentation',
    'ui.welcome': 'Willkommen bei FluxForge',
  },

  // ── Korean ───────────────────────────────────────────────────────────────────
  ko: {
    'menu.file': '파일', 'menu.edit': '편집', 'menu.view': '보기',
    'menu.activeDesign': '현재 설계', 'menu.tools': '도구', 'menu.help': '도움말',
    'file.new': '새 설계', 'file.open': '설계 열기…', 'file.save': '저장',
    'file.saveAs': '다른 이름으로 저장…', 'file.export': '내보내기…', 'file.print': '인쇄…',
    'file.recent': '최근 설계', 'file.close': '설계 닫기', 'file.exit': '종료',
    'edit.undo': '실행 취소', 'edit.redo': '다시 실행', 'edit.cut': '잘라내기', 'edit.copy': '복사',
    'edit.paste': '붙여넣기', 'edit.selectAll': '모두 선택', 'edit.exportAll': '모든 탭을 PDF로 내보내기',
    'edit.preferences': '환경 설정…',
    'view.schematic': '회로도', 'view.designResults': '설계 결과', 'view.bom': '부품 목록',
    'view.boardLayout': '보드 레이아웃', 'view.transformer': '트랜스포머 구조', 'view.notes': '설계 메모',
    'view.zoomIn': '확대', 'view.zoomOut': '축소', 'view.fitAll': '전체 맞춤',
    'design.properties': '설계 속성', 'design.simulate': '시뮬레이션 실행',
    'design.optimize': '최적화', 'design.validate': '검증', 'design.compare': '변형 비교',
    'tools.compDB': '부품 데이터베이스', 'tools.compSets': '부품 세트',
    'tools.magnetics': '자성 데이터베이스', 'tools.calcLp': '인덕턴스 계산기',
    'tools.calcThermal': '열 계산기', 'tools.calcEfficiency': '효율 추정기', 'tools.settings': '설정',
    'help.helpCenter': '도움말 센터', 'help.gettingStarted': '시작하기',
    'help.about': 'FluxForge 정보', 'help.feedback': '피드백 보내기',
    'help.techSupport': '기술 지원 받기',
    'ui.language': '언어', 'ui.logout': '로그아웃', 'ui.getTechSupport': '기술 지원',
    'ui.designWarning': '설계 경고', 'ui.beta': '베타',
    'ui.newDesign': '새 설계', 'ui.openDesign': '설계 열기',
    'ui.compLibrary': '부품 라이브러리', 'ui.helpDocs': '도움말 및 문서',
    'ui.welcome': 'FluxForge에 오신 것을 환영합니다',
  },
};

// Available languages
export const LANGUAGES = [
  { code:'en', label:'English',            flag:'🇺🇸' },
  { code:'tl', label:'Filipino',           flag:'🇵🇭' },
  { code:'ja', label:'日本語',              flag:'🇯🇵' },
  { code:'zh', label:'中文 (简体)',          flag:'🇨🇳' },
  { code:'de', label:'Deutsch',            flag:'🇩🇪' },
  { code:'ko', label:'한국어',              flag:'🇰🇷' },
];

// ── Reactive state ────────────────────────────────────────────────────────────
const currentLang = ref(
  localStorage.getItem('fluxforge-lang') || navigator.language?.slice(0,2) || 'en'
);

// Ensure fallback to English if language not found
if (!TRANSLATIONS[currentLang.value]) currentLang.value = 'en';

export function useI18n() {
  const locale = currentLang;

  function t(key) {
    const dict = TRANSLATIONS[currentLang.value] || TRANSLATIONS.en;
    return dict[key] ?? TRANSLATIONS.en[key] ?? key;
  }

  function setLocale(code) {
    if (TRANSLATIONS[code]) {
      currentLang.value = code;
      localStorage.setItem('fluxforge-lang', code);
      // Update document lang attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = code;
      }
    }
  }

  return { t, locale: readonly(locale), setLocale, LANGUAGES };
}

export default useI18n;
