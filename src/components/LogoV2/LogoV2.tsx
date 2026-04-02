import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import { stringWidth } from '../../ink/stringWidth.js'
import {
  formatWelcomeMessage,
  truncatePath,
  getRecentActivitySync,
  getRecentReleaseNotesSync,
  getLogoDisplayData,
} from '../../utils/logoV2Utils.js'
import { truncate } from '../../utils/format.js'
import { getDisplayPath } from '../../utils/file.js'
import { FeedColumn } from './FeedColumn.js'
import {
  createRecentActivityFeed,
  createWhatsNewFeed,
  createProjectOnboardingFeed,
  createGuestPassesFeed,
} from './feedConfigs.js'
import { getGlobalConfig, saveGlobalConfig } from 'src/utils/config.js'
import { getInitialSettings } from 'src/utils/settings/settings.js'
import {
  isDebugMode,
  isDebugToStdErr,
  getDebugLogPath,
} from 'src/utils/debug.js'
import { useEffect, useState, useMemo } from 'react'
import {
  getSteps,
  shouldShowProjectOnboarding,
  incrementProjectOnboardingSeenCount,
} from '../../projectOnboardingState.js'
import { OffscreenFreeze } from '../OffscreenFreeze.js'
import { checkForReleaseNotesSync } from '../../utils/releaseNotes.js'
import { getDumpPromptsPath } from 'src/services/api/dumpPrompts.js'
import { isEnvTruthy } from 'src/utils/envUtils.js'
import {
  getStartupPerfLogPath,
  isDetailedProfilingEnabled,
} from 'src/utils/startupProfiler.js'
import { EmergencyTip } from './EmergencyTip.js'
import { VoiceModeNotice } from './VoiceModeNotice.js'
import { Opus1mMergeNotice } from './Opus1mMergeNotice.js'
import { feature } from 'bun:bundle'
import { SandboxManager } from 'src/utils/sandbox/sandbox-adapter.js'
import {
  useShowGuestPassesUpsell,
  incrementGuestPassesSeenCount,
} from './GuestPassesUpsell.js'
import {
  useShowOverageCreditUpsell,
  incrementOverageCreditUpsellSeenCount,
  createOverageCreditFeed,
} from './OverageCreditUpsell.js'
import { useAppState } from '../../state/AppState.js'
import { getEffortSuffix } from '../../utils/effort.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { renderModelSetting } from '../../utils/model/model.js'
import { RedstoneBanner, BANNER_WIDTH } from './RedstoneBanner.js'
import { InfoBar } from './InfoBar.js'
import { VoxelDivider } from './VoxelDivider.js'

const ChannelsNoticeModule =
  feature('KAIROS') || feature('KAIROS_CHANNELS')
    ? (require('./ChannelsNotice.js') as typeof import('./ChannelsNotice.js'))
    : null

