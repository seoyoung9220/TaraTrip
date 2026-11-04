// TaraTrip 관광객 화면 와이어프레임을 현재 페이지에 그린다.
// 화면 7개(조건 입력, 추천 중, 추천 코스, 장소 상세, 오류 3종)를 오토레이아웃 프레임으로 만든다.

const C = {
  ink: '#191B1F', sub: '#6B7079', body: '#4A4F57', hint: '#8B9098',
  line: '#E3E5E8', soft: '#F5F6F8', white: '#FFFFFF',
  pri: '#0B7A6C', priSoft: '#E4F3F0', priInk: '#075A50',
  warn: '#C2410C', warnBg: '#FFF3EC',
  map: '#E9F1EC', water: '#D5E7F0', photo: '#EEF0F2',
  skel1: '#E9EBEE', skel2: '#E3E5E8', skel3: '#ECEEF1'
};

const ICON = {
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  close: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  locate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  sparkle: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
  image: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2"/><path d="M21 17l-5-5-9 7"/></svg>',
  wallet: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  alert: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.5"/></svg>'
};

const MAP_SVG = '<svg width="390" height="320" viewBox="0 0 390 320" fill="none">' +
  '<path d="M260 0 C 300 60, 340 90, 390 100 L390 0 Z" fill="' + C.water + '"/>' +
  '<path d="M0 120 L390 96 M0 236 L390 262 M110 0 L92 320 M292 0 L312 320 M0 30 L200 320" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>' +
  '<path d="M0 176 L390 170 M200 0 L214 320" stroke="#FFFFFF" stroke-width="6"/>' +
  '<path d="M78 236 L156 150 L246 196 L318 108" stroke="' + C.pri + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M78 262 L78 250" stroke="' + C.ink + '" stroke-width="3" stroke-dasharray="3 3"/>' +
  '<circle cx="78" cy="270" r="9" fill="#FFFFFF" stroke="' + C.ink + '" stroke-width="4"/>' +
  '</svg>';
const MAP_PINS = [[78, 236], [156, 150], [246, 196], [318, 108]];

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

// o: dir 'V'|'H'|'NONE', gap, pad, fill, radius, w, h, align, justify, wrap, stroke, clip, opacity
function F(name, o) {
  o = o || {};
  const f = figma.createFrame();
  f.name = name;
  f.fills = o.fill ? [paint(o.fill)] : [];
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
  if (o.opacity !== undefined) f.opacity = o.opacity;
  if (o.w || o.h) f.resize(o.w || 100, o.h || 100);
  if (o.dir !== 'NONE') {
    const horiz = f.layoutMode === 'HORIZONTAL';
    f.primaryAxisSizingMode = (horiz ? o.w : o.h) ? 'FIXED' : 'AUTO';
    f.counterAxisSizingMode = (horiz ? o.h : o.w) ? 'FIXED' : 'AUTO';
  }
  return f;
}

// o: lh (percent), color, align, underline
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

function spacer(parent, h) {
  const s = F('spacer', { dir: 'V', h: h });
  add(parent, s, { fillW: true });
  return s;
}

function button(label, o) {
  const b = F(label, {
    dir: 'H', gap: 8, pad: [0, o.padX || 16], h: o.h || 56, radius: o.radius === undefined ? 16 : o.radius,
    fill: o.bg, stroke: o.stroke, align: 'CENTER', justify: 'CENTER'
  });
  if (o.icon) add(b, icon(o.icon, o.fg));
  add(b, T(label, o.size || 17, o.weight || 700, o.fg));
  return b;
}

function primaryButton(label) {
  return button(label, { bg: C.pri, fg: C.white });
}

function softButton(label, h) {
  return button(label, { bg: C.soft, fg: C.ink, h: h || 56, size: h ? 16 : 17, weight: h ? 600 : 700 });
}

