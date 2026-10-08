#!/usr/bin/env node
// 小方视频 · 最终合成（HyperFrames）。把「画面层 mp4」＋外部配音＋BGM＋字幕时间戳 组成一个 HyperFrames 工程并渲染。
//   node build_final.mjs --video packaged.mp4 --out-dir <工程目录> --render <成片.mp4>
//        [--voice voice.wav] [--bgm bgm.wav] [--captions captions.json|captions.srt] [--bgm-volume 0.5] [--carve 0.5] [--quality delivery]
// 约定：
//  · 配音只接外部音频文件（本脚本不生成、不调用任何 TTS）；字幕/时间戳可选：JSON [{start,end,text}] 或 SRT。
//  · 字幕用得意黑，放在底部留白区（画面 y≥1400 的字幕带上部，中心 y≈1500，避开平台底部 UI）。
//  · 有配音又有 BGM 时，用 HyperFrames 的 voiceover carve 给 BGM 做自动闪避（carve.mjs，Apache-2.0，来自 heygen-com/hyperframes）。
//  · 输出 9:16 1080×1920 30fps；交付前再用 xf.sh web 转兼容版。
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url)), COMPOSE = resolve(HERE, '..'), SKILL = resolve(COMPOSE, '..');
const args = {}; const av = process.argv.slice(2);
for (let i = 0; i < av.length; i++) { const k = av[i].replace(/^--/, ''); args[k] = av[i + 1]; i++; }
const need = (k) => { if (!args[k]) { console.error(`缺 --${k}`); process.exit(2); } return args[k]; };
const video = resolve(need('video')), outDir = resolve(need('out-dir'));
for (const p of [outDir, args.render || '']) if (/\/obsidian(\/|$)/.test(resolve(p || '.')) && p) { console.error('❌ 视频/工程不进 Obsidian'); process.exit(2); }
const probeDur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const dur = probeDur(video);
// ---------- 字幕 ----------
function parseSrt(s) {
  const t = (x) => { const m = x.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/); return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000; };
  return s.replace(/\r/g, '').split(/\n\n+/).map((b) => b.split('\n').filter(Boolean)).filter((l) => l.length >= 2)
    .map((l) => { const i = l.findIndex((x) => x.includes('-->')); const [a, b] = l[i].split('-->'); return { start: t(a), end: t(b), text: l.slice(i + 1).join(' ') }; });
}
let caps = [];
if (args.captions) { const raw = readFileSync(args.captions, 'utf8'); caps = extname(args.captions).toLowerCase() === '.srt' ? parseSrt(raw) : JSON.parse(raw); }
caps = caps.filter((c) => c.end > c.start && c.start < dur).map((c) => ({ ...c, end: Math.min(c.end, dur) }));
// ---------- 工程目录 ----------
mkdirSync(resolve(outDir, 'assets'), { recursive: true });
const cp = (src, name) => { copyFileSync(src, resolve(outDir, 'assets', name)); return `assets/${name}`; };
const vSrc = cp(video, 'picture' + extname(video));
const fSrc = cp(resolve(SKILL, 'scripts/engine/lib/fonts/SmileySans-Oblique.ttf'), 'SmileySans-Oblique.ttf');
cp(resolve(SKILL, 'scripts/engine/lib/fonts/SmileySans-OFL.txt'), 'SmileySans-OFL.txt');
const gSrc = cp(resolve(COMPOSE, 'node_modules/gsap/dist/gsap.min.js'), 'gsap.min.js');
const voice = args.voice ? cp(resolve(args.voice), 'voice' + extname(args.voice)) : null;
const bgm = args.bgm ? cp(resolve(args.bgm), 'bgm' + extname(args.bgm)) : null;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f3 = (x) => (+x).toFixed(3);
const capHtml = caps.map((c, i) => `      <div id="cap-${i}" class="clip cap" data-start="${f3(c.start)}" data-duration="${f3(c.end - c.start)}" data-track-index="3"><span>${esc(c.text)}</span></div>`).join('\n');
const capTl = caps.map((c, i) => `      tl.fromTo("#cap-${i} span", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.18, ease: "power1.out" }, ${f3(c.start)});`).join('\n');
const html = `<!doctype html>
<html lang="zh-CN" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="${gSrc}"></script>
    <style>
      @font-face { font-family: "SmileySans"; src: url("${fSrc}") format("truetype"); font-display: block; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #eeeae1; }
      #root { position: relative; width: 1080px; height: 1920px; }
      #picture { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
      /* 字幕：得意黑、墨色、居中，落在底部留白区上部（y≈1440–1570），下面再留给平台 UI */
      .cap { position: absolute; left: 90px; right: 90px; top: 1440px; height: 130px; display: flex; align-items: center; justify-content: center; text-align: center; z-index: 5; }
      .cap span { font-family: "SmileySans", sans-serif; font-size: 62px; line-height: 1.15; color: #1b1b1b; letter-spacing: 0.01em; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f3(dur)}" data-width="1080" data-height="1920">
      <video id="picture" class="clip" src="${vSrc}" data-start="0" data-duration="${f3(dur)}" data-track-index="0" muted playsinline></video>
${voice ? `      <audio id="vo-1" class="clip" data-audio-group="voiceover" src="${voice}" data-start="0" data-duration="${f3(Math.min(dur, probeDur(resolve(args.voice))))}" data-track-index="1" data-volume="1"></audio>` : ''}
${bgm ? `      <audio id="music" class="clip" src="${bgm}" data-start="0" data-duration="${f3(Math.min(dur, probeDur(resolve(args.bgm))))}" data-track-index="2" data-volume="${args['bgm-volume'] || '0.5'}" data-fade-in="0.8" data-fade-out="1.0"></audio>` : ''}
${capHtml}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
${capTl}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
writeFileSync(resolve(outDir, 'index.html'), html);
writeFileSync(resolve(outDir, 'hyperframes.json'), JSON.stringify({ paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: true } }, null, 2));
writeFileSync(resolve(outDir, 'meta.json'), JSON.stringify({ id: basename(outDir), name: basename(outDir) }, null, 2));
console.log(`工程 -> ${outDir}（${caps.length} 条字幕，时长 ${f3(dur)}s，配音 ${voice ? '有' : '无'}，BGM ${bgm ? '有' : '无'}）`);
const HF = resolve(COMPOSE, 'node_modules/.bin/hyperframes'), env = { ...process.env, HYPERFRAMES_SKIP_SKILLS: '1' };
const run = (cmd, a) => { console.log('$', basename(cmd), a.join(' ')); execFileSync(cmd, a, { stdio: 'inherit', env, cwd: outDir }); };
if (voice && bgm && args.carve !== '0') run(process.execPath, [resolve(HERE, 'carve.mjs'), '--comp', resolve(outDir, 'index.html'), '--bed', 'music', '--voice', 'vo-1', '--strength', args.carve || '0.5', '--core', COMPOSE]);
run(HF, ['lint', outDir]);
if (args.render) run(HF, ['render', outDir, '-o', resolve(args.render), '--quality', args.quality || 'delivery', '--fps', '30', '--resolution', 'portrait']);
