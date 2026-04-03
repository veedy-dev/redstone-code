import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from '../ink.js'
import { Select } from './CustomSelect/select.js'
import TextInput from './TextInput.js'
import { Spinner } from './Spinner.js'
import {
  getProviderProfiles,
  getActiveProviderProfileId,
  applyProviderProfile,
  addModelToProfile,
  removeModelFromProfile,
  setDefaultModelForProfile,
} from '../utils/providerProfiles.js'
import { findModelsForProvider } from '../utils/modelsRegistry.js'

type EditStep = 'list' | 'add_discover' | 'add_pick' | 'add_manual' | 'confirm_remove'

type Props = {
  profileId: string
  onDone: () => void
  onTextInputActive?: (active: boolean) => void
}

export function ProviderModelsForm({ profileId, onDone, onTextInputActive }: Props): React.ReactNode {
  const [step, setStep] = useState<EditStep>('list')
  const [focusedModel, setFocusedModel] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [modelInput, setModelInput] = useState('')
  const [cursorOffset, setCursorOffset] = useState(0)
  const [, forceUpdate] = useState(0)
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])

  const profile = getProviderProfiles().find(p => p.id === profileId)
  const isActive = getActiveProviderProfileId() === profileId

  useEffect(() => {
    if (onTextInputActive) {
      onTextInputActive(step === 'add_manual')
    }
  }, [step, onTextInputActive])

  useInput((input, key, event) => {
    if (step === 'confirm_remove' && pendingRemove) {
      event.stopImmediatePropagation()
      if (input === 'y' || input === 'Y') {
        const updated = removeModelFromProfile(profileId, pendingRemove)
        if (updated && isActive) {
          applyProviderProfile(updated)
        }
        setPendingRemove(null)
        setStep('list')
        forceUpdate(n => n + 1)
      } else if (input === 'n' || input === 'N' || key.escape) {
        setPendingRemove(null)
        setStep('list')
      }
      return
    }

    if (step !== 'list') return

    if (input === 'd' && focusedModel && focusedModel !== '__add__' && focusedModel !== '__back__') {
      const updated = setDefaultModelForProfile(profileId, focusedModel)
      if (updated && isActive) {
        applyProviderProfile(updated)
      }
      forceUpdate(n => n + 1)
      return
    }

    if (key.delete && focusedModel && focusedModel !== '__add__' && focusedModel !== '__back__') {
      if (!profile || profile.models.length <= 1) return
      event.stopImmediatePropagation()
      setPendingRemove(focusedModel)
      setStep('confirm_remove')
    }
  }, { isActive: step === 'list' || step === 'confirm_remove' })

  if (!profile) {
    return <Text color="red">Profile not found.</Text>
  }

  const handleSelect = (value: string) => {
    if (value === '__back__') {
      onDone()
      return
    }
    if (value === '__add__') {
      setStep('add_discover')
      void startModelDiscovery()
      return
    }
  }

  const startModelDiscovery = async () => {
    const found = await findModelsForProvider(profile.baseUrl)
    const newModels = found.filter(m => !profile.models.includes(m))
    if (newModels.length > 0) {
      setDiscoveredModels(newModels)
      setStep('add_pick')
    } else {
      setCursorOffset(0)
      setModelInput('')
      setStep('add_manual')
    }
  }

  const handleAddModel = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const updated = addModelToProfile(profileId, trimmed)
    if (updated && isActive) {
      applyProviderProfile(updated)
    }
    setModelInput('')
    setCursorOffset(0)
    forceUpdate(n => n + 1)
    setStep('list')
  }

  switch (step) {
    case 'list': {
      const options: Array<{ label: React.ReactNode; value: string }> = []

      for (const model of profile.models) {
        const isDefault = model === profile.defaultModel
        options.push({
          label: (
            <Text>
              {model}{isDefault ? <Text dimColor> (default)</Text> : ''}
              {'\n'}
            </Text>
          ),
          value: model,
        })
      }

      options.push({
        label: <Text>+ Add model{'\n'}</Text>,
        value: '__add__',
      })

      options.push({
        label: <Text dimColor>← Back{'\n'}</Text>,
        value: '__back__',
      })

      const isModelFocused = focusedModel !== null && focusedModel !== '__add__' && focusedModel !== '__back__'
      const canRemove = profile.models.length > 1

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Models for "{profile.name}":</Text>
          <Box>
            <Select
              options={options}
              onChange={handleSelect}
              onFocus={setFocusedModel}
              onCancel={onDone}
            />
          </Box>
          {isModelFocused && (
            <Text dimColor>
              d to set default{canRemove ? ' | Del to remove' : ''}
            </Text>
          )}
        </Box>
      )
    }

    case 'add_discover':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Models for "{profile.name}":</Text>
          <Box>
            <Spinner />
            <Text> Looking up models from models.dev registry...</Text>
          </Box>
        </Box>
      )

    case 'add_pick': {
      const pickOptions = discoveredModels.map(m => ({
        label: <Text>{m}{'\n'}</Text>,
        value: m,
      }))
      pickOptions.push({
        label: <Text dimColor>Enter manually instead{'\n'}</Text>,
        value: '__manual__',
      })
      pickOptions.push({
        label: <Text dimColor>← Back{'\n'}</Text>,
        value: '__back__',
      })

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Available models for "{profile.name}":</Text>
          <Text dimColor>Found {discoveredModels.length} model{discoveredModels.length !== 1 ? 's' : ''} from models.dev registry</Text>
          <Box>
            <Select
              options={pickOptions}
              onChange={(value: string) => {
                if (value === '__back__') {
                  setStep('list')
                  return
                }
                if (value === '__manual__') {
                  setCursorOffset(0)
                  setModelInput('')
                  setStep('add_manual')
                  return
                }
                const updated = addModelToProfile(profileId, value)
                if (updated && isActive) {
                  applyProviderProfile(updated)
                }
                setDiscoveredModels(prev => prev.filter(m => m !== value))
                forceUpdate(n => n + 1)
                setStep('list')
              }}
              onCancel={() => setStep('list')}
            />
          </Box>
        </Box>
      )
    }

    case 'add_manual':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Models for "{profile.name}":</Text>
          <Box>
            <Text>Enter model name: </Text>
            <TextInput
              value={modelInput}
              onChange={setModelInput}
              onSubmit={handleAddModel}
              columns={80}
              cursorOffset={cursorOffset}
              onChangeCursorOffset={setCursorOffset}
              showCursor
            />
          </Box>
        </Box>
      )

    case 'confirm_remove':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Models for "{profile.name}":</Text>
          <Text>
            <Text color="error">Remove</Text> "<Text bold>{pendingRemove}</Text>"? (y/n)
          </Text>
        </Box>
      )
  }
}