function chip(label, selected) {
  return button(label, selected
    ? { bg: C.pri, fg: C.white, h: 40, radius: 999, size: 15, weight: 600 }
    : { bg: C.white, fg: C.ink, stroke: C.line, h: 40, radius: 999, size: 15, weight: 500 });
}

function iconButton(name, svg, o) {
  o = o || {};
  const b = F(name, { dir: 'H', w: 44, h: 44, radius: 22, fill: o.bg, align: 'CENTER', justify: 'CENTER' });
  if (o.shadow) {
    b.effects = [{
      type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 2 },
      radius: 8, spread: 0, visible: true, blendMode: 'NORMAL'
    }];
  }
  add(b, icon(svg, C.ink));
  return b;
}

function screen(name, h) {
  return F(name, { dir: 'V', w: 390, h: h, fill: C.white, clip: true });
}

function footer(root) {
  const f = F('footer', { dir: 'V', gap: 10, pad: [8, 20, 28, 20] });
  add(root, f, { fillW: true });
  return f;
}

function label(text) {
  return T(text, 14, 600, C.sub);
}

const links = [];
function link(node, getTarget) { links.push([node, getTarget]); }

// ---------- screens ----------

function buildInput() {
  const root = screen('1. 조건 입력', 844);

  const header = F('header', { dir: 'H', h: 56, pad: [0, 20], align: 'CENTER', justify: 'SPACE_BETWEEN' });
  add(root, header, { fillW: true });
  add(header, T('TaraTrip', 19, 800, C.pri));
  const region = F('region', { dir: 'H', gap: 4, pad: [0, 12], h: 36, radius: 999, fill: C.soft, align: 'CENTER' });
  add(region, icon(ICON.pin, C.ink));
  add(region, T('[지역]', 14, 600));
  add(region, icon(ICON.chevronDown, C.ink));
  add(header, region);

  const main = F('main', { dir: 'V', gap: 28, pad: [12, 20, 24, 20] });
  add(root, main, { fillW: true, grow: true });
  add(main, T('오늘 하루,\n어떻게 보내고 싶나요?', 26, 800, C.ink, { lh: 138 }), { fillW: true });

  const free = F('free text', { dir: 'V', gap: 10 });
  add(main, free, { fillW: true });
  add(free, label('편하게 적어도 돼요'));
  const area = F('textarea', { dir: 'V', pad: [14, 16], radius: 16, fill: C.soft });
  add(free, area, { fillW: true });
  add(area, T('예: 1,000페소로 현지 음식 먹고 시장 구경하고 싶어', 16, 400, C.hint, { lh: 150 }), { fillW: true });

  const budget = F('budget', { dir: 'V', gap: 10 });
  add(main, budget, { fillW: true });
  add(budget, label('하루 예산'));
  const amount = F('amount', { dir: 'H', gap: 4, pad: [0, 0, 8, 0], align: 'BASELINE' });
  amount.strokes = [paint(C.pri)];
  amount.strokeTopWeight = 0; amount.strokeLeftWeight = 0; amount.strokeRightWeight = 0; amount.strokeBottomWeight = 2;
  amount.strokeAlign = 'INSIDE';
  add(budget, amount, { fillW: true });
  add(amount, T('₱', 26, 700));
  add(amount, T('1,000', 30, 800), { grow: true });
  add(amount, T('페소', 14, 400, C.sub));
  add(budget, T('≈ [원화 환산]원 · 오늘 환율 기준', 14, 400, C.sub));
  const quick = F('quick add', { dir: 'H', gap: 8 });
  add(budget, quick);
  ['+₱500', '+₱1,000', '+₱3,000'].forEach(function (q) {
    add(quick, button(q, { bg: C.soft, fg: C.body, h: 32, radius: 8, padX: 12, size: 13, weight: 600 }));
  });

  const food = F('food', { dir: 'V', gap: 10 });
  add(main, food, { fillW: true });
  add(food, label('먹고 싶은 음식'));
  const chips = F('chips', { dir: 'H', gap: 8, wrap: true });
  add(food, chips, { fillW: true });
  [['[음식 1]', true], ['[음식 2]', false], ['[음식 3]', true], ['[음식 4]', false], ['[음식 5]', false]]
    .forEach(function (c) { add(chips, chip(c[0], c[1])); });

  const places = F('places', { dir: 'V', gap: 10 });
  add(main, places, { fillW: true });
  add(places, label('꼭 가보고 싶은 곳'));
  const search = F('search', { dir: 'H', gap: 10, pad: [0, 16], h: 52, radius: 16, fill: C.soft, align: 'CENTER' });
  add(places, search, { fillW: true });
  add(search, icon(ICON.search, C.sub));
  add(search, T('관광지 검색', 16, 400, C.sub));
  const start = F('start', { dir: 'H', pad: [4, 2], align: 'CENTER', justify: 'SPACE_BETWEEN' });
  add(places, start, { fillW: true });
  add(start, T('출발 위치', 15, 500));
  const here = F('current', { dir: 'H', gap: 6, align: 'CENTER' });
  add(here, icon(ICON.locate, C.pri));
  add(here, T('현재 위치', 15, 600, C.pri));
  add(start, here);

  const cta = add(footer(root), primaryButton('코스 추천받기'), { fillW: true });
  link(cta, function () { return screens.loading; });
  return root;
}

