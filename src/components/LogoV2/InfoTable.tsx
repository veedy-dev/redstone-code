import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { truncatePathMiddle } from '../../utils/format.js'

type Props = {
  model: string
  provider: string
  plan: string
  connectionType: string
  connectionDot: 'green' | 'yellow' | 'blue'
  cwd: string
  agentName?: string
  width: number
}

const LABEL_WIDTH = 11

function pad(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length)
}

export function InfoTable({
  model,
  provider,
  plan,
  connectionType,
  connectionDot,
  cwd,
  agentName,
  width,
}: Props): React.ReactNode {
  const tableWidth = Math.min(width, 68)
  const valueWidth = tableWidth - LABEL_WIDTH - 3

  const pathPrefix = agentName ? `@${agentName} · ` : ''
  const maxPathLen = Math.max(10, valueWidth - pathPrefix.length)
  const displayPath = pathPrefix + truncatePathMiddle(cwd, maxPathLen)

  const top = `┌${'─'.repeat(LABEL_WIDTH)}┬${'─'.repeat(valueWidth)}┐`
  const mid = `├${'─'.repeat(LABEL_WIDTH)}┼${'─'.repeat(valueWidth)}┤`
  const bot = `└${'─'.repeat(LABEL_WIDTH)}┴${'─'.repeat(valueWidth)}┘`

  const rows: Array<{ label: string; value: React.ReactNode; raw?: string }> = [
    { label: 'Model', value: <Text>{model}</Text>, raw: model },
    { label: 'Provider', value: <Text>{provider}</Text>, raw: provider },
    { label: 'Plan', value: <Text>{plan}</Text>, raw: plan },
    {
      label: 'Type',
      value: (
        <Text>
          <Text color={connectionDot}>●</Text> {connectionType}
        </Text>
      ),
      raw: `● ${connectionType}`,
    },
    { label: 'Path', value: <Text dimColor>{displayPath}</Text>, raw: displayPath },
  ]

  return (
    <Box flexDirection="column">
      <Text dimColor>{top}</Text>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          <Text>
            <Text dimColor>│</Text>
            <Text color="startupAccent">{pad(` ${row.label}`, LABEL_WIDTH)}</Text>
            <Text dimColor>│</Text>
            <Text> {pad(row.raw ?? '', valueWidth - 1)}</Text>
            <Text dimColor>│</Text>
          </Text>
          {i < rows.length - 1 && <Text dimColor>{mid}</Text>}
        </React.Fragment>
      ))}
      <Text dimColor>{bot}</Text>
    </Box>
  )
}
