
(() => {
'use strict';
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const buzz = () => { try { navigator.vibrate && navigator.vibrate(6); } catch (e) {} };
const set = (id, a) => { const e = typeof id === 'string' ? $(id) : id; for (const k in a) e.setAttribute(k, a[k]); };
const B = (s, cls = 'mu') => `<bdi dir="ltr" class="${cls}">${s}</bdi>`;   // one value per bdi

/* ---------- number formatting ---------- */
const SUP = {'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const sup = s => String(s).split('').map(c => SUP[c] || c).join('');
function sig(x, n = 3) { if (x === 0) return '0'; const p = Math.floor(Math.log10(Math.abs(x))); return x.toFixed(Math.max(0, n - 1 - p)).replace('-', '−'); }
function sci(x, n = 3) {
  if (x === 0) return '0';
  let e = Math.floor(Math.log10(Math.abs(x))), ms = (x / Math.pow(10, e)).toFixed(n - 1);
  if (Math.abs(parseFloat(ms)) >= 10) { e += 1; ms = (x / Math.pow(10, e)).toFixed(n - 1); }
  ms = ms.replace(/\.?0+$/, '');
  return e === 0 ? ms : `${ms} × 10${sup(e)}`;
}
function withPrefix(x, unit) {
  const a = Math.abs(x);
  for (const [f, p] of [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'μ']]) if (a >= f * 0.9995) return [sig(x / f), p + unit];
  return [sig(x / 1e-9), 'n' + unit];
}
const trim = s => s.replace(/\.?0+$/, '');
function ratioText(k) {
  if (Math.abs(k - 1) < 0.005) return '×1';
  if (k >= 1) return '×' + (k >= 10 ? k.toFixed(0) : trim(sig(k, 3)));
  const inv = 1 / k; return '÷' + (inv >= 10 ? inv.toFixed(0) : trim(sig(inv, 3)));
}
function pulse(n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('flash'), 700); }

/* ---------- tabs ---------- */
const tabs = [...document.querySelectorAll('.seg button')], pill = $('pill');
function selectTab(i, focus) {
  tabs.forEach((b, j) => { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; $('p' + (j + 1)).classList.toggle('on', j === i); });
  pill.style.transform = `translateX(${-i * 100}%)`;
  if (focus) tabs[i].focus();
  buzz();
}
tabs.forEach((b, i) => {
  b.tabIndex = i === 0 ? 0 : -1;
  b.addEventListener('click', () => selectTab(i));
  b.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') selectTab((i + 1) % 3, true); if (e.key === 'ArrowRight') selectTab((i + 2) % 3, true); });
});

/* slider fill + aria-valuetext */
const UNITS = { sL: ' متر', sD: ' مليمتر', sOV: ' فولت', sOR: ' أوم', sDV: ' فولت', sE: ' فولت', sr: ' أوم', sI: ' أمبير' };
function fill(inp) {
  inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%');
  inp.setAttribute('aria-valuetext', (+inp.value).toString() + (UNITS[inp.id] || ''));
}
document.querySelectorAll('input[type=range]').forEach(i => { fill(i); i.addEventListener('input', () => fill(i)); i.addEventListener('change', buzz); });

/* =======================================================================
   PANEL 1 — R = ρL/A
   ======================================================================= */
const MATS = [   // book table (1), 20 °C
  { id: 'cu', name: 'نحاس',   al: 'النحاس',   rho: 1.7e-8,  rs: '1.7 × 10⁻⁸',  c: ['#f0b47c', '#c27a3a', '#8f5426'] },
  { id: 'al', name: 'ألمنيوم', al: 'الألمنيوم', rho: 2.82e-8, rs: '2.82 × 10⁻⁸', c: ['#eef2f5', '#b9c3cc', '#86919b'] },
  { id: 'w',  name: 'تنغستن', al: 'التنغستن', rho: 5.6e-8,  rs: '5.6 × 10⁻⁸',  c: ['#b7bcc6', '#7d838f', '#4f5560'] },
  { id: 'fe', name: 'حديد',   al: 'الحديد',   rho: 10e-8,   rs: '10 × 10⁻⁸',   c: ['#b8aaa0', '#857368', '#56483f'] },
  { id: 'ni', name: 'نيكروم', al: 'النيكروم', rho: 1.5e-6,  rs: '1.5 × 10⁻⁶',  c: ['#d9dbe2', '#9fa2ad', '#6b6e79'] },
];
const S1 = { L: 1, d: 0.5, mat: 0 };
let base1 = null, lastKey1 = null;
const matsBox = $('mats');
MATS.forEach((m, i) => {
  const b = document.createElement('button');
  b.className = 'chip'; b.type = 'button'; b.dataset.i = i; b.setAttribute('aria-pressed', i === 0);
  b.setAttribute('aria-label', `${m.name}، المقاوميّة ${m.rs} أوم متر`);
  b.innerHTML = `<span class="sw" style="background:linear-gradient(135deg,${m.c[0]},${m.c[1]} 55%,${m.c[2]})"></span>${m.name}`;
  b.addEventListener('click', () => { snapshot1(); S1.mat = i; lastKey1 = 'mat'; [...matsBox.children].forEach((c, j) => c.setAttribute('aria-pressed', j === i)); buzz(); update1(true); });
  matsBox.appendChild(b);
});
const area = d => Math.PI * Math.pow(d * 1e-3, 2) / 4;
const R1 = s => MATS[s.mat].rho * s.L / area(s.d);
function snapshot1() { base1 = { ...S1 }; }
const sL = $('sL'), sD = $('sD');
['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
  sL.addEventListener(ev, () => { snapshot1(); lastKey1 = 'L'; }, { passive: true });
  sD.addEventListener(ev, () => { snapshot1(); lastKey1 = 'd'; }, { passive: true });
});
sL.addEventListener('input', () => { if (!base1 || lastKey1 !== 'L') { snapshot1(); lastKey1 = 'L'; } S1.L = +sL.value; update1(); });
sD.addEventListener('input', () => { if (!base1 || lastKey1 !== 'd') { snapshot1(); lastKey1 = 'd'; } S1.d = +sD.value; update1(); });
$('q2L').addEventListener('click', () => {
  snapshot1(); lastKey1 = 'L';
  let nv = S1.L * 2; if (nv > 2) { S1.L = 0.5; snapshot1(); nv = 1; }
  S1.L = nv; sL.value = nv; fill(sL); buzz(); update1(true);
});
$('q2D').addEventListener('click', () => {
  snapshot1(); lastKey1 = 'd';
  let nv = +(S1.d * 2).toFixed(2); if (nv > 1) { S1.d = 0.25; snapshot1(); nv = 0.5; }
  S1.d = nv; sD.value = nv; fill(sD); buzz(); update1(true);
});

