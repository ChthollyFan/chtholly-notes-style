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
 *   node scripts/install-dsh-skill.mjs uninstall              # 卸载，只删指向本仓库的链接
 *
 * 作为 npm 包时 package.json 的 bin 指向本文件，所以下面这些写法等价：
 *   npx --yes github:ChthollyFan/chtholly-notes-style
 *   npm i -g chtholly-notes-style && chtholly-notes-style
 * npx 把包体放在临时缓存里，缓存回收后链接会悬挂，因此这种场景自动改成复制。
 */

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
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
  const options = { command: 'install', force: false, help: false, mode: 'auto', targetRoot: undefined }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === 'install' || arg === 'uninstall') {
      options.command = arg
    } else if (arg === '--copy') {
      options.mode = 'copy'
    } else if (arg === '--link') {
      options.mode = 'link'
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
  console.log(`用法：node scripts/install-dsh-skill.mjs [install|uninstall] [--copy|--link] [--force] [--target-dir <目录>]

  install              安装 skill，默认动作
  uninstall            卸载：只删除指向本仓库的链接
  --copy               复制一份独立副本，而不是建立目录链接
  --link               强制建立目录链接；在 npm 临时目录里运行时默认改成复制
  --force              目标已存在且不是本仓库的链接时，先重命名备份再安装/卸载
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
 * @brief 判断两个路径是否指向同一个目录
 * @param left 第一个路径
 * @param right 第二个路径
 * @return 指向同一目录返回 true
 * @note 用文件标识而不是路径文本比较：Windows 的 junction 既不被
 *       isSymbolicLink() 识别、也读不了 readlink，只能靠 statSync 跟随
 *       之后的 ino/dev 判断。inode 不可用（返回 0）时一律判为不同，
 *       宁可多问一次 --force，也不误删用户的真实目录
 */
function isSameDirectory(left, right) {
  try {
    const a = statSync(left, { bigint: true })
    const b = statSync(right, { bigint: true })
    return a.ino !== 0n && a.ino === b.ino && a.dev === b.dev
  } catch {
    return false
  }
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

/**
 * @brief 删除目录链接本身，不触碰链向的内容
 * @param target 链接路径
 * @note Windows 的 junction 只能用 rmdir 删（unlink 返回 EPERM），
 *       其他平台的目录符号链接相反，所以两个都试一遍
 */
function removeLink(target) {
  const attempts = process.platform === 'win32' ? [rmdirSync, unlinkSync] : [unlinkSync, rmdirSync]
  let lastError
  for (const attempt of attempts) {
    try {
      attempt(target)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/**
 * @brief 生成备份路径，保留原名并追加时间戳
 * @param target 待备份的路径
 * @return 备份路径
 */
function backupPath(target) {
  return `${target}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`
}

/**
 * @brief 判断本脚本是否运行在 npm 的临时安装目录里
 * @return 运行于 npx 缓存等临时位置时返回 true
 * @note npx 把包体放在 cache/_npx/<hash>/node_modules 下，缓存随时会被回收，
 *       此时建链接会留下指向空目录的悬挂链接，所以自动降级为复制
 */
function isEphemeralInstall() {
  return /[\\/]_npx[\\/]/.test(REPO_ROOT) || /[\\/]_cacache[\\/]/.test(REPO_ROOT)
}

/**
 * @brief 卸载已安装的 skill
 * @param target 已安装路径
 * @param force 目标不是本仓库链接时，是否重命名备份而不是直接报错
 * @return 卸载成功返回 true
 * @note 只删除指向本仓库源码目录的链接，链接指向别处或真实目录一律不动
 */
function uninstall(target, force) {
  const existing = describeTarget(target)
  if (existing === undefined) {
    console.log(`[跳过] ${target} 不存在，无需卸载`)
    return true
  }

  if (isSameDirectory(target, SOURCE_DIR)) {
    // 删除链接本身，不触碰链向的内容
    removeLink(target)
    console.log(`[删除] ${target}`)
    return true
  }

  if (!force) {
    console.error(`[错误] ${target} 不是指向本仓库的链接（类型：${existing.kind}），未做任何修改`)
    console.error('       确认要移除副本后加 --force；脚本只会重命名备份，不会删除内容')
    return false
  }

  const backup = backupPath(target)
  renameSync(target, backup)
  console.log(`[备份] 原内容已重命名为 ${backup}`)
  return true
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

  if (options.command === 'uninstall') {
    if (!uninstall(target, options.force)) process.exitCode = 1
    return
  }

  const existing = describeTarget(target)

  if (existing !== undefined) {
    // 已经指向本仓库时直接视为已安装，避免重复操作
    if (isSameDirectory(target, SOURCE_DIR)) {
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
    const backup = backupPath(target)
    renameSync(target, backup)
    console.log(`[备份] 原内容已重命名为 ${backup}`)
  }

  mkdirSync(skillRoot, { recursive: true })
  const useCopy = options.mode === 'copy' || (options.mode === 'auto' && isEphemeralInstall())
  if (useCopy) {
    cpSync(SOURCE_DIR, target, { recursive: true })
    const reason = options.mode === 'auto' ? '（npm 临时目录里的包体随时会被回收，改用复制）' : ''
    console.log(`[复制] ${relative(REPO_ROOT, SOURCE_DIR)} -> ${target}${reason}`)
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
