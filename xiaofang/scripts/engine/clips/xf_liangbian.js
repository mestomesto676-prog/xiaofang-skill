// 小方 · 量变与质变（15s 竖屏 1080×1920 无声）。v2：去掉浮笔、屏幕字改得意黑（SmileySans）、地上的水更明显。
//语法：y3 白板（RSA 型：一整块板、相机在板上移动、笔领着线走、收尾看全图），
// 材质沿用 xf_night 的浅纸底＋蜡笔线（固定纸齿、线条 10fps 轻沸腾）；黑白灰＋唯一强调色蓝（蓝＝水位＝「感觉」，水和曲线同色同概念）。
// 机制：烧瓶下宽上窄。每天滴进去的水一样多，宽瓶身里水位几乎不动（量变），进了细瓶颈就猛涨、溢出（质变）。
//   板上那条蓝曲线就是「水位（感觉）随天数」：小方和烧瓶站着的地面＝横轴＝平台期。
// 时间轴（秒）：
//   0–3.6  近景：小方用滴管每天滴一滴，Day 1→30（前三滴慢，之后加速），水位贴着虚线几乎不动；3.3 探头看，3.5 起「无语」＋「…」
//   3.95–5 相机拉远到全板；4.7 起小方托下巴「思考」，眼睛跟着笔
//   5–6.2  笔画纵轴、箭头、写「感觉」；6.2–8.5 蓝笔从原点沿地面画平台期，Day 31→55，水位慢慢上来；8.5–9.05 笔停在拐点前
//   9.05–9.85 曲线陡升，Day 56→70，水冲上瓶颈；9.9 溢出；9.95 小方「惊讶」＋「!」；10.05「质变」弹出；10.55 开心、跳一下
//   10.8–11.45 笔补「量变」括号与字；12.7–13.95 笔写结尾两行；14.3 后全板定住
// spec.data 可改：line1 / line2（结尾两行）、ylabel（纵轴字）、qty / qual（两个标注）。
CLIPS.xf_liangbian = (() => {
const { clamp, lerp, ss, rng } = U;
const INK = XF.INK, BLUE = '#2f5c9c', BLUE_FILL = 'rgba(84,124,186,0.20)', GRAY = '#5f5c57', FONT = 'SmileySans';   // 屏幕字一律得意黑
let W, H, D, PAPER, TOOTH, WHATCH, CURVE, TXT;

// ---------- 板面布局（世界坐标；收尾镜头 z=1、中心 (540,900)） ----------
const GY = 1270, X0 = 120, XE = 940, YTOP = 250, YC_TOP = 330, DAYS = 70, LAM = 11;
const FL = { cx: 528, bw: 300, bh: 210, sh: 56, nh: 105, nw: 72, r: 32 };          // 烧瓶：瓶身宽/高、肩高、颈高、颈宽、底角
const MOUTH = GY - FL.bh - FL.sh - FL.nh;                                          // 899
const H0 = 125;                                                                    // 起始水位（离瓶底）
const XFX = 270, XFH = 215, HIP = GY - 0.84 * XFH;                                 // 小方站位
const DL = 84, A_DROP = Math.atan2(36, 68), A_UP = -0.75, A_REST = 1.6;             // 滴管长、朝向（滴水时右下 / 欢呼时右上 / 垂手时朝下）
const DIR = a => [Math.cos(a), Math.sin(a)], DU = DIR(A_DROP);
const HAND0 = [FL.cx - 8 - DU[0] * DL, MOUTH - 22 - DU[1] * DL];                     // 滴管手：管尖悬在瓶口上方
const COUNTER = { x: 470, y: 722, size: 66 };
const CAM_A = { x: 440, y: 1040, z: 1.30 }, CAM_B = { x: 540, y: 960, z: 1.0 }, CAM_P = { x: 565, y: 958, z: 1.04 };   // 推近时也让开 y≥1400 的字幕带

// ---------- 曲线与水位（同一个函数：感觉＝水位） ----------
const Fd = d => (Math.exp(LAM * d / DAYS) - 1) / (Math.exp(LAM) - 1);
const cxD = d => X0 + (XE - X0) * d / DAYS, cyD = d => GY - 6 - (GY - 6 - YC_TOP) * Fd(d);
const hOf = d => H0 + 6 * Math.min(d, 55) / 55 + (FL.bh + FL.sh + FL.nh - H0 - 6) * Fd(Math.min(d, DAYS));
function buildCurve() {
  const raw = []; for (let d = 0; d <= DAYS + 1e-9; d += 0.02) raw.push([cxD(d), cyD(d), d]);
  const pts = [[raw[0][0], raw[0][1]]], ds = [0]; let acc = 0;
  for (let i = 1; i < raw.length; i++) { acc += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
    if (acc >= 4 || i === raw.length - 1) { pts.push([raw[i][0], raw[i][1]]); ds.push(raw[i][2]); acc = 0; } }
  return { pts, ds };
}
const curvePrefix = d => { const { pts, ds } = CURVE, out = []; for (let i = 0; i < pts.length && ds[i] <= d; i++) out.push(pts[i]);
  if (out.length < pts.length && out.length) out.push([cxD(d), cyD(d)]); return out; };
// 瓶子半宽（离瓶底 h）
const hw = h => {
  const { bw, bh, sh, nw, r } = FL;
  if (h < r) return bw / 2 - r + Math.sqrt(Math.max(0, r * r - (r - h) * (r - h)));
  if (h <= bh) return bw / 2;
  if (h <= bh + sh) return lerp(bw / 2, nw / 2, ss(0, 1, (h - bh) / sh));
  return nw / 2;
};
const TOPH = FL.bh + FL.sh + FL.nh;
const flaskSide = (sg, off = 0) => { const o = []; for (let h = TOPH; h >= 0; h -= 4) o.push([FL.cx + sg * (hw(h) + off), GY - h]); o.push([FL.cx + sg * (hw(0) + off), GY]); return o; };
const flaskPoly = () => [...flaskSide(-1).reverse(), ...flaskSide(1)];

// ---------- 时间轴 ----------
// 第一段：每一滴的松手时刻（前三滴慢，之后间隔 0.09→0.03 越来越快）
const REL_A = (() => { const o = [0.30, 0.88, 1.42]; let t = 1.70; for (let k = 4; k <= 30; k++) { o.push(t); t += lerp(0.09, 0.03, (k - 4) / 26); } return o; })();
const REL_B = (() => { const o = []; for (let t = 5.45; t < 8.95; t += 0.5) o.push(t); for (let t = 9.08; t < 9.8; t += 0.12) o.push(t); return o; })();
const GRAV = 3000;
const fallT = y0 => { const hS = GY - hOf(30); return Math.sqrt(2 * Math.max(10, hS - y0) / GRAV); };
const tipOf = (hand, a = A_DROP) => { const u = DIR(a); return [hand[0] + u[0] * DL, hand[1] + u[1] * DL]; };
const LAND_A = REL_A.map(r => r + fallT(tipOf(HAND0)[1]));
const T_SURP = 9.95, T_HAPPY = 10.55, T_OVER = 9.88;
// 笔画时间线（笔领着线走）
// 笔的分组：g1 纵轴→曲线（笔身朝左下，不压到小方）；g2「量变」；g3 结尾两行（笔身朝右上，不压计数）。进出画的屏幕外点按组给
const PEN_G = { 1: { ang: 2.3, offIn: [-260, 2160], offOut: [1360, -260] }, 2: { ang: 2.3, offIn: [-260, 2160], offOut: [-260, 2160] }, 3: { ang: -0.65, offIn: [1360, -260], offOut: [1360, -260] } };
const PEN = [
  { g: 1, k: 'line', t0: 5.00, t1: 5.40, pts: () => [[X0, GY + 12], [X0, YTOP]], w: 5.5, col: INK, seed: 11 },
  { g: 1, k: 'line', t0: 5.43, t1: 5.56, pts: () => [[X0 - 17, YTOP + 28], [X0, YTOP + 2], [X0 + 17, YTOP + 28]], w: 5, col: INK, seed: 12 },
  { g: 1, k: 'text', t0: 5.64, t1: 5.94, str: () => TXT.ylabel, x: X0 + 26, y: YTOP + 52, size: 50, col: GRAY },
  { g: 1, k: 'curve', t0: 6.20, t1: 6.70, d0: 0, d1: 30, e: 'io' },
  { g: 1, k: 'curve', t0: 6.70, t1: 8.50, d0: 30, d1: 55, e: 'lin' },
  { g: 1, k: 'curve', t0: 9.05, t1: 9.85, d0: 55, d1: DAYS, e: 'in' },
  { g: 1, k: 'line', t0: 9.86, t1: 9.97, pts: () => { const a = [cxD(DAYS), cyD(DAYS)]; return [[a[0] - 20, a[1] + 22], a, [a[0] + 14, a[1] + 26]]; }, w: 6, col: BLUE, seed: 13 },
  { g: 2, k: 'line', t0: 10.80, t1: 11.10, pts: () => [[X0 + 18, GY + 14], [X0 + 18, GY + 30], [750, GY + 30], [750, GY + 14]], w: 4, col: INK, seed: 14, sharp: true },
  { g: 2, k: 'text', t0: 11.15, t1: 11.45, str: () => TXT.qty, x: (X0 + 18 + 750) / 2, y: GY + 90, size: 56, col: INK, center: true },
  { g: 3, k: 'text', t0: 12.70, t1: 13.15, str: () => TXT.line1, x: 172, y: 470, size: 90, col: INK },
  { g: 3, k: 'text', t0: 13.27, t1: 13.95, str: () => TXT.line2, x: 172, y: 575, size: 90, col: INK },
];
const curveD = (t) => {   // 笔已经画到第几天（曲线前沿）
  let d = 0; for (const s of PEN) if (s.k === 'curve' && t >= s.t0) { const q = clamp((t - s.t0) / (s.t1 - s.t0)), e = s.e === 'io' ? MO.sineInOut(q) : s.e === 'in' ? q * q * 0.55 + q * 0.45 : q; d = lerp(s.d0, s.d1, e); }
  return d;
};
// 计数（天）＆ 水位用的连续天数
const landedA = t => { let n = 0; for (const l of LAND_A) if (t >= l) n++; return n; };
const releasedA = t => { let n = 0; for (const r of REL_A) if (t >= r) n++; return Math.max(1, n); };
const dayNow = t => t < 6.7 ? releasedA(t) : Math.max(30, Math.floor(curveD(t) + 1e-6));
const dLevel = t => {
  if (t < 6.7) { let v = 0; for (const l of LAND_A) v += ss(l, l + 0.18, t); return v; }
  return Math.max(30, curveD(t));
};
const surfY = t => GY - hOf(dLevel(t));

// ---------- 相机 ----------
function camAt(t) {
  const lerpCam = (a, b, e) => ({ x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)) });
  if (t < 3.95) return lerpCam(CAM_A, { ...CAM_A, z: 1.34 }, t / 3.95);
  if (t < 5.0) return lerpCam({ ...CAM_A, z: 1.34 }, CAM_B, MO.sineInOut((t - 3.95) / 1.05));
  if (t < 9.0) return CAM_B;
  if (t < 10.6) return lerpCam(CAM_B, CAM_P, MO.sineInOut((t - 9.0) / 1.6));
  if (t < 12.2) return CAM_P;
  return lerpCam(CAM_P, CAM_B, MO.sineInOut(clamp((t - 12.2) / 0.7)));
}
const toScreen = (cam, x, y) => [W / 2 + (x - cam.x) * cam.z, H / 2 + (y - cam.y) * cam.z];
const camM = cam => [cam.z, 0, 0, cam.z, W / 2 - cam.x * cam.z, H / 2 - cam.y * cam.z];

