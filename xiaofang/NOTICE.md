# 来源与许可（NOTICE）

本 skill 是「生活大于考研」频道的私用工具，由以下开源材料组合而成：

1. **huashu-art-motion**（MIT，© 2026 alchaincyf 花叔·花生）——画面层引擎来自它：
   `scripts/engine/clip.js`、`render.py`、`lib/{util,paint,motion,camera,diagram}.js`、`scripts/qa.py`、`scripts/subzone_gate.py`
   原样或精简复制，`render.py` 加了「--spec 时也认 --from/--to」，`clip.html` 只保留小方需要的库。MIT 全文见 `LICENSE-huashu-art-motion`。
   **没有**复制花叔的任何示例角色（花叔/花生形象、rig_huashu、assets/角色、demo 片、reference_films）。
2. **小方**角色代码 `lib/rig_xiaofang.js`、场景 `clips/xf_liangbian.js`、`clips/xf_template.js`：为本频道新写，依据用户的 IP 设定图 `references/小方-IP设定图.jpg`。
3. **得意黑 Smiley Sans v2.0.1**（SIL OFL 1.1，© atelier-anchor）：`scripts/engine/lib/fonts/`，官方 release 原文件未改动，许可全文 `SmileySans-OFL.txt`。
4. **v0.2 合成层**（`compose/`，依赖由 npm 安装在本目录，不随 skill 复制源码）：
   - Remotion 4.0.534（Remotion License：个人/≤3 人公司/非营利免费，可商用；详见 SKILL.md 第 8 节）
   - HyperFrames 0.8.140、@hyperframes/core（Apache-2.0）；`compose/hf/carve.mjs` 复制自 heygen-com/hyperframes `skills/hyperframes-audio/scripts/carve.mjs`（commit b66e8a1），许可全文 `compose/hf/LICENSE-hyperframes-Apache-2.0`
   - GSAP 3.15.0（Webflow Standard "no charge" License）、React 19（MIT）