export function LogoV2(): React.ReactNode {
  const activities = getRecentActivitySync()
  const username = getGlobalConfig().oauthAccount?.displayName ?? ''
  const { columns } = useTerminalSize()

  const showOnboarding = useMemo(() => shouldShowProjectOnboarding(), [])
  const showSandboxStatus = useMemo(
    () => SandboxManager.isSandboxingEnabled(),
    [],
  )
  const showGuestPassesUpsell = useShowGuestPassesUpsell()
  const showOverageCreditUpsell = useShowOverageCreditUpsell()
  const agent = useAppState(s => s.agent)
  const effortValue = useAppState(s => s.effortValue)
  const config = getGlobalConfig()

  let changelog: ReturnType<typeof getRecentReleaseNotesSync>
  try {
    changelog = getRecentReleaseNotesSync(
      3,
      MACRO.VERSION,
      config.lastReleaseNotesSeen,
    )
  } catch {
    changelog = []
  }

  const [announcement] = useState(() => {
    const announcements = getInitialSettings().companyAnnouncements
    if (!announcements || announcements.length === 0) return undefined
    return config.numStartups === 1
      ? announcements[0]
      : announcements[Math.floor(Math.random() * announcements.length)]
  })

  const { hasReleaseNotes } = checkForReleaseNotesSync(
    config.lastReleaseNotesSeen,
  )

  useEffect(() => {
    const currentConfig = getGlobalConfig()
    if (currentConfig.lastReleaseNotesSeen === MACRO.VERSION) return
    saveGlobalConfig(current => {
      if (current.lastReleaseNotesSeen === MACRO.VERSION) return current
      return { ...current, lastReleaseNotesSeen: MACRO.VERSION }
    })
    if (showOnboarding) incrementProjectOnboardingSeenCount()
  }, [config, showOnboarding])

  const isCondensedMode =
    !hasReleaseNotes &&
    !showOnboarding &&
    !isEnvTruthy(process.env.CLAUDE_CODE_FORCE_FULL_LOGO)

  useEffect(() => {
    if (showGuestPassesUpsell && !showOnboarding && !isCondensedMode)
      incrementGuestPassesSeenCount()
  }, [showGuestPassesUpsell, showOnboarding, isCondensedMode])

  useEffect(() => {
    if (
      showOverageCreditUpsell &&
      !showOnboarding &&
      !showGuestPassesUpsell &&
      !isCondensedMode
    )
      incrementOverageCreditUpsellSeenCount()
  }, [
    showOverageCreditUpsell,
    showOnboarding,
    showGuestPassesUpsell,
    isCondensedMode,
  ])

  const model = useMainLoopModel()
  const fullModelDisplayName = renderModelSetting(model)
  const { version, cwd, billingType, agentName: agentNameFromSettings } =
    getLogoDisplayData()
  const agentName = agent ?? agentNameFromSettings
  const effortSuffix = getEffortSuffix(model, effortValue)
  const modelDisplayName = truncate(
    fullModelDisplayName + effortSuffix,
    30,
  )

  const showBanner = columns >= BANNER_WIDTH + 4
  const feedWidth = Math.max(30, columns - 6)

  const feeds = useMemo(() => {
    const activityFeed = createRecentActivityFeed(activities, feedWidth)
    if (showOnboarding) {
      const onboardingFeed = createProjectOnboardingFeed(
        getSteps(),
        cwd,
        feedWidth,
      )
      return [onboardingFeed, activityFeed]
    }
    if (showGuestPassesUpsell) {
      const guestPassesFeed = createGuestPassesFeed(feedWidth)
      return [activityFeed, guestPassesFeed]
    }
    if (showOverageCreditUpsell) {
      const overageFeed = createOverageCreditFeed(feedWidth)
      return [activityFeed, overageFeed]
    }
    const whatsNewFeed = createWhatsNewFeed(changelog, feedWidth)
    return [activityFeed, whatsNewFeed]
  }, [
    activities,
    changelog,
    feedWidth,
    showOnboarding,
    showGuestPassesUpsell,
    showOverageCreditUpsell,
    cwd,
  ])

  const notices = (
    <>
      <VoiceModeNotice />
      <Opus1mMergeNotice />
      {ChannelsNoticeModule && <ChannelsNoticeModule.ChannelsNotice />}
      {isDebugMode() && (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="warning">Debug mode enabled</Text>
          <Text dimColor>
            Logging to: {isDebugToStdErr() ? 'stderr' : getDebugLogPath()}
          </Text>
        </Box>
      )}
      <EmergencyTip />
      {process.env.CLAUDE_CODE_TMUX_SESSION && (
        <Box paddingLeft={2} flexDirection="column">
          <Text dimColor>
            tmux session: {process.env.CLAUDE_CODE_TMUX_SESSION}
          </Text>
        </Box>
      )}
      {announcement && (
        <Box paddingLeft={2} flexDirection="column">
          {!process.env.IS_DEMO &&
            config.oauthAccount?.organizationName && (
              <Text dimColor>
                Message from {config.oauthAccount.organizationName}:
              </Text>
            )}
          <Text>{announcement}</Text>
        </Box>
      )}
      {showSandboxStatus && (
        <Box paddingLeft={2} flexDirection="column">
          <Text color="warning">
            Your bash commands will be sandboxed. Disable with /sandbox.
          </Text>
        </Box>
      )}
    </>
  )

  if (isCondensedMode) {
    return (
      <>
        <Box flexDirection="column" paddingLeft={2}>
          <Text>
            <Text color="startupAccent" bold>
              Redstone Code
            </Text>{' '}
            <Text dimColor>v{version}</Text>
            <Text dimColor>
              {' · '}
              {modelDisplayName} · {billingType}
            </Text>
          </Text>
          <Text dimColor>
            {agentName ? `@${agentName} · ` : ''}
            {truncatePath(cwd, columns - 4)}
          </Text>
        </Box>
        {notices}
      </>
    )
  }

  const mainContent = (
    <Box flexDirection="column">
      {showBanner && <RedstoneBanner version={`v${version}`} />}
      {!showBanner && (
        <Box paddingLeft={2}>
          <Text>
            <Text color="startupAccent" bold>
              Redstone Code
            </Text>{' '}
            <Text dimColor>v{version}</Text>
          </Text>
        </Box>
      )}
      <Text>{' '}</Text>
      <InfoBar
        username={username || null}
        version={version}
        modelDisplayName={modelDisplayName}
        billingType={billingType}
        cwd={cwd}
        agentName={agentName ?? undefined}
        columns={columns}
      />
      <Text>{' '}</Text>
      <VoxelDivider width={Math.min(feedWidth + 4, columns)} />
      <Text>{' '}</Text>
      {columns >= 80 ? (
        <Box flexDirection="row" paddingLeft={2} gap={4}>
          {feeds.map((feed, i) => (
            <FeedColumn
              key={i}
              feeds={[feed]}
              maxWidth={Math.floor((feedWidth - 4) / 2)}
            />
          ))}
        </Box>
      ) : (
        <Box flexDirection="column" paddingLeft={2}>
          {feeds.map((feed, i) => (
            <FeedColumn key={i} feeds={[feed]} maxWidth={feedWidth} />
          ))}
        </Box>
      )}
    </Box>
  )

  return (
    <>
      <OffscreenFreeze>{mainContent}</OffscreenFreeze>
      {notices}
    </>
  )
}
