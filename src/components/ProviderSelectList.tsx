import React, { useState } from 'react'
import { Box, Text } from '../ink.js'
import { Select } from './CustomSelect/select.js'
import {
  getProviderProfiles,
  getActiveProviderProfileId,
  applyProviderProfile,
  deactivateProviderProfile,
  updateProfileLastUsed,
  removeProviderProfile,
} from '../utils/providerProfiles.js'
import type { ProviderProfile } from '../utils/config.js'

type Props = {
  onSelect: (action: 'anthropic' | 'add_custom' | { profile: ProviderProfile }) => void
}

export function ProviderSelectList({ onSelect }: Props): React.ReactNode {
  const [, forceUpdate] = useState(0)
  const profiles = getProviderProfiles()
  const activeId = getActiveProviderProfileId()

  const options: Array<{ label: React.ReactNode; value: string }> = []

  options.push({
    label: (
      <Text>
        Anthropic {activeId === null ? '(current)' : ''} ·{' '}
        <Text dimColor>Default account</Text>
        {'\n'}
      </Text>
    ),
    value: '__anthropic__',
  })

  for (const profile of profiles) {
    const isCurrent = activeId === profile.id
    const modelInfo = profile.defaultModel ?? profile.models[0] ?? 'no model set'
    options.push({
      label: (
        <Text>
          {profile.name} {isCurrent ? '(current)' : ''} ·{' '}
          <Text dimColor>{modelInfo}</Text>
          {'\n'}
        </Text>
      ),
      value: profile.id,
    })
    options.push({
      label: (
        <Text dimColor>
          {'  '}Remove {profile.name}{'\n'}
        </Text>
      ),
      value: `__remove__${profile.id}`,
    })
  }

  options.push({
    label: (
      <Text>
        + Add custom provider ·{' '}
        <Text dimColor>Anthropic-compatible endpoint</Text>
        {'\n'}
      </Text>
    ),
    value: '__add_custom__',
  })

  const handleChange = (value: string) => {
    if (value.startsWith('__remove__')) {
      const id = value.slice('__remove__'.length)
      removeProviderProfile(id)
      forceUpdate(n => n + 1)
      return
    }
    if (value === '__anthropic__') {
      deactivateProviderProfile()
      onSelect('anthropic')
    } else if (value === '__add_custom__') {
      onSelect('add_custom')
    } else {
      const profile = profiles.find(p => p.id === value)
      if (profile) {
        applyProviderProfile(profile)
        updateProfileLastUsed(profile.id)
        onSelect({ profile })
      }
    }
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Switch provider:</Text>
      <Box>
        <Select options={options} onChange={handleChange} />
      </Box>
    </Box>
  )
}
