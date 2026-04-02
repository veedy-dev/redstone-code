import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { truncatePathMiddle } from '../../utils/format.js'

type Props = {
  model: string
  provider: string
  connectionType: string
  connectionDot: 'green' | 'yellow' | 'blue'
  cwd: string
  agentName?: string
  width: number
}

const LABEL_WIDTH = 10

export function InfoTable({
  model,
  provider,
  connectionType,
  connectionDot,
  cwd,
  agentName,
  width,
}: Props): React.ReactNode {
  const innerWidth = Math.max(30, width - 6)
  const valueWidth = innerWidth - LABEL_WIDTH - 3

  const pathPrefix = agentName ? `@${agentName} · ` : ''
  const maxPathLen = Math.max(10, valueWidth - pathPrefix.length)
  const displayPath = pathPrefix + truncatePathMiddle(cwd, maxPathLen)

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: 'Model', value: <Text>{model}</Text> },
    { label: 'Provider', value: <Text>{provider}</Text> },
    {
      label: 'Type',
      value: (
        <Text>
          <Text color={connectionDot}>●</Text> {connectionType}
        </Text>
      ),
    },
    { label: 'Path', value: <Text dimColor>{displayPath}</Text> },
  ]

  const topBorder = `┌${'─'.repeat(LABEL_WIDTH)}┬${'─'.repeat(valueWidth + 1)}┐`
  const bottomBorder = `└${'─'.repeat(LABEL_WIDTH)}┴${'─'.repeat(valueWidth + 1)}┘`

  return (
    <Box flexDirection="column">
      <Text dimColor>{topBorder}</Text>
      {rows.map((row, i) => (
        <Text key={i}>
          <Text dimColor>│</Text>
          <Text color="startupAccent"> {row.label.padEnd(LABEL_WIDTH - 1)}</Text>
          <Text dimColor>│</Text>
          <Text> </Text>
          {row.value}
        </Text>
      ))}
      <Text dimColor>{bottomBorder}</Text>
    </Box>
  )
}
