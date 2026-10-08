import { AbsoluteFill, Img, staticFile } from 'remotion';
import { FONT } from './font.js';
export const xfCoverDefaults = { series: '生活大于考研', line1: '复习一个月', line2: '还没感觉？', blue: '没感觉', frame: 'cover_frame.png' };
// 封面：纸底＋正片里截的一帧（下半）＋得意黑两行大字（blue 指定的词标蓝；注意 React 里 key 是保留字，不能当 prop 名）
export const XfCover = ({ series, line1, line2, blue, frame }) => {
  const paint = (s) => { const i = blue ? s.indexOf(blue) : -1; if (i < 0) return s;
    return (<>{s.slice(0, i)}<span style={{ color: '#2f5c9c' }}>{blue}</span>{s.slice(i + blue.length)}</>); };
  return (<AbsoluteFill>
    <Img src={staticFile('paper.png')} style={{ position: 'absolute', width: 1080, height: 1920, top: -240 }} />
    {/* 正片帧缩到 0.815 倍，取画面 y≈230–1420 的内容落在封面 y≈470–1440 */}
    <Img src={staticFile(frame)} style={{ position: 'absolute', width: 880, height: 1565, left: 100, top: 283,
      WebkitMaskImage: 'radial-gradient(ellipse 72% 68% at 50% 52%, #000 62%, transparent 100%)', maskImage: 'radial-gradient(ellipse 72% 68% at 50% 52%, #000 62%, transparent 100%)' }} />
    <div style={{ position: 'absolute', left: 80, top: 80, fontFamily: FONT, color: '#5f5c57', fontSize: 44 }}>{series}</div>
    <div style={{ position: 'absolute', left: 76, top: 150, fontFamily: FONT, color: '#1b1b1b', fontSize: 128, lineHeight: 1.12 }}>{paint(line1)}<br />{paint(line2)}</div>
  </AbsoluteFill>);
};
