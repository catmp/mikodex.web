import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const uid = () => crypto.randomUUID()

export const useUserStore = create(
  persist(
    (set) => ({
      // ── Active Generation ─────────────────────────────────────────────
      activeGeneration: null,  // '1'–'9' or null (all gens)
      setActiveGeneration: (gen) => set({ activeGeneration: gen }),
      clearGeneration: ()      => set({ activeGeneration: null }),

      // ── Team Builder ──────────────────────────────────────────────────
      teams: [],
      addTeam: (name) =>
        set((s) => ({ teams: [...s.teams, { id: uid(), name, pokemonIds: [] }] })),
      updateTeam: (id, updates) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
      deleteTeam: (id) =>
        set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),

      // ── Party Profiles ────────────────────────────────────────────────
      parties: [],
      addParty: (name) =>
        set((s) => ({ parties: [...s.parties, { id: uid(), name, members: [] }] })),
      updateParty: (id, updates) =>
        set((s) => ({ parties: s.parties.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),
      deleteParty: (id) =>
        set((s) => ({ parties: s.parties.filter((p) => p.id !== id) })),

      // ── EV Tracker ────────────────────────────────────────────────────
      evData: {},
      upsertEVEntry: (instanceId, data) =>
        set((s) => ({
          evData: { ...s.evData, [instanceId]: { ...s.evData[instanceId], ...data } },
        })),
      addEVLog: (instanceId, entry) =>
        set((s) => {
          const existing = s.evData[instanceId] ?? { evs: {}, log: [], pokemonId: null, nickname: '' }
          return {
            evData: {
              ...s.evData,
              [instanceId]: { ...existing, log: [...(existing.log ?? []), entry] },
            },
          }
        }),
      deleteEVEntry: (instanceId) =>
        set((s) => {
          const next = { ...s.evData }
          delete next[instanceId]
          return { evData: next }
        }),

      // ── Dex Tracker ───────────────────────────────────────────────────
      dexProgress: {},
      markSeen: (gameDex, pokemonId) =>
        set((s) => {
          const prog = s.dexProgress[gameDex] ?? { seen: [], caught: [] }
          if (prog.seen.includes(pokemonId)) return s
          return { dexProgress: { ...s.dexProgress, [gameDex]: { ...prog, seen: [...prog.seen, pokemonId] } } }
        }),
      markCaught: (gameDex, pokemonId) =>
        set((s) => {
          const prog = s.dexProgress[gameDex] ?? { seen: [], caught: [] }
          const seen = prog.seen.includes(pokemonId) ? prog.seen : [...prog.seen, pokemonId]
          const caught = prog.caught.includes(pokemonId) ? prog.caught : [...prog.caught, pokemonId]
          return { dexProgress: { ...s.dexProgress, [gameDex]: { ...prog, seen, caught } } }
        }),
      unmarkCaught: (gameDex, pokemonId) =>
        set((s) => {
          const prog = s.dexProgress[gameDex] ?? { seen: [], caught: [] }
          return {
            dexProgress: {
              ...s.dexProgress,
              [gameDex]: { ...prog, caught: prog.caught.filter((id) => id !== pokemonId) },
            },
          }
        }),
    }),
    { name: 'mikodex-user-data' }
  )
)
