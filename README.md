# chtholly-notes-style

将 C++ 开发中的优化、算法和 debug 记录整理成个人中文博客风格。

这个 skill 重点保留问题推进过程、个人判断和适度口语，避免把工作记录写成整齐的报告模板。适用于需要按既有大学博客风格重写 C++ 工作笔记的场景，不用于正式技术文档、代码审查或与博客写作无关的编码任务。

## 安装

四种方式装的是同一份 `skills/chtholly-notes-style`，按场景挑一个。

### 用 npx 安装（推荐）

不需要克隆仓库，也不需要 npm 账号——包直接从 GitHub 解析：

```bash
npx --yes github:ChthollyFan/chtholly-notes-style
```

默认装到 dsh 的用户级 skill 根目录（`$DSH_HOME/skills`，未设置时为 `~/.dsh/skills`）。常用参数：

```bash
npx --yes github:ChthollyFan/chtholly-notes-style --copy                  # 复制副本，而不是建链接
npx --yes github:ChthollyFan/chtholly-notes-style --target-dir <skill 根> # 换目标目录
npx --yes github:ChthollyFan/chtholly-notes-style --force                 # 已装过副本时覆盖，旧的改名备份
npx --yes github:ChthollyFan/chtholly-notes-style uninstall               # 卸载
```

npx 会把包体放在 npm 的临时缓存里（`_npx/<hash>/node_modules`），缓存回收后链接就会悬挂，所以这种场景脚本自动改用复制。想要 `git pull` 之后立即生效的链接模式，用下面的仓库内安装。

包发布到 npm registry 之后（见「发布为 npm 包」）可以简写成：

```bash
npx --yes @chtholly-fan/chtholly-notes-style
npm i -g @chtholly-fan/chtholly-notes-style && chtholly-notes-style
```

npm 装的是快照：更新要重跑命令并加 `--force`（旧副本改名成 `<名字>.bak-<时间戳>`，不会删除），链接模式则由 `git pull` 直接生效。

### 用 dsh 插件安装（dsh bundle 通道）

包在 `package.json` 里声明了 `dsh.bundle`，因此可以直接走 dsh 自己的插件安装命令（包名带 `@chtholly-fan/` scope，技能名本身仍是 `chtholly-notes-style`）：

```bash
dsh plugin --profile web add @chtholly-fan/chtholly-notes-style
```

dsh 会把包装进该 profile 的 `node_modules`，并登记到 `dsh.profile.bundles`；profile 下次启动时，包内的 `index.js` 会把 `skills/chtholly-notes-style` 植入 `$DSH_HOME/skills`（所有 profile 共享的用户级 skill 根），所以 **web 与 desktop 装一次即可共用**。

- 来源不限于 registry，GitHub 与本地 tarball 同样可以：
  `dsh plugin --profile web add ./chtholly-fan-chtholly-notes-style-1.0.0.tgz`
- desktop profile 由桌面应用独占管理：`dsh plugin --profile desktop add ...` 只在桌面版自带的 dsh 下放行，且应用运行时会撞上 profile 的文件锁，建议先完全退出应用，或改用应用内的插件市场安装。
- 生效时机：web 端要等下一次启动 profile；desktop 端的 `patchReload: live` 是否热加载尚未实测。
- 如果 `$DSH_HOME/skills/chtholly-notes-style` 已经存在、又不带本插件的版本戳（例如下面「仓库内安装」建立的目录链接），插件会跳过并在日志里说明，不会覆盖你现有的目录。

卸载分两步：dsh 侧移除依赖与 bundles 条目，植入的副本由脚本清理（只改名备份，不删除内容）：

```bash
dsh plugin --profile web remove @chtholly-fan/chtholly-notes-style
npx --yes @chtholly-fan/chtholly-notes-style uninstall --force
```

### Codex 官方脚本

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

卸载（只删除指向本仓库的链接，链向的内容不动）：