function buildLoading() {
  const root = screen('2. 추천 중', 844);

  const header = F('header', { dir: 'H', h: 56, pad: [0, 8], align: 'CENTER' });
  add(root, header, { fillW: true });
  const close = add(header, iconButton('close', ICON.close));
  link(close, function () { return screens.input; });

  const main = F('main', { dir: 'V', gap: 36, pad: [16, 24, 24, 24] });
  add(root, main, { fillW: true, grow: true });
  add(main, T('[지역]에서 보낼\n하루 코스를 짜고 있어요', 26, 800, C.ink, { lh: 138 }), { fillW: true });

  const steps = F('steps', { dir: 'V', gap: 22 });
  add(main, steps, { fillW: true });
  function step(text, state) {
    const row = F(text, { dir: 'H', gap: 14, align: 'CENTER' });
    let badge;
    if (state === 'done') {
      badge = F('done', { dir: 'H', w: 28, h: 28, radius: 14, fill: C.priSoft, align: 'CENTER', justify: 'CENTER' });
      add(badge, icon(ICON.check, C.pri));
    } else if (state === 'active') {
      badge = F('active', { dir: 'H', w: 28, h: 28, radius: 14, stroke: C.pri, strokeWeight: 3 });
    } else {
      badge = F('todo', { dir: 'H', w: 28, h: 28, radius: 14, fill: C.soft });
    }
    add(row, badge);
    add(row, T(text, 17, state === 'active' ? 700 : 400, state === 'active' ? C.ink : C.sub));
    add(steps, row);
  }
  step('요청 내용 이해하기', 'done');
  step('예산에 맞는 현지 가게 찾기', 'active');
  step('동선 순서 정하기', 'todo');

  const skeleton = F('skeleton', { dir: 'V', gap: 12, pad: [8, 0, 0, 0] });
  add(main, skeleton, { fillW: true });
  [[150, 100, 1], [130, 85, 0.6]].forEach(function (s) {
    const card = F('card', { dir: 'H', gap: 14, pad: 16, radius: 20, fill: C.soft, align: 'CENTER', opacity: s[2] });
    add(skeleton, card, { fillW: true });
    add(card, rect('thumb', 48, 48, C.skel1, 14));
    const lines = F('lines', { dir: 'V', gap: 8 });
    add(card, lines, { grow: true });
    add(lines, rect('line', s[0], 12, C.skel2, 6));
    add(lines, rect('line', s[1], 10, C.skel3, 5));
  });

  const f = F('footer', { dir: 'H', pad: [8, 20, 28, 20], justify: 'CENTER' });
  add(root, f, { fillW: true });
  const skip = add(f, T('(프로토타입) 결과 화면으로', 13, 400, C.sub, { underline: true }));
  link(skip, function () { return screens.result; });
  return root;
}

