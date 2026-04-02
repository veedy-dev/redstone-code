import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
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
import { InfoTable } from './InfoTable.js'
import { getAuthTokenSource } from '../../utils/auth.js'
import { getDirectConnectServerUrl } from '../../bootstrap/state.js'
import { getAPIProvider } from '../../utils/model/providers.js'

const ChannelsNoticeModule =
  feature('KAIROS') || feature('KAIROS_CHANNELS')
    ? (require('./ChannelsNotice.js') as typeof import('./ChannelsNotice.js'))
    : null

const REDSTONE_TEXT = [
  '█████▄  ▄▄▄▄▄ ▄▄▄▄   ▄▄▄▄ ▄▄▄▄▄▄ ▄▄▄  ▄▄  ▄▄ ▄▄▄▄▄',
  '██▄▄██▄ ██▄▄  ██▀██ ███▄▄   ██  ██▀██ ███▄██ ██▄▄',
  '██   ██ ██▄▄▄ ████▀ ▄▄██▀   ██  ▀███▀ ██ ▀██ ██▄▄▄',
  '',
  '▄█████  ▄▄▄  ▄▄▄▄  ▄▄▄▄▄',
  '██     ██▀██ ██▀██ ██▄▄',
  '▀█████ ▀███▀ ████▀ ██▄▄▄',
]
const TEXT_ART_WIDTH = 53

function getProviderName(): string {
  const provider = getAPIProvider()
  switch (provider) {
    case 'firstParty': return 'Anthropic'
    case 'bedrock': return 'AWS Bedrock'
    case 'vertex': return 'Google Vertex'
    case 'foundry': return 'Azure Foundry'
    case 'openai': return 'OpenAI'
    default: return 'Anthropic'
  }
}

function getConnectionInfo(): { type: string; dot: 'green' | 'yellow' | 'blue' } {
  const serverUrl = getDirectConnectServerUrl()
  if (serverUrl) return { type: `Cloud`, dot: 'green' }
  const { source } = getAuthTokenSource()
  if (source === 'claude.ai' || source === 'ANTHROPIC_AUTH_TOKEN' || source === 'CLAUDE_CODE_OAUTH_TOKEN') {
    return { type: 'Cloud', dot: 'green' }
  }
  if (source === 'apiKeyHelper') return { type: 'API Key', dot: 'blue' }
  if (source === 'none') return { type: 'Not configured', dot: 'yellow' }
  return { type: 'Cloud', dot: 'green' }
}

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
  const modelDisplayName = fullModelDisplayName + effortSuffix
  const connectionInfo = getConnectionInfo()
  const providerName = getProviderName()

  const innerWidth = Math.max(40, columns - 4)
  const feedWidth = Math.max(30, innerWidth - 4)

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

  const welcome = username
    ? `Welcome back, ${username}`
    : 'Welcome'

  const showTextArt = columns >= TEXT_ART_WIDTH + 6

  const textArt = showTextArt ? (
    <Box flexDirection="column">
      {REDSTONE_TEXT.map((line, i) => (
        <Text key={i} color="startupAccent">{line}</Text>
      ))}
    </Box>
  ) : null

  const titleRow = showTextArt ? null : (
    <Box justifyContent="space-between" width={innerWidth}>
      <Text color="startupAccent" bold>Redstone Code</Text>
      <Text dimColor>v{version}</Text>
    </Box>
  )

  const welcomeRow = (
    <Text bold>{welcome}</Text>
  )

  const versionText = (
    <Text dimColor>v{version}</Text>
  )

  const infoTable = (
    <InfoTable
      model={truncate(modelDisplayName, 40)}
      provider={providerName}
      plan={billingType}
      connectionType={connectionInfo.type}
      connectionDot={connectionInfo.dot}
      cwd={cwd}
      agentName={agentName ?? undefined}
      width={innerWidth}
    />
  )

  const helpPrompt = (
    <Text dimColor>Type <Text color="startupAccent">/help</Text> to get started</Text>
  )

  if (isCondensedMode) {
    return (
      <>
        <Box
          borderStyle="round"
          borderColor="startupAccent"
          flexDirection="column"
          paddingX={1}
          paddingY={0}
        >
          {textArt}
          {titleRow}
          {welcomeRow}
          {versionText}
          <Text>{' '}</Text>
          {infoTable}
          <Text>{' '}</Text>
          {helpPrompt}
        </Box>
        {notices}
      </>
    )
  }

  const feedSection =
    columns >= 80 ? (
      <Box flexDirection="row" gap={4}>
        {feeds.map((feed, i) => (
          <FeedColumn
            key={i}
            feeds={[feed]}
            maxWidth={Math.floor((feedWidth - 4) / 2)}
          />
        ))}
      </Box>
    ) : (
      <Box flexDirection="column">
        {feeds.map((feed, i) => (
          <FeedColumn key={i} feeds={[feed]} maxWidth={feedWidth} />
        ))}
      </Box>
    )

  const mainContent = (
    <Box
      borderStyle="round"
      borderColor="startupAccent"
      flexDirection="column"
      paddingX={1}
      paddingY={0}
    >
      {textArt}
      {titleRow}
      {welcomeRow}
      {versionText}
      <Text>{' '}</Text>
      {infoTable}
      <Text>{' '}</Text>
      {feedSection}
      <Text>{' '}</Text>
      {helpPrompt}
    </Box>
  )

  return (
    <>
      <OffscreenFreeze>{mainContent}</OffscreenFreeze>
      {notices}
    </>
  )
}
