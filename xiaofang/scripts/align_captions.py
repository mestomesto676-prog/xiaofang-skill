#!/usr/bin/env python3
"""Align exact script text to word-timestamp ASR; emit TypeScript and SRT."""

from __future__ import annotations

import argparse
import bisect
import difflib
import json
import re
from pathlib import Path


def norm(text: str) -> str:
    return "".join(re.findall(r"[\u3400-\u9fffA-Za-z0-9+%]", text)).lower()


def make_chunks(text: str, limit: int) -> list[str]:
    result: list[str] = []
    for paragraph in (p.strip() for p in text.splitlines() if p.strip()):
        for sentence in re.findall(r"[^。！？!?；;]+[。！？!?；;]?[”’\"]?", paragraph):
            current = ""
            for unit in re.findall(r"[^，,：:、]+[，,：:、]?", sentence):
                if current and len(norm(current + unit)) > limit:
                    result.append(current.strip())
                    current = ""
                if len(norm(unit)) <= limit:
                    current += unit
                    continue
                if current:
                    result.append(current.strip())
                    current = ""
                raw = unit.strip()
                while len(norm(raw)) > limit:
                    cut = min(limit, len(raw))
                    while cut > 1 and len(norm(raw[:cut])) > limit:
                        cut -= 1
                    result.append(raw[:cut].strip())
                    raw = raw[cut:]
                current = raw
            if current.strip():
                result.append(current.strip())
    return [item for item in result if norm(item)]


def srt_time(frame: int, fps: float) -> str:
    ms = round(frame / fps * 1000)
    hours, ms = divmod(ms, 3600000)
    minutes, ms = divmod(ms, 60000)
    seconds, ms = divmod(ms, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{ms:03d}"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--script", required=True, type=Path)
    parser.add_argument("--asr", required=True, type=Path)
    parser.add_argument("--typescript", required=True, type=Path)
    parser.add_argument("--srt", required=True, type=Path)
    parser.add_argument("--fps", type=float, default=30)
    parser.add_argument("--duration", type=float, required=True)
    parser.add_argument("--limit", type=int, default=18)
    parser.add_argument("--strong-phrase", action="append", default=[])
    return parser.parse_args()


def main() -> None:
    args = arguments()
    plain = re.sub(r"<#\d+(?:\.\d+)?#>", "", args.script.read_text(encoding="utf-8"))
    texts = make_chunks(plain, args.limit)
    source = "".join(norm(item) for item in texts)
    data = json.loads(args.asr.read_text(encoding="utf-8"))
    recognized_chars: list[str] = []
    recognized_times: list[tuple[float, float]] = []
    for segment in data.get("segments", []):
        for word in segment.get("words") or []:
            chars = list(norm(str(word.get("word", ""))))
            if not chars:
                continue
            start, end = float(word["start"]), float(word["end"])
            step = max(0.001, (end - start) / len(chars))
            for index, char in enumerate(chars):
                recognized_chars.append(char)
                recognized_times.append((start + index * step, start + (index + 1) * step))
    recognized = "".join(recognized_chars)
    if not source or not recognized:
        raise SystemExit("Script or ASR contains no alignable characters")

    matcher = difflib.SequenceMatcher(None, source, recognized, autojunk=False)
    mapped: dict[int, int] = {}
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            mapped[block.a + offset] = block.b + offset
    anchors = sorted(mapped)
    if not anchors:
        raise SystemExit("No alignment anchors found")

    def source_time(index: int, use_end: bool = False) -> float:
        if index in mapped:
            return recognized_times[mapped[index]][1 if use_end else 0]
        position = bisect.bisect_left(anchors, index)
        left = anchors[position - 1] if position else None
        right = anchors[position] if position < len(anchors) else None
        if left is None:
            return max(0.0, recognized_times[mapped[right]][0] - (right - index) * 0.13)
        if right is None:
            return min(args.duration, recognized_times[mapped[left]][1] + (index - left) * 0.13)
        lt = recognized_times[mapped[left]][1]
        rt = recognized_times[mapped[right]][0]
        return lt + (rt - lt) * (index - left) / (right - left)

    cues: list[dict[str, object]] = []
    cursor = 0
    for index, text in enumerate(texts):
        length = len(norm(text))
        start_frame = round(max(0.0, source_time(cursor) - 0.03) * args.fps)
        end_frame = round(min(args.duration, source_time(cursor + length - 1, True) + 0.12) * args.fps)
        cues.append({
            "id": f"C{index + 1:03d}",
            "startFrame": start_frame,
            "endFrame": max(start_frame + 6, end_frame),
            "text": text,
            "emphasis": any(phrase in text for phrase in args.strong_phrase),
        })
        cursor += length
    for index in range(len(cues) - 1):
        if int(cues[index]["endFrame"]) >= int(cues[index + 1]["startFrame"]):
            cues[index]["endFrame"] = max(int(cues[index]["startFrame"]) + 6, int(cues[index + 1]["startFrame"]) - 1)

    args.typescript.parent.mkdir(parents=True, exist_ok=True)
    ts = [
        "export type CaptionCue = {id:string; startFrame:number; endFrame:number; text:string; emphasis:boolean};",
        "export const CAPTIONS: CaptionCue[] = [",
        *("  " + json.dumps(cue, ensure_ascii=False, separators=(",", ":")) + "," for cue in cues),
        "];",
    ]
    args.typescript.write_text("\n".join(ts) + "\n", encoding="utf-8")
    args.srt.parent.mkdir(parents=True, exist_ok=True)
    srt: list[str] = []
    for index, cue in enumerate(cues, 1):
        srt.extend([str(index), f"{srt_time(int(cue['startFrame']), args.fps)} --> {srt_time(int(cue['endFrame']), args.fps)}", str(cue["text"]), ""])
    args.srt.write_text("\n".join(srt), encoding="utf-8")
    ratio = sum(block.size for block in matcher.get_matching_blocks()) / len(source)
    print(f"captions={len(cues)} source_chars={len(source)} recognized_chars={len(recognized)} match_ratio={ratio:.3f}")


if __name__ == "__main__":
    main()