// ---------- 静态层 ----------
function buildWaterHatch() {   // 蓝蜡笔斜排线（只在水里露出）
  const c = XF.mk(W, H), g = c.getContext('2d'), r = rng(31);
  g.lineCap = 'round';
  for (let k = 0; k < 650; k++) {
    const x = FL.cx - 160 + r() * 320, y = MOUTH - 120 + r() * (GY - MOUTH + 240), a = -0.75 + (r() - 0.5) * 0.12, l = 26 + r() * 36;
    g.strokeStyle = `rgba(47,92,156,${0.06 + r() * 0.12})`; g.lineWidth = 2 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return c;
}

// ---------- 小方状态 ----------
const P = (t, a, b, e = MO.sineInOut) => e(clamp((t - a) / (b - a)));
const bump = (t, a, d) => (t > a && t < a + d) ? Math.sin((t - a) / d * Math.PI) : 0;
function squeezeAt(t) { let s = 0; for (const r of [...REL_A, ...REL_B]) s = Math.max(s, bump(t, r - 0.06, 0.16)); return s; }
function penWorld(t, cam) { const p = penAt(t, cam); return p ? [cam.x + (p[0] - W / 2) / cam.z, cam.y + (p[1] - H / 2) / cam.z] : null; }
function charState(t, cam) {
  const Hh = XFH, st = { x: XFX, y: HIP, H: Hh, sy: 1 + 0.012 * Math.sin(t * Math.PI * 2 / 2.3), lean: 0, head: { dx: 0, dy: 0, rot: 0 }, face: { exp: 'default', lx: 0.55, ly: 0.45 }, hands: {}, seed: 3 };
  const sq = squeezeAt(t);
  const shL = [XFX - 0.22 * Hh, HIP - 0.70 * Hh], shR = [XFX + 0.22 * Hh, HIP - 0.70 * Hh];
  const hang = XF.hang(shL, -1, Hh);                        // v0.3：自然下垂手离开躯干
  const chin = [XFX - 0.06 * Hh, HIP - 0.785 * Hh + 12];
  const elbowThink = [XFX - 0.37 * Hh, HIP - 0.25 * Hh];   // 上臂垂在身侧、小臂折上来托下巴
  let hr = [HAND0[0], HAND0[1] + 3 * sq], hl = null, ang = A_DROP, elL = null, elW = 0;
  // 第一段末：探头看水位 → 无语
  const peek = P(t, 3.15, 3.5) * (1 - P(t, 4.3, 4.8));
  st.lean = 0.035 * peek; st.head.dx = 6 * peek; st.face.ly = 0.45 + 0.4 * peek;
  if (t >= 3.5 && t < 4.5) st.face.exp = 'meh';
  if (t >= 4.5 && t < 4.6) st.face.exp = 'blink';
  // 思考：左手托下巴（肘往外撑），眼睛跟着笔
  const think = P(t, 4.6, 5.05) * (1 - P(t, T_SURP, T_SURP + 0.12, MO.cubicOut));
  if (think > 0) { hl = [lerp(hang[0], chin[0], think), lerp(hang[1], chin[1], think)]; elL = elbowThink; elW = think; st.head.rot = -0.05 * think; }
  if (t >= 4.6 && t < T_SURP) {
    const pw = penWorld(t, cam), tgt = pw || [cxD(55), cyD(55)];
    const hc = [XFX, HIP - 0.86 * Hh];
    st.face.lx = lerp(st.face.lx, clamp((tgt[0] - hc[0]) / 420, -1, 1), think); st.face.ly = lerp(st.face.ly, clamp((tgt[1] - hc[1]) / 380, -1, 1), think);
    if (bump(t, 7.25, 0.12) > 0 || bump(t, 8.8, 0.1) > 0) st.face.exp = 'blink';
  }
  // 惊讶 → 开心（两手张开举起，跳一下）→ 放下
  if (t >= T_SURP) {
    const j = P(t, T_SURP, T_SURP + 0.14, MO.cubicOut), back = j * (1 - P(t, T_HAPPY, T_HAPPY + 0.3));
    st.lean = -0.06 * back; st.head.dy = -8 * back; st.face = { exp: t < T_HAPPY ? 'surprised' : 'happy', lx: 0.3, ly: -0.2 };
    const up = P(t, T_HAPPY, T_HAPPY + 0.22, MO.cubicOut), down = P(t, 11.35, 12.0);
    const lS = [shL[0] - 0.33 * Hh, shL[1] + 0.28 * Hh], lU = [shL[0] - 0.34 * Hh, shL[1] - 0.44 * Hh];
    const rS = [shR[0] + 0.48 * Hh, shR[1] - 0.62 * Hh], rU = [shR[0] + 0.52 * Hh, shR[1] - 0.40 * Hh], rD = [shR[0] + 0.16 * Hh, shR[1] + 0.74 * Hh];   // v0.3：放下的拿滴管手也离开躯干
    const L3 = (a, b, c2, d2) => [lerp(lerp(lerp(a[0], b[0], j), c2[0], up), d2[0], down), lerp(lerp(lerp(a[1], b[1], j), c2[1], up), d2[1], down)];
    hl = L3(chin, lS, lU, hang); elL = elbowThink; elW = 1 - j;
    hr = L3(HAND0, rS, rU, rD);
    ang = lerp(lerp(lerp(A_DROP, -0.35, j), A_UP, up), A_REST, down);
    const hop = Math.sin(clamp((t - 10.62) / 0.34) * Math.PI) * 30, land = bump(t, 10.96, 0.18);
    st.y -= hop - 6 * land; st.sy *= 1 - 0.035 * land;
    st.feet = { l: [XFX - Hh * 0.13, GY - 2 - hop], r: [XFX + Hh * 0.13, GY - 2 - hop] };
    hl = [hl[0], hl[1] - hop]; hr = [hr[0], hr[1] - hop];
    if (t > 12.45) { const lk = P(t, 12.45, 12.8); st.face.lx = lerp(0.3, -0.4, lk); st.face.ly = lerp(-0.2, -0.9, lk); }
  }
  st.hands.r = hr; if (hl) st.hands.l = hl;
  if (elL && elW > 0) st.elbows = { l: elL, w: elW };
  st.dropAng = ang;
  if (!st.feet) st.feet = { l: [XFX - Hh * 0.13, GY - 2], r: [XFX + Hh * 0.13, GY - 2] };
  return st;
}

// ---------- 画：板 ----------
function drawGround() {
  XF.stroke(D, [[70, GY], [1012, GY]], { w: 6, seed: 1, amp: 1.2 });
  XF.stroke(D, [[994, GY - 15], [1014, GY], [994, GY + 15]], { w: 5, seed: 2, double: false });
  D.flush();
}
// 笔画：线/曲线/字。返回正在画的笔尖（世界坐标）或 null
function drawPenStrokes(t) {
  let tip = null, col = null;
  for (const s of PEN) {
    if (t < s.t0) continue;
    const q = clamp((t - s.t0) / (s.t1 - s.t0)), live = t < s.t1;
    let p = null;
    if (s.k === 'line') {
      const full = XF.resample(s.pts(), 4), cum = DG.cum(full), d = cum[cum.length - 1] * MO.sineInOut(q);
      const pre = []; for (let i = 0; i < full.length && cum[i] <= d; i++) pre.push(full[i]);
      if (pre.length < full.length) pre.push(DG.pointAt(full, cum, d));
      if (pre.length >= 2) XF.stroke(D, pre, { w: s.w, col: s.col, color: s.col, seed: s.seed, amp: s.sharp ? 0.6 : 1.1, double: !s.sharp });
      p = pre[pre.length - 1];
    } else if (s.k === 'curve') {
      const d = curveD(Math.min(t, s.t1)), pre = curvePrefix(d).filter((_, i, a) => true);
      // 只画这一段负责的区间（前面的段已经画过同一条线的前缀，这里整条前缀一次画，避免接缝）
      if (s === PEN.filter(x => x.k === 'curve').filter(x => t >= x.t0).pop() && pre.length >= 2) XF.stroke(D, pre, { w: 7, color: BLUE, seed: 21, amp: 1.0 });
      p = pre[pre.length - 1];
    } else if (s.k === 'text') {
      p = writeText(s.str(), s.x, s.y, s.size, s.col, q, s.center);
    }
    if (live) { tip = p; col = s.col || BLUE; }
  }
  D.flush();
  return { tip, col };
}
function writeText(str, x, y, size, col, q, center) {
  const g = D.ig; g.save(); g.font = `${size}px "${FONT}"`; g.fillStyle = col; g.textBaseline = 'alphabetic';
  const chars = [...str], ws = chars.map(ch => g.measureText(ch).width), wsum = ws.reduce((a, b) => a + b, 0), x0 = center ? x - wsum / 2 : x;
  const n = chars.length, k = Math.min(n, q * n), done = Math.floor(k); let xx = x0, tip = null;
  chars.forEach((ch, i) => {
    const jy = (U.hash(i + str.length, 3) - 0.5) * size * 0.06, jr = (U.hash(i + str.length, 5) - 0.5) * 0.05;   // 每字一点基线与倾斜变化
    const drawCh = () => { g.save(); g.translate(xx + ws[i] / 2, y + jy); g.rotate(jr); g.fillText(ch, -ws[i] / 2, 0); g.restore(); };
    if (i < done || q >= 1) drawCh();
    else if (i === done) {
      const zz = DG.zigzag(xx - 2, y - size * 0.95, ws[i] + 4, size * 1.15, 3), cum = DG.cum(zz), d = cum[cum.length - 1] * (k - done);
      g.save(); g.clip(DG.revealMask(zz, cum, d, size * 0.62)); drawCh(); g.restore(); tip = DG.pointAt(zz, cum, d);
    }
    xx += ws[i];
  });
  g.restore();
  return tip || [x0 + wsum, y - size * 0.35];
}
// 「质变」：强调词不带手，蓝括号自己划出、字弹出
function drawQual(t) {
  const T = 10.02; if (t < T) return;
  const a = 790, b = 948, q = clamp((t - T) / 0.16), pts = XF.resample([[a, GY + 14], [a, GY + 30], [b, GY + 30], [b, GY + 14]], 4);
  const cum = DG.cum(pts), d = cum[cum.length - 1] * q, pre = []; for (let i = 0; i < pts.length && cum[i] <= d; i++) pre.push(pts[i]);
  if (pre.length >= 2) XF.stroke(D, pre, { w: 4, color: BLUE, seed: 15, amp: 0.6, double: false });
  const p = clamp((t - T - 0.08) / 0.3);
  if (p > 0) { const g = D.ig, e = MO.backOut(p, 2.2), size = 56; g.save(); g.font = `${size}px "${FONT}"`; g.fillStyle = BLUE; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.globalAlpha = clamp(p * 4); g.translate((a + b) / 2, GY + 90 - size * 0.35); g.scale(e, e); g.fillText(TXT.qual, 0, size * 0.35); g.restore(); }
  D.flush();
}
function drawCounter(t) {
  const n = dayNow(t); if (n < 1) return;
  const g = D.ig, sz = COUNTER.size, pop = 1 + 0.07 * (t < 6.7 ? (() => { let s = 0; for (const r of REL_A.slice(1)) s = Math.max(s, bump(t, r, 0.14)); return s; })() : 0);
  g.save(); g.font = `${sz}px "${FONT}"`; g.fillStyle = INK; g.textBaseline = 'alphabetic';
  g.translate(COUNTER.x, COUNTER.y); g.scale(pop, pop);
  g.fillText('Day', 0, 0); g.fillStyle = n >= DAYS ? BLUE : INK; g.fillText(String(n), g.measureText('Day ').width, 0); g.restore();
  D.flush();
}

// ---------- 画：烧瓶与水 ----------
function drawFlask(t) {
  const g = D.g, poly = flaskPoly(), sY = surfY(t);
  // 玻璃：极淡的冷灰
  XF.fill(g, poly, 'rgba(250,250,247,0.75)');
  // 水
  let wave = 0; const lands = [...LAND_A, ...REL_B.map(r => r + 0.16)];
  for (const l of lands) if (t > l && t < l + 0.5) wave = Math.max(wave, (1 - (t - l) / 0.5));
  const over = t >= T_OVER;
  g.save(); XF.trace(g, flaskSide(-1, -3).reverse().concat(flaskSide(1, -3)), true); g.clip();
  const surf = []; for (let x = FL.cx - 150; x <= FL.cx + 150; x += 6) surf.push([x, sY + Math.sin(x * 0.09 - t * 14) * 2.6 * wave + Math.sin(x * 0.03 + t * 2) * 0.8]);
  const wp = [...surf, [FL.cx + 150, GY + 5], [FL.cx - 150, GY + 5]];
  XF.fill(g, wp, BLUE_FILL);
  XF.trace(g, wp, true); g.clip(); g.drawImage(WHATCH, 0, 0);
  g.restore();
  // 水面线（蓝蜡笔）—— 只画在瓶内宽度
  const sh = GY - sY, half = hw(sh) - 5;
  if (!over) XF.stroke(D, surf.filter(p => Math.abs(p[0] - FL.cx) <= half), { w: 4, color: BLUE, seed: 41, amp: 0.6, double: false });
  // 起始水位虚线（Day 1 的位置）
  for (let x = FL.cx - hw(H0) + 12; x < FL.cx + hw(H0) - 16; x += 20) XF.stroke(D, [[x, GY - H0], [x + 10, GY - H0]], { w: 3, color: GRAY, seed: 50 + x, amp: 0.3, double: false });
  // 刻度
  for (const [h, l] of [[50, 22], [100, 30], [150, 22]]) XF.stroke(D, [[FL.cx + FL.bw / 2 - 6 - l, GY - h], [FL.cx + FL.bw / 2 - 8, GY - h]], { w: 2.6, color: GRAY, seed: 60 + h, amp: 0.3, double: false });
  // 高光
  XF.stroke(D, [[FL.cx - FL.bw / 2 + 22, GY - 40], [FL.cx - FL.bw / 2 + 22, GY - FL.bh + 20]], { w: 6, color: '#ffffff', alpha: 0.85, seed: 70, amp: 0.4, double: false });
  XF.stroke(D, [[FL.cx - FL.nw / 2 + 12, MOUTH + 22], [FL.cx - FL.nw / 2 + 12, MOUTH + FL.nh - 6]], { w: 4, color: '#ffffff', alpha: 0.85, seed: 71, amp: 0.3, double: false });
  D.flush();
  // 瓶身轮廓 + 瓶口唇
  XF.stroke(D, flaskSide(-1).reverse().concat(flaskSide(1)), { w: 5.5, seed: 80, amp: 1.0 });
  const lip = XF.rrect(FL.cx - FL.nw / 2 - 9, MOUTH - 8, FL.nw + 18, 14, 6);
  XF.fill(g, lip, '#f7f6f2'); XF.stroke(D, lip, { w: 4.5, seed: 81, closed: true, amp: 0.6 });
  D.flush();
}
function drawSpill(t) {
  if (t < T_OVER) return;
  const g = D.g, p = t - T_OVER;
  // 瓶口鼓起的水
  const dome = Math.min(1, p / 0.12) * (8 + Math.sin(t * 9) * 1.5);
  const dm = XF.ellipsePts(FL.cx, MOUTH - 7, FL.nw / 2 + 6, dome, Math.PI, Math.PI * 2, 16);
  XF.fill(g, [...dm, [FL.cx + FL.nw / 2 + 6, MOUTH - 4], [FL.cx - FL.nw / 2 - 6, MOUTH - 4]], 'rgba(84,124,186,0.55)');
  XF.stroke(D, dm, { w: 4, color: BLUE, seed: 90, amp: 0.5, double: false });
  // 两侧顺着瓶外壁流下
  for (const sg of [-1, 1]) {
    const path = [[FL.cx + sg * (FL.nw / 2 + 9), MOUTH - 2], ...flaskSide(sg, 6).slice(1)], cum = DG.cum(path), L = cum[cum.length - 1];
    const head = Math.min(L, 900 * p * p + 160 * p), pre = []; for (let i = 0; i < path.length && cum[i] <= head; i++) pre.push(path[i]);
    if (pre.length < path.length) pre.push(DG.pointAt(path, cum, head));
    if (pre.length >= 2) XF.stroke(D, pre, { w: 7 - 2 * clamp((p - 1) / 1.5), color: BLUE, seed: 91 + sg, amp: 0.9, double: true });
    if (head < L) { const hp = pre[pre.length - 1]; D.ig.save(); D.ig.fillStyle = BLUE; D.ig.beginPath(); D.ig.ellipse(hp[0], hp[1] + 3, 6, 8, 0, 0, Math.PI * 2); D.ig.fill(); D.ig.restore(); }
    // 地上的一摊
    const tg = (Math.sqrt(160 * 160 + 4 * 900 * L) - 160) / 1800, pd = clamp((p - tg) / 1.4);
    if (pd > 0) {
      const x0 = FL.cx + sg * (FL.bw / 2 + 2), reach = (sg < 0 ? 86 : 210) * MO.cubicOut(pd), th = 24 * MO.cubicOut(pd) + 2;
      const top = []; for (let i = 0; i <= 12; i++) { const u = i / 12; top.push([x0 + sg * reach * u, GY - th * Math.sqrt(Math.max(0, 1 - u * u)) - 0.5]); }
      XF.fill(g, [...top, [x0, GY + 1]], 'rgba(70,112,178,0.72)');
      XF.stroke(D, top, { w: 4.5, color: BLUE, seed: 95 + sg, amp: 0.5, double: true });
      // 水面上两道亮反光 + 外沿小涟漪，让地上这摊水一眼看得见
      for (const u of [0.25, 0.55]) { const xa = x0 + sg * reach * u, xb = x0 + sg * reach * (u + 0.16); XF.stroke(D, [[xa, GY - th * 0.55], [xb, GY - th * 0.5]], { w: 3, color: '#ffffff', alpha: 0.8 * pd, seed: 97 + u * 10 + sg, amp: 0.2, double: false }); }
      const rp = (t * 1.6) % 1, rx = x0 + sg * (reach + 6);
      if (pd > 0.5) XF.stroke(D, XF.ellipsePts(rx, GY - 2, 10 + 14 * rp, 3 + 2 * rp, Math.PI, Math.PI * 2, 12), { w: 2.6, color: BLUE, alpha: (1 - rp) * 0.8, seed: 99 + sg, amp: 0.2, double: false });
    }
  }
  // 溅起的水珠
  for (let i = 0; i < 4; i++) { const q = (p - 0.02 - i * 0.05) / 0.45; if (q <= 0 || q >= 1) continue;
    const sg = i % 2 ? 1 : -1, vx = sg * (60 + i * 25), vy = -(150 + (i % 3) * 40);
    const x = FL.cx + sg * 20 + vx * q * 0.45, y = MOUTH - 10 + vy * q * 0.45 + 0.5 * 1400 * (q * 0.45) ** 2;
    D.ig.save(); D.ig.fillStyle = BLUE; D.ig.globalAlpha = 1 - q * 0.6; D.ig.beginPath(); D.ig.ellipse(x, y, 5, 6.5, 0, 0, Math.PI * 2); D.ig.fill(); D.ig.restore(); }
  D.flush();
}
// 滴管（握在画面右手里）＋ 正在落的水滴
function drawDropper(t, J, st) {
  const g = D.g, h = J.arms.r[2], sq = squeezeAt(t), u = DIR(st.dropAng), n = [-u[1], u[0]];
  const P2 = (a, b) => [h[0] + u[0] * a + n[0] * b, h[1] + u[1] * a + n[1] * b];
  const tube = [P2(4, -7), P2(DL - 14, -4), P2(DL, -1.5), P2(DL, 1.5), P2(DL - 14, 4), P2(4, 7)];
  XF.fill(g, tube, 'rgba(250,250,247,0.95)');
  // 管里一点水
  XF.fill(g, [P2(DL - 26, -4.2), P2(DL - 12, -3.6), P2(DL - 2, -1.2), P2(DL - 2, 1.2), P2(DL - 12, 3.6), P2(DL - 26, 4.2)], 'rgba(84,124,186,0.6)');
  XF.stroke(D, tube, { w: 3.2, seed: 101, closed: true, amp: 0.4, double: false });
  const bw = 11 * (1 - 0.28 * sq), bulb = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; bulb.push(P2(-14 + Math.cos(a) * 20, Math.sin(a) * bw)); }
  XF.fill(g, bulb, '#3b3a3c'); XF.stroke(D, bulb, { w: 3, seed: 102, closed: true, amp: 0.4, double: false });
  D.flush();
}
function drawDrops(t) {
  const tip = tipOf(HAND0), sY = surfY(t), rels = [...REL_A, ...REL_B];
  const g = D.ig; g.save(); g.fillStyle = BLUE;
  for (const r of rels) {
    if (t < r || r > T_OVER) continue;
    const dt = t - r, y = tip[1] + 6 + 0.5 * GRAV * dt * dt;
    if (y > sY - 2) continue;
    const s = clamp(dt / 0.05);
    g.beginPath(); g.moveTo(tip[0], y - 11 * s); g.quadraticCurveTo(tip[0] + 6 * s, y, tip[0], y + 5 * s); g.quadraticCurveTo(tip[0] - 6 * s, y, tip[0], y - 11 * s); g.fill();
  }
  // 刚离管口、还挂着的那一滴
  const next = rels.find(r => r > t - 0.001); if (next && next - t < 0.12 && t < T_OVER) { const k = 1 - (next - t) / 0.12; g.beginPath(); g.ellipse(tip[0], tip[1] + 3 + 3 * k, 3 + 2.5 * k, 3.5 + 3 * k, 0, 0, Math.PI * 2); g.fill(); }
  g.restore(); D.flush();
}
// 「…」与「!」
function drawMarks(t, J) {
  const c = J.head.c, hh = J.hh, Hh = J.H, g = D.ig;
  const dots = clamp((t - 3.55) / 0.45), fade = 1 - clamp((t - 4.4) / 0.25);
  if (dots > 0 && fade > 0) { g.save(); g.fillStyle = INK; g.globalAlpha = fade;
    for (let i = 0; i < 3; i++) if (dots * 3 > i) { g.beginPath(); g.arc(c[0] + Hh * 0.22 + i * 24, c[1] - hh * 0.5 - 30, 6, 0, Math.PI * 2); g.fill(); } g.restore(); }
  const ex = clamp((t - (T_SURP + 0.02)) / 0.16), ef = 1 - clamp((t - (T_HAPPY + 0.15)) / 0.2);
  if (ex > 0 && ef > 0) {
    const base = [c[0] + Hh * 0.58, c[1] - hh * 0.62], a = 0.28, e = MO.backOut(ex, 2.4);
    const p0 = [base[0], base[1]], p1 = [base[0] + Math.sin(a) * 44 * e, base[1] - Math.cos(a) * 44 * e];
    XF.stroke(D, [p0, p1], { w: 7, seed: 120, amp: 0.4, double: false, alpha: ef });
    g.save(); g.globalAlpha = ef; g.fillStyle = INK; g.beginPath(); g.arc(base[0] - Math.sin(a) * 14, base[1] + Math.cos(a) * 14, 5, 0, Math.PI * 2); g.fill(); g.restore();
  }
  D.flush();
}

