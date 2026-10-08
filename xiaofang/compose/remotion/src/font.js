// 得意黑：从 public/ 载入，载完前 delayRender 挡住渲染（否则头几帧会用回退字体）
import { continueRender, delayRender, staticFile } from 'remotion';
export const FONT = 'SmileySans';
if (typeof document !== 'undefined' && !window.__xfFont) {
  window.__xfFont = true;
  const h = delayRender('load SmileySans');
  new FontFace(FONT, `url(${staticFile('SmileySans-Oblique.ttf')})`).load()
    .then((f) => { document.fonts.add(f); continueRender(h); })
    .catch((e) => { console.error('得意黑加载失败', e); continueRender(h); });
}
