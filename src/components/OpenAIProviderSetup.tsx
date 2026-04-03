import React, { useState } from 'react'
import { Box, Text, useInput } from '../ink.js'
import TextInput from './TextInput.js'
import { Spinner } from './Spinner.js'
import {
  generateProfileId,
  saveProviderProfile,
  applyProviderProfile,
  updateProfileLastUsed,
} from '../utils/providerProfiles.js'
import { findProviderForUrl } from '../utils/modelsRegistry.js'
import type { ProviderProfile } from '../utils/config.js'

type SetupStep = 'url' | 'looking_up' | 'name' | 'key' | 'models_manual' | 'done'

type Props = {
  onDone: (profile: ProviderProfile | null) => void
}

export function OpenAIProviderSetup({ onDone }: Props): React.ReactNode {
  const [step, setStep] = useState<SetupStep>('url')
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState('')
  const [detectedModels, setDetectedModels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cursorOffset, setCursorOffset] = useState(0)

  useInput((_input, key) => {
    if (!key.escape) return
    if (step === 'models_manual') { setStep('key') }
    else if (step === 'key') { setStep('name') }
    else if (step === 'name') { setStep('url') }
    else if (step === 'url') { onDone(null) }
  }, { isActive: step !== 'looking_up' && step !== 'done' })

  const handleUrlSubmit = async (value: string) => {
    if (!value.trim()) return
    try {
      new URL(value.trim())
    } catch {
      setError('Invalid URL format')
      return
    }
    setError(null)
    const url = value.trim().replace(/\/$/, '')
    setBaseUrl(url)
    setCursorOffset(0)
    setStep('looking_up')

    const result = await findProviderForUrl(url)
    if (result) {
      setName(result.name)
      setDetectedModels(result.models)
    }
    setStep('name')
  }

  const handleNameSubmit = (value: string) => {
    if (!value.trim()) return
    setName(value.trim())
    setCursorOffset(0)
    setStep('key')
  }

  const handleKeySubmit = (value: string) => {
    if (!value.trim()) return
    const key = value.trim()
    setApiKey(key)
    setCursorOffset(0)

    if (detectedModels.length > 0) {
      finishSetup(detectedModels, key, detectedModels)
    } else {
      setStep('models_manual')
    }
  }

  const handleModelsSubmit = (value: string) => {
    if (!value.trim()) return
    const modelList = value.split(',').map(m => m.trim()).filter(Boolean)
    if (modelList.length === 0) return
    finishSetup(modelList, apiKey, [])
  }

  const finishSetup = (modelList: string[], key: string, discovered: string[]) => {
    const profile: ProviderProfile = {
      id: generateProfileId(),
      name,
      type: 'openai-compatible',
      baseUrl,
      apiKey: key,
      models: modelList,
      cachedModels: discovered.length > 0 ? discovered : undefined,
      cachedModelsAt: discovered.length > 0 ? Date.now() : undefined,
      defaultModel: modelList[0],
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    }
    saveProviderProfile(profile)
    applyProviderProfile(profile)
    updateProfileLastUsed(profile.id)
    setStep('done')
    onDone(profile)
  }

  switch (step) {
    case 'url':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up OpenAI-compatible provider</Text>
          {error && <Text color="error">{error}</Text>}
          <Box>
            <Text>Base URL: </Text>
            <TextInput
              value={baseUrl}
              onChange={setBaseUrl}
              onSubmit={handleUrlSubmit}
              placeholder="https://openrouter.ai/api/v1"
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
              showCursor
            />
          </Box>
        </Box>
      )

    case 'looking_up':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up OpenAI-compatible provider</Text>
          <Text dimColor>Base URL: {baseUrl}</Text>
          <Box>
            <Spinner />
            <Text> Looking up provider...</Text>
          </Box>
        </Box>
      )

    case 'name':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up OpenAI-compatible provider</Text>
          <Text dimColor>Base URL: {baseUrl}</Text>
          {detectedModels.length > 0 && (
            <Text color="success">Found {detectedModels.length} model{detectedModels.length !== 1 ? 's' : ''} from models.dev registry</Text>
          )}
          <Box>
            <Text>Provider name: </Text>
            <TextInput
              value={name}
              onChange={setName}
              onSubmit={handleNameSubmit}
              placeholder="e.g., OpenRouter, Together, Groq"
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
              showCursor
            />
          </Box>
        </Box>
      )

    case 'key':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up {name}</Text>
          <Text dimColor>Base URL: {baseUrl}</Text>
          <Box>
            <Text>API Key: </Text>
            <TextInput
              value={apiKey}
              onChange={setApiKey}
              onSubmit={handleKeySubmit}
              placeholder="sk-..."
              mask="*"
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
              showCursor
            />
          </Box>
        </Box>
      )

    case 'models_manual':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up {name}</Text>
          <Text dimColor>No models found in the registry for this provider.</Text>
          <Box>
            <Text>Enter model names (comma-separated): </Text>
            <TextInput
              value={models}
              onChange={setModels}
              onSubmit={handleModelsSubmit}
              placeholder="gpt-4o, gpt-4o-mini"
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
              showCursor
            />
          </Box>
        </Box>
      )

    case 'done':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="success">Provider "{name}" saved and activated.</Text>
        </Box>
      )
  }
}
