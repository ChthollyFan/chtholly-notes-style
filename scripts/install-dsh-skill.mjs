#!/usr/bin/env node
/**
 * @brief 把 chtholly-notes-style skill 安装到 dsh 的用户级 skill 根目录
 *
 * dsh 的本地文件系统提供方按 `<root>/<name>/SKILL.md` 发现 skill，用户级根目录是
 * `$DSH_HOME/skills`（默认 `~/.dsh/skills`），且只扫描一层，不递归子目录。
 * 本脚本把目标根目录下的 `chtholly-notes-style` 建成指向本仓库
 * `skills/chtholly-notes-style` 的目录链接，这样 `git pull` 之后 dsh 立即看到新内容。
 *
 * Windows 下使用 junction 而不是符号链接：junction 由普通权限即可创建，
 * 而 Git Bash 的 `ln -s` 在没有开启开发者模式时会退化成复制。
 *
 * 用法：
 *   node scripts/install-dsh-skill.mjs                        # 在默认根下建链接
 *   node scripts/install-dsh-skill.mjs --copy                 # 复制副本而不是链接
 *   node scripts/install-dsh-skill.mjs --force                # 已有同名条目时先重命名备份
 *   node scripts/install-dsh-skill.mjs --target-dir <目录>    # 指定 skill 根目录
 */

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  symlinkSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

/** 目录名与 frontmatter 中的 name 必须一致，dsh 用它作为 skill 标识 */
const SKILL_NAME = 'chtholly-notes-style'

/** dsh 要求 kebab-case，对应 dsh-skill 中的 SKILL_NAME 正则 */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** codex 只接受这些 frontmatter 键，出现其他键会让 codex 拒绝整个 skill */
const CODEX_ALLOWED_KEYS = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata'])

/** 仓库根目录，即本脚本所在目录的上一级 */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 本仓库中 skill bundle 的源目录 */
const SOURCE_DIR = join(REPO_ROOT, 'skills', SKILL_NAME)

/**
 * @brief 解析命令行参数
 * @param argv 去掉 node 与脚本路径后的参数列表
 * @return 解析出的选项对象
 * @throw Error 出现未知参数时抛出
 */
function parseArgs(argv) {
  const options = { copy: false, force: false, help: false, targetRoot: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--copy') {
      options.copy = true
    } else if (arg === '--force') {
      options.force = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--target-dir') {
      // 下一个参数是 skill 根目录，例如 ~/.dsh/skills
      options.targetRoot = argv[index + 1]
      index += 1
    } else {
      throw new Error(`未知参数：${arg}`)
    }
  }
  return options
}

/** 打印用法说明 */
function printUsage() {
  console.log(`用法：node scripts/install-dsh-skill.mjs [--copy] [--force] [--target-dir <目录>]

  --copy               复制一份独立副本，而不是建立目录链接
  --force              目标已存在且不是本仓库的链接时，先重命名备份再安装
  --target-dir <目录>  指定 skill 根目录，默认 $DSH_HOME/skills 或 ~/.dsh/skills`)
}

/**
 * @brief 计算 dsh 用户级 skill 根目录
 * @param explicit 命令行显式指定的根目录，可为空
 * @return skill 根目录的绝对路径
 * @note 未显式指定时优先读 $DSH_HOME，其次回退到 ~/.dsh
 */
function resolveSkillRoot(explicit) {
  if (explicit !== undefined && explicit !== '') return resolve(explicit)
  const dshHome = process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== ''
    ? process.env.DSH_HOME
    : join(homedir(), '.dsh')
  return join(resolve(dshHome), 'skills')
}

/**
 * @brief 读取 SKILL.md 的 frontmatter，只取顶层键
 * @param skillFile SKILL.md 的绝对路径
 * @return 顶层键值组成的 Map
 * @throw Error frontmatter 缺失或格式不完整时抛出
 * @note 这里刻意只做轻量解析，不引入 YAML 依赖；缩进的嵌套键会被跳过
 */
