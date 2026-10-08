#!/usr/bin/env bash
# 小方视频命令入口（只依赖本 skill 目录 + 本机 uv / ffmpeg / Playwright Chromium）。
#   xf.sh new    <工程目录> <语法名>                  从模板起一个新片工程（复制引擎 + clips/<语法名>.js + spec.json）
#   xf.sh render <工程目录> <spec.json> <out.mp4> [--to 秒]   渲染画面层（无声 mp4，高码率母版）
#   xf.sh stills <工程目录> <spec.json> <输出目录> <t1,t2,...>  只出几张静帧（改动后先看静帧再整渲）
#   xf.sh qa     <工程目录> <spec_qa.json> <输出目录>  自动验收（确定性/跳变/半截字/叠字/进字幕带）；spec_qa 带 safe.bottom=520
#   xf.sh gate   <无字幕成片.mp4>                      竖屏字幕带门禁（图形进 y≥1400 带），等价 subzone_gate --band 787
#   xf.sh frames <video> <输出目录> <t1> [t2 ...]      导出关键帧 png（自审用）
#   xf.sh web    <in.mp4> <out_web.mp4>                兼容转码（H.264 High@4.0 / yuv420p / faststart / 静音 AAC 轨），交付必须用这个
#   ── v0.2 合成层（Node 22 与 npm 依赖都装在本 skill 目录内：.runtime/node22、compose/node_modules）──
#   xf.sh setup                                       装/补齐本地 Node 22 + compose 依赖（不装全局）
#   xf.sh package <正片.mp4> <out.mp4> [props.json]   Remotion：正片＋栏目角标（＋可选片头/片尾），props 见 compose/remotion/src/XfPackage.jsx
#   xf.sh cover   <帧.png> <out.png> [props.json]     Remotion：3:4 封面（纸底＋正片帧＋得意黑大字）
#   xf.sh tone    <captions.json> <秒> <voice.wav> <bgm.wav>   生成占位配音/BGM（只为测管线，不是配音）
#   xf.sh final   <画面.mp4> <工程目录> <成片.mp4> [--voice v.wav] [--bgm b.wav] [--captions c.json|c.srt] [--carve 0.5] [--bgm-volume 0.5]
#                                                     HyperFrames：得意黑字幕（底部留白区）＋配音＋BGM 自动闪避（carve）→ 9:16 母版
set -euo pipefail
SK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENG="$SK/scripts/engine"
CMP="$SK/compose"; NODE_BIN="$SK/.runtime/node22/bin"
node22() { [ -x "$NODE_BIN/node" ] || { echo "先跑 xf.sh setup" >&2; exit 2; }; export PATH="$NODE_BIN:$PATH" HYPERFRAMES_SKIP_SKILLS=1; }
abs_path() { python3 - "$1" <<'PY'
import os,sys
print(os.path.abspath(os.path.expanduser(sys.argv[1])))
PY
}
no_obsidian() { case "$(abs_path "$1")" in */obsidian/*|*/obsidian) echo "❌ 视频/图片/工程一律不进 Obsidian：$1" >&2; exit 2;; esac; }
cmd="${1:-}"; shift || true
case "$cmd" in
  new)
    P="$1"; G="$2"; no_obsidian "$P"
    [ -e "$P/clips/$G.js" ] && { echo "已存在 $P/clips/$G.js" >&2; exit 1; }
    mkdir -p "$P"; cp -rn "$ENG"/. "$P"/
    sed "s/CLIPS\.xf_template/CLIPS.$G/; s/'xf_template 屏幕字'/'$G 屏幕字'/" "$ENG/clips/xf_template.js" > "$P/clips/$G.js"
    sed "s/\"xf_template\"/\"$G\"/" "$SK/templates/spec_template.json" > "$P/spec.json"
    python3 - "$P/spec.json" <<'PY'
