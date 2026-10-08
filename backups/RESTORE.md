# 小方 Skill 双版本恢复包

备份日期：2026-10-08

这个恢复包同时保留了两个状态：

- `xiaofang-unified-v1.0-source.tar.gz`：当前合并、优化后的统一「小方」Skill。
- `xiaofang-pre-merge-source.tar.gz`：合并前的 `xiaofang-video` 与 `remotion-explainer-video` 两个独立 Skill。

## 恢复统一版

```bash
chmod +x restore.sh
./restore.sh unified
~/.codex/skills/xiaofang/scripts/xf.sh setup
```

## 恢复合并前的双 Skill

```bash
chmod +x restore.sh
./restore.sh pre-merge
~/.codex/skills/xiaofang-video/scripts/xf.sh setup
```

恢复脚本会先校验文件完整性，并把当前同名 Skill 移到 `~/.codex/skill-backups/restore-时间戳/`。它不会直接删除现有版本。恢复后请新开一个 Codex 任务，让 Skill 列表重新载入。

## 未打包内容

为了让备份适合 GitHub 保存，以下内容没有打包：

- `.runtime` 和 `node_modules`（约 1GB，可由 `xf.sh setup` 重新安装）
- API 密钥、账号凭据和本机配置
- 已渲染的视频、临时缓存和生成日志

源码、角色资产、参考文档、脚本、模板，以及锁定依赖版本的 `package-lock.json` 均已保留。

## 手动校验

macOS：

```bash
shasum -a 256 -c MANIFEST.sha256
```

Linux：

```bash
sha256sum -c MANIFEST.sha256
```
