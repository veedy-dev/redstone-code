import React, { useState } from 'react'
import { Box, Text } from '../ink.js'
import TextInput from './TextInput.js'
import { Spinner } from './Spinner.js'
import {
  generateProfileId,
  discoverModels,
  saveProviderProfile,
  applyProviderProfile,
  updateProfileLastUsed,
} from '../utils/providerProfiles.js'
import type { ProviderProfile } from '../utils/config.js'

type SetupStep = 'name' | 'url' | 'key' | 'models_manual' | 'discovering' | 'done'

type Props = {
  onDone: (profile: ProviderProfile | null) => void
}

export function ProviderSetupForm({ onDone }: Props): React.ReactNode {
  const [step, setStep] = useState<SetupStep>('name')
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [models, setModels] = useState('')
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cursorOffset, setCursorOffset] = useState(0)

  const handleNameSubmit = (value: string) => {
    if (!value.trim()) return
    setName(value.trim())
    setCursorOffset(0)
    setStep('url')
  }

  const handleUrlSubmit = (value: string) => {
    if (!value.trim()) return
    try {
      new URL(value.trim())
    } catch {
      setError('Invalid URL format')
      return
    }
    setError(null)
    setBaseUrl(value.trim().replace(/\/$/, ''))
    setCursorOffset(0)
    setStep('key')
  }

  const handleKeySubmit = async (value: string) => {
    if (!value.trim()) return
    setApiKey(value.trim())
    setCursorOffset(0)
    setStep('discovering')

    const found = await discoverModels(baseUrl, value.trim())
    if (found.length > 0) {
      setDiscoveredModels(found)
      finishSetup(found, value.trim())
    } else {
      setStep('models_manual')
    }
  }

  const handleModelsSubmit = (value: string) => {
    if (!value.trim()) return
    const modelList = value.split(',').map(m => m.trim()).filter(Boolean)
    if (modelList.length === 0) return
    finishSetup(modelList, apiKey)
  }

  const finishSetup = (modelList: string[], key: string) => {
    const profile: ProviderProfile = {
      id: generateProfileId(),
      name,
      type: 'anthropic-compatible',
      baseUrl,
      apiKey: key,
      models: modelList,
      cachedModels: discoveredModels.length > 0 ? discoveredModels : undefined,
      cachedModelsAt: discoveredModels.length > 0 ? Date.now() : undefined,
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
    case 'name':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up custom Anthropic-compatible provider</Text>
          <Box>
            <Text>Provider name: </Text>
            <TextInput
              value={name}
              onChange={setName}
              onSubmit={handleNameSubmit}
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
            />
          </Box>
        </Box>
      )

    case 'url':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up {name}</Text>
          {error && <Text color="red">{error}</Text>}
          <Box>
            <Text>Base URL: </Text>
            <TextInput
              value={baseUrl}
              onChange={setBaseUrl}
              onSubmit={handleUrlSubmit}
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
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
              mask="*"
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
            />
          </Box>
        </Box>
      )

    case 'discovering':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up {name}</Text>
          <Box>
            <Spinner />
            <Text>Discovering models...</Text>
          </Box>
        </Box>
      )

    case 'models_manual':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up {name}</Text>
          <Text dimColor>Could not auto-discover models from the API.</Text>
          <Box>
            <Text>Enter model names (comma-separated): </Text>
            <TextInput
              value={models}
              onChange={setModels}
              onSubmit={handleModelsSubmit}
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
            />
          </Box>
        </Box>
      )

    case 'done':
      return (
        <Box flexDirection="column" gap={1}>
          <Text color="green">Provider "{name}" saved and activated.</Text>
        </Box>
      )
  }
}