import json,sys; p=sys.argv[1]; s=json.load(open(p)); q=dict(s); q['safe']={'bottom':520}; json.dump(q,open(p.replace('spec.json','spec_qa.json'),'w'),ensure_ascii=False,indent=2)
PY
    echo "新工程：${P}（改 clips/${G}.js 与 spec.json；试渲：xf.sh stills ${P} ${P}/spec.json /tmp/${G}_stills 1,3,5）";;
  render)
    P="$1"; SP="$2"; OUT="$3"; shift 3; no_obsidian "$OUT"
    uv run --with playwright python "$P/render.py" --spec "$SP" --out "$OUT" "$@";;
  stills)
    P="$1"; SP="$2"; OUT="$3"; TS="$4"; no_obsidian "$OUT"
    uv run --with playwright python "$P/render.py" --spec "$SP" --out "$OUT" --stills "$TS";;
  qa)
    P="$1"; SP="$2"; OUT="$3"; no_obsidian "$OUT"
    uv run "$SK/scripts/qa.py" --project "$P" --spec "$SP" --out "$OUT";;
  gate)
    uv run --with numpy python "$SK/scripts/subzone_gate.py" "$1" --band 787;;
  frames)
    V="$1"; OUT="$2"; shift 2; no_obsidian "$OUT"; mkdir -p "$OUT"
    for t in "$@"; do ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 "$OUT/frame_${t}s.png"; done; ls -1 "$OUT";;
  web)
    IN="$1"; OUT="$2"; no_obsidian "$OUT"
    # 有音轨的成片：保留原音轨重编码；无声母版：补一条静音 AAC（部分播放器/平台遇到纯视频流会拒播）
    if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$IN" | grep -q .; then
      ffmpeg -y -v error -i "$IN" -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -crf 23 -preset slow -maxrate 6M -bufsize 12M -c:a aac -b:a 128k -movflags +faststart "$OUT"
    else
      ffmpeg -y -v error -i "$IN" -f lavfi -i anullsrc=r=44100:cl=stereo -shortest -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -crf 23 -preset slow -maxrate 6M -bufsize 12M -c:a aac -b:a 64k -movflags +faststart "$OUT"
    fi
    ffprobe -v error -show_entries format=duration,size:stream=codec_name,profile,level,width,height,r_frame_rate -of compact "$OUT";;
  setup)
    if [ ! -x "$NODE_BIN/node" ]; then
      mkdir -p "$SK/.runtime"; cd "$SK/.runtime"
      SYS_NODE="$(command -v node 2>/dev/null || true)"
      SYS_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
      if [ -n "$SYS_NODE" ] && [ "$SYS_MAJOR" -ge 22 ] && command -v npm >/dev/null 2>&1; then
        ln -sfn "$(cd "$(dirname "$SYS_NODE")/.." && pwd)" node22
      else
        case "$(uname -s)" in Darwin) OS=darwin;; Linux) OS=linux;; *) echo "不支持的系统：$(uname -s)" >&2; exit 2;; esac
        case "$(uname -m)" in arm64|aarch64) ARCH=arm64;; x86_64|amd64) ARCH=x64;; *) echo "不支持的架构：$(uname -m)" >&2; exit 2;; esac
        V=$(curl -s https://nodejs.org/dist/index.json | python3 -c "import json,sys;print([r['version'] for r in json.load(sys.stdin) if r['version'].startswith('v22.')][0])")
        FILE="node-$V-$OS-$ARCH.tar.gz"
        curl -sSLO "https://nodejs.org/dist/$V/$FILE"
        EXPECTED="$(curl -sSL "https://nodejs.org/dist/$V/SHASUMS256.txt" | awk -v f="$FILE" '$2==f {print $1}')"
        ACTUAL="$(shasum -a 256 "$FILE" | awk '{print $1}')"
        [ -n "$EXPECTED" ] && [ "$EXPECTED" = "$ACTUAL" ] || { echo "Node SHA256 校验失败" >&2; exit 2; }
        tar -xzf "$FILE"; rm "$FILE"; ln -sfn "node-$V-$OS-$ARCH" node22
      fi
    fi
    node22; cd "$CMP" && npm install --no-fund --no-audit && npx hyperframes telemetry disable >/dev/null 2>&1 || true
    node -v; echo "合成层就绪：$CMP";;
  package)
    node22; IN="$(realpath "$1")"; OUT="$(abs_path "$2")"; PROPS="${3:-}"; no_obsidian "$OUT"
    cp "$IN" "$CMP/remotion/public/body.mp4"
    DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
    TMP=$(mktemp "${TMPDIR:-/tmp}/xiaofang-props.XXXXXX"); python3 - "$PROPS" "$DUR" "$TMP" <<'PY'
import json,sys; p=json.load(open(sys.argv[1])) if sys.argv[1] else {}; p['body']='body.mp4'; p['bodySec']=round(float(sys.argv[2]),3); json.dump(p,open(sys.argv[3],'w'),ensure_ascii=False)
PY
    cd "$CMP" && npx remotion render remotion/src/index.jsx XfPackage "$OUT" --public-dir=remotion/public --props="$TMP" --crf=14;;
  cover)
    node22; IN="$(realpath "$1")"; OUT="$(abs_path "$2")"; PROPS="${3:-}"; no_obsidian "$OUT"
    cp "$IN" "$CMP/remotion/public/cover_frame.png"
    cd "$CMP" && npx remotion still remotion/src/index.jsx XfCover "$OUT" --public-dir=remotion/public ${PROPS:+--props="$(realpath "$PROPS")"};;
  tone)
    uv run "$SK/scripts/make_placeholder_audio.py" --captions "$1" --dur "$2" --voice "$3" --bgm "$4";;
  final)
    node22; V="$1"; D="$2"; OUT="$3"; shift 3; no_obsidian "$D"; no_obsidian "$OUT"
    node "$CMP/hf/build_final.mjs" --video "$V" --out-dir "$D" --render "$OUT" "$@";;
  *) sed -n 2,17p "$0"; exit 1;;
esac
