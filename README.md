# 小方：竖屏知识视频生成 Skill

以统一的小方 IP，使用“纸雕世界＋粗线条小方＋代码动画”的十步工作流，制作「生活大于考研」竖屏知识视频、封面、字幕和发布材料。

## 用 Codex 安装

把下面这句话发给 Codex：

```text
请使用 skill-installer 安装：
https://github.com/mestomesto676-prog/xiaofang-skill/tree/main/xiaofang
```

安装完成后新开一个任务，然后直接说“使用小方 Skill 制作……”即可。

## 手动安装

```bash
git clone https://github.com/mestomesto676-prog/xiaofang-skill.git
cp -R xiaofang-skill/xiaofang ~/.codex/skills/xiaofang
~/.codex/skills/xiaofang/scripts/xf.sh setup
```

## 一句话安装完整发行包

```bash
curl -fsSL https://raw.githubusercontent.com/mestomesto676-prog/xiaofang-skill/main/install.sh | bash
```

也可以直接把这句话发给 Codex：

```text
请从 https://github.com/mestomesto676-prog/xiaofang-skill 安装完整的小方 Skill，并运行 install.sh。
```

`.runtime` 与 `node_modules` 没有上传；首次使用时运行 `xf.sh setup` 即可重建环境。

## 备份与复原

`backups/` 保存了统一版源码包、合并前的双 Skill 源码包、校验文件和安全恢复脚本。恢复脚本会先把现有版本移动到时间戳目录，不会直接删除。

## 分享说明

项目公开供大家安装、学习和创作使用。小方角色及原创视觉资产的权利归原作者所有；仓库中带有单独许可证或来源说明的组件，继续遵循各自文件中的条款。
