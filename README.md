# chtholly-notes-style

将 C++ 开发中的优化、算法和 debug 记录整理成个人中文博客风格。

这个 skill 重点保留问题推进过程、个人判断和适度口语，避免把工作记录写成整齐的报告模板。适用于需要按既有大学博客风格重写 C++ 工作笔记的场景，不用于正式技术文档、代码审查或与博客写作无关的编码任务。

## 安装

dsh（DeepSeek Harness）与 Codex 都有官方插件通道，两条通道装的是同一份 `skills/chtholly-notes-style`，按你用的客户端选一条。

### 用 dsh 插件安装

包在 `package.json` 里声明了 `dsh.bundle`，可以直接走 dsh 自己的插件安装命令（包名带 `@chtholly-fan/` scope，技能名本身仍是 `chtholly-notes-style`）：

```bash
dsh plugin --profile web add @chtholly-fan/chtholly-notes-style
```

dsh 会把包装进该 profile 的 `node_modules`，并登记到 `dsh.profile.bundles`；profile 下次启动时，包内的 `index.js` 会把 `skills/chtholly-notes-style` 植入 `$DSH_HOME/skills`（所有 profile 共享的用户级 skill 根），所以 web 与 desktop 装一次即可共用。

- 来源不限于 registry，GitHub 与本地 tarball 同样可以：`dsh plugin --profile web add ./chtholly-fan-chtholly-notes-style-<版本>.tgz`
- desktop profile 由桌面应用独占管理，`dsh plugin --profile desktop add ...` 只在桌面版自带的 dsh 下放行，且应用运行时会撞上 profile 的文件锁；建议先完全退出应用，或改用应用内的插件市场安装。
- 如果 `$DSH_HOME/skills/chtholly-notes-style` 已经存在、又不带本插件的版本戳，插件会跳过并在日志里说明，不会覆盖你现有的目录。

更新与卸载；应用内插件市场的更新按钮同理，装完要重启应用让插件重新植入：

```bash
dsh plugin --profile web update @chtholly-fan/chtholly-notes-style
dsh plugin --profile web remove @chtholly-fan/chtholly-notes-style
```

### 用 Codex 插件安装

仓库自带 `.codex-plugin/plugin.json`（技能入口）与 `.agents/plugins/marketplace.json`（市场清单），注册成 Codex 市场后即可安装：

```bash
codex plugin marketplace add ChthollyFan/chtholly-notes-style --ref main
codex plugin add chtholly-notes-style@chtholly-fan
```

也可以只注册本地路径（`--ref` 仅对远端源有效）：

```bash
codex plugin marketplace add <本仓库路径>
```

更新要先刷新市场再重装：`.codex-plugin/plugin.json` 的 `version` 是插件缓存目录名，版本没变 Codex 不会替换文件。

```bash
codex plugin marketplace upgrade chtholly-fan
codex plugin remove chtholly-notes-style@chtholly-fan
codex plugin add chtholly-notes-style@chtholly-fan
```

卸载：

```bash
codex plugin remove chtholly-notes-style@chtholly-fan
codex plugin marketplace remove chtholly-fan
```

## 仓库内容

```text
package.json                      # npm 包元数据：dsh.bundle 指向 patch
cordis.patch.yml                  # dsh bundle 的 patch 层，插入本包的 host 插件行
index.js                          # 该插件：把随包技能植入 $DSH_HOME/skills
.codex-plugin/
└── plugin.json                   # Codex 插件清单，skills 指向 ./skills/
.agents/
└── plugins/
    └── marketplace.json          # Codex 市场清单，source.path 指向仓库自身
skills/
└── chtholly-notes-style/
    ├── SKILL.md                  # 技能正文：工作流与输出约定
    ├── agents/
    │   └── openai.yaml           # Codex 的界面元数据
    └── references/
        ├── entry-patterns.md     # 文章骨架与开头方式
        └── style-profile.md      # 具体写作风格与禁写清单
.github/
└── workflows/
    └── publish.yml               # 推 v* tag 自动发布到 npm
```

`SKILL.md` 提供主要工作流，`references/` 中的文件只在需要判断文章骨架或具体写作风格时读取。

## 使用范围

- 根据日志、源码、diff 和测试记录整理 C++ 调试过程。
- 改写性能优化、算法实现和排障笔记。
- 保持用户已有博客的标题、叙述、代码展示和收尾习惯。
- 对没有证据的根因、失败过程、性能数字和验证结果不进行补写。
