// TaraTrip 관광객 화면 와이어프레임을 그린다.
// 실행할 때마다 새 페이지를 만들어 거기에만 그린다. 기존 페이지와 프레임은 건드리지 않는다.

const C = {
  ink: '#191B1F', sub: '#6B7079', body: '#4A4F57', hint: '#8B9098',
  line: '#E3E5E8', divider: '#F0F1F3', soft: '#F5F6F8', white: '#FFFFFF',
  forest: '#17362E', forestMid: '#3E6457', forestLine: '#2C5247',
  onForest: '#F3F1EA', onForestSub: '#93ADA3', ticketSub: '#A9C2B8',
  mango: '#F4A836', mangoSoft: '#FDF0D8', mangoInk: '#7A4700', mangoDeep: '#A35F00', warmText: '#3B2A10',
  map: '#E6EAE2', water: '#D3E2E4', road: '#F6F7F3', photo: '#EEF0F2', photoIcon: '#9AA0A8',
  ring1: '#F3F7F5', ring2: '#E7EFEB', ring3: '#D3E2DB'
};

const ICON = {
  pin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  pin18: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  locate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  locate20: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  image: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 7"/></svg>',
  wallet: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  alert: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.5"/></svg>',
  shop: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16l-1.5-5h-13z"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>'
};

// ---------- curves for the animations (same shapes as FE/src/components/anim/scenery.ts) ----------
// The plugin has no DOM, so the curves are sampled by hand to find points along them.

function cubicPt(s, t) {
  const u = 1 - t;
  return [
    u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
    u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1]
  ];
}

// Returns { pts, at(frac) } where at() gives { x, y, angle } at that share of the curve's length.
function curve(segments) {
  const pts = [];
  segments.forEach(function (seg) {
    for (let i = pts.length ? 1 : 0; i <= 80; i++) pts.push(cubicPt(seg, i / 80));
  });
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = acc[acc.length - 1];
  return {
    pts: pts,
    at: function (frac) {
      const target = total * frac;
      let i = 1;
      while (i < acc.length - 1 && acc[i] < target) i++;
      const k = (target - acc[i - 1]) / ((acc[i] - acc[i - 1]) || 1);
      const a = pts[i - 1], b = pts[i];
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
  };
}

function seeded(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// 0-1 splash: a plane flies over three pins. The mango trail is revealed by a clipping frame
// whose width grows between animation frames (Smart Animate).
const FLIGHT_D = 'M10 48 C 46 48, 58 18, 100 20 S 158 50, 190 18';
const FLIGHT = curve([
  [[10, 48], [46, 48], [58, 18], [100, 20]],
  [[100, 20], [142, 22], [158, 50], [190, 18]]
]);
const FLIGHT_STOPS = [0, 0.5, 1].map(function (f) { return FLIGHT.at(f); });
const SPLASH_ROUTE = {
  w: 200, h: 64, r: 5.5, track: 1.8, line: 2.4, dash: '3 5', d: FLIGHT_D,
  dots: FLIGHT_STOPS.map(function (p) { return [p.x, p.y]; })
};
const PLANE_SVG = '<svg width="24" height="19.2" viewBox="-15 -12 30 24" fill="none"><path fill="' + C.onForest + '" d="M15 0c0-1.6-2-2.2-4-2.2H3.6L-4.4-11h-3.2l4.2 8.8H-9l-3-4h-2.4l1.6 6.2-1.6 6.2h2.4l3-4h5.6L-7.6 11h3.2l8-8.8H11c2 0 4-.6 4-2.2z"/></svg>';
// [x, y, scale, opacity] — large faint clouds across the top of the splash
const SKY_CLOUDS = [[250, 40, 1.5, 0.07], [30, 100, 1.1, 0.1], [190, 160, 0.8, 0.06], [-20, 70, 0.9, 0.05]];

// 2 loading: a jeepney drives along a road, one stop per step.
const ROAD_D = 'M14 182 C 92 182, 34 112, 112 106 S 214 152, 236 100 S 266 28, 320 28';
const ROAD = curve([
  [[14, 182], [92, 182], [34, 112], [112, 106]],
  [[112, 106], [190, 100], [214, 152], [236, 100]],
  [[236, 100], [258, 48], [266, 28], [320, 28]]
]);
const ROAD_FRACS = [0, 1 / 3, 2 / 3, 1];
const ROAD_STOPS = ROAD_FRACS.map(function (f) { return ROAD.at(f); });

// Smart Animate moves layers in a straight line between frames, so each stop-to-stop move is
// split into SUB frames. The vehicle then steps along the curve instead of cutting across it.
const SUB = 6;
const ROAD_SVG = (function () {
  const r = seeded(21);
  let bushes = '';
  let count = 0;
  for (let tries = 0; tries < 160 && count < 26; tries++) {
    const x = 4 + r() * 326, y = 8 + r() * 186;
    const clear = ROAD.pts.every(function (p) { return (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y) >= 900; });
    if (!clear) continue;
    const rad = 4 + r() * 6;
    bushes += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + (r() > 0.4 ? C.forestMid : C.forestLine) + '"/>';
    count++;
  }
  return '<svg width="334" height="200" viewBox="0 0 334 200" fill="none">' + bushes +
    '<path d="' + ROAD_D + '" stroke="#0F2A23" stroke-width="30" stroke-linecap="round"/>' +
    '<path d="' + ROAD_D + '" stroke="' + C.forestLine + '" stroke-width="24" stroke-linecap="round"/>' +
    '<path d="' + ROAD_D + '" stroke="' + C.onForest + '" stroke-opacity="0.5" stroke-width="1.6" stroke-dasharray="7 9"/></svg>';
})();
const JEEPNEY_SVG = '<svg width="28" height="15" viewBox="0 0 28 15" fill="none">' +
  '<rect width="28" height="15" rx="3.5" fill="' + C.onForest + '"/>' +
  '<rect x="21" width="7" height="15" rx="3" fill="' + C.mango + '"/>' +
  '<rect x="4" y="3" width="14" height="9" rx="1.5" fill="' + C.forestMid + '"/>' +
  '<path d="M11 3v9" stroke="' + C.onForest + '" stroke-width="1.2"/></svg>';

const RESULT_MAP_SVG = '<svg width="390" height="320" viewBox="0 0 390 320" fill="none">' +
  '<path d="M260 0 C 300 60, 340 90, 390 100 L390 0 Z" fill="' + C.water + '"/>' +
  '<path d="M0 120 L390 96 M0 236 L390 262 M110 0 L92 320 M292 0 L312 320 M0 30 L200 320" stroke="' + C.road + '" stroke-width="12" stroke-linecap="round"/>' +
  '<path d="M0 176 L390 170 M200 0 L214 320" stroke="' + C.road + '" stroke-width="6"/>' +
  '<path d="M78 236 L156 150 L246 196 L318 108" stroke="' + C.forest + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M78 262 L78 250" stroke="' + C.ink + '" stroke-width="3" stroke-dasharray="3 3"/>' +
  '<circle cx="78" cy="270" r="9" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="4"/></svg>';
const RESULT_PINS = [[78, 236], [156, 150], [246, 196], [318, 108]];

const ONB_MAP_SVG = '<svg width="310" height="300" viewBox="0 0 310 300" fill="none">' +
  '<path d="M0 96 L310 78 M0 210 L310 228 M88 0 L74 300 M232 0 L246 300" stroke="' + C.road + '" stroke-width="10" stroke-linecap="round"/>' +
  '<path d="M60 230 L130 132 L212 176 L258 84" stroke="' + C.forest + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<circle cx="60" cy="230" r="13" fill="' + C.forest + '" stroke="#FFFFFF" stroke-width="3"/>' +
  '<circle cx="130" cy="132" r="13" fill="' + C.forest + '" stroke="#FFFFFF" stroke-width="3"/>' +
  '<circle cx="212" cy="176" r="13" fill="' + C.mango + '" stroke="#FFFFFF" stroke-width="3"/>' +
  '<circle cx="258" cy="84" r="13" fill="' + C.forest + '" stroke="#FFFFFF" stroke-width="3"/></svg>';

const PERM_SVG = '<svg width="220" height="220" viewBox="0 0 220 220" fill="none">' +
  '<circle cx="110" cy="110" r="104" fill="' + C.ring1 + '"/><circle cx="110" cy="110" r="72" fill="' + C.ring2 + '"/>' +
  '<circle cx="110" cy="110" r="40" fill="' + C.ring3 + '"/>' +
  '<path d="M110 146s-26-23-26-41a26 26 0 0 1 52 0c0 18-26 41-26 41z" fill="' + C.forest + '"/>' +
  '<circle cx="110" cy="104" r="9" fill="' + C.mango + '"/></svg>';

const FULL_MAP_SVG = '<svg width="390" height="844" viewBox="0 0 390 844" fill="none">' +
  '<path d="M240 0 C 300 120, 350 170, 390 180 L390 0 Z" fill="' + C.water + '"/>' +
  '<path d="M0 210 L390 180 M0 470 L390 500 M0 700 L390 690 M96 0 L76 844 M300 0 L318 844 M0 60 L240 844" stroke="' + C.road + '" stroke-width="12" stroke-linecap="round"/>' +
  '<path d="M0 340 L390 330 M190 0 L206 844 M0 590 L390 600" stroke="' + C.road + '" stroke-width="6"/></svg>';

const BIG_PIN_SVG = '<svg width="40" height="52" viewBox="0 0 40 52" fill="none"><path d="M20 50s-18-16-18-30a18 18 0 0 1 36 0c0 14-18 30-18 30z" fill="' + C.forest + '"/><circle cx="20" cy="20" r="7" fill="' + C.mango + '"/></svg>';

// ---------- fonts ----------

let FAMILY = 'Noto Sans KR';
const WEIGHT_STYLES = {
  400: ['Regular'],
  500: ['Medium', 'Regular'],
  600: ['SemiBold', 'Bold', 'Medium'],
  700: ['Bold'],
  800: ['ExtraBold', 'Black', 'Bold']
};
const fontCache = {};

async function loadFonts() {
  for (const w of Object.keys(WEIGHT_STYLES)) {
    for (const style of WEIGHT_STYLES[w]) {
      try {
        await figma.loadFontAsync({ family: FAMILY, style: style });
        fontCache[w] = { family: FAMILY, style: style };
        break;
      } catch (e) { /* try next style */ }
    }
  }
  if (!fontCache[400]) {
    FAMILY = 'Inter';
    figma.notify('Noto Sans KR을 찾지 못해 Inter로 그립니다. 한글이 깨지면 글꼴을 바꿔 주세요.');
    for (const w of Object.keys(WEIGHT_STYLES)) {
      const style = w >= 700 ? 'Bold' : (w >= 500 ? 'Medium' : 'Regular');
      await figma.loadFontAsync({ family: 'Inter', style: style });
      fontCache[w] = { family: 'Inter', style: style };
    }
  }
  for (const w of Object.keys(WEIGHT_STYLES)) {
    if (!fontCache[w]) fontCache[w] = fontCache[700] || fontCache[400];
  }
}

// ---------- helpers ----------

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function paint(hex, opacity) {
  return { type: 'SOLID', color: rgb(hex), opacity: opacity === undefined ? 1 : opacity };
}

function pad(p) {
  if (typeof p === 'number') return [p, p, p, p];
  if (p.length === 2) return [p[0], p[1], p[0], p[1]];
  if (p.length === 3) return [p[0], p[1], p[2], p[1]];
  return p;
}

// o: dir 'V'|'H'|'NONE', gap, pad, fill, fillOpacity, radius, w, h, align, justify, wrap, stroke, strokeWeight, clip
function F(name, o) {
  o = o || {};
  const f = figma.createFrame();
  f.name = name;
  f.fills = o.fill ? [paint(o.fill, o.fillOpacity)] : [];
  f.clipsContent = !!o.clip;
  if (o.dir !== 'NONE') {
    f.layoutMode = o.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL';
    f.itemSpacing = o.gap || 0;
    const p = pad(o.pad || 0);
    f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];
    f.counterAxisAlignItems = o.align || 'MIN';
    f.primaryAxisAlignItems = o.justify || 'MIN';
    if (o.wrap) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = o.gap || 0; }
  }
  if (o.radius !== undefined) {
    if (Array.isArray(o.radius)) {
      f.topLeftRadius = o.radius[0]; f.topRightRadius = o.radius[1];
      f.bottomRightRadius = o.radius[2]; f.bottomLeftRadius = o.radius[3];
    } else {
      f.cornerRadius = o.radius;
    }
  }
  if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = o.strokeWeight || 1; f.strokeAlign = 'INSIDE'; }
  if (o.w || o.h) f.resize(o.w || 100, o.h || 100);
  if (o.dir !== 'NONE') {
    const horiz = f.layoutMode === 'HORIZONTAL';
    f.primaryAxisSizingMode = (horiz ? o.w : o.h) ? 'FIXED' : 'AUTO';
    f.counterAxisSizingMode = (horiz ? o.h : o.w) ? 'FIXED' : 'AUTO';
  }
  return f;
}