function buildResult() {
  const root = F('3. 추천 코스', { dir: 'V', w: 390, fill: C.white, clip: true });
  root.itemSpacing = -24;

  const map = F('map', { dir: 'NONE', w: 390, h: 320, fill: C.map, clip: true });
  add(root, map);
  const mapArt = icon(MAP_SVG, C.ink);
  mapArt.name = 'map art';
  map.appendChild(mapArt);
  mapArt.x = 0; mapArt.y = 0;
  MAP_PINS.forEach(function (p, i) {
    const pin = F('pin ' + (i + 1), { dir: 'H', w: 32, h: 32, radius: 16, fill: C.pri, stroke: C.white, strokeWeight: 3, align: 'CENTER', justify: 'CENTER' });
    add(pin, T(String(i + 1), 14, 800, C.white));
    map.appendChild(pin);
    pin.x = p[0] - 16; pin.y = p[1] - 16;
  });
  const back = iconButton('back', ICON.back, { bg: C.white, shadow: true });
  map.appendChild(back);
  back.x = 12; back.y = 12;
  link(back, function () { return screens.input; });

  const sheet = F('sheet', { dir: 'V', pad: [10, 20, 32, 20], fill: C.white, radius: [24, 24, 0, 0] });
  add(root, sheet, { fillW: true });

  const handleRow = F('handle', { dir: 'H', justify: 'CENTER' });
  add(sheet, handleRow, { fillW: true });
  add(handleRow, rect('grabber', 36, 4, C.line, 2));

  const summary = F('summary', { dir: 'V', gap: 6, pad: [18, 0, 20, 0] });
  add(sheet, summary, { fillW: true });
  add(summary, T('[지역] 하루 코스 · 4곳 · 약 [시간]', 15, 600, C.sub));
  const total = F('total', { dir: 'H', gap: 8, align: 'BASELINE' });
  add(summary, total);
  add(total, T('₱920', 32, 800));
  add(total, T('≈ [원화 환산]원', 15, 400, C.sub));
  const left = T('예산 ₱1,000 중 ₱80 남아요', 15, 400, C.sub);
  const hi = left.characters.indexOf('₱80');
  left.setRangeFills(hi, left.characters.length, [paint(C.pri)]);
  left.setRangeFontName(hi, left.characters.length, fontCache[700]);
  add(summary, left);
  spacer(summary, 2);
  const bar = F('progress', { dir: 'H', h: 8, radius: 999, fill: C.priSoft, clip: true });
  add(summary, bar, { fillW: true });
  add(bar, rect('used 92%', 322, 8, C.pri, 999));

  const tiles = F('cost breakdown', { dir: 'H', gap: 8 });
  add(sheet, tiles, { fillW: true });
  [['식비', '₱710'], ['입장료', '₱150'], ['교통비', '₱60']].forEach(function (c) {
    const tile = F(c[0], { dir: 'V', gap: 4, pad: 14, radius: 16, fill: C.soft });
    add(tiles, tile, { grow: true });
    add(tile, T(c[0], 13, 400, C.sub));
    add(tile, T(c[1], 17, 700));
  });

  spacer(sheet, 16);
  const ai = F('AI summary', { dir: 'H', gap: 12, pad: 16, radius: 16, fill: C.priSoft });
  add(sheet, ai, { fillW: true });
  add(ai, icon(ICON.sparkle, C.priInk));
  add(ai, T('[AI 추천 요약: 이 코스가 예산과 취향에 맞는 이유]', 15, 400, C.priInk, { lh: 155 }), { fillW: true });

  const heading = F('heading', { dir: 'V', pad: [32, 0, 16, 0] });
  add(sheet, heading, { fillW: true });
  add(heading, T('코스 순서', 20, 800));

  const stops = [
    ['10:00', '[식당 이름]', '식당', '60분', '₱250', null],
    ['11:20', '[시장 이름]', '시장', '60분', '₱180', '지프니 · 15분 · ₱13'],
    ['12:40', '[관광지 이름]', '관광지', '90분', '₱150', '도보 · 20분'],
    ['14:30', '[가게 이름]', '가게', '45분', '₱280', '트라이시클 · 10분 · ₱47']
  ];
  stops.forEach(function (s, i) {
    if (s[5]) {
      const tr = F('transport', { dir: 'H', gap: 12, pad: [4, 0, 4, 15], align: 'CENTER' });
      add(sheet, tr, { fillW: true });
      add(tr, rect('line', 2, 32, C.line));
      const pill = F('pill', { dir: 'H', pad: [4, 10], radius: 999, fill: C.soft });
      add(pill, T(s[5], 13, 400, C.sub));
      add(tr, pill);
    }
    const row = F('stop ' + (i + 1), { dir: 'H', gap: 14, pad: [6, 0] });
    add(sheet, row, { fillW: true });
    const num = F('order', { dir: 'H', w: 32, h: 32, radius: 16, fill: C.pri, align: 'CENTER', justify: 'CENTER' });
    add(num, T(String(i + 1), 15, 800, C.white));
    add(row, num);
    const info = F('info', { dir: 'V', gap: 4 });
    add(row, info, { grow: true });
    add(info, T(s[0] + ' · ' + s[2] + ' · ' + s[3], 13, 400, C.sub));
    const line = F('name row', { dir: 'H', gap: 8, align: 'BASELINE', justify: 'SPACE_BETWEEN' });
    add(info, line, { fillW: true });
    add(line, T(s[1], 17, 700));
    add(line, T(s[4], 16, 700));
    add(info, T('[이곳을 추천한 이유]', 14, 400, C.sub, { lh: 150 }), { fillW: true });
    link(row, function () { return screens.place; });
  });

  spacer(sheet, 32);
  const again = add(sheet, softButton('조건 바꿔서 다시 추천받기', 52), { fillW: true });
  link(again, function () { return screens.input; });
  return root;
}