// ---------- 笔（马克笔，屏幕空间） ----------
const OFF = [1260, 2080];
function penAt(t, cam) {
  for (const s of PEN) if (t >= s.t0 && t < s.t1) return null;   // 正在画：由 draw 时的 tip 决定
  let prev = null, next = null;
  for (const s of PEN) { if (s.t1 <= t) prev = s; else if (s.t0 > t && !next) next = s; }
  const endPt = s => s.k === 'curve' ? [cxD(s.d1), cyD(s.d1)] : s.k === 'line' ? s.pts()[s.pts().length - 1] : PEN_END(s);
  const startPt = s => s.k === 'curve' ? [cxD(s.d0), cyD(s.d0)] : s.k === 'line' ? s.pts()[0] : PEN_START(s);
  const sc = p => toScreen(cam, p[0], p[1]);
  const gap = prev && next ? next.t0 - prev.t1 : 99;
  if (prev && next && gap < 0.62) {   // 两笔之间：沿弧线滑过去（停在拐点前就悬着）
    const a = sc(endPt(prev)), b = sc(startPt(next)), q = MO.sineInOut((t - prev.t1) / gap), lift = Math.min(70, 16 + Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.15);
    const hover = Math.hypot(b[0] - a[0], b[1] - a[1]) < 4 ? Math.sin((t - prev.t1) * 7) * 4 - 6 * Math.sin(q * Math.PI) : 0;
    return [lerp(a[0], b[0], q), lerp(a[1], b[1], q) - Math.sin(q * Math.PI) * lift + hover];
  }
  const OUT = 0.3, IN = 0.32;
  if (prev && t - prev.t1 < OUT) { const a = sc(endPt(prev)), o = PEN_G[prev.g].offOut, q = MO.cubicIn((t - prev.t1) / OUT); return [lerp(a[0], o[0], q), lerp(a[1], o[1], q)]; }
  if (next && next.t0 - t < IN) { const b = sc(startPt(next)), o = PEN_G[next.g].offIn, q = MO.cubicOut(1 - (next.t0 - t) / IN); return [lerp(o[0], b[0], q), lerp(o[1], b[1], q)]; }
  return 'off';
}
function penGroupAt(t) { const cur = PEN.find(s => t >= s.t0 && t < s.t1); if (cur) return cur.g; const nx = PEN.find(s => s.t0 > t), pv = [...PEN].reverse().find(s => s.t1 <= t);
  if (pv && nx && nx.t0 - pv.t1 < 0.62) return nx.g; if (pv && t - pv.t1 < 0.3) return pv.g; return nx ? nx.g : (pv ? pv.g : 1); }