let Rshow = R1(S1), Rtarget = Rshow;
function update1(flash) {
  const m = MATS[S1.mat], A = area(S1.d), R = m.rho * S1.L / A;
  Rtarget = R; $('Rval').dataset.exact = R;
  $('vL').textContent = S1.L.toFixed(2) + ' m';
  $('vD').textContent = S1.d.toFixed(2) + ' mm';
  $('rhoInfo').textContent = 'ρ = ' + m.rs + ' Ω·m';
  const [Rn, Ru] = withPrefix(R, 'Ω');
  $('eq1').innerHTML =
    `<span class="m">R</span> = <span class="frac"><span><span class="m">ρ</span> <span class="m">L</span></span><span><span class="m">A</span></span></span> = ` +
    `<span class="frac"><span>(${m.rs}) × ${S1.L.toFixed(2)}</span><span>${sci(A, 3)}</span></span> = <span class="hl">${Rn} ${Ru}</span>`;
  const box = $('ratioBox');
  if (!base1) { $('note1t').innerHTML = 'حرّك أي قيمة أو جرّب زرّي المضاعفة، وستظهر هنا النتيجة وسببها.'; return; }
  const k = R / R1(base1);
  $('ratioV').textContent = ratioText(k);
  box.classList.toggle('up', k > 1.005); box.classList.toggle('down', k < 0.995);
  $('ratioT').textContent = k > 1.005 ? 'زادت المقاومة' : k < 0.995 ? 'قلّت المقاومة' : 'لم تتغيّر';
  let t = '';
  if (lastKey1 === 'L') {
    const kL = S1.L / base1.L;
    t = Math.abs(kL - 1) < 0.005 ? 'الطول لم يتغيّر بعد.' :
      `تغيّر الطول (${B(ratioText(kL))})، فتغيّرت المقاومة بالنسبة نفسها (${B(ratioText(k))}). المقاومة تتناسب <b>طرديًا</b> مع الطول، لأن الإلكترونات تتعرّض لتصادمات أكثر في الموصل الأطول.`;
  } else if (lastKey1 === 'd') {
    const kd = S1.d / base1.d;
    t = Math.abs(kd - 1) < 0.005 ? 'القطر لم يتغيّر بعد.' :
      `تغيّر القطر (${B(ratioText(kd))})، فتغيّرت مساحة المقطع (${B(ratioText(kd * kd))}) لأنها تتناسب مع مربع القطر، فتغيّرت المقاومة (${B(ratioText(k))}). المقاومة تتناسب <b>عكسيًا</b> مع مساحة المقطع.`;
  } else if (lastKey1 === 'mat') {
    const mb = MATS[base1.mat];
    if (base1.mat === S1.mat) t = 'هذه المادة مختارة حاليًا.';
    else {
      const q = m.rho / mb.rho;
      t = (q >= 1 ? `مقاوميّة ${m.al} تساوي ${B(trim(sig(q, 3)))} أمثال مقاوميّة ${mb.al}`
                  : `مقاوميّة ${m.al} أصغر من مقاوميّة ${mb.al} بنحو ${B(trim(sig(1 / q, 3)))} مرات`) +
          `، فتغيّرت مقاومة السلك بالنسبة نفسها (${B(ratioText(k))}) لأن الأبعاد لم تتغيّر. <b>المقاوميّة صفة للمادة، والمقاومة صفة للموصل.</b>`;
    }
  }
  if (t) { $('note1t').innerHTML = t; if (flash) pulse($('note1')); }
}