function buildPlace() {
  const root = screen('4. 장소 상세', 844);

  const body = F('body', { dir: 'V' });
  body.itemSpacing = -24;
  add(root, body, { fillW: true, grow: true });

  const photo = F('photo', { dir: 'V', h: 260, fill: C.photo, align: 'CENTER', justify: 'CENTER' });
  add(body, photo, { fillW: true });
  add(photo, icon(ICON.image, '#9AA0A8'));
  const back = iconButton('back', ICON.back, { bg: C.white, shadow: true });
  photo.appendChild(back);
  back.layoutPositioning = 'ABSOLUTE';
  back.x = 12; back.y = 12;
  link(back, function () { return screens.result; });
  const counter = F('photo count', { dir: 'H', pad: [4, 10], radius: 999, fill: C.ink });
  counter.fills = [paint(C.ink, 0.72)];
  add(counter, T('1 / [n]', 12, 600, C.white));
  photo.appendChild(counter);
  counter.layoutPositioning = 'ABSOLUTE';
  counter.x = 390 - 16 - counter.width; counter.y = 260 - 36 - counter.height;

  const main = F('main', { dir: 'V', gap: 22, pad: [24, 20], fill: C.white, radius: [24, 24, 0, 0] });
  add(body, main, { fillW: true, grow: true });

  const head = F('title', { dir: 'V', gap: 8 });
  add(main, head, { fillW: true });
  add(head, T('코스 1번째 · 식당', 14, 600, C.pri));
  add(head, T('[식당 이름]', 26, 800));
  add(head, T('[가게 소개 문구]', 15, 400, C.body, { lh: 160 }), { fillW: true });

  const facts = F('facts', { dir: 'V', gap: 14 });
  add(main, facts, { fillW: true });
  [[ICON.wallet, '가격대', '₱[최저] – ₱[최고]'], [ICON.clock, '영업시간', '[08:00 – 20:00]'], [ICON.pin, '주소', '[주소]']]
    .forEach(function (r) {
      const row = F(r[1], { dir: 'H', gap: 12, align: 'CENTER' });
      add(facts, row, { fillW: true });
      const key = F('label', { dir: 'H', gap: 8, w: 88, align: 'CENTER' });
      add(key, icon(r[0], C.sub));
      add(key, T(r[1], 15, 400, C.sub));
      add(row, key);
      add(row, T(r[2], 15, 600));
    });

  const card = F('in this route', { dir: 'V', gap: 10, pad: 18, radius: 20, fill: C.soft });
  add(main, card, { fillW: true });
  add(card, T('이 코스에서는', 15, 700));
  const cost = F('cost', { dir: 'H', gap: 8, align: 'BASELINE' });
  add(card, cost);
  add(cost, T('₱250', 22, 800));
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

  const header = F('header', { dir: 'H', h: 56, pad: [0, 8], align: 'CENTER' });
  add(root, header, { fillW: true });
  const back = add(header, iconButton('back', ICON.back));
  link(back, function () { return screens.input; });

  const main = F('main', { dir: 'V', gap: 20, pad: [40, 24, 24, 24] });
  add(root, main, { fillW: true, grow: true });
  const badge = F('alert', { dir: 'H', w: 64, h: 64, radius: 20, fill: C.warnBg, align: 'CENTER', justify: 'CENTER' });
  add(badge, icon(ICON.alert, C.warn));
  add(main, badge);
  const text = F('message', { dir: 'V', gap: 12 });
  add(main, text, { fillW: true });
  add(text, T(copy[1], 26, 800, C.ink, { lh: 138 }), { fillW: true });
  add(text, T(copy[2], 16, 400, C.body, { lh: 160 }), { fillW: true });

  const f = footer(root);
  if (variant === 'timeout') {
    const retry = add(f, primaryButton('다시 시도하기'), { fillW: true });
    link(retry, function () { return screens.loading; });
    const edit = add(f, softButton(copy[3]), { fillW: true });
    link(edit, function () { return screens.input; });
  } else {
    const edit = add(f, primaryButton(copy[3]), { fillW: true });
    link(edit, function () { return screens.input; });
  }
  return root;
}

