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
```

`SKILL.md` 提供主要工作流，`references/` 中的文件只在需要判断文章骨架或具体写作风格时读取。

## 使用范围

- 根据日志、源码、diff 和测试记录整理 C++ 调试过程。
- 改写性能优化、算法实现和排障笔记。
- 保持用户已有博客的标题、叙述、代码展示和收尾习惯。
- 对没有证据的根因、失败过程、性能数字和验证结果不进行补写。

## 校验

使用 skill-creator 提供的校验脚本检查 `SKILL.md`：

```bash
python quick_validate.py skills/chtholly-notes-style
```