// o: lh (percent), align, underline
function T(chars, size, weight, color, o) {
  o = o || {};
  const t = figma.createText();
  t.fontName = fontCache[weight] || fontCache[400];
  t.fontSize = size;
  t.characters = chars;
  t.fills = [paint(color || C.ink)];
  t.letterSpacing = { unit: 'PERCENT', value: size >= 22 ? -3 : -1 };
  if (o.lh) t.lineHeight = { unit: 'PERCENT', value: o.lh };
  if (o.align) t.textAlignHorizontal = o.align;
  if (o.underline) t.textDecoration = 'UNDERLINE';
  return t;
}

function logo(size, taraColor) {
  const t = T('TaraTrip', size, 800, taraColor);
  t.setRangeFills(4, 8, [paint(C.mango)]);
  t.name = 'logo';
  return t;
}

function icon(svg, color) {
  const n = figma.createNodeFromSvg(svg.replace(/currentColor/g, color));
  n.name = 'icon';
  return n;
}

function rect(name, w, h, color, radius) {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(w, h);
  r.fills = [paint(color)];
  if (radius) r.cornerRadius = radius;
  return r;
}

function shadow(node, alpha, y, blur) {
  node.effects = [{
    type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: alpha || 0.12 }, offset: { x: 0, y: y || 2 },
    radius: blur || 8, spread: 0, visible: true, blendMode: 'NORMAL'
  }];
}

// o: fillW, fillH, grow
function add(parent, child, o) {
  parent.appendChild(child);
  o = o || {};
  if (o.fillW) {
    child.layoutSizingHorizontal = 'FILL';
    if (child.type === 'TEXT') child.textAutoResize = 'HEIGHT';
  }
  if (o.fillH) child.layoutSizingVertical = 'FILL';
  if (o.grow) child.layoutGrow = 1;
  return child;
}

// Places a child freely inside an auto-layout parent.
function absolute(parent, child, x, y) {
  parent.appendChild(child);
  child.layoutPositioning = 'ABSOLUTE';
  child.x = x; child.y = y;
  return child;
}

function spacer(parent, h) {
  return add(parent, F('spacer', { dir: 'V', h: h }), { fillW: true });
}

function button(label, o) {
  const b = F(label, {
    dir: 'H', gap: 8, pad: [0, o.padX || 16], h: o.h || 56, radius: o.radius === undefined ? 16 : o.radius,
    fill: o.bg, stroke: o.stroke, align: 'CENTER', justify: 'CENTER'
  });
  if (o.icon) add(b, icon(o.icon, o.iconColor || o.fg));
  add(b, T(label, o.size || 17, o.weight || 700, o.fg));
  if (o.iconAfter) add(b, icon(o.iconAfter, o.iconColor || o.fg));
  return b;
}

