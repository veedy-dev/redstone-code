/**
 * XDG Base Directory utilities for Claude CLI Native Installer
 *
 * Implements the XDG Base Directory specification for organizing
 * native installer components across appropriate system directories.
 *
 * @see https://specifications.freedesktop.org/basedir-spec/latest/
 */

import { homedir as osHomedir } from 'os'
import { join } from 'path'

type EnvLike = Record<string, string | undefined>

type XDGOptions = {
  env?: EnvLike
  homedir?: string
}

function resolveOptions(options?: XDGOptions): { env: EnvLike; home: string } {
  return {
    env: options?.env ?? process.env,
    home: options?.homedir ?? process.env.HOME ?? osHomedir(),
  }
}

function isWindows(): boolean {
  return process.platform === 'win32'
}

function getLocalAppData(env: EnvLike, home: string): string {
  return env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
}

/**
 * Get XDG state home directory
 * Default: ~/.local/state (Unix), %LOCALAPPDATA% (Windows)
 * @param options Optional env and homedir overrides for testing
 */
export function getXDGStateHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  if (env.XDG_STATE_HOME) return env.XDG_STATE_HOME
  if (isWindows()) return getLocalAppData(env, home)
  return join(home, '.local', 'state')
}

/**
 * Get XDG cache home directory
 * Default: ~/.cache (Unix), %LOCALAPPDATA%\cache (Windows)
 * @param options Optional env and homedir overrides for testing
 */
export function getXDGCacheHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  if (env.XDG_CACHE_HOME) return env.XDG_CACHE_HOME
  if (isWindows()) return join(getLocalAppData(env, home), 'cache')
  return join(home, '.cache')
}

/**
 * Get XDG data home directory
 * Default: ~/.local/share (Unix), %LOCALAPPDATA% (Windows)
 * @param options Optional env and homedir overrides for testing
 */
export function getXDGDataHome(options?: XDGOptions): string {
  const { env, home } = resolveOptions(options)
  if (env.XDG_DATA_HOME) return env.XDG_DATA_HOME
  if (isWindows()) return getLocalAppData(env, home)
  return join(home, '.local', 'share')
}

/**
 * Get user bin directory (not technically XDG but follows the convention)
 * Default: ~/.local/bin
 * @param options Optional homedir override for testing
 */
export function getUserBinDir(options?: XDGOptions): string {
  const { home } = resolveOptions(options)
  return join(home, '.local', 'bin')
}
