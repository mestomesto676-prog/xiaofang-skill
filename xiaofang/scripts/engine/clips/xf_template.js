// 小方 · 新片起手模板（竖屏 1080×1920，无声画面层）。复制成 clips/<你的语法名>.js，把 CLIPS.xf_template 改成同名再改内容。
// 已经接好的：浅纸底＋固定纸齿＋10fps 轻沸腾蜡笔线、地平线、小方站立（呼吸、眨眼、看向重点、结尾开心）、得意黑逐字「长出来」、唯一蓝色强调、白板相机（推近→拉回全图）。
// 版面约定：画面内容放在 y < 1400（下方 520px 留给字幕/平台 UI），推镜时也一样。
// spec.data：title（主句，两行用 \n 分开）、key（主句里要标蓝的那个词，可空）、exp（结尾表情：happy / surprised / meh / sad / default）
CLIPS.xf_template = (() => {
const { clamp, lerp } = U;
const INK = XF.INK, BLUE = '#2f5c9c', GRAY = '#5f5c57', FONT = 'SmileySans';
let W, H, D, PAPER, TOOTH, TXT;
const GY = 1270, XFX = 300, XFH = 230, HIP = GY - 0.84 * XFH;
const CAM_A = { x: 540, y: 1000, z: 1.18 }, CAM_B = { x: 540, y: 900, z: 1.0 };
const T_GROUND = [0.2, 0.8], T_TEXT = [1.2, 3.0], T_KEY = 3.2, T_END = 3.6;

const P = (t, a, b, e = MO.sineInOut) => e(clamp((t - a) / (b - a)));
function camAt(t) { const e = P(t, 0, 2.4); return { x: lerp(CAM_A.x, CAM_B.x, e), y: lerp(CAM_A.y, CAM_B.y, e), z: Math.exp(lerp(Math.log(CAM_A.z), Math.log(CAM_B.z), e)) }; }
const camM = cam => [cam.z, 0, 0, cam.z, W / 2 - cam.x * cam.z, H / 2 - cam.y * cam.z];

// 一条线按进度长出来（不画笔）
function growLine(pts, q, opt) {
  const full = XF.resample(pts, 4), cum = DG.cum(full), d = cum[cum.length - 1] * q, pre = [];
  for (let i = 0; i < full.length && cum[i] <= d; i++) pre.push(full[i]);
  if (pre.length < full.length) pre.push(DG.pointAt(full, cum, d));
  if (pre.length >= 2) XF.stroke(D, pre, opt);
  return pre;
}
// 得意黑逐字揭开（每字一点基线/倾斜抖动，像手写贴上去）；返回每个字的外框，便于给强调词画下划线
function writeText(str, x, y, size, col, q, colOf) {
  const g = D.ig; g.save(); g.font = `${size}px "${FONT}"`; g.textBaseline = 'alphabetic';
  const chars = [...str], ws = chars.map(ch => g.measureText(ch).width), n = chars.length, k = Math.min(n, q * n), done = Math.floor(k);
  let xx = x; const boxes = [];
  chars.forEach((ch, i) => {
    const jy = (U.hash(i + n, 3) - 0.5) * size * 0.06, jr = (U.hash(i + n, 5) - 0.5) * 0.05;
    g.fillStyle = colOf ? colOf(i) : col;
    const drawCh = () => { g.save(); g.translate(xx + ws[i] / 2, y + jy); g.rotate(jr); g.fillText(ch, -ws[i] / 2, 0); g.restore(); };
    if (i < done || q >= 1) drawCh();
    else if (i === done) { const zz = DG.zigzag(xx - 2, y - size * 0.95, ws[i] + 4, size * 1.15, 3), cum = DG.cum(zz), d = cum[cum.length - 1] * (k - done);
      g.save(); g.clip(DG.revealMask(zz, cum, d, size * 0.62)); drawCh(); g.restore(); }
    boxes.push([xx, y - size * 0.8, ws[i], size]); xx += ws[i];
  });
  g.restore(); return boxes;
}
function charState(t) {
  const st = { x: XFX, y: HIP, H: XFH, sy: 1 + 0.012 * Math.sin(t * Math.PI * 2 / 2.3), lean: 0, head: { dx: 0, dy: 0, rot: 0 }, face: { exp: 'default', lx: 0.4, ly: -0.6 }, hands: {}, seed: 3 };
  const shL = [XFX - 0.22 * XFH, HIP - 0.70 * XFH], shR = [XFX + 0.22 * XFH, HIP - 0.70 * XFH];
  st.hands.l = XF.hang(shL, -1, XFH);                                              // 自然下垂（v0.3：手离开躯干）
  const hangR = XF.hang(shR, 1, XFH);
  const point = P(t, T_KEY - 0.3, T_KEY + 0.1, MO.cubicOut);                       // 右手指向重点
  st.hands.r = [lerp(hangR[0], shR[0] + 0.55 * XFH, point), lerp(hangR[1], shR[1] - 0.35 * XFH, point)];
  if ((t > 1.9 && t < 2.0) || (t > 4.6 && t < 4.7)) st.face.exp = 'blink';
  if (t >= T_END) { st.face.exp = TXT.exp; const hop = Math.sin(clamp((t - T_END) / 0.34) * Math.PI) * (TXT.exp === 'happy' ? 24 : 0); st.y -= hop;
    st.feet = { l: [XFX - XFH * 0.13, GY - 2 - hop], r: [XFX + XFH * 0.13, GY - 2 - hop] }; st.hands.l[1] -= hop; st.hands.r[1] -= hop; }
  if (!st.feet) st.feet = { l: [XFX - XFH * 0.13, GY - 2], r: [XFX + XFH * 0.13, GY - 2] };
  return st;
}
return {
  fonts: [FONT],
  init(ctx) {
    W = ctx.W; H = ctx.H; const dt = ctx.data || {};
    TXT = { title: dt.title || '每天一点点，\n看不见也在涨。', key: dt.key || '一点点', exp: dt.exp || 'happy' };
    U.assertGlyphs(FONT, TXT.title.replace(/\n/g, '') + TXT.key, 'xf_template 屏幕字');
    PAPER = XF.paper(W, H); TOOTH = XF.tooth(W, H, 7, 0.5); D = XF.drawer(W, H, TOOTH);
  },
  draw(c, t, ctx) {
    D.reset(); D.bs = Math.floor(t * 10);                                            // 线条 10fps 轻沸腾
    const g = D.g, cam = camAt(t), M = camM(cam);
    g.drawImage(PAPER, 0, 0); g.setTransform(...M); D.ig.setTransform(...M);
    growLine([[90, GY], [990, GY]], P(t, ...T_GROUND), { w: 6, seed: 1, amp: 1.2 }); D.flush();
    // 主句：逐行逐字长出来；key 所在的字用蓝色，出完再划一道蓝下划线
    const lines = TXT.title.split('\n'), total = lines.reduce((s, l) => s + [...l].length, 0); let used = 0;
    const qAll = P(t, ...T_TEXT, x => x), keyBoxes = [];
    lines.forEach((ln, li) => {
      const n = [...ln].length, q = clamp((qAll * total - used) / n); used += n; if (q <= 0) return;
      const ki = TXT.key ? [...ln].join('').indexOf(TXT.key) : -1, kL = [...TXT.key].length;
      const boxes = writeText(ln, 150, 460 + li * 110, 92, INK, q, i => (ki >= 0 && i >= ki && i < ki + kL) ? BLUE : INK);
      if (ki >= 0) keyBoxes.push(...boxes.slice(ki, ki + kL));
    });
    if (keyBoxes.length && t >= T_KEY) { const a = keyBoxes[0], b = keyBoxes[keyBoxes.length - 1], y = a[1] + a[3] * 0.95;
      growLine([[a[0], y], [b[0] + b[2], y + 4]], P(t, T_KEY, T_KEY + 0.35), { w: 6, color: BLUE, seed: 9, amp: 0.8, double: false }); }
    D.flush();
    const st = charState(t), J = XF.solve(st);
    XF.drawLegs(D, J, st); XF.drawTorso(D, J, st); XF.drawArms(D, J, st); XF.drawHead(D, J, st); D.flush();
    c.drawImage(D.world, 0, 0);
  },
};
})();