function readFrontmatterFields(skillFile) {
  const text = readFileSync(skillFile, 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (match === null) throw new Error(`${skillFile} 缺少 YAML frontmatter`)

  const fields = new Map()
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (entry !== null) fields.set(entry[1], entry[2].trim().replace(/^["']|["']$/g, ''))
  }
  return fields
}

/**
 * @brief 校验 skill 是否满足 dsh 与 codex 的双端约束
 * @param skillDir skill bundle 目录
 * @return 包含 problems（阻塞问题）与 foreignKeys（codex 不认识的键）的对象
 * @throw Error SKILL.md 不存在时抛出
 */
function verifySkill(skillDir) {
  const skillFile = join(skillDir, 'SKILL.md')
  if (!existsSync(skillFile)) throw new Error(`${skillFile} 不存在，skill bundle 不完整`)

  const fields = readFrontmatterFields(skillFile)
  const name = fields.get('name')
  const description = fields.get('description')
  const problems = []

  if (name !== SKILL_NAME) problems.push(`frontmatter 的 name 应为 "${SKILL_NAME}"，实际为 "${name ?? ''}"`)
  if (name === undefined || !SKILL_NAME_PATTERN.test(name)) problems.push('name 不符合 dsh 要求的 kebab-case')
  if (description === undefined || description === '') problems.push('description 为空，dsh 会忽略该 skill')

  const foreignKeys = [...fields.keys()].filter((key) => !CODEX_ALLOWED_KEYS.has(key))
  return { problems, foreignKeys }
}

/**
 * @brief 描述目标路径的现状
 * @param target 目标路径
 * @return 已存在时返回 { kind, dest }，不存在或无法读取时返回 undefined
 */
function describeTarget(target) {
  try {
    const stats = lstatSync(target)
    if (stats.isSymbolicLink()) return { kind: 'link', dest: readlinkSync(target) }
    return { kind: stats.isDirectory() ? 'dir' : 'file' }
  } catch {
    return undefined
  }
}

/**
 * @brief 判断两个路径是否指向同一位置
 * @param left 第一个路径
 * @param right 第二个路径
 * @return 指向同一位置返回 true
 * @note Windows 路径大小写不敏感，这里统一转小写后再比较
 */
function isSamePath(left, right) {
  const normalize = (value) => {
    const resolved = resolve(value).replace(/\\/g, '/')
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  return normalize(left) === normalize(right)
}

/**
 * @brief 在目标位置建立指向源目录的链接
 * @param target 链接路径
 * @param source 源目录
 * @note Windows 使用 junction，普通权限即可创建且不需要开发者模式
 */
function createLink(target, source) {
  const linkType = process.platform === 'win32' ? 'junction' : 'dir'
  symlinkSync(source, target, linkType)
}

/** 主流程：校验源、处理已有目标、安装并打印结果 */
function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printUsage()
    return
  }

  const { problems, foreignKeys } = verifySkill(SOURCE_DIR)
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[错误] ${problem}`)
    process.exitCode = 1
    return
  }
  for (const key of foreignKeys) {
    console.warn(`[警告] frontmatter 存在 codex 白名单外的键 "${key}"，这会让 codex 拒绝该 skill`)
  }

  const skillRoot = resolveSkillRoot(options.targetRoot)
  const target = join(skillRoot, SKILL_NAME)
  const existing = describeTarget(target)

  if (existing !== undefined) {
    // 已经指向本仓库时直接视为已安装，避免重复操作
    if (existing.kind === 'link' && isSamePath(existing.dest, SOURCE_DIR)) {
      console.log(`[跳过] ${target} 已指向本仓库，无需重新安装`)
      return
    }
    if (!options.force) {
      console.error(`[错误] ${target} 已存在（类型：${existing.kind}），未做任何修改`)
      console.error('       确认可以覆盖后加 --force；脚本只会重命名备份，不会删除原内容')
      process.exitCode = 1
      return
    }
    // 按文件安全约定先重命名备份，不直接删除用户目录
    const backup = `${target}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`
    renameSync(target, backup)
    console.log(`[备份] 原内容已重命名为 ${backup}`)
  }

  mkdirSync(skillRoot, { recursive: true })
  if (options.copy) {
    cpSync(SOURCE_DIR, target, { recursive: true })
    console.log(`[复制] ${relative(REPO_ROOT, SOURCE_DIR)} -> ${target}`)
  } else {
    createLink(target, SOURCE_DIR)
    console.log(`[链接] ${target} -> ${SOURCE_DIR}`)
  }

  console.log(`
安装完成，skill 根目录：${skillRoot}
  - dsh Desktop / Web：输入框中打 “/”，选择 ${SKILL_NAME}
  - 模型侧：由持久 skill 目录或 skill_search / skill_load 自动加载
  - 生效时机：新开一个会话（dsh 在会话开始和目录变化时刷新 skill 目录）`)
}

try {
  main()
} catch (error) {
  console.error(`[错误] ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
