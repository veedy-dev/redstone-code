import * as React from 'react'
import { Box, Text } from '../../ink.js'

const BANNER_LINES = [
  '    ----        █████▄  ▄▄▄▄▄ ▄▄▄▄   ▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄  ▄▄  ▄▄ ▄▄▄▄▄',
  '  --×××-++      ██▄▄██▄ ██▄▄  ██▀██ ███▄▄   ██  ██▀██ ███▄██ ██▄▄',
  '+-××××-×-+++    ██   ██ ██▄▄▄ ████▀ ▄▄██▀   ██  ▀███▀ ██ ▀██ ██▄▄▄',
  '---×××-××----+++',
  '--×-××××--++-+++  ▄█████  ▄▄▄  ▄▄▄▄  ▄▄▄▄▄',
  '+++-××--+--+++++  ██     ██▀██ ██▀██ ██▄▄',
  '  ++++++++++++    ▀█████ ▀███▀ ████▀ ██▄▄▄',
  '     ++++++',
]

export const BANNER_WIDTH = 71

type Props = {
  version?: string
}

export function RedstoneBanner({ version }: Props): React.ReactNode {
  return (
    <Box flexDirection="column">
      {BANNER_LINES.map((line, i) => (
        <Text key={i} color="startupAccent">{line}</Text>
      ))}
      {version && (
        <Text dimColor>{'  '}{version}</Text>
      )}
    </Box>
  )
}