function primaryButton(label) { return button(label, { bg: C.forest, fg: C.white }); }
function softButton(label, h) {
  return button(label, { bg: C.soft, fg: C.ink, h: h || 56, size: h ? 16 : 17, weight: h ? 600 : 700 });
}
function textButton(label, color) {
  return button(label, { fg: color || C.forest, h: 44, padX: 12, size: 15, weight: 600 });
}

function chip(label, selected) {
  return button(label, selected
    ? { bg: C.forest, fg: C.white, h: 40, radius: 999, size: 15, weight: 600 }
    : { bg: C.white, fg: C.ink, stroke: C.line, h: 40, radius: 999, size: 15, weight: 500 });
}

function iconButton(name, svg, o) {
  o = o || {};
  const size = o.size || 44;
  const b = F(name, { dir: 'H', w: size, h: size, radius: size / 2, fill: o.bg, align: 'CENTER', justify: 'CENTER' });
  if (o.shadow) shadow(b);
  add(b, icon(svg, o.color || C.ink));
  return b;
}

function screen(name, h, bg) {
  return F(name, { dir: 'V', w: 390, h: h, fill: bg || C.white, clip: true });
}

function footer(root) {
  return add(root, F('footer', { dir: 'V', gap: 10, pad: [8, 20, 28, 20], align: 'CENTER' }), { fillW: true });
}

function label(text) { return T(text, 14, 600, C.sub); }

function title(text, color) { return T(text, 26, 800, color || C.ink, { lh: 138 }); }

function bodyText(text) { return T(text, 16, 400, C.body, { lh: 160 }); }

function pageDots(active) {
  const d = F('page dots', { dir: 'H', gap: 6, align: 'CENTER' });
  [0, 1].forEach(function (i) {
    add(d, rect(i === active ? 'dot (active)' : 'dot', i === active ? 20 : 6, 6, i === active ? C.forest : C.line, 3));
  });
  return d;
}

// Dashed line with half-circle notches; the parent ticket must clip its content.
function perforation(width, notchColor) {
  const p = F('perforation', { dir: 'NONE', w: width, h: 20 });
  const line = figma.createLine();
  line.resize(width, 0);
  line.strokes = [paint(C.forestMid)];
  line.strokeWeight = 1;
  line.dashPattern = [4, 4];
  p.appendChild(line); line.x = 0; line.y = 10;
  [-10, width - 10].forEach(function (x) {
    const e = figma.createEllipse();
    e.resize(20, 20);
    e.fills = [paint(notchColor)];
    p.appendChild(e); e.x = x; e.y = 0;
  });
  return p;
}

// spec: one of LOADING_ROUTE / SPLASH_ROUTE. reveal: width of the visible mango line. lit: dots turned on.
function animatedRoute(spec, reveal, lit) {
  const box = F('route', { dir: 'NONE', w: spec.w, h: spec.h });
  const track = icon('<svg width="' + spec.w + '" height="' + spec.h + '" viewBox="0 0 ' + spec.w + ' ' + spec.h + '" fill="none">' +
    '<path d="' + spec.d + '" stroke="' + C.forestMid + '" stroke-width="' + spec.track + '" stroke-dasharray="' + spec.dash + '" stroke-linecap="round"/></svg>', C.forestMid);
  track.name = 'track';
  box.appendChild(track); track.x = 0; track.y = 0;
  const clipBox = F('reveal', { dir: 'NONE', w: Math.max(1, reveal), h: spec.h, clip: true });
  box.appendChild(clipBox); clipBox.x = 0; clipBox.y = 0;
  const line = icon('<svg width="' + spec.w + '" height="' + spec.h + '" viewBox="0 0 ' + spec.w + ' ' + spec.h + '" fill="none">' +
    '<path d="' + spec.d + '" stroke="' + C.mango + '" stroke-width="' + spec.line + '" stroke-linecap="round"/></svg>', C.mango);
  line.name = 'line';
  clipBox.appendChild(line); line.x = 0; line.y = 0;
  spec.dots.forEach(function (p, i) {
    const dot = figma.createEllipse();
    dot.name = 'dot ' + (i + 1);
    dot.resize(spec.r * 2, spec.r * 2);
    if (i < lit) {
      dot.fills = [paint(C.mango)];
      dot.strokes = [paint(C.mango)];
    } else {
      dot.fills = [paint(C.forest)];
      dot.strokes = [paint(C.forestMid)];
    }
    dot.strokeWeight = 2.5;
    dot.strokeAlign = 'INSIDE';
    box.appendChild(dot); dot.x = p[0] - spec.r; dot.y = p[1] - spec.r;
  });
  return box;
}

// Puts node's center on (x, y) inside a free-layout parent, turned to `angle` (radians, y down).
// Smart Animate then moves and turns it between frames that share the layer name.
function placeRotated(parent, node, x, y, angle) {
  parent.appendChild(node);
  const w = node.width, h = node.height;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  node.relativeTransform = [
    [cos, -sin, x - (cos * w / 2 - sin * h / 2)],
    [sin, cos, y - (sin * w / 2 + cos * h / 2)]
  ];
  return node;
}

// frac: how far along the road the jeepney is (0–1). Stops it has reached are lit.
function roadScene(frac) {
  const box = F('road', { dir: 'NONE', w: 334, h: 200 });
  const art = icon(ROAD_SVG, C.ink);
  art.name = 'road art';
  box.appendChild(art); art.x = 0; art.y = 0;
  ROAD_STOPS.forEach(function (p, i) {
    const lit = ROAD_FRACS[i] <= frac + 1e-6;
    const stop = F('stop ' + (i + 1), {
      dir: 'H', w: 22, h: 22, radius: 11, fill: lit ? C.mango : C.forest,
      stroke: C.onForest, strokeWeight: 2.5, align: 'CENTER', justify: 'CENTER'
    });
    stop.strokeAlign = 'CENTER';
    add(stop, T(String(i + 1), 12, 800, lit ? C.forest : C.mango));
    // 22px to the left of the direction of travel, clear of the jeepney
    box.appendChild(stop);
    stop.x = p.x + Math.sin(p.angle) * 22 - 11;
    stop.y = p.y - Math.cos(p.angle) * 22 - 11;
  });
  const at = ROAD.at(frac);
  const jeep = icon(JEEPNEY_SVG, C.ink);
  jeep.name = 'jeepney';
  placeRotated(box, jeep, at.x, at.y, at.angle);
  return box;
}

function cloud(scale, opacity) {
  const c = icon('<svg width="' + (82 * scale) + '" height="' + (22 * scale) + '" viewBox="0 0 82 22" fill="none">' +
    '<g fill="' + C.onForest + '"><ellipse cx="22" cy="14" rx="22" ry="9"/><ellipse cx="40" cy="6" rx="16" ry="11"/>' +
    '<ellipse cx="58" cy="13" rx="19" ry="8"/><rect x="6" y="13" width="70" height="9" rx="4.5"/></g></svg>', C.onForest);
  c.opacity = opacity;
  return c;
}

// "진행 중" that blinks in prototypes: two variants that switch to each other after a delay.
let blinkOn = null;
async function buildBlinkComponent(page) {
  function variant(name, opacity) {
    const c = figma.createComponent();
    c.name = name;
    c.layoutMode = 'HORIZONTAL';
    c.primaryAxisSizingMode = 'AUTO';
    c.counterAxisSizingMode = 'AUTO';
    c.fills = [];
    const t = T('진행 중', 13, 400, C.mango);
    t.opacity = opacity;
    c.appendChild(t);
    return c;
  }
  const on = variant('state=on', 1);
  const dim = variant('state=dim', 0.25);
  const set = figma.combineAsVariants([on, dim], page);
  set.name = '진행 중 (깜빡임)';
  set.layoutMode = 'HORIZONTAL';
  set.itemSpacing = 16;
  set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 16;
  set.primaryAxisSizingMode = 'AUTO';
  set.counterAxisSizingMode = 'AUTO';
  set.fills = [paint(C.forest)];
  const swap = function (to) {
    return [{
      trigger: { type: 'AFTER_TIMEOUT', timeout: 0.3 },
      actions: [{ type: 'NODE', destinationId: to.id, navigation: 'CHANGE_TO', transition: { type: 'DISSOLVE', easing: { type: 'EASE_IN_AND_OUT' }, duration: 0.45 }, preserveScrollPosition: false }]
    }];
  };
  try {
    await on.setReactionsAsync(swap(dim));
    await dim.setReactionsAsync(swap(on));
  } catch (e) { /* blinking is optional */ }
  blinkOn = on;
  return set;
}

