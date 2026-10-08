# 踩过的坑（按发生顺序；每条：现象 → 原因 → 做法）

1. **浮笔压到小方/计数**（v1）→ 一支屏幕空间的马克笔跟着笔画走，几个时刻笔身横在小方头上、压住 Day 计数 → 用户决定：**不要浮笔**，线和字自己长出来（growLine / writeText 的 zigzag 揭开）。`xf_liangbian.js` 里 penAt 只留给小方的视线追踪。
2. **托下巴的手臂读不清** → 肘关节自由解算会往外甩成奇怪角度 → 固定肘点 `st.elbows = {l: [XFX-0.37H, HIP-0.25H], w}`，手放下巴 `[XFX-0.06H, HIP-0.785H+12]`。
3. **推镜时标注进字幕带** → 世界坐标的字在 z>1 时屏幕 y 变大 → 设计时用 `屏幕y = H/2 + (世界y - cam.y)·z` 自查，所有字 < 1400；`CAM_P.y` 往下挪、标注贴近地面。
4. **「…」和 Day 计数相撞** → 两个元素都挂在小方头右上 → 「…」放头顶上方，计数右移；**每加一个浮动元素都要在关键帧里查一次与其它元素的外框**。
5. **用 Python 正则按 `];` 拆 JS 块，把笔画数组里的 `];` 当成块尾，改坏了代码** → 改 JS 用精确字符串替换或手改，不要按符号切块。
6. **交付的母版在用户手机/电脑上放不了**（v1：H.264 High@5.0、9.8Mbps、moov 在尾、无音轨）→ 交付一律用 `xf.sh web` 出兼容版（High@4.0、yuv420p、CRF23、maxrate 6M、faststart、补静音 AAC），母版只留本机。
7. **subzone_gate 默认按横屏**：它把画面缩放到 1920×1080 再看 `--band` 以下 → 竖屏 1080×1920 的字幕带 y≥1400 对应 `--band 787`（1400/1920×1080），`xf.sh gate` 已经写死。
8. **qa 的字幕带检查要 spec.safe.bottom**：小方语法没接 safe（`safe:false`，自己排版让开），所以 qa 用单独的 `spec_qa.json`（多一个 `safe.bottom:520`）；渲染时 clip.js 会警告「还没接 safe」，正常。
9. **字体**：`U.loadCmaps` 能读 TTF/OTF/WOFF1，读不了 WOFF2 → 得意黑用官方 release 的原 TTF；**不要子集化/转格式**（OFL 下那就是修改版，不能再叫「得意黑」）。缺字检查：语法 init 里 `U.assertGlyphs('SmileySans', 全部屏幕字)`，缺字 → 页面报错 → render 失败退出。
10. **render.py --spec 原本忽略 --from/--to**（总是整段渲）→ 本 skill 的 render.py 已改为认 `--to`，试渲前几秒用 `--to 3`。
11. **GitHub API 限流**（下载 release 时 403/None）→ 用 `https://github.com/<org>/<repo>/releases/expanded_assets/<tag>` 的 HTML 拿到 zip 直链。
12. **素材绝不进 Obsidian**：视频、图片、工程都放 /workspace/xiaofang/ 或 /tmp；Obsidian 只放纯文字说明。`xf.sh` 对 obsidian 路径直接拒绝。

## v0.2（合成层）新增

13. **系统 Node 是 v20，HyperFrames 要求 ≥22** → 不升级系统、不装全局：`xf.sh setup` 把官方 Node 22 tarball 下到 `.runtime/`（校验 SHA256；机器上没有 `xz`，用 Python tarfile 解压）。
14. **HyperFrames 在后台子 shell 里渲染会被取消**（`render_cancelled_parent_exited`：它发现父进程退出就停）→ `hyperframes render` 放前台跑，或用能保持父进程存活的方式；不要 `( … ) &`。
15. **React 里 `key` 是保留字**：给 Remotion 组件传 `key` 当 prop 会被 React 吞掉（封面强调词一直不变蓝）→ prop 改名 `blue`。
16. **carve.mjs 的 `--voice` 要写音频 clip 的 id（`vo-1`），不是音频组名**；它看到 clip 属于组 `voiceover` 会自动写成组形式 `sources:["voiceover"]`。写组名会报「no <audio> with id=voiceover」。
17. **carve 默认 strength 0.8 对连续口播太狠**：占位音测得 BGM 被压约 19 dB、几乎听不见，短停顿（<0.5s）也回不来 → 默认改 0.5（约 14 dB）。真配音到了再按耳朵调。
18. **Remotion 版本钉死 4.0.534**：5.0 会换许可（承包商计入人数等），升级前先读新 LICENSE；`compose/package.json` 里不用 `^`。
19. **HyperFrames init 默认从 CDN 引 GSAP、并去 GitHub 检查 skills** → 合成页用本地 `node_modules/gsap` 拷进工程 assets，环境变量 `HYPERFRAMES_SKIP_SKILLS=1`。
20. **成片时长 15.018s**：AAC 编码器前置帧让音轨比视频长约 18ms，播放无影响；需要严格 15.000 时在 `web` 里加 `-shortest`。

## v0.3（小方造型）新增

21. **手臂看起来「生硬」**（v0.2）→ 原因有三个：IK 出来的是三点等宽折线，肘部是硬角；手抖频率 0.012/px，在 40–90px 的短线段上几乎不弯；自然下垂的目标点离满臂长差 4px，而且落在躯干下半宽以内，所以手臂贴着躯干斜边走、腰部打一个小折，像躯干多一条边。10fps 沸腾不是原因 → v0.3：肘部倒圆角（`XF.armPath`）＋下垂目标改到肩外 0.22H（`XF.hang`）。**语法里要「放下手」一律用 `XF.hang`**，别写死旧的 `[sh-0.06H, sh+0.84H-4]`。
22. **改了默认下垂点，拿道具的手也要看一眼**：`xf_liangbian` 收尾时拿滴管的手原来在肩外 0.10H，正好压在躯干边上；挪到 0.20H 时滴管又碰到烧瓶，最后定在 0.16H。**换姿势参数后，抽收尾帧看道具和其他物体的外框**。
23. **难过眉毛画反**：v0.2 的眉毛是内低外高，读起来像生气 → 内高外低（外端下垂）。眼睛放大以后眉毛要跟着眼睛顶部走（`top = 眼睛顶 − …`），否则 k≥1.6 时眉毛会压到眼睛。k=1.8 时：难过眉毛的最低处离眼睛顶 ≥0.03H、长度不随 k 变；无语的眼皮线抬高 0.014H、缩短到 0.046H·k，和半颗豆之间留一道缝；线宽最多按 1.3 倍放大。
24. **放大眼睛是一个参数的事**：`XF.EYE.k`（默认 1.8，Shawn 2026-10-08 定）；线状表情（∩眼、眨眼、眉毛）用 `1+(k−1)·0.6` 缩放，免得线太粗。单支片子要换：在语法 init 里写 `XF.EYE.k = 1.4`。

