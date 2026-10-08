# 频道 SVG 素材库

## 目标

素材库用于提高复用速度、丰富场景层次，不用于堆装饰。任何素材必须能回答“它在这个镜头里表达了什么”。

本频道的当前问题不是画面不够满，而是图形词汇偏少：文字、通用符号和线条人重复出现。素材库要增加“可表达的动作、物品和关系”，不增加背景噪声。

## 不可变的风格锚点

- 核心特征始终是黑色粗线条描边。
- 主体内部保持白色或透明，不使用大面积装饰色块。
- 所有端点与连接使用圆角，轮廓干净、友好、易识别。
- 不转向细线图标、实心扁平图标、拟物、写实、3D、手绘纹理或纸张拼贴。
- 红蓝仍只承担信息语义，不改变素材的黑色粗描边主体。
- 素材多样性来自“画什么”和“它如何变化”，不是来自“换一种画风”。

## 图像生成到 SVG 的流程

1. 从真实分镜提出一组高复用对象，不脱离内容批量造图。
2. 用图像生成产出无文字、近白背景的概念母版；参考频道人物与视觉规范。
3. 只审核轮廓、姿态、比例、识别度、留白和对象组合，不追求纹理。
4. 选中后人工或代码重绘为 SVG；不要自动描摹噪声、阴影和纸张纹理。
5. 在 64px、128px 和实际镜头尺寸下检查识别度。
6. 做静态、进入、状态变化三个 Remotion 使用示例。
7. 在视频中验证后加入索引；没有使用场景的草图留在候选区。

## 场景组合规则

- 单人物只在动作本身足以表达逻辑时使用。
- 抽象观点优先落到可见物品：书页、错题、时钟、筹码、路径、标靶、日记、计划表。
- 重点镜头优先组合两类素材，如“焦虑人物 + 被反复擦改的计划表”。
- 动画应改变素材状态，如错题被框选、时间被压缩、分数被保住、路径被删除。
- 不用阴影、纹理、漂浮小图标或随机摆件制造伪层次。
- 竖屏素材在设计时标记为 `core` 或 `decorative`：标题人物、人物面部、核心物品、关键图表和数字属于 `core`，默认必须完整进入中部偏左的 `2:3` 舞台；背景纹理、环境线条和纯装饰物属于 `decorative`，允许突破 `2:3` 并进入平台 UI 区。
- 素材本身不内嵌可见安全区边框；安全区只在 Remotion QA 遮罩中显示。

## 首批分类

```text
svg-library/
├── characters/
│   ├── standing.svg
│   ├── thinking.svg
│   ├── pointing.svg
│   ├── studying.svg
│   ├── walking.svg
│   ├── running.svg
│   └── anxious.svg
├── study/
│   ├── book-stack.svg
│   ├── notebook.svg
│   ├── exam-paper.svg
│   ├── wrong-answer.svg
│   ├── formula-card.svg
│   └── flashcards.svg
├── time-score/
│   ├── clock.svg
│   ├── countdown.svg
│   ├── hourglass.svg
│   ├── score-plus.svg
│   ├── score-loss.svg
│   └── progress-ring.svg
├── choice-path/
│   ├── fork-road.svg
│   ├── target.svg
│   ├── flag.svg
│   ├── arrow.svg
│   ├── keep.svg
│   └── abandon.svg
└── review-ai/
    ├── diary.svg
    ├── pattern.svg
    ├── loop.svg
    ├── insight.svg
    └── plan-change.svg
```

## SVG 规范

- 使用 `viewBox="0 0 256 256"`；需要横向组合时可用 `0 0 512 256`。
- 默认 `fill="none"`、`stroke="currentColor"`、`stroke-linecap="round"`、`stroke-linejoin="round"`。
- 主线宽在 256 viewBox 下统一为 10–14，默认 12；同一图标最多两档线宽，禁止为了细节改用纤细线条。
- 黑色为默认 `currentColor`；红蓝只在调用组件时按语义注入。
- 不在 SVG 内嵌字体、位图、滤镜、渐变、阴影和无意义的分组。
- `id` 使用稳定英文语义名，供 Remotion 定向动画。
- 每个文件包含 `<title>`，并保证独立渲染无裁切。

## 索引字段

素材索引至少记录：

| 字段 | 含义 |
|---|---|
| `id` | 稳定唯一名 |
| `category` | 分类 |
| `path` | 相对路径 |
| `meaning` | 视觉语义 |
| `tags` | 检索词 |
| `poses/states` | 可用动作或状态 |
| `animationHooks` | 可动画的 SVG id |
| `usedIn` | 已使用视频/镜头 |
| `safeClass` | `core` 或 `decorative` |
| `preferredZone` | 推荐构图区，如 `core-left`、`core-center`、`full-bleed` |

## 图像生成母版提示词骨架

```text
Use case: stylized-concept
Asset type: SVG library concept sheet for a Chinese education explainer channel
Primary request: create a clean concept sheet of [objects/poses]
Style/medium: minimal black line-art pictograms, vector-friendly silhouettes
Scene/backdrop: plain warm light gray #ECECEA
Color palette: black #000000 and white only; use red #E63946 or blue #2563EB only when the requested object has that semantic meaning
Composition/framing: evenly spaced isolated objects, generous negative space, consistent scale
Constraints: no text, no letters, no numbers, no gradients, no texture, no shadows, no faces, no detailed clothing, no decorative elements
```

生成图只锁定造型方向。最终 SVG 必须由可审查的路径和几何图形构成。