const PEN_START = s => { const w = s.size * [...s.str()].length; return [s.center ? s.x - w / 2 : s.x, s.y - s.size * 0.55]; };
const PEN_END = s => { const w = s.size * [...s.str()].length * 0.98; return [s.center ? s.x + w / 2 : s.x + w, s.y - s.size * 0.35]; };
function penColorAt(t) { const nx = PEN.find(s => s.t0 > t - 1e-6 && true), pv = [...PEN].reverse().find(s => s.t1 <= t); const s = (PEN.find(s => t >= s.t0 && t < s.t1)) || nx || pv; return s ? (s.k === 'curve' ? BLUE : s.col) : INK; }
function drawMarker(x, y, col, z, a) {
  const g = D.g, ig = D.ig; g.save(); ig.save(); g.setTransform(1, 0, 0, 1, 0, 0); ig.setTransform(1, 0, 0, 1, 0, 0);
  const k = z, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  const P2 = (s, m) => [x + (u[0] * s + n[0] * m) * k, y + (u[1] * s + n[1] * m) * k];
  // 投影（笔悬在纸上）
  XF.fill(g, [P2(30, -14), P2(256, -16), P2(256, 16), P2(30, 14)].map(p => [p[0] + 12 * k, p[1] + 18 * k]), 'rgba(60,58,54,0.06)');
  const tipC = [P2(0, 0), P2(22, -7), P2(22, 7)], collar = [P2(20, -11), P2(42, -12), P2(42, 12), P2(20, 11)];
  const body = [P2(40, -17), P2(208, -17), P2(208, 17), P2(40, 17)], cap = XF.rrect(0, 0, 1, 1, 0).length && [P2(204, -18), P2(252, -18), P2(256, -12), P2(256, 12), P2(252, 18), P2(204, 18)];
  XF.fill(g, body, '#e4e1da'); XF.fill(g, collar, '#f7f6f2'); XF.fill(g, cap, col); XF.fill(g, tipC, col);
  XF.fill(g, [P2(56, -10), P2(190, -10), P2(190, -5), P2(56, -5)], 'rgba(255,255,255,0.7)');
  for (const [pts, sd] of [[body, 131], [collar, 132], [cap, 133]]) XF.stroke(D, pts, { w: 3.6 * k, seed: sd, closed: true, amp: 0.6, double: false });
  XF.stroke(D, tipC, { w: 3 * k, seed: 134, closed: true, amp: 0.3, double: false });
  D.flush(); g.restore(); ig.restore();
}