const links = [];
function link(node, key) { links.push([node, key]); }

// Frame-to-frame auto advance. transition: 'smart' | 'smartOut' | 'dissolve'
const autos = [];
function auto(fromKey, toKey, delay, transition, duration) { autos.push([fromKey, toKey, delay, transition, duration]); }

// ---------- row 1: main flow ----------

function buildMain() {
  const root = screen('1. 조건 입력 (홈)', 844);

  const header = add(root, F('header', { dir: 'H', h: 56, pad: [0, 20], align: 'CENTER', justify: 'SPACE_BETWEEN' }), { fillW: true });
  add(header, logo(19, C.forest));
  const region = add(header, F('region', { dir: 'H', gap: 4, pad: [0, 12], h: 36, radius: 999, fill: C.soft, align: 'CENTER' }));
  add(region, icon(ICON.pin, C.ink));
  add(region, T('[지역]', 14, 600));
  add(region, icon(ICON.chevronDown, C.ink));
  link(region, 'region');

  const main = add(root, F('main', { dir: 'V', gap: 28, pad: [12, 20, 24, 20] }), { fillW: true, grow: true });
  add(main, title('오늘 하루,\n어떻게 보내고 싶나요?'), { fillW: true });

  const free = add(main, F('free text', { dir: 'V', gap: 10 }), { fillW: true });
  add(free, label('편하게 적어도 돼요'));
  const area = add(free, F('textarea', { dir: 'V', pad: [14, 16], radius: 16, fill: C.soft }), { fillW: true });
  add(area, T('예: 1,000페소로 현지 음식 먹고 시장 구경하고 싶어', 16, 400, C.hint, { lh: 150 }), { fillW: true });

  const budget = add(main, F('budget', { dir: 'V', gap: 10 }), { fillW: true });
  add(budget, label('하루 예산'));
  const amount = add(budget, F('amount', { dir: 'H', gap: 4, pad: [0, 0, 8, 0], align: 'BASELINE' }), { fillW: true });
  amount.strokes = [paint(C.forest)];
  amount.strokeTopWeight = 0; amount.strokeLeftWeight = 0; amount.strokeRightWeight = 0; amount.strokeBottomWeight = 2;
  amount.strokeAlign = 'INSIDE';
  add(amount, T('₱', 26, 700));
  add(amount, T('1,000', 30, 800), { grow: true });
  add(amount, T('페소', 14, 400, C.sub));
  add(budget, T('≈ [원화 환산]원 · 오늘 환율 기준', 14, 400, C.sub));
  const quick = add(budget, F('quick add', { dir: 'H', gap: 8 }));
  ['+₱500', '+₱1,000', '+₱3,000'].forEach(function (q) {
    add(quick, button(q, { bg: C.soft, fg: C.body, h: 32, radius: 8, padX: 12, size: 13, weight: 600 }));
  });

  const food = add(main, F('food', { dir: 'V', gap: 10 }), { fillW: true });
  add(food, label('먹고 싶은 음식'));
  const chips = add(food, F('chips', { dir: 'H', gap: 8, wrap: true }), { fillW: true });
  [['[음식 1]', true], ['[음식 2]', false], ['[음식 3]', true], ['[음식 4]', false], ['[음식 5]', false]]
    .forEach(function (c) { add(chips, chip(c[0], c[1])); });

  const places = add(main, F('places', { dir: 'V', gap: 10 }), { fillW: true });
  add(places, label('꼭 가보고 싶은 곳'));
  const search = add(places, F('search', { dir: 'H', gap: 10, pad: [0, 16], h: 52, radius: 16, fill: C.soft, align: 'CENTER' }), { fillW: true });
  add(search, icon(ICON.search, C.sub));
  add(search, T('관광지 검색', 16, 400, C.sub));
  link(search, 'search');
  const start = add(places, F('start', { dir: 'H', pad: [4, 2], align: 'CENTER', justify: 'SPACE_BETWEEN' }), { fillW: true });
  add(start, T('출발 위치', 15, 500));
  const here = add(start, F('current location', { dir: 'H', gap: 6, align: 'CENTER' }));
  add(here, icon(ICON.locate, C.forest));
  add(here, T('현재 위치', 15, 600, C.forest));
  link(here, 'startPick');

  link(add(footer(root), primaryButton('코스 추천받기'), { fillW: true }), 'loading');
  return root;
}

// step: 0-2 = that step is in progress, 3 = all done
// step: the active row (3 = all done). frac: jeepney position along the road.
function buildLoading(step, frac, name) {
  const root = screen(name, 844, C.forest);

  const header = add(root, F('header', { dir: 'H', h: 56, pad: [0, 8], align: 'CENTER' }), { fillW: true });
  link(add(header, iconButton('close', ICON.close, { color: C.onForest })), 'main');

  const main = add(root, F('main', { dir: 'V', pad: [32, 28, 24, 28] }), { fillW: true, grow: true });
  add(main, roadScene(frac));
  spacer(main, 44);
  add(main, title('[지역]의 하루를\n엮고 있어요', C.onForest), { fillW: true });
  spacer(main, 40);

  const steps = add(main, F('steps', { dir: 'V' }), { fillW: true });
  [['01', '요청 읽기'], ['02', '예산 안의 가게 찾기'], ['03', '동선 잇기']].forEach(function (s, i) {
    const active = i === step;
    const row = add(steps, F('step ' + s[0], { dir: 'H', gap: 16, pad: [14, 0], align: 'CENTER' }), { fillW: true });
    row.strokes = [paint(C.forestLine)];
    row.strokeTopWeight = 1; row.strokeLeftWeight = 0; row.strokeRightWeight = 0;
    row.strokeBottomWeight = i === 2 ? 1 : 0;
    row.strokeAlign = 'INSIDE';
    add(row, T(s[0], 15, 400, active ? C.mango : C.onForestSub)).name = 'number';
    add(row, T(s[1], 15, active ? 700 : 400, active ? C.onForest : C.onForestSub), { grow: true }).name = 'label';
    let status;
    if (active && blinkOn) status = blinkOn.createInstance();
    else status = T(active ? '진행 중' : (i < step ? '완료' : '대기'), 13, 400, active ? C.mango : C.onForestSub);
    status.name = 'status';
    add(row, status);
  });

  const f = add(root, F('footer', { dir: 'H', pad: [8, 20, 28, 20], justify: 'CENTER' }), { fillW: true });
  link(add(f, T('(프로토타입) 결과 화면으로', 13, 400, C.onForestSub, { underline: true })), 'result');
  return root;
}

