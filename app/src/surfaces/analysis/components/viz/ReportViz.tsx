// The four visual tabs of the match report, loaded on demand so the « Rapport » tab stays light on phones.
import { useMemo } from 'react'
import type { Match, MatchEvent, Player, Team } from '../../../../lib/types'
import type { NjangiResult } from '../../../../lib/njangi'
import { VizContext, type VizData } from './context'
import MapsTab from './MapsTab'
import PlayersTab from './PlayersTab'
import TimelineTab from './TimelineTab'
import AssistTab from './AssistTab'

export type VizTab = 'cartes' | 'joueurs' | 'chronologie' | 'mola'

export default function ReportViz({ tab, match, events, players, team, teamName, videoId, prev }: {
  tab: VizTab; match: Match; events: MatchEvent[]; players: Player[]; team?: Team; teamName: string; videoId: string | null
  prev?: { opponent: string; result: NjangiResult } | null
}) {
  const value = useMemo<VizData>(() => ({ match, events, players, byId: new Map(players.map((p) => [p.id, p])), team, teamName, videoId, prev }), [match, events, players, team, teamName, videoId, prev])
  return (
    <VizContext.Provider value={value}>
      {tab === 'cartes' && <MapsTab />}
      {tab === 'joueurs' && <PlayersTab />}
      {tab === 'chronologie' && <TimelineTab />}
      {tab === 'mola' && <AssistTab />}
    </VizContext.Provider>
  )
}