// ---------- run ----------

const screens = {};

async function main() {
  await loadFonts();

  screens.input = buildInput();
  screens.loading = buildLoading();
  screens.result = buildResult();
  screens.place = buildPlace();
  screens.errBudget = buildError('budget');
  screens.errNone = buildError('none');
  screens.errTimeout = buildError('timeout');

  const order = ['input', 'loading', 'result', 'place', 'errBudget', 'errNone', 'errTimeout'];
  const page = figma.currentPage;
  let x = 0;
  order.forEach(function (k) {
    const s = screens[k];
    page.appendChild(s);
    s.x = x; s.y = 0;
    x += 470;
  });

  let linkFailures = 0;
  for (const pair of links) {
    try {
      await pair[0].setReactionsAsync([{
        trigger: { type: 'ON_CLICK' },
        actions: [{ type: 'NODE', destinationId: pair[1]().id, navigation: 'NAVIGATE', transition: null, preserveScrollPosition: false }]
      }]);
    } catch (e) {
      linkFailures++;
    }
  }
  try { page.flowStartingPoints = [{ nodeId: screens.input.id, name: 'TaraTrip 관광객 흐름' }]; } catch (e) { /* optional */ }

  const all = order.map(function (k) { return screens[k]; });
  page.selection = all;
  figma.viewport.scrollAndZoomIntoView(all);
  figma.closePlugin(linkFailures
    ? 'TaraTrip 화면 7개를 그렸어요. 프로토타입 연결 ' + linkFailures + '개는 실패했어요.'
    : 'TaraTrip 화면 7개를 그렸어요.');
}

main().catch(function (e) {
  figma.closePlugin('그리기 실패: ' + (e && e.message ? e.message : String(e)));
});
