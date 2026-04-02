import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { truncatePathMiddle } from '../../utils/format.js'

type Props = {
  model: string
  provider: string
  plan: string
  connectionType: string
  connectionDot: string
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

  const dotStr = `● ${connectionType}`

  const rows: Array<{ label: string; value: string; colored?: React.ReactNode }> = [
    { label: 'Model', value: model },
    { label: 'Provider', value: provider },
    { label: 'Plan', value: plan },
    {
      label: 'Type',
      value: dotStr,
      colored: (
        <>
          <Text color={connectionDot}>●</Text>
          <Text> {pad(connectionType, valueWidth - 3)}</Text>
        </>
      ),
    },
    { label: 'Path', value: displayPath },
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
            {row.colored ? (
              <Text> {row.colored}</Text>
            ) : (
              <Text> {pad(row.value, valueWidth - 1)}</Text>
            )}
            <Text dimColor>│</Text>
          </Text>
          {i < rows.length - 1 && <Text dimColor>{mid}</Text>}
        </React.Fragment>
      ))}
      <Text dimColor>{bot}</Text>
    </Box>
  )
}
