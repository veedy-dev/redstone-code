import * as React from 'react'
import { Text } from '../../ink.js'

type Props = {
  width: number
}

export function VoxelDivider({ width }: Props): React.ReactNode {
  return <Text color="startupAccent" dimColor>{'  ' + '▄'.repeat(Math.max(0, width - 4))}</Text>
}
