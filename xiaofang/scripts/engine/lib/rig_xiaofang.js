// 小方（「生活大于考研」IP）代码骨架 + 蜡笔线工具。几何角色按 references/10「几何角色可以代码画」。
// 造型（对照 /workspace/brand/小方-IP设定图.jpg）：白色方头（宽 > 高、小圆角、粗黑描边、左内侧灰色月牙影）、两颗竖椭圆豆豆眼、默认无嘴；
// 细线白色梯形躯干（上窄下宽）；细黑火柴手脚、手脚末端略粗；灰色软地影。黑白灰。
// v0.3（2026-10-08）：手臂＝两段＋圆角肘（XF.armPath，均匀粗细）；自然下垂手离开躯干（XF.HANG / XF.hang）；眼睛放大（XF.EYE.k，默认 1.8，略下移）；难过眉毛改成外端下垂。
// 用法：const D = XF.drawer(W, H, toothCanvas); D.bs = 沸腾种子; 填色画在 D.g，线画进墨层 XF.stroke(D, pts, {...})，D.flush() 把墨层（带纸纹齿）压回。
// 角色：J = XF.solve(st)；XF.drawLegs / XF.drawTorso / XF.drawArms / XF.drawHead(D, J, st)（drawBody = 躯干+头）。st 见 XF.solve 注释。左右一律按「画面左右」。
window.XF = (() => {
const { clamp, lerp, hash } = U;
const N = (x, y) => PAINT.noise(x, y);
const XF = {};
XF.INK = '#1b1b1b'; XF.WHITE = '#fbfaf6'; XF.SHADE = '#dfdcd5';
// ★ 眼睛大小：只改这一个数。k = 相对 v0.2 的倍数（1.0 = 旧版小眼、1.4、1.6、1.8 = v0.3 默认，Shawn 2026-10-08 定）；y = 眼睛中心在头高 hh 上的位置（v0.2 是 0.06，v0.3 略下移到 0.11）。
//   一支片子要换：在语法 init 里写 XF.EYE.k = 1.4; 全局默认改这里。
XF.EYE = { k: 1.8, y: 0.11 };
// ★ 手臂自然下垂的目标：比肩点往外 HANG[0]·H、往下 HANG[1]·H（手离开躯干斜边约 0.1H，呈微微张开的「八」字）。
XF.HANG = [0.22, 0.79];
XF.ELBOW_R = 0.16;   // 肘部圆角半径上限（×H）
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
XF.mk = mk;

// ---------- 纸与蜡笔齿（静态、种子确定） ----------
XF.paper = (W, H, base = [238, 234, 225], seed = 3) => {
  const c = mk(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const blot = PAINT.fbm(x * 0.0035 + seed, y * 0.0035, 4), fib = N(x * 0.06 + 50, y * 0.018), gr = (hash(x + 7, y + seed) - 0.5) * 8;
    const rx = (x / W - 0.5) * 1.6, ry = (y / H - 0.5) * 1.1, vig = -(rx * rx + ry * ry) * 10;
    const v = blot * 11 + fib * 3 + gr + vig;
    d[i] = base[0] + v; d[i + 1] = base[1] + v; d[i + 2] = base[2] + v * 0.9; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
};
// 齿：墨层上要被「挖掉」的点（纸面凸起处蜡笔没沾上）
XF.tooth = (W, H, seed = 7, amount = 0.6) => {
  const c = mk(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fib = N(x * 0.11 + seed, y * 0.42) * 0.5 + 0.5, sp = hash(x + seed * 131, y + 17);
    d[(y * W + x) * 4 + 3] = clamp((fib * 0.7 + sp * 0.6 - 0.82) * 2.8) * amount * 255;
  }
  g.putImageData(img, 0, 0); return c;
};
XF.drawer = (W, H, tooth) => {
  const world = mk(W, H), g = world.getContext('2d', { willReadFrequently: false }), inkC = mk(W, H), ig = inkC.getContext('2d');
  const D = { W, H, world, g, inkC, ig, tooth, bs: 0,
    flush() { ig.save(); ig.setTransform(1, 0, 0, 1, 0, 0); ig.globalCompositeOperation = 'destination-out'; if (tooth) ig.drawImage(tooth, 0, 0); ig.restore();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(inkC, 0, 0); g.restore(); ig.save(); ig.setTransform(1, 0, 0, 1, 0, 0); ig.clearRect(0, 0, W, H); ig.restore(); },
    reset() { g.reset ? g.reset() : g.setTransform(1, 0, 0, 1, 0, 0); ig.reset ? ig.reset() : ig.setTransform(1, 0, 0, 1, 0, 0); ig.clearRect(0, 0, W, H); } };
  return D;
};

// ---------- 手绘线 ----------
XF.resample = (pts, step = 5, closed = false) => {
  const out = [], n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(L / step));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]); }
  if (!closed) out.push(pts[pts.length - 1].slice());
  return out;
};
// 低频抖动（沿法线）：一份固定的手抖形状 + 一份随 boil 种子（10fps）轻轻变的分量 → 线条「呼吸」而不是乱跳
XF.wobble = (pts, { seed = 1, amp = 1.4, freq = 0.012, bs = 0, closed = false } = {}) => {
  let s = 0; const n = pts.length;
  return pts.map((p, i) => {
    if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const o = N(s * freq + seed * 13.37, seed * 3.1) * amp * 2 + N(s * freq * 1.6 + seed * 7.1, bs * 0.71 + seed) * amp * 0.9;   // 静态手抖 + 较小的沸腾分量
    return [p[0] - ty * o, p[1] + tx * o];
  });
};
const tracePath = (g, pts, closed) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if (closed) g.closePath(); };
XF.trace = tracePath;
// 蜡笔线：主笔 + 一道细的副笔（错开一点），画进墨层
XF.stroke = (D, pts, { w = 5, color = XF.INK, alpha = 1, seed = 1, amp = 1.3, closed = false, double = true, step = 5 } = {}) => {
  const g = D.ig, base = XF.resample(pts, step, closed);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color;
  g.globalAlpha = alpha; g.lineWidth = w; tracePath(g, XF.wobble(base, { seed, amp, bs: D.bs, closed }), closed); g.stroke();
  if (double) { g.globalAlpha = alpha * 0.5; g.lineWidth = Math.max(1.2, w * 0.45); tracePath(g, XF.wobble(base, { seed: seed + 91, amp: amp * 1.6, bs: D.bs, closed }), closed); g.stroke(); }
  g.restore();
};
XF.fill = (g, pts, color, closed = true) => { g.save(); g.fillStyle = color; tracePath(g, pts, closed); g.fill(); g.restore(); };
XF.rrect = (x, y, w, h, r, seg = 5) => {
  const out = [], C = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of C) for (let i = 0; i <= seg; i++) { const a = a0 + i / seg * Math.PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
};
XF.rot = (p, o, a) => { const c = Math.cos(a), s = Math.sin(a), dx = p[0] - o[0], dy = p[1] - o[1]; return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c]; };
XF.ellipsePts = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 28) => { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
XF.shadow = (g, x, y, rx, ry, a = 0.17) => {
  g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
  gr.addColorStop(0, `rgba(70,68,64,${a})`); gr.addColorStop(0.7, `rgba(70,68,64,${a * 0.7})`); gr.addColorStop(1, 'rgba(70,68,64,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill(); g.restore();
};

// ---------- 两骨 IK：肘往 out 方向弯；够不着就伸直 ----------
XF.ik = (s, h, L1, L2, out) => {
  let dx = h[0] - s[0], dy = h[1] - s[1], d = Math.hypot(dx, dy) || 1e-6; const maxd = (L1 + L2) * 0.999;
  let hand = h; if (d > maxd) { hand = [s[0] + dx / d * maxd, s[1] + dy / d * maxd]; d = maxd; }
  const base = Math.atan2(hand[1] - s[1], hand[0] - s[0]), a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const e1 = [s[0] + Math.cos(base + a) * L1, s[1] + Math.sin(base + a) * L1], e2 = [s[0] + Math.cos(base - a) * L1, s[1] + Math.sin(base - a) * L1];
  const dot = e => (e[0] - s[0]) * out[0] + (e[1] - s[1]) * out[1];
  return { elbow: dot(e1) >= dot(e2) ? e1 : e2, hand };
};

// ---------- 角色 ----------
// 自然下垂的手的目标点：sh = 肩点，side = -1 画面左手 / +1 画面右手。语法里要「放下手」一律用它，别再手写 [sh-0.06H, sh+0.84H-4]（v0.2 的旧值会贴着躯干、腰部打折）。
XF.hang = (sh, side, H) => [sh[0] + side * XF.HANG[0] * H, sh[1] + XF.HANG[1] * H];
// 手臂路径：肩—肘—手三点，肘处倒圆角（半径 ≤ ELBOW_R·H，且不超过任一段的 45%），避免两根直棍的硬折角
XF.armPath = ([s, e, h], H) => {
  const ax = s[0] - e[0], ay = s[1] - e[1], bx = h[0] - e[0], by = h[1] - e[1], la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
  const r = Math.min(XF.ELBOW_R * H, 0.45 * la, 0.45 * lb), p1 = [e[0] + ax / la * r, e[1] + ay / la * r], p2 = [e[0] + bx / lb * r, e[1] + by / lb * r], out = [s];
  for (let i = 0; i < 14; i++) { const t = i / 14, u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * e[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * e[1] + t * t * p2[1]]); }
  out.push(p2, h); return out;
};
// st = { x, y: 胯（躯干底边中点）, H: 头宽(px), sy: 躯干纵向伸缩, lean: 躯干绕胯旋转(rad),
//        head: {dx, dy, rot}, face: {exp: 'default'|'meh'(无语)|'happy'(开心)|'blink'|'sad'(难过)|'surprised'(惊讶), lx, ly ∈[-1,1]},
//        hands: {l:[x,y], r:[x,y]}（画面左/右手的目标）, elbows: {l, r, w}（可选，钉住肘位，w=0..1 与 IK 解混合）, feet: {l, r}（可选，默认直立）, legs: false = 不画腿（被桌子挡住时）, seed }
XF.solve = (st) => {
  const H = st.H, hh = H * 0.83, sy = st.sy ?? 1, lean = st.lean || 0, x = st.x, y = st.y, hip = [x, y];
  const R = p => XF.rot(p, hip, lean);
  const tH = H * 0.76 * sy, tTop = H * 0.5, tBot = H * 0.63;
  const torso = [[x - tTop / 2, y - tH], [x + tTop / 2, y - tH], [x + tBot / 2, y], [x - tBot / 2, y]].map(R);
  const hd = st.head || {};
  const hc = R([x + (hd.dx || 0), y - tH - H * 0.025 - hh / 2 + (hd.dy || 0)]);
  const shL = R([x - tTop / 2 + H * 0.03, y - tH + H * 0.06]), shR = R([x + tTop / 2 - H * 0.03, y - tH + H * 0.06]);
  const L1 = H * 0.42, L2 = H * 0.42, oL = XF.rot([-1, 0.9], [0, 0], lean), oR = XF.rot([1, 0.9], [0, 0], lean);
  const hands = st.hands || {}, aL = XF.ik(shL, hands.l || XF.hang(shL, -1, H), L1, L2, oL), aR = XF.ik(shR, hands.r || XF.hang(shR, 1, H), L1, L2, oR);
  const el = st.elbows || {}, ew = el.w ?? 1, mixE = (a, b) => [lerp(a[0], b[0], ew), lerp(a[1], b[1], ew)]; if (el.l) aL.elbow = mixE(aL.elbow, el.l); if (el.r) aR.elbow = mixE(aR.elbow, el.r);   // 指定肘位（如手肘撑在桌上），此时不强制骨长
  const hpL = R([x - H * 0.13, y - 2]), hpR = R([x + H * 0.13, y - 2]), K = H * 0.42, ft = st.feet || {};
  const lgL = XF.ik(hpL, ft.l || [hpL[0], hpL[1] + 2 * K], K, K, [-0.3, -1]), lgR = XF.ik(hpR, ft.r || [hpR[0], hpR[1] + 2 * K], K, K, [0.3, -1]);
  return { H, hh, torso, head: { c: hc, rot: lean + (hd.rot || 0) }, arms: { l: [shL, aL.elbow, aL.hand], r: [shR, aR.elbow, aR.hand] }, legs: { l: [hpL, lgL.elbow, lgL.hand], r: [hpR, lgR.elbow, lgR.hand] } };
};
XF.drawLegs = (D, J, st) => {
  const H = J.H, s = st.seed || 1;
  for (const [k, pts] of Object.entries(J.legs)) { XF.stroke(D, pts, { w: H * 0.036, seed: s + (k === 'l' ? 40 : 41), amp: 1.1 });
    const f = pts[2]; D.ig.save(); D.ig.fillStyle = XF.INK; D.ig.beginPath(); D.ig.ellipse(f[0] + (k === 'l' ? -3 : 3), f[1], H * 0.03, H * 0.022, 0, 0, Math.PI * 2); D.ig.fill(); D.ig.restore(); }
  D.flush();
};
XF.drawTorso = (D, J, st) => {
  const g = D.g, H = J.H, hh = J.hh, s = st.seed || 1;
  // 躯干：白填 + 头下灰影 + 细描边
  g.save(); XF.trace(g, J.torso, true); g.fillStyle = XF.WHITE; g.fill(); g.clip();
  const tc = [(J.torso[0][0] + J.torso[1][0]) / 2, (J.torso[0][1] + J.torso[1][1]) / 2];
  g.fillStyle = 'rgba(160,156,150,0.28)'; g.beginPath(); g.ellipse(tc[0], tc[1], H * 0.24, H * 0.07, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(160,156,150,0.16)'; g.fillRect(J.torso[3][0], tc[1], H * 0.06, H * 2); g.restore();
  XF.stroke(D, J.torso, { w: H * 0.024, seed: s + 10, closed: true, amp: 1.0 });
  D.flush();
};
// 头单独一层：举手（伸懒腰）时手臂应在头后面，所以推荐顺序 torso → (前景物件) → arms → head
XF.drawHead = (D, J, st) => {
  const g = D.g, H = J.H, hh = J.hh, s = st.seed || 1;
  const c = J.head.c, a = J.head.rot, hw = H, r = H * 0.075;
  const box = XF.rrect(-hw / 2, -hh / 2, hw, hh, r).map(p => XF.rot([p[0] + c[0], p[1] + c[1]], c, a));
  g.save(); XF.trace(g, box, true); g.fillStyle = XF.SHADE; g.fill(); g.clip();
  g.translate(c[0], c[1]); g.rotate(a); g.fillStyle = XF.WHITE;
  XF.trace(g, XF.rrect(-hw / 2 + H * 0.075, -hh / 2 - H * 0.05, hw, hh - H * 0.0, r * 2.2), true); g.fill(); g.restore();
  XF.stroke(D, box, { w: H * 0.04, seed: s + 20, closed: true, amp: 1.5 });
  XF.drawFace(D, J, st.face || {}, s);
  D.flush();
};
XF.drawBody = (D, J, st) => { XF.drawTorso(D, J, st); XF.drawHead(D, J, st); };
XF.drawFace = (D, J, f, s = 1) => {
  const g = D.ig, H = J.H, hh = J.hh, c = J.head.c, exp = f.exp || 'default', K = XF.EYE.k, Kc = 1 + (K - 1) * 0.6;   // Kc：线状表情（∩眼/眨眼/眉）放大得少一点，免得太粗
  g.save(); g.translate(c[0], c[1]); g.rotate(J.head.rot); g.fillStyle = XF.INK; g.strokeStyle = XF.INK; g.lineCap = 'round';
  const lx = (f.lx || 0) * H * 0.05, ly = (f.ly || 0) * hh * 0.07;
  for (const sg of [-1, 1]) {
    const ex = sg * H * 0.21 + lx, ey = hh * XF.EYE.y + ly;
    g.beginPath();
    if (exp === 'meh') {                                       // 无语：平眼皮 + 下半颗豆
      const lid = ey - H * 0.016 * K, lw = H * 0.026 * Math.min(Kc, 1.3), ly2 = lid - lw / 2 - H * 0.014;   // 眼皮线和半颗豆之间留一道缝，大眼时也不糊成一团
      g.lineWidth = lw; g.moveTo(ex - H * 0.046 * K, ly2); g.lineTo(ex + H * 0.046 * K, ly2 - H * 0.004 * K); g.stroke();
      g.beginPath(); g.ellipse(ex, lid, H * 0.034 * K, H * 0.04 * K, 0, 0, Math.PI); g.fill();
    } else if (exp === 'happy') {                              // 开心：∩ 眼
      g.lineWidth = H * 0.028 * Kc; g.arc(ex, ey + H * 0.03 * Kc, H * 0.05 * Kc, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    } else if (exp === 'blink') {
      g.lineWidth = H * 0.026 * Kc; g.moveTo(ex - H * 0.035 * K, ey); g.lineTo(ex + H * 0.035 * K, ey); g.stroke();
    } else if (exp === 'sad') {                                // 难过：豆豆眼 + 八字眉（内端高、外端下垂；v0.2 画反了，像生气）
      g.ellipse(ex, ey + H * 0.01, H * 0.03 * K, H * 0.042 * K, 0, 0, Math.PI * 2); g.fill();
      const top = ey + H * 0.01 - H * 0.042 * K, bw = H * 0.022 * Math.min(Kc, 1.3);   // 眉毛跟着眼睛顶部走：内端高、外端下垂，最低处也离眼睛 ≥ 0.03H
      g.beginPath(); g.lineWidth = bw; g.moveTo(ex - sg * H * 0.055, top - H * 0.075); g.lineTo(ex + sg * H * 0.06, top - H * 0.035 - bw / 2); g.stroke();
    } else {                                                   // 默认 / 惊讶
      const k = exp === 'surprised' ? 1.15 : 1; g.ellipse(ex, ey, H * 0.03 * K * k, H * 0.048 * K * k, 0, 0, Math.PI * 2); g.fill();
    }
  }
  const my = Math.max(hh * 0.3, hh * XF.EYE.y + H * 0.048 * K * 1.15 + H * 0.07);   // 嘴：在眼睛下方留够距离
  if (exp === 'happy') { g.fillStyle = '#a8a29b'; g.beginPath(); g.ellipse(0, my, H * 0.028 * Kc, H * 0.014 * Kc, 0, 0, Math.PI * 2); g.fill(); }
  if (exp === 'surprised') { g.fillStyle = '#5a5651'; g.beginPath(); g.ellipse(0, my, H * 0.022 * Kc, H * 0.02 * Kc, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
};
XF.drawArms = (D, J, st, only) => {
  const H = J.H, s = st.seed || 1;
  for (const k of only || ['l', 'r']) { const pts = J.arms[k];
    XF.stroke(D, XF.armPath(pts, H), { w: H * 0.034, seed: s + (k === 'l' ? 30 : 31), amp: 1.1 });   // v0.3：圆角肘，粗细不变
    const h = pts[2]; D.ig.save(); D.ig.fillStyle = XF.INK; D.ig.beginPath(); D.ig.arc(h[0], h[1], H * 0.034, 0, Math.PI * 2); D.ig.fill(); D.ig.restore(); }
  D.flush();
};
return XF;
})();
