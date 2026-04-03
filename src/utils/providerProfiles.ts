import { randomBytes } from 'crypto'
import type { ProviderProfile } from './config.js'
import { getGlobalConfig, saveGlobalConfig } from './config.js'
import { setMainLoopModelOverride } from '../bootstrap/state.js'

let envStash: Record<string, string | undefined> | null = null

const STASH_KEYS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_MODEL',
] as const

export function generateProfileId(): string {
  return randomBytes(8).toString('hex')
}

export function getProviderProfiles(): ProviderProfile[] {
  return getGlobalConfig().providerProfiles ?? []
}

export function getActiveProviderProfileId(): string | null {
  return getGlobalConfig().activeProviderProfileId ?? null
}

export function getActiveProviderProfile(): ProviderProfile | null {
  const id = getActiveProviderProfileId()
  if (!id) return null
  return getProviderProfiles().find(p => p.id === id) ?? null
}

export function isCustomProviderActive(): boolean {
  return getActiveProviderProfileId() !== null
}

export function saveProviderProfile(profile: ProviderProfile): void {
  saveGlobalConfig(config => {
    const profiles = [...(config.providerProfiles ?? [])]
    const idx = profiles.findIndex(p => p.id === profile.id)
    if (idx >= 0) {
      profiles[idx] = profile
    } else {
      profiles.push(profile)
    }
    return { ...config, providerProfiles: profiles }
  })
}

export function removeProviderProfile(id: string): void {
  const wasActive = getActiveProviderProfileId() === id
  saveGlobalConfig(config => {
    const profiles = (config.providerProfiles ?? []).filter(p => p.id !== id)
    const updates: Partial<typeof config> = { providerProfiles: profiles }
    if (config.activeProviderProfileId === id) {
      updates.activeProviderProfileId = null
    }
    return { ...config, ...updates }
  })
  if (wasActive) {
    restoreStashedEnv()
    setMainLoopModelOverride(undefined)
  }
}

export function stashCurrentEnv(): void {
  if (envStash) return
  envStash = {}
  for (const key of STASH_KEYS) {
    envStash[key] = process.env[key]
  }
}

export function restoreStashedEnv(): void {
  if (!envStash) return
  for (const key of STASH_KEYS) {
    const val = envStash[key]
    if (val === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = val
    }
  }
  envStash = null
}

export function applyProviderProfile(profile: ProviderProfile): void {
  stashCurrentEnv()
  process.env.ANTHROPIC_BASE_URL = profile.baseUrl
  process.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey
  delete process.env.ANTHROPIC_API_KEY
  if (profile.defaultModel) {
    process.env.ANTHROPIC_MODEL = profile.defaultModel
  }
  saveGlobalConfig(config => ({
    ...config,
    activeProviderProfileId: profile.id,
  }))
  void refreshCachedModelsIfStale(profile)
}

export function deactivateProviderProfile(): void {
  restoreStashedEnv()
  saveGlobalConfig(config => ({
    ...config,
    activeProviderProfileId: null,
  }))
}

export async function discoverModels(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  const endpoints = [`${baseUrl}/v1/models`, `${baseUrl}/models`]
  for (const url of endpoints) {
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!resp.ok) continue
      const json = (await resp.json()) as { data?: Array<{ id: string }> }
      if (json.data && Array.isArray(json.data)) {
        return json.data.map(m => m.id)
      }
    } catch {
      continue
    }
  }
  return []
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export async function refreshCachedModelsIfStale(profile: ProviderProfile): Promise<void> {
  const isStale = !profile.cachedModelsAt || (Date.now() - profile.cachedModelsAt > CACHE_TTL_MS)
  if (!isStale) return

  const found = await discoverModels(profile.baseUrl, profile.apiKey)
  if (found.length > 0) {
    saveProviderProfile({
      ...profile,
      cachedModels: found,
      cachedModelsAt: Date.now(),
    })
  }
}

export function updateProfileLastUsed(id: string): void {
  saveGlobalConfig(config => {
    const profiles = [...(config.providerProfiles ?? [])]
    const idx = profiles.findIndex(p => p.id === id)
    if (idx >= 0) {
      profiles[idx] = { ...profiles[idx], lastUsedAt: Date.now() }
    }
    return { ...config, providerProfiles: profiles }
  })
}

export function initActiveProviderProfile(): void {
  const profile = getActiveProviderProfile()
  if (profile) {
    stashCurrentEnv()
    process.env.ANTHROPIC_BASE_URL = profile.baseUrl
    process.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey
    delete process.env.ANTHROPIC_API_KEY
    if (profile.defaultModel) {
      process.env.ANTHROPIC_MODEL = profile.defaultModel
    }
  }
}

export function addModelToProfile(profileId: string, model: string): ProviderProfile | null {
  const profiles = getProviderProfiles()
  const profile = profiles.find(p => p.id === profileId)
  if (!profile || profile.models.includes(model)) return null
  const updated = { ...profile, models: [...profile.models, model] }
  saveProviderProfile(updated)
  return updated
}

export function removeModelFromProfile(profileId: string, model: string): ProviderProfile | null {
  const profiles = getProviderProfiles()
  const profile = profiles.find(p => p.id === profileId)
  if (!profile || profile.models.length <= 1) return null
  const newModels = profile.models.filter(m => m !== model)
  const updated = {
    ...profile,
    models: newModels,
    defaultModel: profile.defaultModel === model ? newModels[0] : profile.defaultModel,
  }
  saveProviderProfile(updated)
  return updated
}

export function setDefaultModelForProfile(profileId: string, model: string): ProviderProfile | null {
  const profiles = getProviderProfiles()
  const profile = profiles.find(p => p.id === profileId)
  if (!profile || !profile.models.includes(model)) return null
  const updated = { ...profile, defaultModel: model }
  saveProviderProfile(updated)
  return updated
}
