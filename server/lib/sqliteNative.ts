import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Options } from 'better-sqlite3'

function sqliteAddonFileName(): string {
  return `${process.platform}-${process.arch}.node`
}

function existing(paths: Array<string | undefined>): string | undefined {
  return paths.find((path) => path && existsSync(path))
}

function envAddonPath(): string | undefined {
  const override = process.env.GOALTRACKER_SQLITE_ADDON
  if (override) {
    return override
  }
  const appRoot = process.env.GOALTRACKER_APP_ROOT
  if (!appRoot) {
    return undefined
  }
  const fileName = sqliteAddonFileName()
  return existing([
    join(appRoot, `better-sqlite3-${fileName}`),
    join(appRoot, 'binaries', `better-sqlite3-${fileName}`),
    join(appRoot, 'resources', `better-sqlite3-${fileName}`),
  ])
}

function sidecarAddonPath(): string | undefined {
  const fileName = sqliteAddonFileName()
  const exeDir = dirname(process.execPath)
  return existing([
    join(exeDir, `better-sqlite3-${fileName}`),
    join(exeDir, fileName),
  ])
}

function nodeModulesAddonPath(): string | undefined {
  const fileName = sqliteAddonFileName()
  try {
    const require = createRequire(join(process.cwd(), 'package.json'))
    const packageDir = dirname(require.resolve('better-sqlite3/package.json'))
    return join(packageDir, 'prebuilds', fileName)
  } catch {
    return join(process.cwd(), 'node_modules', 'better-sqlite3', 'prebuilds', fileName)
  }
}

export function resolveSqliteNativeBinding(): string {
  const found = existing([envAddonPath(), sidecarAddonPath(), nodeModulesAddonPath()])
  if (!found) {
    throw new Error(
      `SQLite native addon missing (${sqliteAddonFileName()}). Run npm rebuild better-sqlite3 and try again.`,
    )
  }
  return found
}

function loadSqliteAddon(): object {
  const bindingPath = resolveSqliteNativeBinding()
  const addon: { exports: object } = { exports: {} }
  process.dlopen(addon as NodeJS.Module, bindingPath)
  return addon.exports
}

export function sqliteNativeOptions(options: Options = {}): Options {
  return {
    ...options,
    nativeBinding: loadSqliteAddon() as unknown as string,
  }
}
