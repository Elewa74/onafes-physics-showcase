
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

/* ---------------- physics (book table 1, 20 °C) ---------------- */
const RHO = { nichrome: 1.5e-6, iron: 10e-8, tungsten: 5.6e-8 };
const MAT = { nichrome: 'نيكروم', iron: 'حديد', tungsten: 'تنغستن' };
const D_THIN = 0.10e-3, D_THICK = 0.20e-3;           // micrometer readings (equal diameters for the three 40 cm wires)
const V_SRC = 1.00;                                   // supply set to 1 V
const area = d => Math.PI * d * d / 4;
const resist = (rho, L, d) => rho * L / area(d);
window.__lab = { RHO, D_THIN, D_THICK, V_SRC, area, resist };

/* formatting */
const fmtI = I => I < 0.1 ? { v: (I * 1000).toFixed(2), u: 'mA', dg: 2 } : I < 1 ? { v: (I * 1000).toFixed(1), u: 'mA', dg: 1 } : { v: I.toFixed(2), u: 'A', dg: 2 };
const fmtR = x => x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toFixed(3);
const sig3 = fmtR;
const fmtA = A => { const e = Math.floor(Math.log10(A)); const m = A / 10 ** e; return `${m.toFixed(2)} × 10<sup>${e < 0 ? '\u2212' + (-e) : e}</sup>`; };
const TARGETS = [20, 40, 60, 80];
const listCm = cs => cs.map((c, i) => `<bdi>${c}${i === cs.length - 1 ? ' cm' : ''}</bdi>`).join(' و');

/* ---------------- toast & meters ---------------- */
/* recording feedback is shown inline (hint line under the meters + row flash + meter pulse) instead of a floating toast */
let flashMsg = null;
function toast(msg) { flashMsg = msg; }
const tweens = new Map();
function setMeter(id, val, unit, digits, pulseId) {
  const node = $(id); const prev = tweens.get(id) || { cur: 0 };
  const from = isFinite(prev.cur) ? prev.cur : 0, to = val; const t0 = performance.now(), dur = 420;
  cancelAnimationFrame(prev.raf);
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    const v = from + (to - from) * e;
    node.innerHTML = `${v.toFixed(digits)} <small>${unit}</small>`;
    st.cur = v; if (k < 1) st.raf = requestAnimationFrame(step); else { node.innerHTML = `${to.toFixed(digits)} <small>${unit}</small>`; st.cur = to; }
  };
  const st = { cur: from, raf: requestAnimationFrame(step) }; tweens.set(id, st);
  if (pulseId) { const m = $(pulseId); m.classList.remove('pulse'); void m.offsetWidth; m.classList.add('pulse'); }
}

