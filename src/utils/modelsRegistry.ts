type RegistryModel = {
  id: string
  name: string
}

type RegistryProvider = {
  id: string
  name: string
  api: string
  models: Record<string, RegistryModel>
}

type RegistryData = Record<string, RegistryProvider>

let cachedRegistry: RegistryData | null = null
let cachedAt = 0
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const REGISTRY_URL = 'https://models.dev/api.json'

async function fetchRegistry(): Promise<RegistryData | null> {
  if (cachedRegistry && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRegistry
  }
  try {
    const resp = await fetch(REGISTRY_URL, {
      signal: AbortSignal.timeout(15000),
    })
    if (!resp.ok) return cachedRegistry
    const data = (await resp.json()) as RegistryData
    cachedRegistry = data
    cachedAt = Date.now()
    return data
  } catch {
    return cachedRegistry
  }
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').toLowerCase()
}

function extractHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

function matchProvider(registry: RegistryData, baseUrl: string): RegistryProvider | null {
  const normalizedBase = normalizeUrl(baseUrl)
  const baseHost = extractHost(baseUrl)

  for (const provider of Object.values(registry)) {
    if (!provider.api || !provider.models) continue

    const providerHost = extractHost(provider.api)
    if (providerHost === baseHost) {
      return provider
    }

    if (normalizeUrl(provider.api).startsWith(normalizedBase) ||
        normalizedBase.startsWith(normalizeUrl(provider.api))) {
      return provider
    }
  }

  return null
}

export async function findModelsForProvider(baseUrl: string): Promise<string[]> {
  const registry = await fetchRegistry()
  if (!registry) return []
  const provider = matchProvider(registry, baseUrl)
  return provider ? Object.keys(provider.models) : []
}

export async function findProviderForUrl(baseUrl: string): Promise<{ name: string; models: string[] } | null> {
  const registry = await fetchRegistry()
  if (!registry) return null
  const provider = matchProvider(registry, baseUrl)
  if (!provider) return null
  return {
    name: provider.name.replace(/\s*\(.*\)\s*$/, ''),
    models: Object.keys(provider.models),
  }
}