function buildResult() {
  const root = F('3. 추천 코스', { dir: 'V', w: 390, fill: C.white, clip: true });
  root.itemSpacing = -24;

  const map = add(root, F('map (Leaflet in app)', { dir: 'NONE', w: 390, h: 320, fill: C.map, clip: true }));
  const art = icon(RESULT_MAP_SVG, C.ink);
  art.name = 'map art';
  map.appendChild(art); art.x = 0; art.y = 0;
  RESULT_PINS.forEach(function (p, i) {
    const pin = F('pin ' + (i + 1), { dir: 'H', w: 32, h: 32, radius: 16, fill: C.forest, stroke: C.white, strokeWeight: 3, align: 'CENTER', justify: 'CENTER' });
    add(pin, T(String(i + 1), 14, 800, C.mango));
    map.appendChild(pin); pin.x = p[0] - 16; pin.y = p[1] - 16;
  });
  const back = iconButton('back', ICON.back, { bg: C.white, shadow: true });
  map.appendChild(back); back.x = 12; back.y = 12;
  link(back, 'main');

  const sheet = add(root, F('sheet', { dir: 'V', pad: [10, 20, 32, 20], fill: C.white, radius: [24, 24, 0, 0] }), { fillW: true });
  const handle = add(sheet, F('handle', { dir: 'H', justify: 'CENTER' }), { fillW: true });
  add(handle, rect('grabber', 36, 4, C.line, 2));
  spacer(sheet, 18);

  const ticket = add(sheet, F('ticket', { dir: 'V', radius: 20, fill: C.forest, clip: true }), { fillW: true });
  const top = add(ticket, F('ticket top', { dir: 'V', gap: 6, pad: [22, 22, 10, 22] }), { fillW: true });
  add(top, T('[지역] 하루 코스 · 4곳', 13, 600, C.ticketSub));
  const price = add(top, F('price', { dir: 'H', gap: 8, align: 'BASELINE' }));
  add(price, T('₱920', 34, 800, C.mango));
  add(price, T('≈ [원화 환산]원', 14, 400, C.ticketSub));
  add(ticket, perforation(350, C.white));
  const stats = add(ticket, F('ticket stats', { dir: 'H', gap: 8, pad: [10, 22, 22, 22] }), { fillW: true });
  [['예산', '₱1,000', C.onForest], ['남는 돈', '₱80', C.mango], ['소요 시간', '5시간 30분', C.onForest]].forEach(function (s) {
    const cell = add(stats, F(s[0], { dir: 'V', gap: 4 }), { grow: true });
    add(cell, T(s[0], 12, 400, C.ticketSub));
    add(cell, T(s[1], 16, 700, s[2]));
  });

  spacer(sheet, 12);
  const tiles = add(sheet, F('cost breakdown', { dir: 'H', gap: 8 }), { fillW: true });
  [['식비', '₱710'], ['입장료', '₱150'], ['교통비', '₱60']].forEach(function (c) {
    const tile = add(tiles, F(c[0], { dir: 'V', gap: 4, pad: 14, radius: 16, fill: C.soft }), { grow: true });
    add(tile, T(c[0], 13, 400, C.sub));
    add(tile, T(c[1], 17, 700));
  });

  spacer(sheet, 12);
  const why = add(sheet, F('why this route', { dir: 'V', gap: 6, pad: [16, 18], radius: 16, fill: C.mangoSoft }), { fillW: true });
  add(why, T('왜 이 코스냐면', 13, 700, C.mangoInk));
  add(why, T('[추천 요약: 이 코스가 예산과 취향에 맞는 이유]', 15, 400, C.warmText, { lh: 160 }), { fillW: true });

  const heading = add(sheet, F('heading', { dir: 'V', pad: [32, 0, 16, 0] }), { fillW: true });
  add(heading, T('코스 순서', 20, 800));

  [
    ['10:00', '[식당 이름]', '식당', '60분', '₱250', null],
    ['11:20', '[시장 이름]', '시장', '60분', '₱180', '지프니 · 15분 · ₱13'],
    ['12:40', '[관광지 이름]', '관광지', '90분', '₱150', '도보 · 20분'],
    ['14:30', '[가게 이름]', '가게', '45분', '₱280', '트라이시클 · 10분 · ₱47']
  ].forEach(function (s, i) {
    if (s[5]) {
      const tr = add(sheet, F('transport', { dir: 'H', gap: 12, pad: [4, 0, 4, 15], align: 'CENTER' }), { fillW: true });
      add(tr, rect('line', 2, 32, '#D3D6DA'));
      const pill = add(tr, F('pill', { dir: 'H', pad: [4, 10], radius: 999, fill: C.soft }));
      add(pill, T(s[5], 13, 400, C.sub));
    }
    const row = add(sheet, F('stop ' + (i + 1), { dir: 'H', gap: 14, pad: [6, 0] }), { fillW: true });
    const num = add(row, F('order', { dir: 'H', w: 32, h: 32, radius: 16, fill: C.forest, align: 'CENTER', justify: 'CENTER' }));
    add(num, T(String(i + 1), 15, 800, C.mango));
    const info = add(row, F('info', { dir: 'V', gap: 4 }), { grow: true });
    add(info, T(s[0] + ' · ' + s[2] + ' · ' + s[3], 13, 400, C.sub));
    const line = add(info, F('name row', { dir: 'H', gap: 8, align: 'BASELINE', justify: 'SPACE_BETWEEN' }), { fillW: true });
    add(line, T(s[1], 17, 700));
    add(line, T(s[4], 16, 700));
    add(info, T('[이곳을 추천한 이유]', 14, 400, C.sub, { lh: 150 }), { fillW: true });
    link(row, 'place');
  });

  spacer(sheet, 32);
  link(add(sheet, softButton('조건 바꿔서 다시 추천받기', 52), { fillW: true }), 'main');
  return root;
}

function buildPlace() {
  const root = screen('4. 장소 상세', 844);

  const body = add(root, F('body', { dir: 'V' }), { fillW: true, grow: true });
  body.itemSpacing = -24;

  const photo = add(body, F('photo', { dir: 'V', h: 260, fill: C.photo, align: 'CENTER', justify: 'CENTER' }), { fillW: true });
  add(photo, icon(ICON.image, C.photoIcon));
  link(absolute(photo, iconButton('back', ICON.back, { bg: C.white, shadow: true }), 12, 12), 'result');
  const counter = F('photo count', { dir: 'H', pad: [4, 10], radius: 999, fill: C.forest, fillOpacity: 0.85 });
  add(counter, T('1 / [n]', 12, 600, C.white));
  absolute(photo, counter, 0, 0);
  counter.x = 390 - 16 - counter.width; counter.y = 260 - 36 - counter.height;

  const main = add(body, F('main', { dir: 'V', gap: 22, pad: [24, 20], fill: C.white, radius: [24, 24, 0, 0] }), { fillW: true, grow: true });
  const head = add(main, F('title', { dir: 'V', gap: 8 }), { fillW: true });
  const tag = add(head, F('tag', { dir: 'H', pad: [3, 10], radius: 999, fill: C.mangoSoft }));
  add(tag, T('코스 1번째 · 식당', 13, 700, C.mangoInk));
  add(head, T('[식당 이름]', 26, 800));
  add(head, T('[가게 소개 문구]', 15, 400, C.body, { lh: 160 }), { fillW: true });

  const facts = add(main, F('facts', { dir: 'V', gap: 14 }), { fillW: true });
  [[ICON.wallet, '가격대', '₱[최저] – ₱[최고]'], [ICON.clock, '영업시간', '[08:00 – 20:00]'], [ICON.pin18, '주소', '[주소]']]
    .forEach(function (r) {
      const row = add(facts, F(r[1], { dir: 'H', gap: 12, align: 'CENTER' }), { fillW: true });
      const key = add(row, F('label', { dir: 'H', gap: 8, w: 88, align: 'CENTER' }));
      add(key, icon(r[0], C.sub));
      add(key, T(r[1], 15, 400, C.sub));
      add(row, T(r[2], 15, 600));
    });

  const card = add(main, F('in this route', { dir: 'V', gap: 10, pad: 18, radius: 20, fill: C.soft }), { fillW: true });
  add(card, T('이 코스에서는', 15, 700));
  const cost = add(card, F('cost', { dir: 'H', gap: 8, align: 'BASELINE' }));
  add(cost, T('₱250', 22, 800, C.forest));
  add(cost, T('≈ [원화 환산]원 · 60분 머물러요', 14, 400, C.sub));
  add(card, T('[이곳을 추천한 이유]', 14, 400, C.body, { lh: 155 }), { fillW: true });

  add(footer(root), primaryButton('길찾기'), { fillW: true });
  return root;
}