/* ---------------- tabs ---------------- */
function placePill() { const on = $('.tabs button.on'), p = $('#pill'); const r = on.getBoundingClientRect(), pr = on.parentElement.getBoundingClientRect(); p.style.left = (r.left - pr.left) + 'px'; p.style.width = r.width + 'px'; }
$$('.tabs button').forEach(b => b.onclick = () => {
  $$('.tabs button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
  $$('.pane').forEach(p => p.classList.toggle('on', p.id === b.dataset.tab)); placePill();
  if (b.dataset.tab === 'exp0') draw0();
});
window.addEventListener('resize', placePill);

/* =================================================================
   EXPERIMENT 1 — rig drawing
   ================================================================= */
const RX0 = 34, RX1 = 334, PXCM = (RX1 - RX0) / 100;   // ruler 0..100 cm
const WY = 168;                                         // wire height
const rig = $('#rig');
const S = { step: 0, maxStep: 0, L: 20, part1: {}, part2: null, thinRef: null, mat: 'nichrome', part3: {}, measured: { thin: false, thick: false }, dragging: false };
window.__S = S;

function drawRig() {
  rig.innerHTML = '';
  const defs = el('defs', {}, rig);
  defs.innerHTML = `
   <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2d6aa"/><stop offset="1" stop-color="#d9b07a"/></linearGradient>
   <linearGradient id="psu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9edf5"/><stop offset="1" stop-color="#cfd6e3"/></linearGradient>
   <linearGradient id="wN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c5c9d2"/><stop offset=".5" stop-color="#8b8f9c"/><stop offset="1" stop-color="#6e7280"/></linearGradient>
   <linearGradient id="wFe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8e98"/><stop offset=".5" stop-color="#55585f"/><stop offset="1" stop-color="#3c3f45"/></linearGradient>
   <linearGradient id="wW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e9f2"/><stop offset=".5" stop-color="#a9b6c8"/><stop offset="1" stop-color="#8291a6"/></linearGradient>
   <marker id="arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#e99f09"/></marker>
   <filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1f2a44" flood-opacity=".18"/></filter>`;
  // bench line

  // ruler
  const ru = el('g', {}, rig);
  el('rect', { x: RX0 - 12, y: WY + 4, width: RX1 - RX0 + 24, height: 34, rx: 4, fill: 'url(#wood)', stroke: '#c19358', 'stroke-width': 1, filter: 'url(#sh)' }, ru);
  for (let c = 0; c <= 100; c++) {
    const x = RX0 + c * PXCM, big = c % 10 === 0, mid = c % 5 === 0;
    el('line', { x1: x, y1: WY + 4, x2: x, y2: WY + 4 + (big ? 11 : mid ? 7 : 4), stroke: '#6b4a22', 'stroke-width': big ? 1 : .6 }, ru);
    if (big) { const t = el('text', { x, y: WY + 30, 'text-anchor': 'middle', 'font-size': 10, fill: '#5a3d18', 'font-family': 'STIX Two Text' }, ru); t.textContent = c; }
  }

  // wire (length depends on part)
  const wireLen = S.step === 0 ? 100 : 40;
  const wx1 = RX0 + wireLen * PXCM;
  const grad = S.step === 2 ? ({ nichrome: 'wN', iron: 'wFe', tungsten: 'wW' })[S.mat] : 'wN';
  const thick = S.step === 0 ? 2.6 : 4.6;                       // drawn thickness: thin vs thick wire
  el('rect', { x: RX0, y: WY - thick / 2, width: wx1 - RX0, height: thick, rx: thick / 2, fill: `url(#${grad})` }, rig);
  // end clamps
  el('rect', { x: RX0 - 7, y: WY - 6, width: 9, height: 12, rx: 2, fill: '#2d3440' }, rig);
  el('rect', { x: wx1 - 2, y: WY - 6, width: 9, height: 12, rx: 2, fill: '#2d3440' }, rig);

  // power supply
  const ps = el('g', { filter: 'url(#sh)' }, rig);
  el('rect', { x: 12, y: 10, width: 104, height: 66, rx: 10, fill: 'url(#psu)', stroke: '#b8c1d1' }, ps);
  el('rect', { x: 22, y: 18, width: 58, height: 24, rx: 5, fill: '#1d2733' }, ps);
  const vt = el('text', { x: 75, y: 35, 'text-anchor': 'end', 'font-size': 13, fill: '#7ee0ff', 'font-family': 'IBM Plex Mono', 'font-weight': 600 }, ps); vt.textContent = V_SRC.toFixed(2) + ' V';
  const dc = el('text', { x: 98, y: 32, 'text-anchor': 'middle', 'font-size': 10, fill: '#3b4658', 'font-family': 'IBM Plex Mono', 'font-weight': 600 }, ps); dc.textContent = 'DC';
  el('circle', { cx: 98, cy: 22, r: 0 }, ps);
  // knob
  el('circle', { cx: 98, cy: 52, r: 0 }, ps);
  // terminals (−) black at x=34, (+) red at x=96
  el('circle', { cx: 34, cy: 62, r: 6, fill: '#2b2f36', stroke: '#111' }, ps);
  el('circle', { cx: 96, cy: 62, r: 6, fill: '#d23a2a', stroke: '#8f1f14' }, ps);
  const tm = el('text', { x: 46, y: 66, 'font-size': 11, fill: '#2b2f36', 'font-weight': 700 }, ps); tm.textContent = '−';
  const tp = el('text', { x: 80, y: 66, 'font-size': 11, fill: '#d23a2a', 'font-weight': 700 }, ps); tp.textContent = '+';

  // contact position
  const Lc = S.step === 0 ? S.L : 40;
  const xc = RX0 + Lc * PXCM;
  const AX = 232, AY = 42, VX = 124, VY = 94;

  // leads (drawn first so instruments overlay)
  const leads = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, rig);
  // (−) terminal down to zero end of wire
  el('path', { d: `M34 68 V${WY - 10} Q34 ${WY - 4} ${RX0} ${WY - 4}`, stroke: '#2b2f36', 'stroke-width': 2.2 }, leads);
  // (+) terminal to ammeter
  el('path', { d: `M96 68 V${AY} H${AX - 15}`, stroke: '#d23a2a', 'stroke-width': 2.2 }, leads);
  // ammeter to contact (flexible lead)
  const cpy = WY - 34;
  const aLead = `M${AX} ${AY + 15} C ${AX} ${AY + 62}, ${xc} ${cpy - 56}, ${xc} ${cpy}`;
  el('path', { d: aLead, stroke: '#d23a2a', 'stroke-width': 2.2 }, leads);
  // voltmeter: left side tapped from (−) lead, right side to the contact
  el('path', { d: `M34 ${VY} H${VX - 15}`, stroke: '#2b2f36', 'stroke-width': 1.8 }, leads);
  el('circle', { cx: 34, cy: VY, r: 3, fill: '#2b2f36' }, leads);
  el('path', { d: `M${VX} ${VY + 15} C ${VX} ${VY + 34}, ${xc + 3} ${cpy - 20}, ${xc + 3} ${cpy + 4}`, stroke: '#3a6ea5', 'stroke-width': 1.8 }, leads);

  // current path for animated charges (conventional: + → A → contact → along wire → zero → −)
  const curPath = `M96 68 V${AY} H${AX - 15} M${AX + 15} ${AY} C ${AX + 70} ${AY}, ${xc + (xc > AX ? 0 : 30)} ${cpy - 60}, ${xc} ${cpy} V${WY} H${RX0} Q34 ${WY - 4} 34 ${WY - 10} V68`;
  const cp = el('path', { d: `M96 68 V${AY} H${AX} V${AY + 15} C ${AX} ${AY + 62}, ${xc} ${cpy - 56}, ${xc} ${cpy} V${WY} H${RX0} Q34 ${WY - 4} 34 ${WY - 10} V68`, fill: 'none', stroke: 'none', id: 'cpath' }, rig);
  S._cpath = cp;
  const dots = el('g', { id: 'dots' }, rig); S._dots = dots;

  // instruments
  const meter = (x, y, s, col) => { const g = el('g', { filter: 'url(#sh)' }, rig); el('circle', { cx: x, cy: y, r: 15, fill: '#fff', stroke: col, 'stroke-width': 2.4 }, g); const t = el('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: col, 'font-family': 'STIX Two Text' }, g); t.textContent = s; return g; };
  meter(AX, AY, 'A', '#1f5c96'); meter(VX, VY, 'V', '#3a6ea5');

  // current direction arrow along wire (conventional, toward zero)
  if (xc - RX0 > 40) el('path', { d: `M${xc - 12} ${WY - 9} H${Math.max(RX0 + 14, xc - 40)}`, stroke: '#e99f09', 'stroke-width': 2.2, 'marker-end': 'url(#arr)', fill: 'none' }, rig);
  const it = el('text', { x: Math.max(RX0 + 16, xc - 30), y: WY - 14, 'font-size': 11, fill: '#b06f00', 'font-family': 'STIX Two Text', 'font-style': 'italic', 'text-anchor': 'middle' }, rig); it.textContent = 'I';

  // contact (pointed nail) — draggable in part 1
  const nail = el('g', { id: 'nail', style: `cursor:${S.step === 0 ? 'grab' : 'default'}`, transform: `translate(${xc} 0)` }, rig);
  el('rect', { x: -14, y: cpy - 32, width: 28, height: 70, fill: 'transparent' }, nail);     // hit area
  el('rect', { x: -5.5, y: cpy - 18, width: 11, height: 20, rx: 4, fill: '#d23a2a', stroke: '#8f1f14', 'stroke-width': 1 }, nail);
  el('path', { d: `M-2 ${cpy + 2} H2 L0.6 ${WY - 1.5} H-0.6 Z`, fill: '#9aa3b2', stroke: '#6c7585', 'stroke-width': .6 }, nail);
  el('circle', { cx: 0, cy: WY, r: 3.2, fill: '#fdc705', stroke: '#b38a00', 'stroke-width': 1 }, nail);
  // position flag
  const fl = el('g', {}, nail);
  const fx = xc > 300 ? -52 : 10;
  el('rect', { x: fx, y: cpy - 16, width: 42, height: 17, rx: 8.5, fill: S.step === 0 ? '#1f5c96' : '#5f6b78' }, fl);
  const ft = el('text', { x: fx + 21, y: cpy - 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#fff', 'font-family': 'STIX Two Text', 'font-weight': 600 }, fl); ft.textContent = Lc + ' cm';
  S._nail = nail;
  if (S.step === 0 && !S._hinted) {   // one-time affordance: pulsing ring + «اسحب»
    el('circle', { class: 'ring', cx: 0, cy: cpy - 8, r: 16, fill: 'none', stroke: '#7a58ae', 'stroke-width': 2.5 }, nail);
    const dh = el('text', { x: -34, y: cpy + 4, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, fill: '#7a58ae', 'font-family': 'IBM Plex Sans Arabic' }, nail); dh.textContent = 'اسحب ↔';
  }
  rig.setAttribute('aria-valuenow', Lc); rig.setAttribute('aria-valuetext', `${Lc} cm`); rig.setAttribute('aria-disabled', S.step !== 0);

  // target marks in part 1
  if (S.step === 0) [20, 40, 60, 80].forEach(c => {
    const x = RX0 + c * PXCM, done = S.part1[c] !== undefined;
    el('path', { d: `M${x - 4.5} ${WY + 48} l4.5 -7 l4.5 7 z`, fill: done ? '#127a5a' : '#fdc705', stroke: done ? '#0b5a42' : '#b38a00', 'stroke-width': .8 }, rig);
  });
  // label of wire
  const wl = el('text', { x: 184, y: 232, 'font-size': 10.5, fill: '#4b5563', 'font-family': 'IBM Plex Sans Arabic', 'text-anchor': 'middle', direction: 'rtl', 'unicode-bidi': 'embed', 'font-weight': 600 }, rig);
  wl.textContent = S.step === 0 ? 'سلك نيكروم رفيع · \u20661 m\u2069' : S.step === 1 ? 'سلك النيكروم الثاني · \u206640 cm\u2069' : `سلك ${MAT[S.mat]} · \u206640 cm\u2069`;
  if (S.step === 0) attachDrag();
}

/* charges animation */
let tPrev = 0, phase = 0;
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function animDots(now) {
  const cp = S._cpath, g = S._dots;
  if (cp && g && S.step <= 2 && !RM) {
    const len = cp.getTotalLength();
    const I = currentNow();
    const speed = 18 + 26 * Math.log10(1 + I * 40);       // px/s, visual only (monotonic in I)
    const dt = Math.min(0.05, (now - tPrev) / 1000 || 0); tPrev = now; phase = (phase + speed * dt) % 22;
    const n = Math.floor(len / 22);
    while (g.childNodes.length < n) el('circle', { r: 2.3, fill: '#fdc705', stroke: '#b38a00', 'stroke-width': .6 }, g);
    while (g.childNodes.length > n) g.removeChild(g.lastChild);
    for (let i = 0; i < n; i++) { const p = cp.getPointAtLength((i * 22 + phase) % len); g.childNodes[i].setAttribute('cx', p.x); g.childNodes[i].setAttribute('cy', p.y); }
  }
  requestAnimationFrame(animDots);
}

/* current state */
function wireNow() {
  if (S.step === 0) return { rho: RHO.nichrome, L: S.L / 100, d: D_THIN };
  if (S.step === 1) return { rho: RHO.nichrome, L: 0.40, d: D_THICK };
  return { rho: RHO[S.mat], L: 0.40, d: D_THICK };
}
function currentNow() { const w = wireNow(); return V_SRC / resist(w.rho, w.L, w.d); }
function updateMeters(pulse = true) {
  if (S.step > 2) return;
  const I = currentNow(), f = fmtI(I);
  setMeter('#vA', parseFloat(f.v), f.u, f.dg, pulse ? '#mA' : null);
  setMeter('#vV', V_SRC, 'V', 2, null);
}

/* drag (part 1) */
let dragBound = false;
function attachDrag() {
  if (dragBound) return; dragBound = true;
  const toCm = evt => { const pt = rig.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY; const p = pt.matrixTransform(rig.getScreenCTM().inverse()); return (p.x - RX0) / PXCM; };
  const snap = evt => { const raw = toCm(evt); const t = TARGETS.find(t => Math.abs(raw - t) <= 3); let c = t !== undefined ? t : Math.round(raw / 5) * 5; return Math.max(10, Math.min(100, c)); };
  const setL = c => { if (c === S.L) return; S.L = c; S._hinted = true; if (TARGETS.includes(c) && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} } redrawSoft(); };
  rig.addEventListener('keydown', e => {
    if (S.step !== 0) return;
    const k = e.key; let c = S.L;
    if (k === 'ArrowRight' || k === 'ArrowUp') c += 5; else if (k === 'ArrowLeft' || k === 'ArrowDown') c -= 5; else if (k === 'Home') c = 10; else if (k === 'End') c = 100; else if (k === 'Enter' || k === ' ') { e.preventDefault(); $('#rec').click(); return; } else return;
    e.preventDefault(); c = Math.max(10, Math.min(100, c)); setL(c); clearTimeout(S._kt); S._kt = setTimeout(() => { drawRig(); updateMeters(true); setHint(); }, 120);
  });
  rig.addEventListener('pointerdown', e => {
    if (S.step !== 0) return;
    const onNail = !!e.target.closest('#nail');
    const pt = rig.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(rig.getScreenCTM().inverse());
    if (!onNail && (p.y < WY - 50 || p.x < RX0 - 6 || p.x > RX1 + 6)) return;     // only nail, wire or ruler zone
    S.dragging = true; rig.setPointerCapture(e.pointerId); rig.style.cursor = 'grabbing';
    setL(snap(e));
  });
  rig.addEventListener('pointermove', e => { if (!S.dragging) return; setL(snap(e)); });
  const end = () => { if (!S.dragging) return; S.dragging = false; rig.style.cursor = ''; drawRig(); updateMeters(true); setHint(); };
  rig.addEventListener('pointerup', end); rig.addEventListener('pointercancel', end);
}
let softRaf;
function redrawSoft() { cancelAnimationFrame(softRaf); softRaf = requestAnimationFrame(() => { drawRig(); updateMeters(false); setHint(); }); }

/* hints */
function setHint(msg, cls) { _setHint(msg, cls); if (S.step > 2) $('#hint').classList.add('hidden'); }
function _setHint(msg, cls) {
  const h = $('#hint'); h.className = 'hint' + (cls ? ' ' + cls : '') + (S.step > 2 ? ' hidden' : '');
  if (msg) { h.innerHTML = msg; return; }
  if (flashMsg) { h.className = 'hint ok flash'; h.innerHTML = '✓ ' + flashMsg; flashMsg = null; return; }
  if (S.step === 0) {
    const need = TARGETS.filter(c => S.part1[c] === undefined);
    if (!need.length) { h.className = 'hint ok'; h.innerHTML = '✓ اكتملت قراءات الجزء الأول. انتقل إلى الجزء الثاني.'; return; }
    if (TARGETS.includes(S.L)) h.innerHTML = S.part1[S.L] !== undefined ? `سُجّلت القراءة عند <bdi>${S.L} cm</bdi>. اسحب المسمار إلى موضع آخر.` : `المسمار عند <bdi>${S.L} cm</bdi>: سجّل القراءة.`;
    else { h.className = 'hint warn'; h.innerHTML = `اسحب المسمار المدبب إلى ${listCm(need)}`; }
  } else if (S.step === 1) {
    if (!S.measured.thin || !S.measured.thick) h.innerHTML = 'قِس قطر السلكين بالميكروميتر أولًا.';
    else if (!S.part2) h.innerHTML = 'المسمار عند نهاية السلك (<bdi>40 cm</bdi>) وفرق الجهد <bdi>1 V</bdi>: سجّل القراءة.';
    else { h.className = 'hint ok'; h.innerHTML = '✓ قارنها بقراءة السلك الرفيع عند <bdi>40 cm</bdi> في الجدول (1).'; }
  } else if (S.step === 2) {
    const left = Object.keys(RHO).filter(m => !S.part3[m]);
    if (!left.length) { h.className = 'hint ok'; h.innerHTML = '✓ اكتملت قراءات المواد الثلاث.'; }
    else h.innerHTML = S.part3[S.mat] ? `اختر مادة أخرى: <b>${left.map(m => MAT[m]).join(' أو ')}</b>` : `سلك ${MAT[S.mat]} مثبت: سجّل القراءة.`;
  }
}

/* goal text per step */
const GOALS = [
  `(ص 135) سلك نيكروم رفيع طوله <bdi>1 m</bdi> مثبت على المسطرة، والمصدر مضبوط على <bdi>1 V</bdi>. حرّك المسمار المدبب إلى ${listCm(TARGETS)}، وسجّل قراءتي الأميتر والفولتميتر.`,
  'قِس أقطار الأسلاك بالميكروميتر، ثم ثبّت سلك النيكروم الثاني (<bdi>40 cm</bdi>) بدل الأول، واضبط فرق الجهد على <bdi>1 V</bdi>، ثم المس نهاية السلك بالمسمار المدبب.',
  'ضبط المتغيرات: استخدم سلكي الحديد والتنغستن المماثلين له في القياسات (<bdi>40 cm</bdi> والقطر نفسه) مكان النيكروم، وكرّر الخطوة 2 من الجزء 2.',
  'التحليل والاستنتاج: أجب عن أسئلة الكتاب، ثم اضغط على السؤال لإظهار الإجابة النموذجية.'
];

/* tables & graphs */
const mA2 = I => (I * 1000).toFixed(2);
function rowsHtml(rows, cols) { return rows.map(r => `<tr class="${r.cls || ''}">${r.cells.map((c, i) => `<td class="${cols[i] && cols[i].ar ? 'ar' : ''}">${c}</td>`).join('')}</tr>`).join(''); }
let lastAdded = null;
const mth = s => `<span class="math">${s}</span>`;
function renderTable() {
  const T = $('#tblWrap');
  if (S.step === 0) {
    const cols = [{ h: `${mth('L')} (cm)` }, { h: `${mth('ΔV')} (V)` }, { h: `${mth('I')} (mA)` }, { h: `${mth('R = ΔV/I')} (Ω)` }];
    const rows = TARGETS.map(c => { const r = S.part1[c]; return r ? { cls: lastAdded === 'p1-' + c ? 'new' : '', cells: [c, V_SRC.toFixed(2), mA2(r.I), fmtR(V_SRC / r.I)] } : { cls: 'empty', cells: [c, '—', '—', '—'] }; });
    T.innerHTML = `<div class="cap"><span>الجدول (1): الطول والمقاومة</span><span class="tblsub">القطر <bdi>${(D_THIN * 1000).toFixed(2)} mm</bdi></span></div><table><tr>${cols.map(c => `<th>${c.h}</th>`).join('')}</tr>${rowsHtml(rows, cols)}</table>`;
  } else if (S.step === 1) {
    const cols = [{ h: 'السلك', ar: 1 }, { h: `${mth('d')} (mm)` }, { h: `${mth('A')} (m²)` }, { h: `${mth('I')} (mA)` }, { h: `${mth('R')} (Ω)` }];
    const thin = S.part1[40];
    const dT = (D_THIN * 1000).toFixed(2), dK = (D_THICK * 1000).toFixed(2);
    const rows = [
      thin ? { cells: ['الأول (رفيع)', S.measured.thin ? dT : '—', S.measured.thin ? fmtA(area(D_THIN)) : '—', mA2(thin.I), fmtR(V_SRC / thin.I)] } : { cls: 'empty', cells: ['الأول (رفيع)', '—', '—', '—', '—'] },
      S.part2 ? { cls: lastAdded === 'p2' ? 'new' : '', cells: ['الثاني', dK, fmtA(area(D_THICK)), mA2(S.part2.I), fmtR(V_SRC / S.part2.I)] } : { cls: 'empty', cells: ['الثاني', S.measured.thick ? dK : '—', S.measured.thick ? fmtA(area(D_THICK)) : '—', '—', '—'] }
    ];
    T.innerHTML = `<div class="cap"><span>الجدول (2): مساحة المقطع والمقاومة</span><span class="tblsub"><bdi>L = 40 cm</bdi></span></div><table><tr>${cols.map(c => `<th>${c.h}</th>`).join('')}</tr>${rowsHtml(rows, cols)}</table>`;
  } else if (S.step === 2) {
    const cols = [{ h: 'المادة', ar: 1 }, { h: `${mth('ΔV')} (V)` }, { h: `${mth('I')} (A)` }, { h: `${mth('R')} (Ω)` }];
    const rows = Object.keys(RHO).map(m => { const r = S.part3[m]; return r ? { cls: lastAdded === 'p3-' + m ? 'new' : '', cells: [MAT[m], V_SRC.toFixed(2), r.I.toPrecision(3), fmtR(V_SRC / r.I)] } : { cls: 'empty', cells: [MAT[m], '—', '—', '—'] }; });
    T.innerHTML = `<div class="cap"><span>الجدول (3): نوع المادة والمقاومة</span><span class="tblsub"><bdi>40 cm</bdi> · <bdi>${(D_THICK * 1000).toFixed(2)} mm</bdi></span></div><table><tr>${cols.map(c => `<th>${c.h}</th>`).join('')}</tr>${rowsHtml(rows, cols)}</table>`;
  } else { T.innerHTML = summaryTable(); }
}
function summaryTable() {
  const p1 = TARGETS.map(c => `<tr><td>${c}</td><td>${fmtR(V_SRC / S.part1[c].I)}</td></tr>`).join('');
  return `<div class="cap"><span>ملخص قراءاتك (الجدول 1)</span></div><table><tr><th>${mth('L')} (cm)</th><th>${mth('R')} (Ω)</th></tr>${p1}</table>`;
}

const AXF = 'font-family="STIX Two Text"';
function renderGraph() {
  const G = $('#graphWrap');
  if (S.step === 0 || S.step === 3) {
    const pts = TARGETS.filter(c => S.part1[c]).map(c => ({ L: c, R: V_SRC / S.part1[c].I }));
    const W = 340, H = 220, ox = 44, oy = 186, gw = 276, gh = 160, Lmax = 100, Rmax = 200;
    const X = L => ox + L / Lmax * gw, Y = R => oy - R / Rmax * gh;
    let s = `<svg viewBox="0 0 ${W} ${H}" direction="ltr" style="direction:ltr" role="img" aria-label="العلاقة بين المقاومة والطول">`;
    s += `<defs><marker id="ga" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2d2b38"/></marker></defs>`;
    for (let i = 1; i <= 5; i++) s += `<line x1="${X(i * 20)}" y1="${oy}" x2="${X(i * 20)}" y2="${oy - gh}" stroke="#eef0f5"/><text x="${X(i * 20)}" y="${oy + 15}" text-anchor="middle" font-size="11" fill="#5f6b78" ${AXF}>${i * 20}</text>`;
    for (let j = 1; j <= 5; j++) s += `<line x1="${ox}" y1="${Y(j * 40)}" x2="${ox + gw}" y2="${Y(j * 40)}" stroke="#eef0f5"/><text x="${ox - 6}" y="${Y(j * 40) + 4}" text-anchor="end" font-size="11" fill="#5f6b78" ${AXF}>${j * 40}</text>`;
    s += `<line x1="${ox}" y1="${oy}" x2="${ox + gw + 10}" y2="${oy}" stroke="#2d2b38" stroke-width="1.3" marker-end="url(#ga)"/><line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy - gh - 10}" stroke="#2d2b38" stroke-width="1.3" marker-end="url(#ga)"/>`;
    s += `<text x="${ox + gw + 8}" y="${oy + 30}" text-anchor="end" font-size="12" fill="#5f6b78" ${AXF}><tspan font-style="italic">L</tspan> (cm)</text><text x="${ox + 6}" y="${oy - gh - 4}" font-size="12" fill="#5f6b78" ${AXF}><tspan font-style="italic">R</tspan> (Ω)</text><text x="${ox - 6}" y="${oy + 13}" text-anchor="end" font-size="11" fill="#5f6b78" ${AXF}>0</text>`;
    if (!pts.length) s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(100)}" y2="${Y(150)}" stroke="#c9d3e0" stroke-width="2" stroke-dasharray="5 5"/>`;
    if (pts.length >= 2) {
      const k = pts.reduce((a, p) => a + p.L * p.R, 0) / pts.reduce((a, p) => a + p.L * p.L, 0);
      S.slope = k;
      s += `<line class="fit" x1="${X(0)}" y1="${Y(0)}" x2="${X(100)}" y2="${Y(100 * k)}" stroke="#2a6fb0" stroke-width="2.6" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${S._fitDrawn ? 0 : 1}">${S._fitDrawn ? '' : '<animate attributeName="stroke-dashoffset" from="1" to="0" dur=".8s" fill="freeze"/>'}</line>`; S._fitDrawn = true;
    }
    pts.forEach(p => { const isNew = lastAdded === 'p1-' + p.L; s += `<circle cx="${X(p.L)}" cy="${Y(p.R)}" r="5" fill="#fdc705" stroke="#1f5c96" stroke-width="2">${isNew ? '<animate attributeName="r" values="0;8;5" dur=".5s"/>' : ''}</circle>`; });
    s += '</svg>';
    const slopeTxt = pts.length >= 2 ? `<em>الميل ≈ <bdi>${S.slope.toFixed(2)} Ω/cm</bdi></em>` : `<em><bdi>R–L</bdi></em>`;
    const leg = pts.length ? `<div class="legend"><span><i style="background:#fdc705;border:2px solid #1f5c96"></i>قراءاتك</span>${pts.length >= 2 ? '<span><i style="background:#2a6fb0;border-radius:2px;height:4px;width:16px"></i>خط مستقيم يمر بنقطة الأصل</span>' : ''}</div>` : '<div class="ghost">سجّل قراءتك الأولى لتظهر هنا</div>';
    G.innerHTML = `<div class="gt"><span>العلاقة بين المقاومة والطول (منحنى <bdi class="math">R–L</bdi>)</span>${slopeTxt}</div>${s}${leg}`;
  } else if (S.step === 1) {
    const s1 = 40, s2 = 80; // drawn diameters proportional to D_THIN : D_THICK (1 : 2)
    const dT = (D_THIN * 1000).toFixed(2), dK = (D_THICK * 1000).toFixed(2);
    G.innerHTML = `<div class="gt"><span>المقطع العرضي (بالمقياس نفسه)</span><em><bdi>A ∝ d²</bdi></em></div>
      <svg viewBox="0 0 340 152" direction="ltr" style="direction:ltr" role="img" aria-label="مقطعا السلكين: مضاعفة القطر تجعل مساحة المقطع أربعة أضعاف">
      <defs><radialGradient id="cs" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#e3e6ec"/><stop offset="1" stop-color="#8b8f9c"/></radialGradient>
      <marker id="gx" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#126e84"/></marker></defs>
      <circle cx="262" cy="64" r="${s1 / 2}" fill="url(#cs)" stroke="#5a5e69" stroke-width="1.5"/>
      <circle cx="90" cy="64" r="${s2 / 2}" fill="url(#cs)" stroke="#5a5e69" stroke-width="1.5"/>
      <line x1="${90 - s2 / 2}" y1="64" x2="${90 + s2 / 2}" y2="64" stroke="#1f5c96" stroke-width="1.2" stroke-dasharray="3 2"/>
      <line x1="${262 - s1 / 2}" y1="64" x2="${262 + s1 / 2}" y2="64" stroke="#1f5c96" stroke-width="1.2" stroke-dasharray="3 2"/>
      <path d="M222 64 H146" stroke="#126e84" stroke-width="2" marker-end="url(#gx)"/>
      <text x="184" y="54" text-anchor="middle" font-size="12" font-family="IBM Plex Sans Arabic" fill="#126e84" font-weight="700" direction="rtl" unicode-bidi="embed">القطر ×2</text>
      <text x="184" y="85" text-anchor="middle" font-size="12" font-family="IBM Plex Sans Arabic" fill="#126e84" font-weight="700" direction="rtl" unicode-bidi="embed">المساحة ×4</text>
      <text x="262" y="124" text-anchor="middle" font-size="12" font-family="IBM Plex Sans Arabic" fill="#2d2b38" font-weight="700">السلك الأول</text>
      <text x="90" y="124" text-anchor="middle" font-size="12" font-family="IBM Plex Sans Arabic" fill="#2d2b38" font-weight="700">السلك الثاني</text>
      <text x="262" y="142" text-anchor="middle" font-size="12" ${AXF} fill="#5f6b78"><tspan font-style="italic">d</tspan> = ${dT} mm · <tspan font-style="italic">A</tspan></text>
      <text x="90" y="142" text-anchor="middle" font-size="12" ${AXF} fill="#126e84" font-weight="600"><tspan font-style="italic">d</tspan> = ${dK} mm · 4<tspan font-style="italic">A</tspan></text>
      </svg>`;
  } else if (S.step === 2) {
    const ms = Object.keys(RHO); const done = ms.filter(m => S.part3[m]);
    const Rs = ms.map(m => S.part3[m] ? V_SRC / S.part3[m].I : null); const Rm = 20;
    const cols = { nichrome: '#8b8f9c', iron: '#55585f', tungsten: '#9aa8bb' };
    let s = `<svg viewBox="0 0 340 160" direction="ltr" style="direction:ltr" role="img" aria-label="أعمدة مقاومة الأسلاك الثلاثة المتماثلة الأبعاد">`;
    ms.forEach((m, i) => {
      const x = 250 - i * 95, R = Rs[i], h = R ? Math.max(3, R / Rm * 110) : 0;
      s += `<rect x="${x - 22}" y="${130 - 110}" width="44" height="110" rx="8" fill="#f3f5fa"/>`;
      if (R) s += `<rect x="${x - 22}" y="${130 - h}" width="44" height="${h}" rx="8" fill="${cols[m]}"><animate attributeName="height" from="0" to="${h}" dur=".6s"/><animate attributeName="y" from="130" to="${130 - h}" dur=".6s"/></rect><text x="${x}" y="${130 - h - 6}" text-anchor="middle" font-size="12" ${AXF} fill="#2d2b38" font-weight="600">${fmtR(R)} Ω</text>`;
      s += `<text x="${x}" y="150" text-anchor="middle" font-size="12.5" font-family="IBM Plex Sans Arabic" fill="#2d2b38" font-weight="700">${MAT[m]}</text>`;
    });
    s += `</svg>`;
    const ratio = done.length === 3 ? `<p class="gcap gok">مقاومة سلك النيكروم ≈ <bdi>${(Rs[0] / Rs[1]).toFixed(0)}</bdi> ضعف مقاومة سلك الحديد، و≈ <bdi>${(Rs[0] / Rs[2]).toFixed(0)}</bdi> ضعف مقاومة سلك التنغستن.</p>` : '';
    G.innerHTML = `<div class="gt"><span>مقارنة المقاومة بحسب نوع المادة</span><em><bdi>R ∝ ρ</bdi></em></div>${s}<p class="gcap">الأسلاك متماثلة الأبعاد: <bdi>L = 40 cm</bdi> و <bdi>d = ${(D_THICK * 1000).toFixed(2)} mm</bdi></p>${ratio}`;
  } else G.innerHTML = '';
}

/* micrometer */
function drawMicro(d, label) {
  const m = $('#micro'); const shown = d ? (d * 1000).toFixed(2) : '0.00';
  const gap = d ? (d === D_THIN ? 8 : 16) : 0;
  m.innerHTML = `
   <defs><linearGradient id="mf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef1f6"/><stop offset="1" stop-color="#c6cdd9"/></linearGradient></defs>
   <path d="M40 30 V90 Q40 104 54 104 H150 Q164 104 164 90 V74 H150 V88 H56 V30 Z" fill="#2a6fb0" stroke="#1f5c96"/>
   <rect x="56" y="48" width="18" height="16" fill="url(#mf)" stroke="#8a93a3"/>
   <rect x="${74 + gap}" y="50" width="70" height="12" fill="url(#mf)" stroke="#8a93a3"/>
   <rect x="${144 + gap}" y="42" width="60" height="28" rx="3" fill="url(#mf)" stroke="#8a93a3"/>
   ${[...Array(12)].map((_, i) => `<line x1="${148 + gap + i * 4.6}" y1="42" x2="${148 + gap + i * 4.6}" y2="${i % 2 ? 48 : 52}" stroke="#6c7585" stroke-width=".7"/>`).join('')}
   <rect x="${204 + gap}" y="38" width="44" height="36" rx="5" fill="#d4d9e2" stroke="#8a93a3"/>
   ${d ? `<circle cx="${74 + gap / 2}" cy="56" r="${gap / 2}" fill="#8b8f9c" stroke="#5a5e69"/>` : ''}
   <rect x="262" y="34" width="70" height="44" rx="9" fill="#1d2733"/>
   <text x="326" y="64" text-anchor="end" font-family="IBM Plex Mono" font-size="17" font-weight="600" fill="#7ee0ff">${shown}</text>
   <text x="297" y="74" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#8fb4cc">mm</text>
   <text x="100" y="24" text-anchor="middle" font-family="IBM Plex Sans Arabic" font-size="12" fill="#2d2b38" font-weight="600">${label || 'ميكروميتر'}</text>`;
}

/* record */
$('#rec').onclick = () => {
  if (S.step === 0) {
    if (!TARGETS.includes(S.L)) { setHint(`القراءة المطلوبة عند ${listCm(TARGETS)} فقط.`, 'warn'); shake(); return; }
    const I = currentNow(); const f = fmtI(I);
    S.part1[S.L] = { I }; lastAdded = 'p1-' + S.L; S._hinted = true;
    toast(`سُجّلت القراءة: <bdi>${S.L} cm</bdi> ← <bdi>${f.v} ${f.u}</bdi>`);
  } else if (S.step === 1) {
    if (!S.measured.thin || !S.measured.thick) { setHint('قِس قطر السلكين بالميكروميتر أولًا.', 'warn'); shake(); return; }
    const I = currentNow(), f = fmtI(I); S.part2 = { I }; lastAdded = 'p2'; toast(`سُجّلت: السلك الثاني ← <bdi>${f.v} ${f.u}</bdi>`);
  } else if (S.step === 2) {
    const I = currentNow(), f = fmtI(I); S.part3[S.mat] = { I }; lastAdded = 'p3-' + S.mat;
    toast(`سُجّلت: ${MAT[S.mat]} ← <bdi>${f.v} ${f.u}</bdi>`);
    $$('#mats .chip').forEach(c => c.classList.toggle('rec', !!S.part3[c.dataset.m]));
  }
  render(false); burst();
  if (S.step === 0 && Object.keys(S.part1).length === 1) $('#safe1').open = false;
};
function shake() { const b = $('#rec'); b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
function burst() { const b = $('#rec'); b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' }); }

/* parts navigation */
function canNext() {
  if (S.step === 0) return TARGETS.every(c => S.part1[c]);
  if (S.step === 1) return !!S.part2;
  if (S.step === 2) return Object.keys(RHO).every(m => S.part3[m]);
  return false;
}
$('#next').onclick = () => { if (!canNext()) return; go(S.step + 1); };
$$('#stepper .step').forEach(b => b.onclick = () => { const s = +b.dataset.s; if (s <= S.maxStep) go(s); });
function go(s) {
  S.step = s; S.maxStep = Math.max(S.maxStep, s); lastAdded = null;
  $('#safe1').open = false;
  render(true);
  $('#card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#measThin').onclick = () => { S.measured.thin = true; animMicro(D_THIN, 'السلك الأول (الرفيع)'); render(false); };
$('#measThick').onclick = () => { S.measured.thick = true; animMicro(D_THICK, 'السلك الثاني'); render(false); };
function animMicro(d, label) {
  const t0 = performance.now(); const tick = now => { const k = Math.min(1, (now - t0) / 600), e = 1 - Math.pow(1 - k, 3); drawMicro(d * e < 1e-6 ? 0 : d, label); const v = $('#micro text[text-anchor="end"]'); if (v) v.textContent = (d * 1000 * e).toFixed(2); if (k < 1) requestAnimationFrame(tick); else drawMicro(d, label); }; requestAnimationFrame(tick);
}
$$('#mats .chip').forEach(c => c.onclick = () => { S.mat = c.dataset.m; $$('#mats .chip').forEach(x => x.classList.toggle('on', x === c)); drawRig(); updateMeters(); setHint(); });

/* analysis */
const QA = [
  ['أستنتج', '#2a6fb0', 'بالاعتماد على بيانات الجدول (1)؛ ما العلاقة بين طول الموصل ومقاومته؟', 'تتناسب المقاومة طرديًا مع طول الموصل: عند مضاعفة الطول من <bdi>20 cm</bdi> إلى <bdi>40 cm</bdi> تتضاعف المقاومة من <bdi>38.2 Ω</bdi> إلى <bdi>76.4 Ω</bdi>، ومنحنى <span dir="ltr" class="math" style="white-space:nowrap;unicode-bidi:isolate">R–L</span> خط مستقيم يمر بنقطة الأصل.'],
  ['أستنتج', '#2a6fb0', 'بالاعتماد على بيانات الجدول (2)؛ ما العلاقة بين مساحة مقطع الموصل ومقاومته؟', 'تتناسب المقاومة عكسيًا مع مساحة المقطع: مضاعفة القطر من <bdi>0.10 mm</bdi> إلى <bdi>0.20 mm</bdi> تجعل المساحة 4 أضعاف <bdi class="math">(A ∝ d²)</bdi>، فتصبح المقاومة ربع قيمتها: من <bdi>76.4 Ω</bdi> إلى <bdi>19.1 Ω</bdi>.'],
  ['أقارن', '#126e84', 'ما الفرق بين مقاومات الأسلاك المتماثلة في أطوالها ومساحة مقطعها والمختلفة في المواد المصنوعة منها؟', 'مقاومة سلك النيكروم أكبر بكثير من مقاومة سلك الحديد، ومقاومة سلك الحديد أكبر من مقاومة سلك التنغستن، مع أن الأبعاد متماثلة؛ لأن المقاومة تعتمد على نوع المادة، أي مقاوميّتها <bdi class="math">ρ</bdi>.'],
  ['أفسّر', '#b4400f', 'ما العوامل التي تعتمد عليها مقاومة الموصل؟ فسّرها.', 'الطول: الموصل الأطول يعرّض الإلكترونات لتصادمات أكثر. مساحة المقطع: المقطع الأكبر يوفّر مسارات أكثر لحركة الإلكترونات. نوع المادة: تختلف المواد في مقاوميّتها. درجة الحرارة: ارتفاعها يزيد مقاومة الموصل الفلزي (وقد ثُبّتت في هذه التجربة). وبثبوت درجة الحرارة: <bdi class="math">R = ρL/A</bdi>.'],
  ['أتوقّع', '#8a5a00', 'إذا تسبّب التيار في تسخين الموصل في أيّ من المراحل؛ كيف سيؤثر ذلك في النتائج؟', 'ترتفع درجة حرارة الموصل، فتزداد سعة اهتزاز ذراته وتزداد مقاومته، فيقل التيار عن المتوقع وتنحرف النتائج عن العلاقة الخطية. لذلك ضُبط المصدر على <bdi>1 V</bdi>، ويُفصل بعد أخذ القراءة مباشرة، خاصةً مع سلكي الحديد والتنغستن لأن التيار فيهما كبير.']
];
function renderAnalysis() {
  const A = $('#analysis');
  if (S.step !== 3) { A.classList.add('hidden'); return; }
  A.classList.remove('hidden');
  A.innerHTML = QA.map((q, i) => `<div class="qa" id="qa${i}"><button aria-expanded="false"><span class="tag" style="background:${q[1]}">${q[0]}</span><span class="q">${q[2]}</span><svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button><div class="a"><div>${q[3]}</div></div></div>`).join('') +
    `<div class="concl"><span class="f">R = ρL/A</span><p>بثبوت درجة الحرارة: تزداد المقاومة بزيادة الطول، وتقل بزيادة مساحة المقطع، وتعتمد على نوع المادة.</p></div>`;
  $$('#analysis .qa button').forEach(b => b.onclick = () => { const q = b.parentElement; q.classList.toggle('open'); b.setAttribute('aria-expanded', q.classList.contains('open')); });
}

function render(full) {
  // stepper
  $$('#stepper .step').forEach((b, i) => { b.classList.toggle('cur', i === S.step); b.classList.toggle('done', i < S.maxStep || (i === S.step && i < 3 && canNext()) || (i < S.step)); b.disabled = i > S.maxStep; });
  $('#sbar').style.width = `calc(${(S.step / 3) * 100}% - ${(S.step / 3) * 44}px)`;
  $('#goal').innerHTML = `<span class="n">${['الجزء 1', 'الجزء 2', 'الجزء 3', 'التحليل'][S.step]}</span><span>${GOALS[S.step]}</span>`;
  const lab = S.step <= 2;
  $('#rigWrap').classList.toggle('hidden', !lab);
  $('#acts').classList.toggle('hidden', !lab);
  $('#p2extra').classList.toggle('hidden', S.step !== 1);
  $('#p3extra').classList.toggle('hidden', S.step !== 2);
  $('#hint').classList.toggle('hidden', !lab);
  $('#next').disabled = !canNext();
  $('#next').textContent = S.step === 2 ? 'إلى التحليل ←' : 'التالي ←';
  if (lab && full) { drawRig(); updateMeters(true); }
  if (S.step === 1 && full) drawMicro(S.measured.thick ? D_THICK : S.measured.thin ? D_THIN : 0, S.measured.thick ? 'السلك الثاني' : S.measured.thin ? 'السلك الأول (الرفيع)' : 'ميكروميتر');
  if (S.step === 2 && full) $$('#mats .chip').forEach(x => { x.classList.toggle('on', x.dataset.m === S.mat); x.classList.toggle('rec', !!S.part3[x.dataset.m]); });
  if (lab && !full) drawRig();
  setHint(); renderTable(); renderGraph(); renderAnalysis();
}

/* =================================================================
   OPENING EXPERIMENT — ΔV vs I
   ================================================================= */
const R0 = [10, 20, 50];                         // ohm (hidden "unknown" resistors)
const COL0 = ['#2a6fb0', '#d9541c', '#126e84'];
const S0 = { r: 0, V: 1, data: [[], [], []] };
window.__S0 = S0;
const vs = $('#vs');
function vsFill() { vs.style.setProperty('--p', (vs.value / 6 * 100) + '%'); }
vs.oninput = () => { S0.V = +vs.value; $('#vsOut').textContent = S0.V.toFixed(1) + ' V'; vsFill(); meters0(); drawRig0(); };
$$('#rsel .chip').forEach(c => c.onclick = () => { S0.r = +c.dataset.r; $$('#rsel .chip').forEach(x => x.classList.toggle('on', x === c)); meters0(); drawRig0(); hint0(); });
function I0() { return S0.V / R0[S0.r]; }
function meters0() { setMeter('#v0A', +I0().toFixed(3), 'A', 3, '#m0A'); setMeter('#v0V', S0.V, 'V', 2, null); }
function drawRig0() {
  const g = $('#rig0'); const I = I0();
  g.innerHTML = `
   <defs><filter id="sh0" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1f2a44" flood-opacity=".18"/></filter>
   <marker id="ar0" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#e99f09"/></marker></defs>
   <g fill="none" stroke="#2d2b38" stroke-width="2"><path d="M60 58 V36 H150"/><path d="M180 36 H300 V70"/><path d="M300 110 V140 H60 V112"/></g>
   <g fill="none" stroke="#3a6ea5" stroke-width="1.7"><path d="M300 62 H232 V74"/><path d="M300 118 H232 V106"/></g>
   <circle cx="300" cy="62" r="2.8" fill="#2d2b38"/><circle cx="300" cy="118" r="2.8" fill="#2d2b38"/>
   <g filter="url(#sh0)"><rect x="18" y="58" width="84" height="54" rx="10" fill="#e9edf5" stroke="#b8c1d1"/><rect x="26" y="66" width="68" height="21" rx="4" fill="#1d2733"/>
   <text x="88" y="81" text-anchor="end" font-family="IBM Plex Mono" font-size="12" font-weight="600" fill="#7ee0ff">${S0.V.toFixed(2)} V</text>
   <text x="60" y="104" text-anchor="middle" font-family="IBM Plex Mono" font-size="8.5" fill="#3b4658" font-weight="600">DC 0–6 V</text></g>
   <circle cx="60" cy="58" r="4.2" fill="#d23a2a"/><circle cx="60" cy="112" r="4.2" fill="#2b2f36"/>
   <text x="70" y="52" font-size="12" fill="#d23a2a" font-weight="700">+</text><text x="70" y="128" font-size="13" fill="#2b2f36" font-weight="700">−</text>
   <rect x="290" y="70" width="20" height="40" rx="4" fill="#fff" stroke="${COL0[S0.r]}" stroke-width="2.4"/>
   ${[0, 1, 2].map(i => `<rect x="290" y="${77 + i * 9}" width="20" height="3" fill="${COL0[S0.r]}" opacity=".6"/>`).join('')}
   <text x="322" y="95" font-family="STIX Two Text" font-style="italic" font-size="16" fill="${COL0[S0.r]}">R</text>
   <g filter="url(#sh0)"><circle cx="165" cy="36" r="15" fill="#fff" stroke="#1f5c96" stroke-width="2.4"/><text x="165" y="41" text-anchor="middle" font-family="STIX Two Text" font-size="14" font-weight="700" fill="#1f5c96">A</text></g>
   <g filter="url(#sh0)"><circle cx="232" cy="90" r="15" fill="#fff" stroke="#3a6ea5" stroke-width="2.4"/><text x="232" y="95" text-anchor="middle" font-family="STIX Two Text" font-size="14" font-weight="700" fill="#3a6ea5">V</text></g>
   ${I > 0 ? `<path d="M96 36 H128" stroke="#e99f09" stroke-width="2.6" marker-end="url(#ar0)"/><text x="108" y="28" font-family="STIX Two Text" font-style="italic" font-size="13" fill="#b06f00">I</text><path d="M250 140 H214" stroke="#e99f09" stroke-width="2.6" marker-end="url(#ar0)"/>` : ''}
   <text x="180" y="162" text-anchor="middle" direction="rtl" unicode-bidi="embed" font-family="IBM Plex Sans Arabic" font-size="11.5" fill="#5f6b78">الأميتر على التوالي، والفولتميتر على التوازي مع المقاومة</text>`;
}
function hint0(msg, cls) { const h = $('#hint0'); h.className = 'hint' + (cls ? ' ' + cls : ''); if (msg) { h.innerHTML = msg; return; } if (flashMsg) { const n0 = S0.data[S0.r].length; h.className = 'hint ok flash'; h.innerHTML = '✓ ' + flashMsg + (n0 >= 4 ? ` · اكتملت 4 قراءات للمقاومة ${S0.r + 1}` : ` · ${n0} من 4`); flashMsg = null; return; } const n = S0.data[S0.r].length; h.innerHTML = n >= 4 ? `✓ اكتملت 4 قراءات للمقاومة ${S0.r + 1}. جرّب مقاومة أخرى.` : `المقاومة ${S0.r + 1}: ${n} من 4 قراءات. ارفع الجهد قليلًا ثم سجّل.`; if (n >= 4) h.className = 'hint ok'; }
$('#rec0').onclick = () => {
  if (S0.V === 0) { hint0('ارفع جهد المصدر أولًا.', 'warn'); return; }
  const d = S0.data[S0.r];
  if (d.some(p => p.V === S0.V)) { hint0(`سُجّلت قراءة عند <bdi>${S0.V.toFixed(1)} V</bdi> لهذه المقاومة. غيّر الجهد.`, 'warn'); return; }
  d.push({ V: S0.V, I: +I0().toFixed(3) }); d.sort((a, b) => a.V - b.V); S0.last = [S0.r, S0.V];
  toast(`سُجّلت: <bdi>${S0.V.toFixed(1)} V</bdi> ← <bdi>${I0().toFixed(3)} A</bdi>`);
  $$('#rsel .chip').forEach(c => c.classList.toggle('rec', S0.data[+c.dataset.r].length >= 4));
  draw0(); hint0();
  $('#safe0').open = false;
};
function fitSlope(d) { return d.reduce((a, p) => a + p.V * p.I, 0) / d.reduce((a, p) => a + p.V * p.V, 0); }
function draw0() {
  const g = $('#g0'), ox = 40, oy = 196, gw = 280, gh = 170, Vmax = 6, Imax = 0.6;
  const X = V => ox + V / Vmax * gw, Y = I => oy - I / Imax * gh;
  let s = `<defs><marker id="ga0" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2d2b38"/></marker></defs>`;
  for (let i = 1; i <= 6; i++) s += `<line x1="${X(i)}" y1="${oy}" x2="${X(i)}" y2="${oy - gh}" stroke="#eef0f5"/><text x="${X(i)}" y="${oy + 14}" text-anchor="middle" font-size="11" fill="#5f6b78" font-family="STIX Two Text">${i}</text>`;
  for (let j = 1; j <= 6; j++) s += `<line x1="${ox}" y1="${Y(j * 0.1)}" x2="${ox + gw}" y2="${Y(j * 0.1)}" stroke="#eef0f5"/><text x="${ox - 6}" y="${Y(j * 0.1) + 3}" text-anchor="end" font-size="11" fill="#5f6b78" font-family="STIX Two Text">${(j * 0.1).toFixed(1)}</text>`;
  s += `<line x1="${ox}" y1="${oy}" x2="${ox + gw + 10}" y2="${oy}" stroke="#2d2b38" stroke-width="1.3" marker-end="url(#ga0)"/><line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy - gh - 10}" stroke="#2d2b38" stroke-width="1.3" marker-end="url(#ga0)"/>`;
  s += `<text x="${ox + gw + 8}" y="${oy + 28}" text-anchor="end" font-size="11" fill="#5f6b78" font-family="STIX Two Text"><tspan font-style="italic">V</tspan> (V)</text><text x="${ox + 6}" y="${oy - gh - 4}" font-size="11" fill="#5f6b78" font-family="STIX Two Text"><tspan font-style="italic">I</tspan> (A)</text><text x="${ox - 6}" y="${oy + 12}" text-anchor="end" font-size="11" fill="#5f6b78" font-family="STIX Two Text">0</text>`;
  const leg = [];
  S0.data.forEach((d, k) => {
    if (d.length >= 2) {
      const m = fitSlope(d); const Vend = Math.min(6, Imax / m);
      s += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(Vend)}" y2="${Y(m * Vend)}" stroke="${COL0[k]}" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>`;
      leg.push(`<span><i style="background:${COL0[k]}"></i>المقاومة ${k + 1}: الميل <bdi>${m.toFixed(3)} A/V</bdi> ← <bdi>R = ${(1 / m).toFixed(1)} Ω</bdi></span>`);
    } else if (d.length) leg.push(`<span><i style="background:${COL0[k]}"></i>المقاومة ${k + 1}</span>`);
    d.forEach(p => { const isNew = S0.last && S0.last[0] === k && S0.last[1] === p.V; s += `<circle cx="${X(p.V)}" cy="${Y(p.I)}" r="4.5" fill="#fff" stroke="${COL0[k]}" stroke-width="2.2">${isNew ? '<animate attributeName="r" values="0;8;4.5" dur=".5s"/>' : ''}</circle>`; });
  });
  g.innerHTML = s; $('#leg0').innerHTML = leg.length ? leg.join('') : '<span class="ghost">سجّل قراءتك الأولى لتظهر هنا</span>';
  // table
  const rows = S0.data.flatMap((d, k) => d.map(p => `<tr${S0.last && S0.last[0] === k && S0.last[1] === p.V ? ' class="new"' : ''}><td class="ar"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${COL0[k]};margin-inline-end:4px"></span>${k + 1}</td><td>${p.V.toFixed(2)}</td><td>${p.I.toFixed(3)}</td><td>${(p.V / p.I).toFixed(1)}</td></tr>`));
  $('#tbl0').innerHTML = `<div class="cap"><span>جدول القراءات</span></div><table><tr><th>المقاومة</th><th><span class="math">ΔV</span> (V)</th><th><span class="math">I</span> (A)</th><th><span class="math">ΔV/I</span> (Ω)</th></tr>${rows.join('') || '<tr class="empty"><td colspan="4" class="ar">لا توجد قراءات بعد</td></tr>'}</table>`;
  $('#concl0').style.display = S0.data.filter(d => d.length >= 2).length >= 2 ? 'flex' : 'none';
}

/* boot */
function boot() {
  placePill(); render(true); vsFill(); meters0(); drawRig0(); draw0(); hint0();
  requestAnimationFrame(t => { tPrev = t; animDots(t); });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
