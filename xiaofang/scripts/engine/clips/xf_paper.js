// 只画纸：导出和画面层完全同一张的纸底（给 Remotion 包装层/封面当底图，保证片头片尾和正片纸面一致）。
CLIPS.xf_paper = (() => { let PAPER; return { init(ctx) { PAPER = XF.paper(ctx.W, ctx.H); }, draw(c) { c.drawImage(PAPER, 0, 0); } }; })();