/* wire scene */
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const rgb = a => `rgb(${a.map(v => Math.round(v)).join(',')})`;
const W1 = { L: S1.L, d: S1.d, c: MATS[0].c.map(hex2rgb) };
const ruler = $('ruler');
for (let i = 0; i <= 20; i++) { const x = 38 + i * 14; el('line', { x1: x, y1: 150, x2: x, y2: i % 5 === 0 ? 141 : 145, stroke: '#9fb3c8', 'stroke-width': 1 }, ruler); }
el('line', { x1: 38, y1: 150, x2: 318, y2: 150, stroke: '#9fb3c8', 'stroke-width': 1 }, ruler);
['0', '0.5', '1.0', '1.5', '2.0 m'].forEach((s, i) => { const t = el('text', { x: 38 + i * 70, y: 165, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#5f6b78', 'font-family': 'STIX Two Text' }, ruler); t.textContent = s; });
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry(7), EL = [], elecG = $('elec');
for (let i = 0; i < 46; i++) EL.push({ c: el('circle', { r: 2.1, fill: '#1f5c96', opacity: .85 }, elecG), u: rnd(), v: rnd() * 2 - 1, ph: rnd() * 6.28, sp: .75 + rnd() * .5 });
const CY = 82;
function layoutWire() {
  const th = 6 + W1.d * 34, xs = 38, xe = 38 + W1.L * 140, y = CY - th / 2, rx = Math.max(2, th * .22);
  set('wbody', { x: xs, y, width: xe - xs, height: th });
  set('wend', { cx: xe, cy: CY, rx, ry: th / 2 }); set('wstart', { cx: xs, cy: CY, rx, ry: th / 2 });
  set('wshine', { x: xs + 4, y: y + th * .16, width: Math.max(0, xe - xs - 8), height: Math.max(1.2, th * .12) });
  set('wclipr', { x: xs, y, width: xe - xs, height: th });
  set('wg1', { 'stop-color': rgb(W1.c[0]) }); set('wg2', { 'stop-color': rgb(W1.c[1]) }); set('wg3', { 'stop-color': rgb(W1.c[2]) });
  const xr = Math.min(340, xe + 18);
  set('termL', { transform: `translate(18 ${CY - 44})` }); set('termR', { transform: `translate(${xr} ${CY - 44})` });
  set('leadL', { d: `M18 ${CY - 33} V${CY} H${xs - rx}` }); set('leadR', { d: `M${xr} ${CY - 33} V${CY} H${xe + rx}` });
  set('dimLl', { x1: xs, x2: xe, y1: CY + th / 2 + 14, y2: CY + th / 2 + 14 });
  const tL = $('dimLt'); set(tL, { x: (xs + xe) / 2, y: CY + th / 2 + 28 }); tL.textContent = 'L = ' + S1.L.toFixed(2) + ' m';
  const inside = xe < 250;
  set('dimDl', { x1: xe + 10, x2: xe + 10, y1: y, y2: y + th }); $('dimDl').style.display = inside ? '' : 'none';
  const tD = $('dimDt'); set(tD, { x: inside ? xe + 16 : xs + 6, y: inside ? CY + 4 : y - 6 }); tD.textContent = 'd = ' + S1.d.toFixed(2) + ' mm';
  return { xs, xe, th };
}

/* =======================================================================
   PANEL 2 — I–V graphs (V horizontal, I vertical)
   ======================================================================= */
const IS = 1e-14, VT = 0.025852;                         // idealised silicon diode, Shockley, n = 1, 300 K
const Idiode = v => IS * (Math.exp(v / VT) - 1);
const G = { x0: 46, y0: 162, w: 270, h: 140 };
function axesSVG(svg, o) {
  svg.innerHTML = '';
  const X = v => G.x0 + (v - o.xmin) / (o.xmax - o.xmin) * G.w, Y = v => G.y0 - (v - o.ymin) / (o.ymax - o.ymin) * G.h;
  const g = el('g', {}, svg);
  o.xt.forEach(v => el('line', { x1: X(v), y1: Y(o.ymin), x2: X(v), y2: Y(o.ymax), stroke: '#eef1f6' }, g));
  o.yt.forEach(v => el('line', { x1: X(o.xmin), y1: Y(v), x2: X(o.xmax), y2: Y(v), stroke: '#eef1f6' }, g));
  el('defs', {}, svg).innerHTML = `<marker id="ax${svg.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2d2b38"/></marker>`;
  el('line', { x1: X(o.xmin), y1: Y(0), x2: X(o.xmax) + 8, y2: Y(0), stroke: '#2d2b38', 'stroke-width': 1.4, 'marker-end': `url(#ax${svg.id})` }, svg);
  el('line', { x1: X(0), y1: Y(o.ymin), x2: X(0), y2: Y(o.ymax) - 8, stroke: '#2d2b38', 'stroke-width': 1.4, 'marker-end': `url(#ax${svg.id})` }, svg);
  const T = (x, y, s, a = {}) => { const t = el('text', Object.assign({ x, y, 'font-size': 11.5, fill: '#5f6b78', 'font-family': 'STIX Two Text' }, a), svg); t.textContent = s; return t; };
  o.xt.forEach(v => { if (v) T(X(v), Y(0) + 15, o.xl(v), { 'text-anchor': 'middle' }); });
  o.yt.forEach(v => { if (v) T(X(0) - 5, Y(v) + 4, o.yl(v), { 'text-anchor': 'end' }); });
  T(X(0) - 5, Y(0) + 14, '0', { 'text-anchor': 'end' });
  T(X(o.xmax) + 6, Y(0) + 28, 'ΔV (V)', { 'text-anchor': 'end', 'font-size': 12.5, fill: '#2d2b38', 'font-style': 'italic' });
  T(X(0) + 8, Y(o.ymax) - 2, o.ylab, { 'font-size': 12.5, fill: '#2d2b38', 'font-style': 'italic' });
  return { X, Y };
}
const S2 = { V: 4, R: 20, Vd: 0.6 };
let ohm, ohmEls = {}, di, diEls = {};
(function buildOhm() {
  const svg = $('gOhm');
  ohm = axesSVG(svg, { xmin: 0, xmax: 10, ymin: 0, ymax: 1, xt: [0, 2, 4, 6, 8, 10], yt: [0, .2, .4, .6, .8, 1], xl: v => v, yl: v => v.toFixed(1), ylab: 'I (A)' });
  ohmEls.line = el('line', { stroke: '#2a6fb0', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
  ohmEls.trail = el('line', { stroke: '#126e84', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: .22 }, svg);
  ohmEls.vx = el('line', { stroke: '#e99f09', 'stroke-dasharray': '3 3' }, svg);
  ohmEls.hy = el('line', { stroke: '#e99f09', 'stroke-dasharray': '3 3' }, svg);
  ohmEls.halo = el('circle', { r: 11, fill: '#2a6fb0', opacity: .16 }, svg);
  ohmEls.pt = el('circle', { r: 6, fill: '#fdc705', stroke: '#1f5c96', 'stroke-width': 2.5 }, svg);
  ohmEls.slope = el('text', { class: 'h', 'font-size': 12.5, fill: '#1f5c96', 'font-family': 'IBM Plex Sans Arabic', 'font-weight': 700, 'text-anchor': 'middle' }, svg);
  ohmEls.slope.textContent = 'خط مستقيم';
})();
(function buildDi() {
  const svg = $('gDi');
  di = axesSVG(svg, { xmin: -1, xmax: 0.8, ymin: 0, ymax: 0.05, xt: [-1, -0.5, 0, 0.5], yt: [0, .01, .02, .03, .04, .05], xl: v => String(v).replace('-', '−'), yl: v => (v * 1000).toFixed(0), ylab: 'I (mA)' });
  let d = '';
  for (let k = 0; k <= 360; k++) { const v = -1 + k * (1.8 / 360), i = Idiode(v); if (i > 0.05) break; d += (k ? 'L' : 'M') + di.X(v).toFixed(2) + ' ' + di.Y(Math.max(0, i)).toFixed(2); }
  el('path', { d, fill: 'none', stroke: '#d9541c', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
  diEls.vx = el('line', { stroke: '#e99f09', 'stroke-dasharray': '3 3' }, svg);
  diEls.hy = el('line', { stroke: '#e99f09', 'stroke-dasharray': '3 3' }, svg);
  diEls.chord = el('line', { stroke: '#d9541c', 'stroke-width': 1.4, 'stroke-dasharray': '5 4', opacity: .7 }, svg);
  diEls.halo = el('circle', { r: 11, fill: '#d9541c', opacity: .16 }, svg);
  diEls.pt = el('circle', { r: 6, fill: '#fdc705', stroke: '#b4400f', 'stroke-width': 2.5 }, svg);
  const a = el('text', { class: 'h', x: di.X(-0.97), y: di.Y(0) - 9, 'font-size': 12, fill: '#5f6b78', 'font-family': 'IBM Plex Sans Arabic' }, svg); a.textContent = 'الاتجاه العكسي: تيار ≈ 0';
  const b = el('text', { class: 'h', x: di.X(0.6), y: di.Y(0.045), 'font-size': 12, fill: '#b4400f', 'font-family': 'IBM Plex Sans Arabic', 'text-anchor': 'end', 'font-weight': 700 }, svg); b.textContent = 'يزداد التيار بسرعة';
})();
const sOV = $('sOV'), sOR = $('sOR'), sDV = $('sDV');
let base2 = null, last2 = 'ov';
[sOV, sOR, sDV].forEach(s => ['pointerdown', 'keydown', 'touchstart'].forEach(ev => s.addEventListener(ev, () => { base2 = { ...S2 }; }, { passive: true })));
sOV.addEventListener('input', () => { if (!base2 || last2 !== 'ov') base2 = { ...S2 }; last2 = 'ov'; S2.V = +sOV.value; update2(); });
sOR.addEventListener('input', () => { if (!base2 || last2 !== 'or') base2 = { ...S2 }; last2 = 'or'; S2.R = +sOR.value; update2(); });
sDV.addEventListener('input', () => { last2 = 'dv'; S2.Vd = +sDV.value; update2(); });
const T2 = { ...S2 };
const fmtI = i => withPrefix(i, 'A').join(' ');
function update2() {
  const I = S2.V / S2.R;
  $('vOV').textContent = S2.V.toFixed(1) + ' V'; $('vOR').textContent = S2.R + ' Ω';
  $('kOV').textContent = S2.V.toFixed(1) + ' V';
  $('kOI').textContent = S2.V === 0 ? '0 A' : fmtI(I); $('kOI').dataset.exact = I;
  $('kOR').textContent = S2.R.toFixed(1) + ' Ω'; $('kOR').dataset.exact = S2.R;
  $('ohmLive').innerHTML = 'الميل ' + B('1/R = ' + sig(1 / S2.R, 3) + ' Ω⁻¹');
  const V = S2.Vd, Id = Idiode(V), Rd = Math.abs(V) < 1e-9 ? NaN : V / Id;
  $('vDV').textContent = V.toFixed(2).replace('-', '−') + ' V';
  $('kDV').textContent = V.toFixed(2).replace('-', '−') + ' V';
  $('kDI').dataset.exact = Id; $('kDI').textContent = Math.abs(Id) < 1e-9 ? '≈ 0 A' : fmtI(Id);
  $('kDR').dataset.exact = Rd; $('kDR').textContent = isNaN(Rd) ? '—' : (Math.abs(Rd) > 1e6 ? 'كبيرة جدًا' : withPrefix(Rd, 'Ω').join(' '));
  $('diLive').textContent = V > 0 ? 'الاتجاه الأمامي' : V < 0 ? 'الاتجاه العكسي' : '';
  let t;
  if (last2 === 'dv') {
    if (V <= 0) t = 'في الاتجاه العكسي (عكس الاتجاه الذي يسمح فيه الثنائي بمرور التيار) لا يسري تيار يُذكر، فمقاومة الثنائي كبيرة جدًا.';
    else if (V < 0.55) t = `عند ${B(V.toFixed(2) + ' V')} يكون التيار صغيرًا جدًا، ومقاومة الثنائي كبيرة (${B($('kDR').textContent)}).`;
    else t = `قرب ${B('0.6')} إلى ${B('0.7 V')} يزداد التيار بسرعة كبيرة، فتنخفض النسبة ${B('ΔV/I', 'm')} إلى ${B($('kDR').textContent)}. المقاومة تتغيّر بتغيّر فرق الجهد؛ إذن الثنائي مادة لا أوميّة.`;
  } else if (last2 === 'or' && base2 && base2.R !== S2.R) {
    t = `غيّرت المقاومة من ${B(base2.R + ' Ω')} إلى ${B(S2.R + ' Ω')}، فتغيّر ميل الخط (${B('1/R', 'm')}). كلما زادت المقاومة قلّ الميل، وقلّ التيار عند فرق الجهد نفسه.`;
  } else {
    const head = (base2 && Math.abs(base2.V - S2.V) > 1e-9 && base2.V > 0 && S2.V > 0)
      ? `تغيّر فرق الجهد من ${B(base2.V.toFixed(1) + ' V')} إلى ${B(S2.V.toFixed(1) + ' V')} (${B(ratioText(S2.V / base2.V))})، فتغيّر التيار بالنسبة نفسها إلى ${B($('kOI').textContent)}. `
      : `عند ${B('ΔV = ' + S2.V.toFixed(1) + ' V')} يكون ${B('I = ' + $('kOI').textContent)}. `;
    t = head + `النسبة ${B('ΔV/I', 'm')} ثابتة وتساوي ${B(S2.R + ' Ω')}؛ إذن هو موصل أوميّ.`;
  }
  $('note2t').innerHTML = t;
}

/* =======================================================================
   PANEL 3 — ΔVε = ε − Ir  (I set by a rheostat)
   ======================================================================= */
const S3 = { E: 9, r: 1, I: 0.5 };
const sE = $('sE'), sr = $('sr'), sI = $('sI');
let clampMsg = '', last3 = 'I', base3 = { ...S3 };
const Imax3 = () => S3.r > 0 ? S3.E / S3.r : Infinity;
function enforce3() {
  clampMsg = '';
  if (S3.r > 0 && S3.I * S3.r > S3.E + 1e-12) {
    let I = Math.floor(S3.E / S3.r / 0.05 + 1e-9) * 0.05;
    if (I * S3.r > S3.E) I = Math.max(0, I - 0.05);
    S3.I = +I.toFixed(2); sI.value = S3.I; fill(sI);
    clampMsg = `لا يمكن أن يتجاوز الهبوط ${B('Ir', 'm')} القوة الدافعة الكهربائية؛ أقصى تيار هنا ${B('ε/r = ' + sig(S3.E / S3.r, 3) + ' A')}، وعنده يصبح فرق الجهد بين القطبين صفرًا. الجزء المخطّط من شريط التيار غير ممكن.`;
  }
}
function fz() {      // forbidden zone on the current slider
  const im = Imax3(), lab = $('fzLab');
  if (im < 5) {
    const z = im / 5 * 100; sI.style.setProperty('--z', z + '%');
    lab.style.display = 'block'; lab.style.left = `calc(14px + (100% - 28px) * ${z / 100})`;
    lab.innerHTML = 'الحدّ ' + B('ε/r = ' + sig(im, 3) + ' A');
  } else { sI.style.setProperty('--z', '100%'); lab.style.display = 'none'; }
}
[sE, sr, sI].forEach(s => ['pointerdown', 'keydown', 'touchstart'].forEach(ev => s.addEventListener(ev, () => { base3 = { ...S3 }; }, { passive: true })));
sE.addEventListener('input', () => { last3 = 'E'; S3.E = +sE.value; enforce3(); update3(); });
sr.addEventListener('input', () => { last3 = 'r'; S3.r = +sr.value; enforce3(); update3(); });
sI.addEventListener('input', () => { last3 = 'I'; S3.I = +sI.value; enforce3(); update3(); });
const T3 = { ...S3 };
const niceV = E => [3, 6, 9, 12, 15].find(v => v >= E * 1.25 - 1e-9) || 15;

/* battery scene with rheostat */
$('batSvg').innerHTML = `
<path d="M232 150 H318 V40 H220 M136 40 H38 V150 H120" fill="none" stroke="#2d2b38" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M136 40 h6 l5-10 8 20 8-20 8 20 8-20 8 20 8-20 5 10 h18" fill="#e8f1fb" fill-opacity=".001" stroke="#1f5c96" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M150 62 L208 16" stroke="#7a58ae" stroke-width="2.2"/><path d="M208 16 l-11 2 6 7z" fill="#7a58ae"/>
<text x="178" y="80" text-anchor="middle" font-size="12" fill="#1f5c96" font-family="IBM Plex Sans Arabic" font-weight="700">مقاومة متغيّرة نضبط بها التيار</text>
<text id="Rlab" x="232" y="24" font-size="13" fill="#3e2f7a" font-family="STIX Two Text"></text>
<rect x="104" y="122" width="144" height="58" rx="14" fill="#fff" fill-opacity=".75" stroke="#2a6fb0" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="120" y1="150" x2="134" y2="150" stroke="#2d2b38" stroke-width="2.4"/>
<line x1="134" y1="139" x2="134" y2="161" stroke="#2d2b38" stroke-width="4"/>
<line x1="146" y1="130" x2="146" y2="170" stroke="#2d2b38" stroke-width="2.2"/>
<text x="126" y="137" font-size="14" fill="#2d2b38" font-family="STIX Two Text" text-anchor="middle">−</text>
<text x="154" y="132" font-size="13" fill="#2d2b38" font-family="STIX Two Text" text-anchor="middle">+</text>
<path id="rZig" d="M146 150 h10 l4-8 6 16 6-16 6 16 6-16 6 16 4-8 h38" fill="none" stroke="#d9541c" stroke-width="2.4" stroke-linejoin="round"/>
<text x="140" y="196" text-anchor="middle" font-size="16" fill="#2d2b38" font-family="STIX Two Text" font-style="italic">ε</text>
<text x="181" y="196" text-anchor="middle" font-size="15" fill="#b4400f" font-family="STIX Two Text" font-style="italic">r</text>
<text x="226" y="196" text-anchor="middle" font-size="12" fill="#5f6b78" font-family="IBM Plex Sans Arabic">البطارية</text>
<circle cx="120" cy="150" r="4" fill="#2d2b38"/><text x="112" y="141" text-anchor="end" font-size="14" fill="#2d2b38" font-family="STIX Two Text" font-style="italic">a</text>
<circle cx="232" cy="150" r="4" fill="#2d2b38"/><text x="240" y="141" font-size="14" fill="#2d2b38" font-family="STIX Two Text" font-style="italic">b</text>
<g id="qs"></g>
<g id="Iarrow"><path d="M262 150 h22" stroke="#e99f09" stroke-width="3"/><path d="M284 144 l9 6 -9 6z" fill="#e99f09"/><text x="276" y="140" font-size="15" fill="#9a6500" font-family="STIX Two Text" font-style="italic" text-anchor="middle">I</text></g>
<text id="rIdeal" x="181" y="114" text-anchor="middle" font-size="12" fill="#126e84" font-family="IBM Plex Sans Arabic" font-weight="700"></text>`;
const PATH = [[232, 150], [318, 150], [318, 40], [38, 40], [38, 150], [120, 150], [232, 150]];
const segL = []; let PL = 0;
for (let i = 0; i < PATH.length - 1; i++) { const l = Math.hypot(PATH[i + 1][0] - PATH[i][0], PATH[i + 1][1] - PATH[i][1]); segL.push(l); PL += l; }
function ptAt(s) { s = ((s % PL) + PL) % PL; for (let i = 0; i < segL.length; i++) { if (s <= segL[i]) { const f = s / segL[i]; return [PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * f, PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * f]; } s -= segL[i]; } return PATH[0]; }
const QN = 22, QS = [], qg = $('qs');
for (let i = 0; i < QN; i++) { const g = el('g', {}, qg); el('circle', { r: 4.6, fill: '#fdc705', stroke: '#b06f00', 'stroke-width': 1 }, g); const t = el('text', { y: 3, 'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: '#6b4a00', 'font-family': 'IBM Plex Sans Arabic', style: 'stroke:none' }, g); t.textContent = '+'; QS.push(g); }
let qPhase = 0;

/* voltage bar */
$('vbarSvg').innerHTML = `
<rect x="22" y="12" width="36" height="158" rx="10" fill="#f2f5fa"/>
<rect id="vbT" x="22" width="36" fill="#2a6fb0"/><rect id="vbIr" x="22" width="36" fill="#d9541c"/>
<line id="vbE" x1="14" x2="66" stroke="#2d2b38" stroke-width="1.6" stroke-dasharray="3 2"/>
<text id="vbEt" x="40" text-anchor="middle" font-size="12" fill="#2d2b38" font-family="STIX Two Text"></text>
<text id="vbTt" x="40" text-anchor="middle" font-size="11.5" fill="#fff" font-family="STIX Two Text"></text>
<text id="vbIrt" x="40" text-anchor="middle" font-size="11.5" fill="#fff" font-family="STIX Two Text"></text>`;
const VB = { top: 22, bot: 170 };

/* terminal graph — I horizontal, ΔVε vertical, axis auto-scales to ε */
const gt = $('gTerm');
const GT = { x0: 34, y0: 158, w: 196, h: 134, imax: 5, vmax: 12 };
const TX = i => GT.x0 + i / GT.imax * GT.w, TY = v => GT.y0 - v / GT.vmax * GT.h;
function buildTerm(vmax) {
  GT.vmax = vmax;
  const st = vmax / 3;
  let s = `<defs><marker id="axT" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2d2b38"/></marker></defs>`;
  for (let i = 1; i <= 5; i++) s += `<line x1="${TX(i)}" y1="${TY(0)}" x2="${TX(i)}" y2="${TY(vmax)}" stroke="#eef1f6"/>`;
  for (let k = 1; k <= 3; k++) s += `<line x1="${TX(0)}" y1="${TY(k * st)}" x2="${TX(5)}" y2="${TY(k * st)}" stroke="#eef1f6"/>`;
  s += `<line x1="${TX(0)}" y1="${TY(0)}" x2="${TX(5) + 8}" y2="${TY(0)}" stroke="#2d2b38" stroke-width="1.4" marker-end="url(#axT)"/>`;
  s += `<line x1="${TX(0)}" y1="${TY(0)}" x2="${TX(0)}" y2="${TY(vmax) - 8}" stroke="#2d2b38" stroke-width="1.4" marker-end="url(#axT)"/>`;
  for (let i = 1; i <= 5; i++) s += `<text x="${TX(i)}" y="${TY(0) + 14}" text-anchor="middle" font-size="11.5" fill="#5f6b78" font-family="STIX Two Text">${i}</text>`;
  for (let k = 1; k <= 3; k++) s += `<text x="${TX(0) - 4}" y="${TY(k * st) + 4}" text-anchor="end" font-size="11.5" fill="#5f6b78" font-family="STIX Two Text">${k * st}</text>`;
  s += `<text x="${TX(0) - 4}" y="${TY(0) + 13}" text-anchor="end" font-size="11.5" fill="#5f6b78" font-family="STIX Two Text">0</text>`;
  s += `<text x="${TX(5) + 6}" y="${TY(0) + 28}" text-anchor="end" font-size="12.5" fill="#2d2b38" font-family="STIX Two Text" font-style="italic">I (A)</text>`;
  s += `<text x="${TX(0) + 8}" y="${TY(vmax) - 4}" font-size="12.5" fill="#2d2b38" font-family="STIX Two Text" font-style="italic">ΔV<tspan baseline-shift="sub" font-size="70%">ε</tspan><tspan font-style="normal"> (V)</tspan></text>`;
  s += `<rect id="tFz" fill="#fbeee7" opacity=".9"/>`;
  s += `<line id="tE" stroke="#8a93a0" stroke-dasharray="4 4"/><text id="tEt" class="h" font-size="14" fill="#2d2b38" font-family="STIX Two Text" font-style="italic" text-anchor="end">ε</text>`;
  s += `<line id="tLine" stroke="#2a6fb0" stroke-width="3" stroke-linecap="round"/>`;
  s += `<line id="tIr" stroke="#d9541c" stroke-width="3"/><text id="tIrt" class="h" font-size="13" fill="#b4400f" font-family="STIX Two Text" font-style="italic">Ir</text>`;
  s += `<line id="tvx" stroke="#e99f09" stroke-dasharray="3 3"/>`;
  s += `<circle id="tHalo" r="11" fill="#2a6fb0" opacity=".16"/><circle id="tPt" r="6" fill="#fdc705" stroke="#1f5c96" stroke-width="2.5"/>`;
  s += `<text id="tSl" class="h" font-size="12" fill="#1f5c96" font-family="IBM Plex Sans Arabic" font-weight="700" text-anchor="middle"></text>`;
  gt.innerHTML = s;
}
buildTerm(niceV(S3.E));

function update3() {
  const { E, r, I } = S3, drop = I * r, Vt = E - drop;
  $('vE').textContent = E.toFixed(1) + ' V'; $('vr').textContent = r.toFixed(2) + ' Ω'; $('vI').textContent = I.toFixed(2) + ' A';
  const vm = niceV(E); if (vm !== GT.vmax) buildTerm(vm);
  fz();
  $('eq3a').innerHTML = `<span class="m">ΔV<sub class="s">ε</sub></span> = <span class="m">ε</span> − <span class="m">I r</span>`;
  $('eq3b').innerHTML = `= ${E.toFixed(1)} − (${I.toFixed(2)} × ${r.toFixed(2)}) = ${E.toFixed(1)} − ${drop.toFixed(2)} = <span class="hl" id="Vtval" data-exact="${Vt}">${Vt.toFixed(2)} V</span>`;
  const Rext = I > 0 ? Vt / I : Infinity;
  $('eq3c').innerHTML = I > 0 ? `مقاومة المقاومة المتغيّرة اللازمة لهذا التيار: ${B('R = ΔV<sub class="s">ε</sub>/I = ' + (Vt <= 1e-9 ? '0' : sig(Rext, 3)) + ' Ω')}` : 'لا يسري تيار: الدارة مفتوحة (المقاومة المتغيّرة كبيرة جدًا).';
  $('eq3c').dataset.exact = Rext;
  $('Rlab').textContent = I > 0 ? 'R = ' + (Vt <= 1e-9 ? '0' : sig(Rext, 3)) + ' Ω' : 'R → ∞';
  let t, n3 = $('note3');
  if (clampMsg) { t = clampMsg; n3.classList.add('warn'); }
  else {
    n3.classList.remove('warn');
    if (r === 0) t = `<b>بطارية مثالية</b> (${B('r = 0', 'm')}): فرق الجهد بين قطبيها يساوي قوتها الدافعة ${B(E.toFixed(1) + ' V')} مهما كان التيار.`;
    else if (I === 0) t = `لا يسري تيار، فلا هبوط في الجهد داخل البطارية: فرق الجهد بين القطبين يساوي ${B('ε = ' + E.toFixed(1) + ' V')}، وهو أكبر فرق جهد تولّده البطارية.`;
    else if (last3 === 'r') t = `${S3.r >= base3.r ? 'زادت' : 'قلّت'} المقاومة الداخلية، ${S3.r >= base3.r ? 'فيزداد' : 'فيقلّ'} الهبوط ${B('Ir', 'm')} عند التيار نفسه، ويصبح ميل الخط (${B('−r', 'm')}) ${S3.r >= base3.r ? 'أشد' : 'أقل'} انحدارًا.`;
    else if (last3 === 'E') t = `تغيير ${B('ε', 'm')} يرفع الخط كله أو يخفضه، والهبوط ${B('Ir = ' + drop.toFixed(2) + ' V')} لا يتغيّر ما دمنا نضبط التيار نفسه بالمقاومة المتغيّرة.`;
    else t = `يسري تيار ${B(I.toFixed(2) + ' A')}، فيهبط الجهد داخل البطارية بمقدار ${B(drop.toFixed(2) + ' V')}، ويصبح فرق الجهد بين القطبين ${B(Vt.toFixed(2) + ' V')} فقط، أي ${B(Math.round(Vt / E * 100) + '%')} من ${B('ε', 'm')}.`;
  }
  $('note3t').innerHTML = t;
  $('rIdeal').textContent = r === 0 ? 'r = 0: بطارية مثالية' : '';
}

/* ---------- animation loop ---------- */
let last = performance.now(), tAcc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tAcc += dt;
  const k = RM ? 1 : 1 - Math.exp(-dt * 16);
  // panel 1
  W1.L += (S1.L - W1.L) * k; W1.d += (S1.d - W1.d) * k;
  const tc = MATS[S1.mat].c.map(hex2rgb);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) W1.c[i][j] += (tc[i][j] - W1.c[i][j]) * k;
  const { xs, xe, th } = layoutWire();
  const n = Math.round(8 + 38 * clamp((W1.d * W1.d - 0.01) / 0.99, 0, 1));
  const rhoRel = Math.log10(MATS[S1.mat].rho / 1.7e-8);
  const drift = RM ? 0 : 26 / (0.6 + W1.L * 0.5) / (1 + rhoRel * 0.9), jit = 0.15 + rhoRel * 0.18;
  EL.forEach((e, i) => {
    if (i >= n) { e.c.setAttribute('opacity', 0); return; }
    e.u -= (drift * e.sp * dt) / Math.max(20, xe - xs); if (e.u < 0) e.u += 1;
    e.c.setAttribute('cx', (xs + e.u * (xe - xs)).toFixed(1));
    e.c.setAttribute('cy', (CY + e.v * (th / 2 - 2.5) * 0.9 + (RM ? 0 : Math.sin(tAcc * 9 * e.sp + e.ph) * jit * th * 0.25)).toFixed(1));
    e.c.setAttribute('opacity', .85); e.c.setAttribute('r', Math.max(1.4, Math.min(2.4, th / 7)));
  });
  Rshow = Rshow * Math.pow(Rtarget / Rshow, k); if (Math.abs(Rshow / Rtarget - 1) < 1e-3) Rshow = Rtarget;
  const [rn, ru] = withPrefix(Rshow, 'Ω'); const rv = $('Rval'); if (rv.textContent !== rn) rv.textContent = rn; $('Runit').textContent = ru;
  // panel 2
  T2.V += (S2.V - T2.V) * k; T2.R += (S2.R - T2.R) * k; T2.Vd += (S2.Vd - T2.Vd) * k;
  {
    const R = T2.R, vEnd = Math.min(10, R), Io = T2.V / R, px = ohm.X(T2.V), py = ohm.Y(Io);
    set(ohmEls.line, { x1: ohm.X(0), y1: ohm.Y(0), x2: ohm.X(vEnd), y2: ohm.Y(vEnd / R) });
    set(ohmEls.trail, { x1: ohm.X(0), y1: ohm.Y(0), x2: px, y2: py });
    set(ohmEls.vx, { x1: px, x2: px, y1: py, y2: ohm.Y(0) }); set(ohmEls.hy, { x1: ohm.X(0), x2: px, y1: py, y2: py });
    set(ohmEls.pt, { cx: px, cy: py }); set(ohmEls.halo, { cx: px, cy: py, r: 10 + Math.sin(tAcc * 4) * 2 });
    const lv = Math.min(8.6, vEnd * .86);              // label 16 px above the line, away from the point
    const lx = ohm.X(lv) - 26, ly = ohm.Y(lv / R) - 16;
    set(ohmEls.slope, { x: lx, y: ly });
  }
  {
    const v = T2.Vd, i = Math.max(0, Idiode(v)), px = di.X(v), py = di.Y(Math.min(i, 0.05));
    set(diEls.vx, { x1: px, x2: px, y1: py, y2: di.Y(0) }); set(diEls.hy, { x1: di.X(0), x2: px, y1: py, y2: py });
    set(diEls.chord, { x1: di.X(0), y1: di.Y(0), x2: px, y2: py }); diEls.chord.style.display = v > 0.3 ? '' : 'none';
    set(diEls.pt, { cx: px, cy: py }); set(diEls.halo, { cx: px, cy: py, r: 10 + Math.sin(tAcc * 4) * 2 });
  }
  // panel 3
  T3.E += (S3.E - T3.E) * k; T3.r += (S3.r - T3.r) * k; T3.I += (S3.I - T3.I) * k;
  const E = T3.E, r = T3.r, I = T3.I, drop = Math.min(E, I * r), Vt = E - drop;
  const sc = (VB.bot - VB.top) / GT.vmax, hT = Vt * sc, hD = drop * sc;
  set('vbT', { y: VB.bot - hT, height: Math.max(0, hT) }); set('vbIr', { y: VB.bot - hT - hD, height: Math.max(0, hD) });
  set('vbE', { y1: VB.bot - E * sc, y2: VB.bot - E * sc }); set('vbEt', { y: VB.bot - E * sc - 5 }); $('vbEt').textContent = 'ε = ' + S3.E.toFixed(1);
  const Vts = S3.E - S3.I * S3.r;
  set('vbTt', { y: VB.bot - hT / 2 + 4 }); $('vbTt').textContent = hT > 16 ? Vts.toFixed(1) : '';
  set('vbIrt', { y: VB.bot - hT - hD / 2 + 4 }); $('vbIrt').textContent = hD > 15 ? (S3.I * S3.r).toFixed(1) : '';
  const iEnd = r > 0 ? Math.min(5, E / r) : 5;
  set('tLine', { x1: TX(0), y1: TY(E), x2: TX(iEnd), y2: TY(E - r * iEnd) });
  // forbidden zone (I > ε/r) shading on the graph
  if (iEnd < 5) set('tFz', { x: TX(iEnd), y: TY(GT.vmax), width: TX(5) - TX(iEnd), height: TY(0) - TY(GT.vmax) }); else set('tFz', { width: 0, height: 0 });
  set('tE', { x1: TX(0), y1: TY(E), x2: TX(5), y2: TY(E) }); set('tEt', { x: TX(5), y: TY(E) - 6 });
  set('tvx', { x1: TX(I), x2: TX(I), y1: TY(E), y2: TY(0) });
  set('tIr', { x1: TX(I), x2: TX(I), y1: TY(E), y2: TY(Vt) });
  set('tIrt', { x: TX(I) + 5, y: (TY(E) + TY(Vt)) / 2 + 4 }); $('tIrt').style.display = (TY(Vt) - TY(E)) > 16 ? '' : 'none'; set('tIrt', { x: TX(I) - 6, 'text-anchor': 'end' });
  set('tPt', { cx: TX(I), cy: TY(Vt) }); set('tHalo', { cx: TX(I), cy: TY(Vt), r: 10 + Math.sin(tAcc * 4) * 2 });
  const lineLen = Math.hypot(TX(iEnd) - TX(0), TY(E - r * iEnd) - TY(E));
  const mi = iEnd * 0.5, mx = TX(mi), my = TY(E - r * mi);
  const ddx = TX(iEnd) - TX(0), ddy = TY(E - r * iEnd) - TY(E), dl = Math.hypot(ddx, ddy) || 1;
  const nx = ddy / dl, ny = -ddx / dl;                 // normal pointing up-right of the falling line
  if (iEnd < 2.5) set('tSl', { x: Math.min(TX(5) - 30, TX(iEnd) + 42), y: TY(E * 0.55) }); else set('tSl', { x: mx + nx * 24 + 8, y: my + ny * 24 }); $('tSl').textContent = r < 0.001 ? 'r = 0' : (lineLen > 60 ? 'الميل = −r' : '');
  qPhase += RM ? 0 : I * 34 * dt;
  QS.forEach((g, i) => {
    const [x, y] = ptAt(qPhase + i * PL / QN);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const hide = (y < 48 && x > 130 && x < 226) || (y > 140 && x > 124 && x < 152) || (Math.abs(y - 150) < 2 && (Math.abs(x - 120) < 7 || Math.abs(x - 232) < 7 || (x > 256 && x < 298)));
    g.style.opacity = hide ? 0 : (I > 0.001 ? 1 : .45);
  });
  $('Iarrow').style.opacity = I > 0.001 ? 1 : .25;
  $('rZig').setAttribute('stroke-width', (2.2 + clamp(drop / 3, 0, 1) * 1.8).toFixed(2));
  requestAnimationFrame(frame);
}

update1(); update2(); update3();
requestAnimationFrame(frame);
window.__card = { S1, S2, S3, MATS, Idiode, selectTab };
})();
