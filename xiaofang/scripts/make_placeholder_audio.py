#!/usr/bin/env python3
# /// script
# dependencies = ["numpy"]
# ///
"""本地生成占位音轨（只用于验证管线，不是配音）：
  voice：按字幕时间戳生成「像说话」的嗡鸣（基频 170Hz 带颤音＋谐波，4.5Hz 音节包络），句间静音——让 BGM 闪避/carve 有东西可测。
  bgm  ：柔和的四和弦铺底（正弦和声＋慢起慢收），整段循环到指定时长，末尾 1s 淡出。
  uv run make_placeholder_audio.py --captions captions.json --dur 15 --voice voice.wav --bgm bgm.wav
"""
import argparse, json, wave, numpy as np
ap = argparse.ArgumentParser(); ap.add_argument('--captions', required=True); ap.add_argument('--dur', type=float, required=True)
ap.add_argument('--voice', required=True); ap.add_argument('--bgm', required=True); ap.add_argument('--sr', type=int, default=48000)
a = ap.parse_args(); SR = a.sr; N = int(round(a.dur * SR)); t = np.arange(N) / SR
def write(path, x, ch):
    x = np.clip(x, -1, 1); pcm = (x * 32767).astype('<i2')
    if ch == 2 and pcm.ndim == 1: pcm = np.stack([pcm, pcm], 1)
    with wave.open(path, 'wb') as w: w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
caps = json.load(open(a.captions))
v = np.zeros(N); rng = np.random.default_rng(7)
for i, c in enumerate(caps):
    s, e = int(c['start'] * SR), min(N, int(c['end'] * SR)); tt = t[s:e] - c['start']; L = len(tt)
    f0 = 170 * (1 + 0.04 * np.sin(2 * np.pi * 5.2 * tt) + 0.06 * np.sin(2 * np.pi * 0.7 * tt + i))
    ph = 2 * np.pi * np.cumsum(f0) / SR
    sig = sum(np.sin(k * ph) / k ** 1.1 for k in range(1, 12))
    syl = np.abs(np.sin(np.pi * 4.5 * tt + rng.uniform(0, 3))) ** 0.7                   # 音节起伏
    edge = np.minimum(1, np.minimum(tt / 0.06, (tt[-1] - tt) / 0.12))
    v[s:e] += sig * syl * edge * 0.18
write(a.voice, v, 1)
chords = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 392.0]]
b = np.zeros(N); seg = 3.75
for k in range(int(np.ceil(a.dur / seg))):
    s0 = int(k * seg * SR); s1 = min(N, int((k + 1) * seg * SR)); tt = t[s0:s1] - k * seg
    env = np.minimum(1, tt / 0.8) * np.minimum(1, (seg - tt) / 0.8 + 0.3)
    b[s0:s1] += sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt) for f in chords[k % 4]) * env * 0.05
b *= np.minimum(1, (a.dur - t) / 1.0)
write(a.bgm, b, 2)
print('voice ->', a.voice, '| bgm ->', a.bgm)
