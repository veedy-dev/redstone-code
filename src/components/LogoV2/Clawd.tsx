import { c as _c } from "react/compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';
export type ClawdPose = 'default' | 'arms-up'
| 'look-left'
| 'look-right';

type Props = {
  pose?: ClawdPose;
};

type CrystalLines = {
  row1: string;
  row2: string;
  row3: string;
};

const CRYSTAL: Record<ClawdPose, CrystalLines> = {
  default: {
    row1: '  --×--  ',
    row2: ' -×××××- ',
    row3: '  +++++  ',
  },
  'arms-up': {
    row1: ' ×--×--× ',
    row2: '  -×××-  ',
    row3: '  +++++  ',
  },
  'look-left': {
    row1: ' -××--   ',
    row2: '-×××××-  ',
    row3: ' +++++   ',
  },
  'look-right': {
    row1: '   --××- ',
    row2: '  -×××××-',
    row3: '   +++++ ',
  },
};

export function Clawd(t0: Props | undefined) {
  const $ = _c(8);
  let t1;
  if ($[0] !== t0) {
    t1 = t0 === undefined ? {} : t0;
    $[0] = t0;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  const {
    pose: t2
  } = t1;
  const pose = t2 === undefined ? "default" : t2;
  const c = CRYSTAL[pose];
  let t3;
  if ($[2] !== c.row1 || $[3] !== c.row2 || $[4] !== c.row3) {
    t3 = <Box flexDirection="column">
      <Text color="clawd_body">{c.row1}</Text>
      <Text color="clawd_body">{c.row2}</Text>
      <Text color="clawd_body">{c.row3}</Text>
    </Box>;
    $[2] = c.row1;
    $[3] = c.row2;
    $[4] = c.row3;
    $[5] = t3;
  } else {
    t3 = $[5];
  }
  return t3;
}
