import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { FONT } from './font.js';
const INK = '#1b1b1b', GRAY = '#5f5c57', BLUE = '#2f5c9c';
export const xfPackageDefaults = {
  series: '生活大于考研',        // 栏目名（角标、片头片尾）
  tag: '考前70天',               // 角标第二行（可空）
  title: '量变与质变',           // 片头大字
  sub: '为什么复习一个月还没感觉', // 片头小字（可空）
  outro: '明天见。',             // 片尾一句（可空）
  body: 'body.mp4',              // public/ 下的正片文件名
  bodySec: 15,
  introSec: 0,                   // 0 = 不要片头
  outroSec: 0,                   // 0 = 不要片尾
  badgeOutSec: 4.0,              // 角标在正片第几秒淡出（别和结尾大字抢）
};
const ease = Easing.bezier(0.45, 0, 0.55, 1);
// 手绘感下划线：一条略有起伏的路径，按长度长出来（不画笔）
const GrowLine = ({ x, y, w, p, color = BLUE, sw = 7 }) => {
  const d = `M ${x} ${y} C ${x + w * 0.3} ${y - 3}, ${x + w * 0.65} ${y + 4}, ${x + w} ${y + 1}`;
  return (<svg style={{ position: 'absolute', left: 0, top: 0 }} width={1080} height={1920}>
    <path d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} /></svg>);
};
const Card = ({ children }) => (<AbsoluteFill><Img src={staticFile('paper.png')} style={{ width: 1080, height: 1920 }} />{children}</AbsoluteFill>);
const Intro = ({ series, title, sub }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), s = f / fps;
  const a = (t0, d) => interpolate(s, [t0, t0 + d], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  return (<Card>
    <div style={{ position: 'absolute', left: 120, top: 560, fontFamily: FONT, color: GRAY, fontSize: 48, opacity: a(0.1, 0.3) }}>{series}</div>
    <div style={{ position: 'absolute', left: 116, top: 640, fontFamily: FONT, color: INK, fontSize: 132, opacity: a(0.25, 0.3), transform: `translateY(${(1 - a(0.25, 0.3)) * 16}px)` }}>{title}</div>
    <GrowLine x={124} y={812} w={560} p={a(0.6, 0.45)} />
    {sub ? <div style={{ position: 'absolute', left: 120, top: 860, fontFamily: FONT, color: INK, fontSize: 56, opacity: a(0.8, 0.3) }}>{sub}</div> : null}
  </Card>);
};
const Outro = ({ series, outro }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), s = f / fps;
  const a = (t0, d) => interpolate(s, [t0, t0 + d], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  return (<Card>
    {outro ? <div style={{ position: 'absolute', left: 120, top: 700, fontFamily: FONT, color: INK, fontSize: 110, opacity: a(0.1, 0.3) }}>{outro}</div> : null}
    <div style={{ position: 'absolute', left: 120, top: 860, fontFamily: FONT, color: GRAY, fontSize: 52, opacity: a(0.4, 0.3) }}>关注「{series}」</div>
  </Card>);
};
const Badge = ({ series, tag, outSec }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), s = f / fps;
  const o = interpolate(s, [0.3, 0.8, outSec, outSec + 0.5], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  if (o <= 0) return null;
  // 顶部 y≈110–230：在平台顶栏之下、画面内容之上（正片近景开场时顶部 500px 是空纸）
  return (<div style={{ position: 'absolute', left: 72, top: 110, fontFamily: FONT, opacity: o }}>
    <div style={{ color: GRAY, fontSize: 44 }}>{series}</div>
    {tag ? <div style={{ color: GRAY, fontSize: 34, marginTop: 6, opacity: 0.85 }}>{tag}</div> : null}
  </div>);
};
export const XfPackage = (p) => {
  const { fps } = useVideoConfig(), F = (sec) => Math.round(sec * fps);
  return (<AbsoluteFill style={{ backgroundColor: '#eeeae1' }}>
    {p.introSec > 0 && <Sequence durationInFrames={F(p.introSec)} name="片头"><Intro {...p} /></Sequence>}
    <Sequence from={F(p.introSec)} durationInFrames={F(p.bodySec)} name="正片">
      <OffthreadVideo src={staticFile(p.body)} muted />
      <Badge series={p.series} tag={p.tag} outSec={p.badgeOutSec} />
    </Sequence>
    {p.outroSec > 0 && <Sequence from={F(p.introSec + p.bodySec)} durationInFrames={F(p.outroSec)} name="片尾"><Outro {...p} /></Sequence>}
  </AbsoluteFill>);
};