return {
  fonts: [FONT],
  safe: false,
  init(ctx) {
    W = ctx.W; H = ctx.H;
    const dt = ctx.data || {};
    TXT = { line1: dt.line1 || '没感觉，', line2: dt.line2 || '不等于没进步。', ylabel: dt.ylabel || '感觉', qty: dt.qty || '量变', qual: dt.qual || '质变' };
    U.assertGlyphs(FONT, Object.values(TXT).join('') + 'Day0123456789', 'xf_liangbian 屏幕字');
    PAPER = XF.paper(W, H); TOOTH = XF.tooth(W, H, 7, 0.5);
    D = XF.drawer(W, H, TOOTH);
    WHATCH = buildWaterHatch();
    CURVE = buildCurve();
  },
  draw(c, t, ctx) {
    D.reset(); D.bs = Math.floor(t * 10);
    const g = D.g, ig = D.ig, cam = camAt(t), M = camM(cam);
    g.drawImage(PAPER, 0, 0);
    g.setTransform(...M); ig.setTransform(...M);
    drawGround();
    const { tip } = drawPenStrokes(t);
    drawQual(t);
    drawCounter(t);
    const st = charState(t, cam), J = XF.solve(st);
    XF.drawLegs(D, J, st);
    XF.drawTorso(D, J, st);
    drawFlask(t);
    drawSpill(t);
    drawDrops(t);
    XF.drawArms(D, J, st);
    drawDropper(t, J, st);
    XF.drawHead(D, J, st);
    drawMarks(t, J);
    // 笔
    // v2：不画浮笔（线和字照样自己长出来）；penAt 只留给小方的视线用
    c.drawImage(D.world, 0, 0);
  },
};
})();
