import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { truncatePathMiddle } from '../../utils/format.js'

type Props = {
  username: string | null
  version: string
  modelDisplayName: string
  billingType: string
  cwd: string
  agentName?: string
  columns: number
}

export function InfoBar({
  username,
  modelDisplayName,
  billingType,
  cwd,
  agentName,
  columns,
}: Props): React.ReactNode {
  const welcome = username ? `Welcome back, ${username}` : 'Welcome'
  const pathPrefix = agentName ? `@${agentName} · ` : ''
  const maxPathWidth = Math.max(20, columns - pathPrefix.length - 4)
  const displayPath = pathPrefix + truncatePathMiddle(cwd, maxPathWidth)

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text bold>{welcome}</Text>
      <Text dimColor>
        {modelDisplayName} · {billingType} · {displayPath}
      </Text>
    </Box>
  )
}
