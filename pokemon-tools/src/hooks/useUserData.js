// Each selector must return a stable reference so React's useSyncExternalStore
// (used internally by Zustand) doesn't detect an unstable snapshot and crash.
// Returning a new `{}` from a single selector violates this — use one call per value.
import { useUserStore } from '../store/userStore'

export function useActiveGeneration() {
  const activeGeneration    = useUserStore((s) => s.activeGeneration)
  const setActiveGeneration = useUserStore((s) => s.setActiveGeneration)
  const clearGeneration     = useUserStore((s) => s.clearGeneration)
  return { activeGeneration, setActiveGeneration, clearGeneration }
}

export function useTeams() {
  const teams      = useUserStore((s) => s.teams)
  const addTeam    = useUserStore((s) => s.addTeam)
  const updateTeam = useUserStore((s) => s.updateTeam)
  const deleteTeam = useUserStore((s) => s.deleteTeam)
  return { teams, addTeam, updateTeam, deleteTeam }
}

export function useParties() {
  const parties     = useUserStore((s) => s.parties)
  const addParty    = useUserStore((s) => s.addParty)
  const updateParty = useUserStore((s) => s.updateParty)
  const deleteParty = useUserStore((s) => s.deleteParty)
  return { parties, addParty, updateParty, deleteParty }
}

export function useEVData() {
  const evData        = useUserStore((s) => s.evData)
  const upsertEVEntry = useUserStore((s) => s.upsertEVEntry)
  const addEVLog      = useUserStore((s) => s.addEVLog)
  const deleteEVEntry = useUserStore((s) => s.deleteEVEntry)
  return { evData, upsertEVEntry, addEVLog, deleteEVEntry }
}

export function useDexProgress() {
  const dexProgress  = useUserStore((s) => s.dexProgress)
  const markSeen     = useUserStore((s) => s.markSeen)
  const markCaught   = useUserStore((s) => s.markCaught)
  const unmarkCaught = useUserStore((s) => s.unmarkCaught)
  return { dexProgress, markSeen, markCaught, unmarkCaught }
}
