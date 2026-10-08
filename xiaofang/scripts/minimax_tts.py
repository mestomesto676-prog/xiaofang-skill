#!/usr/bin/env python3
"""Generate MiniMax narration using an environment variable or macOS Keychain."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import urllib.error
import urllib.request
from pathlib import Path


KEYCHAIN_ACCOUNT = "codex-remotion"
KEYCHAIN_SERVICE = "minimax-api-key"


def load_api_key() -> str | None:
    key = os.getenv("MINIMAX_API_KEY")
    if key:
        return key
    if os.uname().sysname != "Darwin":
        return None
    result = subprocess.run(
        [
            "/usr/bin/security",
            "find-generic-password",
            "-a",
            KEYCHAIN_ACCOUNT,
            "-s",
            KEYCHAIN_SERVICE,
            "-w",
        ],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="UTF-8 narration text")
    parser.add_argument("output", type=Path, help="Output MP3")
    parser.add_argument("--endpoint", default=os.getenv("MINIMAX_API_ENDPOINT", "https://api.minimaxi.com/v1/t2a_v2"))
    parser.add_argument("--model", default="speech-2.8-hd")
    parser.add_argument("--voice", default="Chinese (Mandarin)_Reliable_Executive")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--volume", type=float, default=1.0)
    parser.add_argument("--pitch", type=int, default=0)
    parser.add_argument(
        "--emotion",
        choices=("happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent", "whipser"),
        help="MiniMax voice emotion; omit to keep the voice default",
    )
    parser.add_argument("--language", default="Chinese")
    parser.add_argument("--sample-rate", type=int, default=44100)
    parser.add_argument("--bitrate", type=int, default=128000)
    return parser.parse_args()


def main() -> None:
    args = arguments()
    key = load_api_key()
    if not key:
        raise SystemExit(
            "Missing MiniMax API key. Set MINIMAX_API_KEY or save it in macOS "
            "Keychain with service 'minimax-api-key' and account 'codex-remotion'."
        )
    text = args.input.read_text(encoding="utf-8").strip()
    if not text:
        raise SystemExit("Narration script is empty")
    if len(text) >= 10000:
        raise SystemExit(f"Script is {len(text)} chars; split it below the synchronous API limit")

    payload = {
        "model": args.model,
        "text": text,
        "stream": False,
        "language_boost": args.language,
        "output_format": "hex",
        "voice_setting": {
            "voice_id": args.voice,
            "speed": args.speed,
            "vol": args.volume,
            "pitch": args.pitch,
        },
        "audio_setting": {
            "sample_rate": args.sample_rate,
            "bitrate": args.bitrate,
            "format": "mp3",
            "channel": 1,
        },
    }
    if args.emotion:
        payload["voice_setting"]["emotion"] = args.emotion
    request = urllib.request.Request(
        args.endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"MiniMax HTTP {error.code}: {detail[:1000]}") from error

    status = result.get("base_resp") or {}
    if status.get("status_code") not in (None, 0):
        raise SystemExit(f"MiniMax error: {json.dumps(status, ensure_ascii=False)}")
    audio_hex = (result.get("data") or {}).get("audio")
    if not audio_hex:
        raise SystemExit("MiniMax response did not contain audio data")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(bytes.fromhex(audio_hex))
    metadata = {
        "endpoint": args.endpoint,
        "model": args.model,
        "voice": args.voice,
        "speed": args.speed,
        "emotion": args.emotion,
        "language": args.language,
        "sample_rate": args.sample_rate,
        "bitrate": args.bitrate,
        "characters": len(text),
        "trace_id": result.get("trace_id"),
    }
    metadata_path = args.output.with_suffix(args.output.suffix + ".json")
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(args.output.resolve())
    print(metadata_path.resolve())


if __name__ == "__main__":
    main()