```powershell
node scripts/install-dsh-skill.mjs uninstall
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

## 发布为 npm 包

`package.json` 已经带好 `bin`（指向 `scripts/install-dsh-skill.mjs`）、`dsh.bundle`（指向 `cordis.patch.yml`）和 `files` 白名单（打包 `scripts/`、`skills/`、`index.js` 与 `cordis.patch.yml`）。`docs/` 是本地写作草稿，既被 `.gitignore` 忽略，也不在 `files` 里，不会进包。

`private` 字段已移除（发布前提），直接发布即可：

```bash
npm pack --dry-run        # 确认真实进包的文件
npm publish --access public
```

发布后的调用方式见上面的「用 npx 安装」。包体是快照：改动 `SKILL.md` 或 `references/` 之后要重新发布并升版本号，用户才能拿到新内容。

## 目录结构

```text
package.json                      # npm 包元数据：bin 指向安装脚本，dsh.bundle 指向 patch
cordis.patch.yml                  # dsh bundle 的 patch 层，插入本包的 host 插件行
index.js                          # 该插件：把随包技能植入 $DSH_HOME/skills
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

`SKILL.md` 提供主要工作流，`references/` 中的文件只在需要判断文章骨架或具体写作风格时读取。`scripts/install-dsh-skill.mjs` 负责 dsh 侧的安装、卸载与 frontmatter 自检，同时是 npm 包的 `bin` 入口。

## 使用范围

- 根据日志、源码、diff 和测试记录整理 C++ 调试过程。
- 改写性能优化、算法实现和排障笔记。
- 保持用户已有博客的标题、叙述、代码展示和收尾习惯。
- 对没有证据的根因、失败过程、性能数字和验证结果不进行补写。

## 写作约定

- 材料里出现优化，或修 bug 时引入了和常规做法不同的算法，成文前先用 `ask_user_question` 确认定位。默认按「介绍一种新的优化/算法方式」写；只有用户说明是针对项目中某个方法的优化记录时，才按「旧做法与瓶颈 → 新做法 → 边界 → 代价」写；分辨不出就先问。
- 算法和优化类文章用二级小标题分段，每个关键步骤写成「文字说明 + 对应代码」；短代码直接进正文，完整实现和长日志才用 `<details>` 折起。
- 有推导价值时补一段和常规做法的复杂度对比：总操作量、依赖深度、误差界和内存访问分开算，前提和适用规模写清楚。
- 算法和优化类文章在复杂度和误差之后、完整实现之前加一节适用场景，写清划算的规模、算子性质和不适用的边界。
- 单独成行的公式用 `$$ ... $$` 居中，正文里的数学量用 `$ ... $` 行内公式。
- 记录算法、数据结构或知识点这类科普性内容前，先用联网工具核对来源：优先论文原文、规范、官方文档和上游 changelog，整理性资料只用于交叉印证；复杂度与误差结论要自己独立推导一遍，找不到可靠来源或来源互相矛盾的内容按猜测语气写。
- 引用外部资料优先一手来源，正文用 `^[url]` 内联脚注，脚注只放 URL、闭合括号后留一个半角空格；不设末尾的参考文献节。
- 不写「这个实现后来单独放进了一个头文件，只做这一件事」这类只交代代码去向的过渡句。
- 要验证代码先探本机工具链，有编译器就在本机编，没有才用在线服务，内部代码不投；每次验证记四项（在哪编、编译器和版本、标准、结果），每个程序后面跟一行编译环境，没实跑过的代码不写成跑过。

## 校验

使用 skill-creator 提供的校验脚本检查 `SKILL.md`：

```bash
python quick_validate.py skills/chtholly-notes-style
```

dsh 侧的校验由安装脚本自己完成，不需要额外命令：`node scripts/install-dsh-skill.mjs` 会检查 `SKILL.md` 是否存在、`name` 是否为 kebab-case、`description` 是否为空，并提示 frontmatter 里是否混入了 Codex 白名单之外的键。
