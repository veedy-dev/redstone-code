type LocalProviderInfo = {
  name: string
  type: 'ollama' | 'lmstudio'
  baseUrl: string
  models: string[]
}

export async function detectOllama(): Promise<LocalProviderInfo | null> {
  try {
    const resp = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as { models?: Array<{ name: string }> }
    if (!data.models || !Array.isArray(data.models)) return null
    return {
      name: 'Ollama',
      type: 'ollama',
      baseUrl: 'http://localhost:11434/v1',
      models: data.models.map(m => m.name),
    }
  } catch {
    return null
  }
}

export async function detectLMStudio(): Promise<LocalProviderInfo | null> {
  try {
    const resp = await fetch('http://localhost:1234/v1/models', {
      signal: AbortSignal.timeout(2000),
    })
    if (!resp.ok) return null
    const data = (await resp.json()) as { data?: Array<{ id: string }> }
    if (!data.data || !Array.isArray(data.data)) return null
    return {
      name: 'LM Studio',
      type: 'lmstudio',
      baseUrl: 'http://localhost:1234/v1',
      models: data.data.map(m => m.id),
    }
  } catch {
    return null
  }
}

export async function detectLocalProviders(): Promise<LocalProviderInfo[]> {
  const [ollama, lmstudio] = await Promise.all([detectOllama(), detectLMStudio()])
  const results: LocalProviderInfo[] = []
  if (ollama) results.push(ollama)
  if (lmstudio) results.push(lmstudio)
  return results
}