function buildError(variant) {
  const copy = {
    budget: ['5a. 오류 · 예산 부족', '예산이 조금 부족해요',
      '₱[예산]으로는 하루 코스를 짜기 어려워요. 예산을 ₱[최소 금액] 이상으로 올리거나, 가고 싶은 곳을 줄여 보세요.', '예산 다시 정하기'],
    none: ['5b. 오류 · 결과 없음', '맞는 장소를 찾지 못했어요',
      '[지역]에서 고른 조건에 맞는 곳이 아직 없어요. 다른 음식을 고르거나 조건을 줄여 보세요.', '조건 바꾸기'],
    timeout: ['5c. 오류 · 시간 초과', '추천이 평소보다 오래 걸려요',
      '잠시 후 다시 시도해 주세요. 입력한 조건은 그대로 남아 있어요.', '조건 바꾸기']
  }[variant];
  const root = screen(copy[0], 844);

  const header = add(root, F('header', { dir: 'H', h: 56, pad: [0, 8], align: 'CENTER' }), { fillW: true });
  link(add(header, iconButton('back', ICON.back)), 'main');

  const main = add(root, F('main', { dir: 'V', gap: 20, pad: [40, 24, 24, 24] }), { fillW: true, grow: true });
  const badge = add(main, F('alert', { dir: 'H', w: 64, h: 64, radius: 20, fill: C.mangoSoft, align: 'CENTER', justify: 'CENTER' }));
  add(badge, icon(ICON.alert, C.mangoDeep));
  const text = add(main, F('message', { dir: 'V', gap: 12 }), { fillW: true });
  add(text, title(copy[1]), { fillW: true });
  add(text, bodyText(copy[2]), { fillW: true });

  const f = footer(root);
  if (variant === 'timeout') {
    link(add(f, primaryButton('다시 시도하기'), { fillW: true }), 'loading');
    link(add(f, softButton(copy[3]), { fillW: true }), 'main');
  } else {
    link(add(f, primaryButton(copy[3]), { fillW: true }), 'main');
  }
  return root;
}

// ---------- row 2: app start ----------

// frac: plane position along the flight path (0–1). The trail is revealed up to the plane,
// and the sky clouds drift a little to the left over the flight (reset under the loop's dissolve).
function buildSplash(showLogo, frac, name) {
  const root = F(name,
    { dir: 'V', w: 390, h: 844, fill: C.forest, clip: true, align: 'CENTER', justify: 'CENTER', pad: [0, 0, 80, 0] });
  SKY_CLOUDS.forEach(function (c, i) {
    const node = cloud(c[2], c[3]);
    node.name = 'cloud ' + (i + 1);
    absolute(root, node, c[0] - 16 * frac, c[1]);
    root.insertChild(i, node);
  });
  const stack = add(root, F('brand', { dir: 'V', gap: 18, align: 'CENTER' }));
  const mark = add(stack, logo(42, C.onForest));
  const reveal = frac >= 1 ? SPLASH_ROUTE.w : Math.max(1, FLIGHT.at(frac).x + 2);
  const lit = [0, 0.5, 1].filter(function (f) { return f <= frac + 1e-6; }).length;
  const flight = add(stack, animatedRoute(SPLASH_ROUTE, reveal, lit));
  const at = FLIGHT.at(frac);
  const plane = icon(PLANE_SVG, C.onForest);
  plane.name = 'plane';
  placeRotated(flight, plane, at.x, at.y, at.angle);
  const tagline = add(stack, T('예산 안에서 만나는 현지의 하루', 15, 400, C.onForestSub));
  tagline.name = 'tagline';
  if (!showLogo) { mark.opacity = 0; tagline.opacity = 0; }
  const next = T('(프로토타입) 다음', 13, 400, C.onForestSub, { underline: true });
  absolute(root, next, 0, 844 - 40 - 20);
  next.x = (390 - next.width) / 2;
  link(next, 'onb1');
  return root;
}

function onboardingFrame(name, dotIndex, heading, body, cta, nextKey, illustration) {
  const root = screen(name, 844);
  const header = add(root, F('header', { dir: 'H', h: 56, pad: [0, 12], align: 'CENTER', justify: 'MAX' }), { fillW: true });
  link(add(header, textButton('건너뛰기', C.sub)), 'permAsk');
  const art = add(root, F('illustration', { dir: 'V', pad: [0, 40], align: 'CENTER', justify: 'CENTER' }), { fillW: true, grow: true });
  illustration(art);
  const main = add(root, F('text', { dir: 'V', gap: 14, pad: [0, 24, 24, 24] }), { fillW: true });
  add(main, pageDots(dotIndex));
  add(main, title(heading), { fillW: true });
  add(main, bodyText(body), { fillW: true });
  link(add(footer(root), primaryButton(cta), { fillW: true }), nextKey);
  return root;
}

function buildOnboarding1() {
  return onboardingFrame('0-2. 첫 방문 안내 1', 0, '예산만 정하면\n하루 코스를 짜 드려요',
    '먹고 싶은 음식과 가고 싶은 곳을 고르면, 예산 안에서 식비·입장료·교통비까지 나눠서 보여 드려요.',
    '다음', 'onb2', function (art) {
      const ticket = add(art, F('ticket', { dir: 'V', w: 310, radius: 22, fill: C.forest, clip: true }));
      const top = add(ticket, F('ticket top', { dir: 'V', gap: 6, pad: [26, 24, 10, 24] }), { fillW: true });
      add(top, T('오늘의 예산', 13, 600, C.ticketSub));
      add(top, T('₱1,000', 40, 800, C.mango));
      add(ticket, perforation(310, C.white));
      const rows = add(ticket, F('ticket rows', { dir: 'V', gap: 10, pad: [10, 24, 26, 24] }), { fillW: true });
      [['식비', '₱710'], ['입장료', '₱150'], ['교통비', '₱60']].forEach(function (r) {
        const row = add(rows, F(r[0], { dir: 'H', justify: 'SPACE_BETWEEN' }), { fillW: true });
        add(row, T(r[0], 14, 400, C.ticketSub));
        add(row, T(r[1], 14, 700, C.onForest));
      });
    });
}

function buildOnboarding2() {
  return onboardingFrame('0-3. 첫 방문 안내 2', 1, '관광객이 잘 모르는\n현지 가게로 이어 드려요',
    '시장, 작은 식당, 동네 가게처럼 현지 사람들이 꾸려 가는 곳을 코스에 함께 넣어요.',
    '시작하기', 'permAsk', function (art) {
      const card = add(art, F('map card', { dir: 'NONE', w: 310, h: 300, radius: 24, fill: C.map, clip: true }));
      const m = icon(ONB_MAP_SVG, C.ink);
      card.appendChild(m); m.x = 0; m.y = 0;
      const shop = F('shop card', { dir: 'H', gap: 8, pad: [10, 14], radius: 14, fill: C.white, align: 'CENTER' });
      shadow(shop, 0.14, 6, 16);
      add(shop, icon(ICON.shop, C.forest));
      const words = add(shop, F('words', { dir: 'V' }));
      add(words, T('[동네 가게 이름]', 13, 700));
      add(words, T('현지 가게 · ₱180', 12, 400, C.sub));
      card.appendChild(shop); shop.x = 132; shop.y = 200;
    });
}

function buildPermission(denied) {
  const root = screen(denied ? '0-4b. 위치 권한 · 거절됨' : '0-4a. 위치 권한', 844);
  spacer(root, 56);
  const art = add(root, F('illustration', { dir: 'V', align: 'CENTER', justify: 'CENTER' }), { fillW: true, grow: true });
  const rings = add(art, F('rings', { dir: 'NONE', w: 220, h: 220 }));
  const svg = icon(PERM_SVG, C.forest);
  rings.appendChild(svg); svg.x = 0; svg.y = 0;
  if (denied) {
    const badge = F('denied badge', { dir: 'H', w: 36, h: 36, radius: 18, fill: C.mangoSoft, stroke: C.white, strokeWeight: 4, align: 'CENTER', justify: 'CENTER' });
    add(badge, icon(ICON.x, C.mangoDeep));
    rings.appendChild(badge); badge.x = 142; badge.y = 44;
  }
  const main = add(root, F('text', { dir: 'V', gap: 14, pad: [0, 24, 24, 24] }), { fillW: true });
  add(main, title(denied ? '위치 권한이 꺼져 있어요' : '출발 위치를 바로 잡으려면\n위치 권한이 필요해요'), { fillW: true });
  add(main, bodyText(denied
    ? '브라우저 설정에서 위치를 허용하거나, 지도에서 출발점을 직접 골라 주세요.'
    : '현재 위치는 코스의 출발점을 정할 때만 써요. 허용하지 않아도 지도에서 직접 고를 수 있어요.'), { fillW: true });
  const f = footer(root);
  f.itemSpacing = 6;
  link(add(f, primaryButton(denied ? '지도에서 고르기' : '위치 허용하기'), { fillW: true }), denied ? 'startPick' : 'main');
  link(add(f, textButton(denied ? '다시 시도하기' : '지도에서 직접 고를게요')), denied ? 'main' : 'startPick');
  return root;
}

