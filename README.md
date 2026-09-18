# chtholly-notes-style

将 C++ 开发中的优化、算法和 debug 记录整理成个人中文博客风格。

这个 skill 重点保留问题推进过程、个人判断和适度口语，避免把工作记录写成整齐的报告模板。适用于需要按既有大学博客风格重写 C++ 工作笔记的场景，不用于正式技术文档、代码审查或与博客写作无关的编码任务。

## 安装

使用 Codex 自带的 skill 安装脚本：

```bash
python install-skill-from-github.py \
  --repo ChthollyFan/chtholly-notes-style \
  --path skills/chtholly-notes-style
```

也可以直接传入 GitHub 目录地址：

```text
https://github.com/ChthollyFan/chtholly-notes-style/tree/main/skills/chtholly-notes-style
```

安装完成后，会在 `$CODEX_HOME/skills/chtholly-notes-style` 下生成对应目录，可以通过 `$chtholly-notes-style` 调用。

## 在 dsh 中使用

dsh（DeepSeek Harness）的本地文件系统提供方直接扫描 `<root>/<name>/SKILL.md`，一层深、不递归，格式与 Codex 的 Agent Skills 一致，因此同一个 bundle 不需要改任何内容就能两端共用。

### 发现路径

dsh 按下面的优先级发现本地 skill，本仓库的 `skills/chtholly-notes-style` 放在任意一个根下都能被发现：

| 优先级 | 来源 | 路径 |
|---|---|---|
| 100 | 项目 | `<项目根>/.dsh/skills` |
| 200 | 项目 | `<项目根>/.agents/skills` |
| 300 | 自定义 | `customSkillDirs` 配置项 |
| 400 | 用户 | `~/.dsh/skills` |
| 500 | 用户 | `~/.agents/skills` |

项目根是最近包含 `.git` 的祖先目录。推荐装到用户级 `~/.dsh/skills`，所有会话都能用。

### 安装

Windows PowerShell：

```powershell
node scripts/install-dsh-skill.mjs
```

脚本会在 `~/.dsh/skills/chtholly-notes-style` 建立指向本仓库的目录链接，`git pull` 之后 dsh 侧立即看到新内容。Windows 下用的是 junction（普通权限即可创建；Git Bash 的 `ln -s` 在没有开启开发者模式时会退化成复制）。想复制一份独立副本而不是链接：

```powershell
node scripts/install-dsh-skill.mjs --copy
```

手动安装等价于：

```bash
mkdir -p ~/.dsh/skills
ln -s "$(pwd)/skills/chtholly-notes-style" ~/.dsh/skills/chtholly-notes-style   # macOS / Linux
```

```cmd
:: Windows：junction 不需要管理员权限
mklink /J "%USERPROFILE%\.dsh\skills\chtholly-notes-style" "<仓库路径>\skills\chtholly-notes-style"
```

脚本默认使用 `$DSH_HOME`，没有该变量时回退到 `~/.dsh`；需要写到别处时用 `--target-dir <skill 根目录>`。目标已存在且不是本仓库的链接时会拒绝安装，`--force` 也只是把原内容重命名为 `<名字>.bak-<时间戳>`，不会删除。

### 调用

- 在 dsh Desktop / Web 的输入框里打 `/`，选择 `chtholly-notes-style`，输入框会插入 `/chtholly-notes-style `。
- 也可以直接描述任务，由模型侧的持久 skill 目录（或 `skill_search` / `skill_load`）自动加载。
- 装完需要新开一个会话，dsh 在会话开始和目录变化时刷新 skill 目录。

### 注意事项

- dsh 要求 `name` 匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`、`description` 非空，当前 frontmatter 已满足。
- 不要往 `SKILL.md` 里加 `whenToUse`、`user-invocable` 等 dsh 专有字段：Codex 只接受 `name`、`description`、`license`、`allowed-tools`、`metadata`，多出的键会让 Codex 直接拒绝整个 skill。
- dsh 的目录消息只渲染 `name` 和 `description`（描述截断到 500 字符），`references/` 通过资源目录提示可达，正文里保持相对路径引用即可。
- `agents/openai.yaml` 是 Codex 的界面元数据，dsh 不读取也不会因此报错，两份可以共存。

## 目录结构

```text
skills/
└── chtholly-notes-style/
    ├── SKILL.md
    ├── agents/
    │   └── openai.yaml
    └── references/
        ├── entry-patterns.md
        └── style-profile.md
scripts/
└── install-dsh-skill.mjs
```

`SKILL.md` 提供主要工作流，`references/` 中的文件只在需要判断文章骨架或具体写作风格时读取。`scripts/install-dsh-skill.mjs` 负责 dsh 侧的安装与 frontmatter 自检。

## 使用范围

- 根据日志、源码、diff 和测试记录整理 C++ 调试过程。
- 改写性能优化、算法实现和排障笔记。
- 保持用户已有博客的标题、叙述、代码展示和收尾习惯。
- 对没有证据的根因、失败过程、性能数字和验证结果不进行补写。

## 写作约定

- 材料里出现优化，或修 bug 时引入了和常规做法不同的算法，成文前先用 `ask_user_question` 确认这篇文章按「介绍一种新的优化/算法方式」还是「bug 排查记录」来写。
- 算法和优化类文章用二级小标题分段，每个关键步骤写成「文字说明 + 对应代码」；短代码直接进正文，完整实现和长日志才用 `<details>` 折起。
- 有推导价值时补一段和常规做法的复杂度对比：总操作量、依赖深度、误差界和内存访问分开算，前提和适用规模写清楚。
- 单独成行的公式用 `$$ ... $$` 居中，正文里的数学量用 `$ ... $` 行内公式。
- 不写「这个实现后来单独放进了一个头文件，只做这一件事」这类只交代代码去向的过渡句。

## 校验

使用 skill-creator 提供的校验脚本检查 `SKILL.md`：

```bash
python quick_validate.py skills/chtholly-notes-style
```

dsh 侧的校验由安装脚本自己完成，不需要额外命令：`node scripts/install-dsh-skill.mjs` 会检查 `SKILL.md` 是否存在、`name` 是否为 kebab-case、`description` 是否为空，并提示 frontmatter 里是否混入了 Codex 白名单之外的键。
