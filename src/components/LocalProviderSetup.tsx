import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from '../ink.js'
import { Select } from './CustomSelect/select.js'
import TextInput from './TextInput.js'
import { Spinner } from './Spinner.js'
import {
  generateProfileId,
  saveProviderProfile,
  applyProviderProfile,
  updateProfileLastUsed,
} from '../utils/providerProfiles.js'
import { detectLocalProviders } from '../utils/localProviders.js'
import type { ProviderProfile } from '../utils/config.js'

type SetupStep = 'detecting' | 'select_provider' | 'select_model' | 'manual_url' | 'manual_model' | 'done'

type DetectedProvider = {
  name: string
  baseUrl: string
  models: string[]
}

type Props = {
  onDone: (profile: ProviderProfile | null) => void
}

export function LocalProviderSetup({ onDone }: Props): React.ReactNode {
  const [step, setStep] = useState<SetupStep>('detecting')
  const [providers, setProviders] = useState<DetectedProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<DetectedProvider | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [manualModel, setManualModel] = useState('')
  const [cursorOffset, setCursorOffset] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useInput((_input, key) => {
    if (!key.escape) return
    if (step === 'manual_model') {
      setManualModel('')
      setCursorOffset(0)
      setStep('manual_url')
    } else if (step === 'manual_url' || step === 'select_provider' || step === 'select_model') {
      onDone(null)
    }
  }, { isActive: step !== 'detecting' && step !== 'done' })

  useEffect(() => {
    void detectLocalProviders().then(found => {
      if (found.length > 0) {
        setProviders(found)
        if (found.length === 1) {
          setSelectedProvider(found[0])
          setStep('select_model')
        } else {
          setStep('select_provider')
        }
      } else {
        setStep('manual_url')
      }
    })
  }, [])

  const finishSetup = (name: string, baseUrl: string, models: string[], defaultModel: string) => {
    const profile: ProviderProfile = {
      id: generateProfileId(),
      name,
      type: 'openai-compatible',
      baseUrl,
      apiKey: '',
      models,
      defaultModel,
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
    case 'detecting':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up local provider</Text>
          <Box>
            <Spinner />
            <Text> Detecting local providers...</Text>
          </Box>
        </Box>
      )

    case 'select_provider': {
      const options = providers.map(p => ({
        label: <Text>{p.name} · <Text dimColor>{p.models.length} model{p.models.length !== 1 ? 's' : ''} found</Text>{'\n'}</Text>,
        value: p.baseUrl,
      }))
      options.push({
        label: <Text dimColor>Enter URL manually{'\n'}</Text>,
        value: '__manual__',
      })
      options.push({
        label: <Text dimColor>← Back{'\n'}</Text>,
        value: '__back__',
      })

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up local provider</Text>
          <Text>Found {providers.length} local provider{providers.length !== 1 ? 's' : ''}:</Text>
          <Box>
            <Select
              options={options}
              onChange={(value: string) => {
                if (value === '__back__') { onDone(null); return }
                if (value === '__manual__') { setStep('manual_url'); return }
                const p = providers.find(pr => pr.baseUrl === value)
                if (p) {
                  setSelectedProvider(p)
                  setStep('select_model')
                }
              }}
              onCancel={() => onDone(null)}
            />
          </Box>
        </Box>
      )
    }

    case 'select_model': {
      if (!selectedProvider) return null
      const options = selectedProvider.models.map(m => ({
        label: <Text>{m}{'\n'}</Text>,
        value: m,
      }))
      options.push({
        label: <Text dimColor>← Back{'\n'}</Text>,
        value: '__back__',
      })

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up {selectedProvider.name}</Text>
          <Text dimColor>Endpoint: {selectedProvider.baseUrl}</Text>
          <Text>Select a model:</Text>
          <Box>
            <Select
              options={options}
              onChange={(value: string) => {
                if (value === '__back__') {
                  if (providers.length > 1) { setStep('select_provider') }
                  else { onDone(null) }
                  return
                }
                finishSetup(selectedProvider.name, selectedProvider.baseUrl, selectedProvider.models, value)
              }}
              onCancel={() => onDone(null)}
            />
          </Box>
        </Box>
      )
    }

    case 'manual_url':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up local provider</Text>
          <Text dimColor>No local providers detected automatically.</Text>
          {error && <Text color="error">{error}</Text>}
          <Box>
            <Text>Base URL: </Text>
            <TextInput
              value={manualUrl}
              onChange={setManualUrl}
              onSubmit={(value: string) => {
                if (!value.trim()) return
                try {
                  new URL(value.trim())
                } catch {
                  setError('Invalid URL format')
                  return
                }
                setError(null)
                setManualUrl(value.trim().replace(/\/$/, ''))
                setCursorOffset(0)
                setStep('manual_model')
              }}
              placeholder="http://localhost:11434/v1"
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
              showCursor
            />
          </Box>
        </Box>
      )

    case 'manual_model':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Set up local provider</Text>
          <Text dimColor>Endpoint: {manualUrl}</Text>
          <Box>
            <Text>Model name: </Text>
            <TextInput
              value={manualModel}
              onChange={setManualModel}
              onSubmit={(value: string) => {
                if (!value.trim()) return
                const model = value.trim()
                finishSetup('Local', manualUrl, [model], model)
              }}
              placeholder="llama3.2, qwen2.5, etc."
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
          <Text color="success">Local provider saved and activated.</Text>
        </Box>
      )
  }
}