// ---------- row 3: input helpers ----------

function buildRegion() {
  const root = screen('1-1. 지역 선택', 844);
  const ghost = add(root, F('home (behind)', { dir: 'V', gap: 24, pad: [18, 20] }), { fillW: true });
  const top = add(ghost, F('top', { dir: 'H', justify: 'SPACE_BETWEEN', align: 'CENTER' }), { fillW: true });
  add(top, logo(19, C.forest));
  add(top, rect('region', 92, 36, C.soft, 18));
  add(ghost, rect('title', 245, 30, C.soft, 8));
  add(ghost, rect('textarea', 350, 72, C.soft, 16));
  add(ghost, rect('budget', 350, 60, C.soft, 8));

  const dim = figma.createRectangle();
  dim.name = 'dim';
  dim.resize(390, 844);
  dim.fills = [paint(C.ink, 0.48)];
  absolute(root, dim, 0, 0);
  link(dim, 'main');

  const sheet = F('sheet', { dir: 'V', w: 390, pad: [10, 20, 28, 20], radius: [24, 24, 0, 0], fill: C.white });
  const handle = add(sheet, F('handle', { dir: 'H', justify: 'CENTER' }), { fillW: true });
  add(handle, rect('grabber', 36, 4, C.line, 2));
  spacer(sheet, 22);
  add(sheet, T('어느 지역으로 가세요?', 22, 800));
  spacer(sheet, 6);
  add(sheet, T('지금은 한 지역부터 시작해요. 다른 지역도 차례로 열 거예요.', 14, 400, C.sub), { fillW: true });
  spacer(sheet, 18);
  const list = add(sheet, F('regions', { dir: 'V', gap: 8 }), { fillW: true });
  const on = add(list, F('[지역 1] (selected)', { dir: 'H', gap: 12, pad: 16, radius: 16, fill: C.white, stroke: C.forest, strokeWeight: 2, align: 'CENTER' }), { fillW: true });
  const onText = add(on, F('text', { dir: 'V', gap: 2 }), { grow: true });
  add(onText, T('[지역 1]', 17, 700));
  add(onText, T('[대표 시장·관광지 이름]', 13, 400, C.sub));
  const tick = add(on, F('check', { dir: 'H', w: 24, h: 24, radius: 12, fill: C.forest, align: 'CENTER', justify: 'CENTER' }));
  add(tick, icon(ICON.check, C.mango));
  ['[지역 2]', '[지역 3]'].forEach(function (n) {
    const row = add(list, F(n + ' (disabled)', { dir: 'H', gap: 12, pad: 16, radius: 16, fill: C.white, stroke: C.line, align: 'CENTER' }), { fillW: true });
    add(row, T(n, 17, 600, C.hint), { grow: true });
    const soon = add(row, F('soon', { dir: 'H', pad: [3, 8], radius: 999, fill: C.soft }));
    add(soon, T('준비 중', 12, 600, C.sub));
  });
  spacer(sheet, 22);
  link(add(sheet, primaryButton('이 지역으로 할게요'), { fillW: true }), 'main');
  absolute(root, sheet, 0, 0);
  sheet.y = 844 - sheet.height;
  return root;
}

function buildSearch() {
  const root = screen('1-2. 관광지 검색', 844);

  const header = add(root, F('header', { dir: 'H', gap: 4, pad: [8, 16, 8, 8], align: 'CENTER' }), { fillW: true });
  link(add(header, iconButton('back', ICON.back)), 'main');
  const field = add(header, F('search field', { dir: 'H', gap: 8, pad: [0, 6, 0, 14], h: 48, radius: 14, fill: C.soft, align: 'CENTER' }), { grow: true });
  add(field, icon(ICON.search, C.sub));
  add(field, T('[검색어]', 16, 400), { grow: true });
  add(field, iconButton('clear', ICON.x, { size: 36, color: C.sub }));

  const picked = add(root, F('picked', { dir: 'V', gap: 10, pad: [12, 20, 18, 20] }), { fillW: true });
  picked.strokes = [paint(C.soft)];
  picked.strokeTopWeight = 0; picked.strokeLeftWeight = 0; picked.strokeRightWeight = 0; picked.strokeBottomWeight = 8;
  picked.strokeAlign = 'INSIDE';
  const count = T('고른 곳 2', 14, 600, C.sub);
  count.setRangeFills(5, 6, [paint(C.forest)]);
  add(picked, count);
  const chips = add(picked, F('chips', { dir: 'H', gap: 8, wrap: true }), { fillW: true });
  ['[관광지 1]', '[관광지 3]'].forEach(function (n) {
    add(chips, button(n, { bg: C.forest, fg: C.white, h: 36, radius: 999, padX: 12, size: 14, weight: 600, iconAfter: ICON.x, iconColor: C.mango }));
  });

  const main = add(root, F('results', { dir: 'V', pad: [18, 20, 0, 20] }), { fillW: true, grow: true });
  add(main, label('검색 결과'));
  spacer(main, 6);
  [['[관광지 1]', '관광지', true], ['[관광지 2]', '관광지', false], ['[관광지 3]', '시장', true], ['[관광지 4]', '관광지', false], ['[관광지 5]', '관광지', false]]
    .forEach(function (r) {
      const row = add(main, F(r[0], { dir: 'H', gap: 14, pad: [12, 0], align: 'CENTER' }), { fillW: true });
      row.strokes = [paint(C.divider)];
      row.strokeTopWeight = 0; row.strokeLeftWeight = 0; row.strokeRightWeight = 0; row.strokeBottomWeight = 1;
      row.strokeAlign = 'INSIDE';
      add(row, rect('thumb', 52, 52, C.photo, 14));
      const text = add(row, F('text', { dir: 'V', gap: 2 }), { grow: true });
      add(text, T(r[0], 16, 700));
      add(text, T(r[1] + ' · [동네 이름]', 13, 400, C.sub));
      add(row, r[2]
        ? iconButton('picked', ICON.check, { size: 36, bg: C.forest, color: C.mango })
        : (function () {
          const b = iconButton('add', ICON.plus, { size: 36, bg: C.white, color: C.ink });
          b.strokes = [paint('#D3D6DA')]; b.strokeWeight = 1; b.strokeAlign = 'INSIDE';
          return b;
        })());
    });

  link(add(footer(root), primaryButton('2곳 고르기 완료'), { fillW: true }), 'main');
  return root;
}

