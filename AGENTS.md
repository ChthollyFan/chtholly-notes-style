# 仓库公约

本文件约束在本仓库里协助维护的 agent。技能本身的写作规则在 `skills/chtholly-notes-style/SKILL.md`，不在这里重复。

## 维护规则

- 写作规则只维护在 `skills/chtholly-notes-style/SKILL.md`（细节在 `references/`），不要在 README、本文件或其他地方复制一份，避免多处漂移。
- 改 `SKILL.md` 时保持 frontmatter 只出现 Codex 白名单内的键（`name`、`description`、`license`、`allowed-tools`、`metadata`）：多出任何一个都会让 Codex 拒绝整个 skill；dsh 侧另要求 `name` 匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`、`description` 非空。
- 改动技能内容后，同步 `package.json` 与 `.codex-plugin/plugin.json` 两处 `version`，二者必须一致：前者决定 npm 版本，后者是 Codex 的插件缓存目录名。
- 发布走 tag：打 `vX.Y.Z` 后推送，`.github/workflows/publish.yml` 会校验 tag 与 `package.json` 的版本一致，已发布过的版本直接跳过。
- 待提交文件的编码保持 UTF-8 无 BOM，提交前检查乱码与冲突标记。
- 旧的脚本安装通道已移除，`scripts/install-dsh-skill.mjs` 在 `待删除/` 下等待手工清理；不要在文档、包元数据或工作流里再引用它。
- `docs/` 是本地写作草稿目录，被 `.gitignore` 忽略，不要提交。
- 仓库与 npm 包面向技能分发，不要往 `package.json` 的 `files` 白名单里加与运行无关的文件。

## 校验

使用 skill-creator 提供的校验脚本检查 `SKILL.md`：

```bash
python quick_validate.py skills/chtholly-notes-style
```
