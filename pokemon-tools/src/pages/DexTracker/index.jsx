import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckSquare, Square, Eye } from 'lucide-react'
import { useDexProgress } from '../../hooks/useUserData'
import { useUserStore } from '../../store/userStore'
import { usePokemon } from '../../hooks/usePokemon'
import { getPokedex } from '../../api/pokemon'
import { GAMES_BY_GEN, GEN_NATIONAL_MAX } from '../../constants/games'
import { GEN_INFO } from '../../constants/generations'
import { formatName } from '../../utils/formatting'
import PokemonDetail from '../Pokedex/PokemonDetail'

function DexEntry({ entry, isCaught, isSeen, onToggle, onViewDetail }) {
  const nationalId = parseInt(entry.pokemon_species.url.split('/').filter(Boolean).at(-1), 10)

  return (
    <button
      onClick={() => onToggle(nationalId)}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault()
          onViewDetail?.(nationalId)
        }
      }}
      title={`${formatName(entry.pokemon_species.name)} — middle-click for details`}
      className={`flex flex-col items-center p-1.5 rounded-xl border transition-all ${
        isCaught
          ? 'border-green-600/50 bg-green-900/20'
          : isSeen
          ? 'border-blue-600/30 bg-blue-900/10 opacity-80'
          : 'border-border bg-surface opacity-50 hover:opacity-80'
      }`}
    >
      <img
        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nationalId}.png`}
        alt={entry.pokemon_species.name}
        loading="lazy"
        className={`w-10 h-10 object-contain ${isCaught ? '' : isSeen ? 'opacity-70' : 'grayscale opacity-40'}`}
      />
      <span className="text-[9px] text-sub">{entry.entry_number}</span>
      {isCaught
        ? <CheckSquare size={10} className="text-green-400" />
        : isSeen
        ? <Eye size={10} className="text-blue-400" />
        : <Square size={10} className="text-dim" />}
    </button>
  )
}

export default function DexTracker() {
  const { dexProgress, markCaught, unmarkCaught } = useDexProgress()
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  const genInfo   = activeGeneration ? GEN_INFO[activeGeneration] : null
  const genMax    = activeGeneration ? (GEN_NATIONAL_MAX[activeGeneration] ?? 1025) : 1025
  const genGames  = activeGeneration ? (GAMES_BY_GEN[activeGeneration] ?? []) : []

  const [selectedDex, setSelectedDex] = useState(genGames[0]?.dexName ?? '')
  const [isNational, setIsNational]   = useState(false)
  const [filter, setFilter]           = useState('all')

  // Detail modal — opened by middle-clicking a pokemon
  const [detailId, setDetailId] = useState(null)
  const { data: detailPokemon } = usePokemon(detailId)

  // National dex and regional dex use different fetch keys but national uses a
  // per-gen progress key so gen I and gen II national progress stay separate.
  const fetchKey    = isNational ? 'national' : selectedDex
  const progressKey = isNational ? `national-gen${activeGeneration}` : selectedDex

  const { data: dexData, isLoading, isError } = useQuery({
    queryKey:  ['pokedex', fetchKey],
    queryFn:   () => getPokedex(fetchKey),
    enabled:   Boolean(fetchKey),
    staleTime: Infinity,
  })

  // For the national dex, trim to only the Pokémon introduced up to this gen.
  const allEntries = useMemo(() => {
    if (!dexData?.pokemon_entries) return []
    if (isNational) {
      return dexData.pokemon_entries.filter((e) => {
        const id = parseInt(e.pokemon_species.url.split('/').filter(Boolean).at(-1), 10)
        return id <= genMax
      })
    }
    return dexData.pokemon_entries
  }, [dexData, isNational, genMax])

  const progress = useMemo(
    () => dexProgress[progressKey] ?? { seen: [], caught: [] },
    [dexProgress, progressKey]
  )

  // How many of the visible entries are actually caught
  const caughtCount = useMemo(() => {
    const ids = new Set(
      allEntries.map((e) => parseInt(e.pokemon_species.url.split('/').filter(Boolean).at(-1), 10))
    )
    return progress.caught.filter((id) => ids.has(id)).length
  }, [progress.caught, allEntries])

  const entries = useMemo(() => {
    if (filter === 'caught') {
      return allEntries.filter((e) => {
        const id = parseInt(e.pokemon_species.url.split('/').filter(Boolean).at(-1), 10)
        return progress.caught.includes(id)
      })
    }
    if (filter === 'uncaught') {
      return allEntries.filter((e) => {
        const id = parseInt(e.pokemon_species.url.split('/').filter(Boolean).at(-1), 10)
        return !progress.caught.includes(id)
      })
    }
    return allEntries
  }, [allEntries, filter, progress])

  const total = allEntries.length
  const pct   = total > 0 ? Math.round((caughtCount / total) * 100) : 0

  const toggle = (nationalId) => {
    if (progress.caught.includes(nationalId)) {
      unmarkCaught(progressKey, nationalId)
    } else {
      markCaught(progressKey, nationalId)
    }
  }

  const selectDex = (dexName) => {
    setSelectedDex(dexName)
    setIsNational(false)
    setFilter('all')
  }

  const currentLabel = isNational
    ? `National Dex (Gen ${genInfo?.number ?? activeGeneration})`
    : genGames.find((g) => g.dexName === selectedDex)?.label ?? selectedDex

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-bold">Dex Tracker</h1>
          <p className="text-sub text-sm mt-1">Track your completion progress per game</p>
        </div>
        {genInfo && (
          <span
            className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full mt-1"
            style={{ backgroundColor: genInfo.color + '20', color: genInfo.color }}
          >
            Gen {genInfo.number} · {genInfo.region}
          </span>
        )}
      </div>

      {!activeGeneration && (
        <div className="text-center py-20 text-sub">
          <p className="text-4xl mb-3">🎯</p>
          <p>Select a generation on the home page to start tracking.</p>
        </div>
      )}

      {activeGeneration && (
        <>
          {/* Dex selector */}
          <div className="mb-5">
            <p className="text-sub text-xs mb-2">Select dex</p>
            <div className="flex flex-wrap gap-2">
              {genGames.map((g) => (
                <button
                  key={g.dexName + g.label}
                  onClick={() => selectDex(g.dexName)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    !isNational && selectedDex === g.dexName
                      ? 'border-accent text-accent bg-accent2'
                      : 'border-border text-sub hover:text-fg'
                  }`}
                >
                  {g.label}
                </button>
              ))}
              <button
                onClick={() => { setIsNational(true); setFilter('all') }}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  isNational
                    ? 'border-accent text-accent bg-accent2'
                    : 'border-border text-sub hover:text-fg'
                }`}
              >
                National Dex
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-10 bg-surface rounded-lg animate-pulse" />)}
            </div>
          )}

          {isError && (
            <p className="text-sub text-sm py-6 text-center">
              Failed to load dex data. This regional dex may not be available in PokéAPI.
            </p>
          )}

          {dexData && allEntries.length > 0 && (
            <>
              {/* Progress bar */}
              <div className="bg-surface border border-border rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-fg font-semibold">{currentLabel}</span>
                  <span className="text-sub text-sm">{caughtCount} / {total} caught ({pct}%)</span>
                </div>
                <div className="bg-card rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: '#4ade80' }}
                  />
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'all',      label: `All (${total})` },
                  { id: 'caught',   label: `Caught (${caughtCount})` },
                  { id: 'uncaught', label: `Remaining (${total - caughtCount})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      filter === id
                        ? 'border-accent text-accent bg-accent2'
                        : 'border-border text-sub hover:text-fg'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="text-dim text-[10px] mb-3">Left-click to toggle caught · Middle-click to view details</p>

              {/* Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                {entries.map((entry) => {
                  const nationalId = parseInt(entry.pokemon_species.url.split('/').filter(Boolean).at(-1), 10)
                  return (
                    <DexEntry
                      key={entry.entry_number}
                      entry={entry}
                      isCaught={progress.caught.includes(nationalId)}
                      isSeen={progress.seen.includes(nationalId)}
                      onToggle={toggle}
                      onViewDetail={(id) => setDetailId(id)}
                    />
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Detail modal — opened by middle-clicking a Pokémon */}
      {detailId && detailPokemon && (
        <PokemonDetail
          pokemon={detailPokemon}
          initialTab="encounters"
          onClose={() => setDetailId(null)}
          onSelectPokemon={(id) => setDetailId(id)}
        />
      )}
    </div>
  )
}