function buildStartPick() {
  const root = F('1-3. 출발 위치', { dir: 'NONE', w: 390, h: 844, fill: C.map, clip: true });
  const map = icon(FULL_MAP_SVG, C.ink);
  map.name = 'map (Leaflet in app)';
  root.appendChild(map); map.x = 0; map.y = 0;

  const back = iconButton('back', ICON.back, { size: 48, bg: C.white, shadow: true });
  root.appendChild(back); back.x = 12; back.y = 12;
  link(back, 'main');
  const search = F('search', { dir: 'H', gap: 10, pad: [0, 16], w: 310, h: 48, radius: 24, fill: C.white, align: 'CENTER' });
  shadow(search);
  add(search, icon(ICON.search, C.sub));
  add(search, T('주소나 장소 검색', 15, 400, C.sub));
  root.appendChild(search); search.x = 68; search.y = 12;

  const pin = icon(BIG_PIN_SVG, C.forest);
  pin.name = 'center pin';
  root.appendChild(pin); pin.x = 175; pin.y = 290;

  const locate = iconButton('current location', ICON.locate20, { size: 48, bg: C.white, shadow: true, color: C.forest });
  root.appendChild(locate); locate.x = 390 - 16 - 48; locate.y = 844 - 232 - 48;

  const card = F('bottom card', { dir: 'V', gap: 4, w: 390, pad: [22, 20, 28, 20], radius: [24, 24, 0, 0], fill: C.white });
  add(card, T('출발 위치', 13, 600, C.sub));
  add(card, T('[지도 가운데 지점의 주소]', 18, 700));
  add(card, T('지도를 움직여서 핀을 맞춰 주세요', 13, 400, C.sub));
  spacer(card, 12);
  link(add(card, primaryButton('여기서 출발할게요'), { fillW: true }), 'main');
  root.appendChild(card); card.x = 0; card.y = 844 - card.height;
  return root;
}

// ---------- run ----------

const screens = {};

async function main() {
  await loadFonts();

  const stamp = new Date();
  const pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  const page = figma.createPage();
  page.name = 'TaraTrip 와이어프레임 ' + (stamp.getMonth() + 1) + '/' + stamp.getDate() + ' ' + pad2(stamp.getHours()) + ':' + pad2(stamp.getMinutes());
  await figma.setCurrentPageAsync(page);

  const blinkSet = await buildBlinkComponent(page);

  screens.main = buildMain();
  // Loading: rest at each stop, then drive to the next one through SUB frames.
  const loadingSeq = ['loading'];
  const loadingMids = [];
  const loadingRests = ['loading'];
  screens.loading = buildLoading(0, 0, '2. 추천 중');
  for (let k = 0; k < 3; k++) {
    for (let i = 1; i <= SUB; i++) {
      const frac = (k + i / SUB) / 3;
      let key;
      if (i < SUB) {
        key = 'loadingMove' + (k + 1) + '_' + i;
        screens[key] = buildLoading(k, frac, '2. 추천 중 · 이동 ' + (k + 1) + '→' + (k + 2) + ' (' + i + '/' + SUB + ')');
        loadingMids.push(key);
      } else {
        key = k < 2 ? 'loadingStep' + (k + 2) : 'loadingDone';
        screens[key] = buildLoading(k + 1, frac, k < 2 ? '2. 추천 중 · 단계 ' + (k + 2) : '2. 추천 중 · 완료');
        loadingRests.push(key);
      }
      loadingSeq.push(key);
    }
  }
  screens.result = buildResult();
  screens.place = buildPlace();
  screens.errBudget = buildError('budget');
  screens.errNone = buildError('none');
  screens.errTimeout = buildError('timeout');
  // Splash: logo fades in, then the plane flies pin 1 → 3 through 2 × SUB frames,
  // stopping briefly at the middle pin (frame SUB).
  screens.splash = buildSplash(false, 0, '0-1. 시작 화면');
  screens.splashIn = buildSplash(true, 0, '0-1. 시작 화면 · 로고');
  const flightSeq = ['splashIn'];
  const flightMids = [];
  for (let i = 1; i <= 2 * SUB; i++) {
    const key = i === SUB ? 'splashMid' : i < 2 * SUB ? 'splashFly' + i : 'splashLanded';
    screens[key] = buildSplash(true, i / (2 * SUB),
      i === SUB ? '0-1. 시작 화면 · 중간 핀' :
        i < 2 * SUB ? '0-1. 시작 화면 · 비행 (' + i + '/' + 2 * SUB + ')' : '0-1. 시작 화면 · 도착');
    if (i < 2 * SUB && i !== SUB) flightMids.push(key);
    flightSeq.push(key);
  }
  screens.onb1 = buildOnboarding1();
  screens.onb2 = buildOnboarding2();
  screens.permAsk = buildPermission(false);
  screens.permDenied = buildPermission(true);
  screens.region = buildRegion();
  screens.search = buildSearch();
  screens.startPick = buildStartPick();

  // Loading: 0.5 s at each stop, 0.9 s of driving to the next (SUB linear hops), loop after the last.
  for (let i = 0; i < loadingSeq.length - 1; i++) {
    const from = loadingSeq[i];
    auto(from, loadingSeq[i + 1], loadingRests.indexOf(from) >= 0 ? 0.5 : 0, 'smart', 0.9 / SUB);
  }
  auto('loadingDone', 'loading', 0.6, 'dissolve', 0.25);
  // Splash: logo fades in, the plane flies 0.8 s to the middle pin, waits 0.5 s there, flies 0.8 s
  // to the last pin, rests, and the flight loops from the logo frame.
  auto('splash', 'splashIn', 0.1, 'smartOut', 0.7);
  for (let i = 0; i < flightSeq.length - 1; i++) {
    const wait = i === 0 ? 0.2 : flightSeq[i] === 'splashMid' ? 0.5 : 0;
    auto(flightSeq[i], flightSeq[i + 1], wait, 'smart', 1.6 / (2 * SUB));
  }
  auto('splashLanded', 'splashIn', 0.8, 'dissolve', 0.25);

  // Rows 4–5 hold the in-between animation frames, away from the screens people review.
  const rows = [
    ['splash', 'splashIn', 'splashMid', 'splashLanded', 'onb1', 'onb2', 'permAsk', 'permDenied'],
    ['main'].concat(loadingRests, ['result', 'place', 'errBudget', 'errNone', 'errTimeout']),
    ['region', 'search', 'startPick'],
    flightMids,
    loadingMids
  ];
  let y = 0;
  rows.forEach(function (row) {
    let x = 0;
    let tallest = 0;
    row.forEach(function (k) {
      const s = screens[k];
      page.appendChild(s);
      s.x = x; s.y = y;
      x += 470;
      tallest = Math.max(tallest, s.height);
    });
    y += tallest + 200;
  });
  blinkSet.x = 0; blinkSet.y = y;

  let linkFailures = 0;
  for (const pair of links) {
    try {
      await pair[0].setReactionsAsync([{
        trigger: { type: 'ON_CLICK' },
        actions: [{ type: 'NODE', destinationId: screens[pair[1]].id, navigation: 'NAVIGATE', transition: null, preserveScrollPosition: false }]
      }]);
    } catch (e) {
      linkFailures++;
    }
  }

  const TRANSITIONS = {
    smart: function (d) { return { type: 'SMART_ANIMATE', easing: { type: 'LINEAR' }, duration: d }; },
    smartOut: function (d) { return { type: 'SMART_ANIMATE', easing: { type: 'EASE_OUT' }, duration: d }; },
    dissolve: function (d) { return { type: 'DISSOLVE', easing: { type: 'EASE_IN_AND_OUT' }, duration: d }; }
  };
  for (const a of autos) {
    try {
      await screens[a[0]].setReactionsAsync([{
        trigger: { type: 'AFTER_TIMEOUT', timeout: a[2] },
        actions: [{ type: 'NODE', destinationId: screens[a[1]].id, navigation: 'NAVIGATE', transition: TRANSITIONS[a[3]](a[4]), preserveScrollPosition: false }]
      }]);
    } catch (e) {
      linkFailures++;
    }
  }
  try {
    page.flowStartingPoints = [
      { nodeId: screens.splash.id, name: '앱 시작' },
      { nodeId: screens.main.id, name: '홈부터' }
    ];
  } catch (e) { /* optional */ }

  const all = Object.keys(screens).map(function (k) { return screens[k]; });
  page.selection = all;
  figma.viewport.scrollAndZoomIntoView(all);
  figma.closePlugin('새 페이지 "' + page.name + '"에 화면 ' + all.length + '개를 그렸어요.' +
    (linkFailures ? ' 프로토타입 연결 ' + linkFailures + '개는 실패했어요.' : ''));
}

main().catch(function (e) {
  figma.closePlugin('그리기 실패: ' + (e && e.message ? e.message : String(e)));
});
