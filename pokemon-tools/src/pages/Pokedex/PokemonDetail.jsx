import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQueries } from '@tanstack/react-query'
import { X, ChevronRight } from 'lucide-react'
import {
  usePokemonSpecies, useEvolutionChain,
  useMove, useMachine, useAbility, usePokemonEncounters,
} from '../../hooks/usePokemon'
import { getMove } from '../../api/moves'
import { getMachine } from '../../api/moves'
import { useTypeChart } from '../../hooks/useTypeChart'
import { useUserStore } from '../../store/userStore'
import { useParties } from '../../hooks/useUserData'
import TypeBadge from '../../components/TypeBadge'
import {
  formatName, padId, officialArtworkUrl, shinyArtworkUrl,
  frontSpriteUrl,
} from '../../utils/formatting'
// TIME_LABELS: PokéAPI condition_value names → human labels
const TIME_LABELS = { 'time-morning': 'Morning', 'time-day': 'Day', 'time-night': 'Night' }
import { STAT_LABELS, STAT_COLORS, STAT_MAX } from '../../utils/statHelpers'
import { getWeaknesses, getResistances, getImmunities, patchMatrixForGen } from '../../utils/typeEffectiveness'
import { GEN_VERSION_GROUPS, VERSION_TO_GEN, VERSION_LABELS } from '../../constants/generations'

// ── Constants ──────────────────────────────────────────────────────────────

const LEARN_METHODS = ['level-up', 'machine', 'egg', 'tutor']
const LEARN_METHOD_LABELS = {
  'level-up': 'Level Up',
  'machine':  'TM / HM',
  'egg':      'Egg',
  'tutor':    'Tutor',
}
const DAMAGE_CLASS_STYLE = {
  physical: { label: 'Phys', color: '#fb923c' },
  special:  { label: 'Spec', color: '#a78bfa' },
  status:   { label: 'Stat', color: '#6b7280' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatLocationName(name) {
  return name
    .replace(/-area$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function bulbapediaLocationUrl(locationAreaName) {
  return `https://bulbapedia.bulbagarden.net/wiki/${formatLocationName(locationAreaName).replace(/ /g, '_')}`
}

// ── FloatingTooltip ────────────────────────────────────────────────────────
// Portal-based tooltip — renders in document.body so overflow:hidden parents
// (like the move table wrapper) never clip it.
// pos is a DOMRect captured inside an event handler (not during render).

function FloatingTooltip({ pos, visible, children }) {
  if (!visible || !pos) return null
  const left = Math.max(8, Math.min(pos.left, window.innerWidth - 296))
  // Prefer above the trigger; fall back to below if too close to top.
  const above = pos.top > 200
  const style = above
    ? { top: pos.top - 8, transform: 'translateY(-100%)' }
    : { top: pos.bottom + 8 }

  return createPortal(
    <div
      style={{ position: 'fixed', left, zIndex: 9999, ...style }}
      className="w-72 bg-card border border-border2 rounded-xl p-3 shadow-2xl pointer-events-none text-xs"
    >
      {children}
    </div>,
    document.body
  )
}

// ── DamageClass badge ──────────────────────────────────────────────────────

function DamageClass({ category }) {
  const s = DAMAGE_CLASS_STYLE[category] ?? DAMAGE_CLASS_STYLE.status
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color: s.color, backgroundColor: s.color + '22' }}
    >
      {s.label}
    </span>
  )
}

// ── AbilityBadge ───────────────────────────────────────────────────────────
// Renders an ability pill that shows a hover tooltip with the effect text.

function AbilityBadge({ abilityName, isHidden }) {
  const [pos, setPos] = useState(null)
  const { data: ability } = useAbility(abilityName)

  const shortEffect = ability?.effect_entries?.find((e) => e.language.name === 'en')?.short_effect

  return (
    <span
      onMouseEnter={(e) => setPos(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setPos(null)}
      className={`cursor-help select-none px-3 py-1 rounded-lg text-sm border ${
        isHidden
          ? 'border-border2 text-sub bg-card italic'
          : 'border-border text-fg bg-card'
      }`}
    >
      {formatName(abilityName)}
      {isHidden && <span className="ml-1 text-dim text-xs">(HA)</span>}

      <FloatingTooltip pos={pos} visible={Boolean(pos) && Boolean(shortEffect)}>
        <p className="font-semibold text-fg mb-1.5">{formatName(abilityName)}</p>
        <p className="text-sub leading-relaxed">{shortEffect}</p>
      </FloatingTooltip>
    </span>
  )
}

// ── Move table components ──────────────────────────────────────────────────

function MoveTableHead({ firstCol }) {
  return (
    <thead>
      <tr className="bg-card border-b border-border">
        {firstCol && (
          <th className="px-3 py-2 text-left text-sub text-xs font-medium w-14">{firstCol}</th>
        )}
        <th className="px-3 py-2 text-left text-sub text-xs font-medium">Move</th>
        <th className="px-3 py-2 text-left text-sub text-xs font-medium">Type</th>
        <th className="px-3 py-2 text-left text-sub text-xs font-medium">Cat.</th>
        <th className="px-2 py-2 text-right text-sub text-xs font-medium w-11">Pwr</th>
        <th className="px-2 py-2 text-right text-sub text-xs font-medium w-11">Acc</th>
        <th className="px-2 py-2 text-right text-sub text-xs font-medium w-10">PP</th>
      </tr>
    </thead>
  )
}

// Shared data cells rendered once move data is loaded
function MoveDataCells({ move }) {
  return (
    <>
      <td className="px-3 py-1.5"><TypeBadge type={move.type.name} size="xs" /></td>
      <td className="px-3 py-1.5"><DamageClass category={move.damage_class.name} /></td>
      <td className="px-2 py-1.5 text-right font-mono text-fg text-xs">{move.power ?? '—'}</td>
      <td className="px-2 py-1.5 text-right font-mono text-fg text-xs">
        {move.accuracy != null ? `${move.accuracy}%` : '—'}
      </td>
      <td className="px-2 py-1.5 text-right font-mono text-fg text-xs">{move.pp ?? '—'}</td>
    </>
  )
}

function LoadingCells() {
  return (
    <td colSpan={5} className="px-3 py-1.5">
      <div className="h-3 w-28 rounded bg-border/50 animate-pulse" />
    </td>
  )
}

// Tooltip content — technical details only: priority, stat changes, short_effect.
function MoveTooltipContent({ move, moveName }) {
  const priority    = move.priority ?? 0
  const statChanges = move.stat_changes ?? []
  const shortEffect = move.effect_entries
    ?.find((e) => e.language.name === 'en')
    ?.short_effect
    ?.replace(/\$effect_chance/g, move.effect_chance ?? '?')

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-fg">{formatName(moveName)}</p>
        <div className="flex gap-1.5">
          <TypeBadge type={move.type.name} size="xs" />
          <DamageClass category={move.damage_class.name} />
        </div>
      </div>

      {/* Core stats row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-sub mb-2">
        <span>Power <span className="text-fg font-mono">{move.power ?? '—'}</span></span>
        <span>Acc <span className="text-fg font-mono">{move.accuracy != null ? `${move.accuracy}%` : '—'}</span></span>
        <span>PP <span className="text-fg font-mono">{move.pp}</span></span>
        {priority !== 0 && (
          <span>Priority <span className={`font-mono font-semibold ${priority > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {priority > 0 ? `+${priority}` : priority}
          </span></span>
        )}
      </div>

      {/* Stat changes with exact stage count */}
      {statChanges.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {statChanges.map(({ stat, change }) => (
            <span key={stat.name}
              className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface flex gap-1 items-center">
              <span className="text-sub">{STAT_LABELS[stat.name] ?? formatName(stat.name)}</span>
              <span className={`font-semibold font-mono ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change > 0 ? `+${change}` : change}
              </span>
            </span>
          ))}
        </div>
      )}

      {shortEffect && <p className="text-sub leading-relaxed text-[10px]">{shortEffect}</p>}
    </>
  )
}

function LevelUpRow({ moveName, level, index }) {
  const { data: move, isLoading } = useMove(moveName)
  const [pos, setPos] = useState(null)
  const bg = index % 2 === 0 ? 'bg-surface' : 'bg-card'

  return (
    <tr className={bg}>
      <td className="px-3 py-1.5 font-mono text-dim text-xs text-center">
        {level === 0 ? '—' : level}
      </td>
      <td
        className="px-3 py-1.5 text-fg text-xs cursor-help"
        onMouseEnter={(e) => setPos(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setPos(null)}
      >
        {formatName(moveName)}
        {move && (
          <FloatingTooltip pos={pos} visible={Boolean(pos)}>
            <MoveTooltipContent move={move} moveName={moveName} />
          </FloatingTooltip>
        )}
      </td>
      {isLoading || !move ? <LoadingCells /> : <MoveDataCells move={move} />}
    </tr>
  )
}

function MachineRow({ moveName, activeGeneration, index }) {
  const { data: move, isLoading } = useMove(moveName)
  const [pos, setPos] = useState(null)
  const bg = index % 2 === 0 ? 'bg-surface' : 'bg-card'

  const machineUrl = useMemo(() => {
    if (!move?.machines?.length) return null
    const groups = new Set(GEN_VERSION_GROUPS[activeGeneration ?? '9'] ?? GEN_VERSION_GROUPS['9'])
    return move.machines.find((m) => groups.has(m.version_group.name))?.machine?.url ?? null
  }, [move, activeGeneration])

  const { data: machine } = useMachine(machineUrl)
  const itemName  = machine?.item?.name ?? null
  const label     = itemName ? itemName.replace('-', '').toUpperCase() : null
  const wikiUrl   = label ? `https://bulbapedia.bulbagarden.net/wiki/${label}` : null

  return (
    <tr className={bg}>
      <td className="px-3 py-1.5 text-xs">
        {label ? (
          <a href={wikiUrl} target="_blank" rel="noreferrer"
            className="font-mono text-accent hover:underline text-[10px]">
            {label}
          </a>
        ) : (
          <span className="text-dim font-mono text-[10px]">
            {isLoading || machineUrl ? '…' : 'TM'}
          </span>
        )}
      </td>
      <td
        className="px-3 py-1.5 text-fg text-xs cursor-help"
        onMouseEnter={(e) => setPos(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setPos(null)}
      >
        {formatName(moveName)}
        {move && (
          <FloatingTooltip pos={pos} visible={Boolean(pos)}>
            <MoveTooltipContent move={move} moveName={moveName} />
          </FloatingTooltip>
        )}
      </td>
      {isLoading || !move ? <LoadingCells /> : <MoveDataCells move={move} />}
    </tr>
  )
}

function BasicMoveRow({ moveName, index }) {
  const { data: move, isLoading } = useMove(moveName)
  const [pos, setPos] = useState(null)
  const bg = index % 2 === 0 ? 'bg-surface' : 'bg-card'

  return (
    <tr className={bg}>
      <td
        className="px-3 py-1.5 text-fg text-xs cursor-help"
        onMouseEnter={(e) => setPos(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setPos(null)}
      >
        {formatName(moveName)}
        {move && (
          <FloatingTooltip pos={pos} visible={Boolean(pos)}>
            <MoveTooltipContent move={move} moveName={moveName} />
          </FloatingTooltip>
        )}
      </td>
      {isLoading || !move ? <LoadingCells /> : <MoveDataCells move={move} />}
    </tr>
  )
}

// EggMoveRow — like BasicMoveRow but shows breeder sprites from learned_by_pokemon.
// Breeders are filtered to base-form IDs (1–905) to avoid alternate-form noise.
function EggMoveRow({ moveName, index, onSelectPokemon, currentPokemonId }) {
  const { data: move, isLoading } = useMove(moveName)
  const [pos, setPos] = useState(null)
  const bg = index % 2 === 0 ? 'bg-surface' : 'bg-card'

  const breeders = useMemo(() => {
    if (!move?.learned_by_pokemon) return []
    return move.learned_by_pokemon
      .map((p) => ({ name: p.name, id: parseInt(p.url.split('/').filter(Boolean).at(-1), 10) }))
      .filter((p) => p.id >= 1 && p.id <= 905 && p.id !== currentPokemonId)
      .slice(0, 6)
  }, [move, currentPokemonId])

  return (
    <>
      <tr className={bg}>
        <td
          className="px-3 py-1.5 text-fg text-xs cursor-help"
          onMouseEnter={(e) => setPos(e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setPos(null)}
        >
          {formatName(moveName)}
          {move && (
            <FloatingTooltip pos={pos} visible={Boolean(pos)}>
              <MoveTooltipContent move={move} moveName={moveName} />
            </FloatingTooltip>
          )}
        </td>
        {isLoading || !move ? <LoadingCells /> : <MoveDataCells move={move} />}
      </tr>
      {breeders.length > 0 && (
        <tr className={bg}>
          <td colSpan={6} className="px-3 pb-2 pt-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-dim text-[10px] mr-1">Breeders:</span>
              {breeders.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectPokemon?.(b.id)}
                  title={formatName(b.name)}
                  className="hover:scale-110 transition-transform rounded"
                >
                  <img
                    src={frontSpriteUrl(b.id)}
                    alt={formatName(b.name)}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Learnset ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = {
  'level-up': [
    { value: 'default', label: 'By Level' },
    { value: 'alpha',   label: 'A–Z' },
    { value: 'type',    label: 'By Type' },
  ],
  machine: [
    { value: 'default', label: 'A–Z' },
    { value: 'type',    label: 'By Type' },
    { value: 'tm',      label: 'By TM #' },
  ],
  egg:   [{ value: 'default', label: 'A–Z' }, { value: 'type', label: 'By Type' }],
  tutor: [{ value: 'default', label: 'A–Z' }, { value: 'type', label: 'By Type' }],
}

function Learnset({ moves, activeGeneration, onSelectPokemon, currentPokemonId }) {
  const [methodTab, setMethodTab] = useState('level-up')
  const [sortBy, setSortBy]       = useState('default')

  const targetGroups = useMemo(() => {
    const gen = activeGeneration ?? '9'
    return new Set(GEN_VERSION_GROUPS[gen] ?? GEN_VERSION_GROUPS['9'])
  }, [activeGeneration])

  const byMethod = useMemo(() => {
    const result = Object.fromEntries(LEARN_METHODS.map((m) => [m, []]))
    for (const entry of moves) {
      const name = entry.move.name
      const matching = entry.version_group_details.filter((d) =>
        targetGroups.has(d.version_group.name)
      )
      if (matching.length === 0) continue
      for (const method of LEARN_METHODS) {
        const forMethod = matching.filter((d) => d.move_learn_method.name === method)
        if (forMethod.length === 0 || result[method].some((r) => r.name === name)) continue
        if (method === 'level-up') {
          const levels = forMethod.map((d) => d.level_learned_at).filter((l) => l > 0)
          result[method].push({ name, level: levels.length > 0 ? Math.min(...levels) : 0 })
        } else {
          result[method].push({ name })
        }
      }
    }
    return result
  }, [moves, targetGroups])

  const available = useMemo(
    () => LEARN_METHODS.filter((m) => byMethod[m].length > 0),
    [byMethod]
  )
  const activeMethod = useMemo(
    () => (available.includes(methodTab) ? methodTab : (available[0] ?? 'level-up')),
    [available, methodTab]
  )

  // Reset sort when method tab changes
  const [prevMethod, setPrevMethod] = useState(activeMethod)
  if (prevMethod !== activeMethod) {
    setPrevMethod(activeMethod)
    setSortBy('default')
  }

  const currentMoves = useMemo(() => byMethod[activeMethod] ?? [], [byMethod, activeMethod])

  // Batch-fetch move data so type sorting and TM# sorting have data immediately.
  // Same query keys as the per-row useMove calls → hits the shared TQ cache.
  const moveResults = useQueries({
    queries: currentMoves.map((m) => ({
      queryKey: ['move', m.name],
      queryFn:  () => getMove(m.name),
      staleTime: Infinity,
    })),
  })

  const moveDataMap = useMemo(() => {
    const map = {}
    currentMoves.forEach((m, i) => {
      if (moveResults[i]?.data) map[m.name] = moveResults[i].data
    })
    return map
  }, [currentMoves, moveResults])

  // For TM# sort: extract machine URLs for the active gen once move data is loaded.
  const machineEntries = useMemo(() => {
    if (activeMethod !== 'machine' || sortBy !== 'tm') return []
    return currentMoves.flatMap((m) => {
      const moveData = moveDataMap[m.name]
      if (!moveData?.machines?.length) return []
      const url = moveData.machines
        .find((mc) => targetGroups.has(mc.version_group.name))?.machine?.url ?? null
      return url ? [{ moveName: m.name, url }] : []
    })
  }, [activeMethod, sortBy, currentMoves, moveDataMap, targetGroups])

  const machineResults = useQueries({
    queries: machineEntries.map(({ url }) => ({
      queryKey: ['machine', url],
      queryFn:  () => getMachine(url),
      staleTime: Infinity,
    })),
  })

  // moveName → TM number (integer) for sorting
  const tmNumberMap = useMemo(() => {
    const map = {}
    machineEntries.forEach(({ moveName }, i) => {
      const itemName = machineResults[i]?.data?.item?.name // e.g. "tm01" or "hm04"
      if (itemName) {
        map[moveName] = parseInt(itemName.replace(/[a-z]+/, ''), 10)
      }
    })
    return map
  }, [machineEntries, machineResults])

  // Sorted move list
  const sorted = useMemo(() => {
    const list = [...currentMoves]
    if (sortBy === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'type') {
      list.sort((a, b) => {
        const ta = moveDataMap[a.name]?.type?.name ?? 'zzz'
        const tb = moveDataMap[b.name]?.type?.name ?? 'zzz'
        return ta.localeCompare(tb) || a.name.localeCompare(b.name)
      })
    } else if (sortBy === 'tm') {
      list.sort((a, b) => {
        const na = tmNumberMap[a.name] ?? 9999
        const nb = tmNumberMap[b.name] ?? 9999
        return na - nb || a.name.localeCompare(b.name)
      })
    } else {
      // default: by level for level-up, alphabetical for everything else
      if (activeMethod === 'level-up') {
        list.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name))
      } else {
        list.sort((a, b) => a.name.localeCompare(b.name))
      }
    }
    return list
  }, [currentMoves, sortBy, activeMethod, moveDataMap, tmNumberMap])

  const sortOptions = SORT_OPTIONS[activeMethod] ?? SORT_OPTIONS.egg

  if (available.length === 0) {
    return <p className="text-sub text-sm text-center py-10">No moves found for the selected generation.</p>
  }

  return (
    <div>
      {/* Method tabs + sort controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {available.map((m) => (
            <button
              key={m}
              onClick={() => setMethodTab(m)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                activeMethod === m ? 'border-accent text-accent bg-accent2' : 'border-border text-sub hover:text-fg'
              }`}
            >
              {LEARN_METHOD_LABELS[m]}
              <span className="ml-1 opacity-50">({byMethod[m].length})</span>
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-dim text-[10px]">Sort:</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                sortBy === opt.value
                  ? 'border-accent text-accent bg-accent2'
                  : 'border-border text-sub hover:text-fg'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full">
          {activeMethod === 'level-up' && (
            <>
              <MoveTableHead firstCol="Lv." />
              <tbody>
                {sorted.map((m, i) => (
                  <LevelUpRow key={m.name} moveName={m.name} level={m.level} index={i} />
                ))}
              </tbody>
            </>
          )}
          {activeMethod === 'machine' && (
            <>
              <MoveTableHead firstCol="TM / HM" />
              <tbody>
                {sorted.map((m, i) => (
                  <MachineRow key={m.name} moveName={m.name} activeGeneration={activeGeneration} index={i} />
                ))}
              </tbody>
            </>
          )}
          {activeMethod === 'egg' && (
            <>
              <MoveTableHead firstCol={null} />
              <tbody>
                {sorted.map((m, i) => (
                  <EggMoveRow
                    key={m.name}
                    moveName={m.name}
                    index={i}
                    onSelectPokemon={onSelectPokemon}
                    currentPokemonId={currentPokemonId}
                  />
                ))}
              </tbody>
            </>
          )}
          {activeMethod === 'tutor' && (
            <>
              <MoveTableHead firstCol={null} />
              <tbody>
                {sorted.map((m, i) => (
                  <BasicMoveRow key={m.name} moveName={m.name} index={i} />
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </div>
  )
}

// ── EncounterList ──────────────────────────────────────────────────────────

function EncounterList({ pokemonId, activeGeneration }) {
  const { data: encounters, isLoading } = usePokemonEncounters(pokemonId)
  const gen = activeGeneration ? parseInt(activeGeneration, 10) : null

  if (gen >= 8) {
    return (
      <div className="text-center py-10 text-sub">
        <p className="text-2xl mb-2">🗺️</p>
        <p className="text-sm">Location data is not tracked for Gen VIII / IX.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const filtered = (encounters ?? [])
    .map((enc) => ({
      ...enc,
      version_details: enc.version_details.filter((vd) => {
        const vGen = VERSION_TO_GEN[vd.version.name]
        if (!vGen) return false
        return gen ? vGen === gen : vGen <= 7
      }),
    }))
    .filter((enc) => enc.version_details.length > 0)
    .sort((a, b) => a.location_area.name.localeCompare(b.location_area.name))

  if (filtered.length === 0) {
    return (
      <p className="text-sub text-sm text-center py-10">
        {gen
          ? `Not encountered in the wild in any Gen ${gen} game.`
          : 'Not found in the wild in any known location.'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map((enc) => {
        const areaName    = enc.location_area.name
        const displayName = formatLocationName(areaName)
        const wikiUrl     = bulbapediaLocationUrl(areaName)

        // Build groups: for each version, sum chance per distinct set of time conditions,
        // then collapse versions that share identical (chance, times) into one row.
        const groups = {}
        for (const vd of enc.version_details) {
          const label = VERSION_LABELS[vd.version.name]
          if (!label) continue

          // Sum encounter slot chances per time-of-day condition set
          const byTime = {}
          for (const detail of vd.encounter_details) {
            const times = [...new Set(
              detail.condition_values
                .filter((cv) => cv.name.startsWith('time-'))
                .map((cv) => TIME_LABELS[cv.name] ?? formatName(cv.name))
            )].sort()
            const timeKey = times.join(',')
            if (!byTime[timeKey]) byTime[timeKey] = { times, chance: 0 }
            byTime[timeKey].chance += detail.chance
          }
          // Fall back to max_chance when no encounter_details carry time conditions
          if (Object.keys(byTime).length === 0) {
            byTime[''] = { times: [], chance: vd.max_chance }
          }

          for (const { times, chance } of Object.values(byTime)) {
            const key = `${chance}::${times.join(',')}`
            if (!groups[key]) groups[key] = { rate: chance, times, versions: [] }
            if (!groups[key].versions.includes(label)) groups[key].versions.push(label)
          }
        }
        const groupList = Object.values(groups).sort((a, b) => b.rate - a.rate)

        return (
          <div key={areaName} className="bg-card border border-border rounded-lg px-3 py-2.5">
            <a
              href={wikiUrl}
              target="_blank"
              rel="noreferrer"
              className="text-fg text-xs font-medium hover:text-accent hover:underline inline-block mb-1.5"
            >
              {displayName}
            </a>
            <div className="space-y-1">
              {groupList.map((g, gi) => (
                <div key={gi} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                  <span className="font-mono font-semibold text-fg">{g.rate}%</span>
                  {g.times.map((t) => (
                    <span key={t} className="text-accent border border-accent/30 bg-accent/10 rounded px-1 py-px">
                      {t}
                    </span>
                  ))}
                  <span className="text-dim">{g.versions.join(' · ')}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── StatBar ────────────────────────────────────────────────────────────────

function StatBar({ statKey, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-sub w-8 text-right shrink-0 font-medium">{STAT_LABELS[statKey]}</span>
      <span className="text-fg font-mono w-8 text-right shrink-0">{value}</span>
      <div className="flex-1 bg-card rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${Math.min((value / STAT_MAX) * 100, 100)}%`, backgroundColor: STAT_COLORS[statKey] }}
        />
      </div>
    </div>
  )
}

function flattenChain(chain) {
  const result = []
  function walk(node) {
    const id = parseInt(node.species.url.split('/').filter(Boolean).at(-1), 10)
    result.push({ name: node.species.name, id })
    for (const next of node.evolves_to) walk(next)
  }
  walk(chain)
  return result
}

// ── AddToPartyModal ────────────────────────────────────────────────────────

function AddToPartyModal({ pokemonId, pokemonName, onClose }) {
  const { parties, addParty, updateParty } = useParties()
  const [newName, setNewName]   = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('')

  const addToParty = (party) => {
    const members = party.members ?? []
    if (members.length >= 6) { setFeedback(`${party.name} is full (6/6).`); return }
    updateParty(party.id, {
      members: [...members, { pokemonId, nickname: '', nature: '', heldItem: '', notes: '', shiny: false }],
    })
    setFeedback(`Added to ${party.name}!`)
    setTimeout(onClose, 1000)
  }

  const createAndAdd = () => {
    if (!newName.trim()) return
    addParty(newName.trim())
    // Zustand is synchronous — getState() reads the updated parties immediately
    const newParty = useUserStore.getState().parties.at(-1)
    updateParty(newParty.id, {
      members: [{ pokemonId, nickname: '', nature: '', heldItem: '', notes: '', shiny: false }],
    })
    setFeedback(`Added to ${newName.trim()}!`)
    setTimeout(onClose, 1000)
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface border border-border2 rounded-xl p-5 w-72 shadow-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-fg font-semibold text-sm">Add {formatName(pokemonName)} to party</h3>
          <button onClick={onClose} className="text-dim hover:text-fg"><X size={14} /></button>
        </div>

        {feedback ? (
          <p className="text-green-400 text-sm text-center py-3">{feedback}</p>
        ) : (
          <>
            {parties.length === 0 && !creating && (
              <p className="text-sub text-xs text-center mb-3">No parties yet — create one below.</p>
            )}

            {parties.length > 0 && (
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                {parties.map((party) => {
                  const count = (party.members ?? []).length
                  const full  = count >= 6
                  return (
                    <button
                      key={party.id}
                      onClick={() => addToParty(party)}
                      disabled={full}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border transition-colors ${
                        full
                          ? 'border-border text-dim cursor-not-allowed'
                          : 'border-border text-fg hover:border-accent hover:text-accent'
                      }`}
                    >
                      <span>{party.name}</span>
                      <span className={`font-mono ${full ? 'text-red-400' : 'text-sub'}`}>{count}/6</span>
                    </button>
                  )
                })}
              </div>
            )}

            {creating ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                  placeholder="New party name…"
                  className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-fg text-xs focus:outline-none focus:border-border2"
                />
                <button onClick={createAndAdd} className="px-2 py-1.5 bg-accent text-white rounded-lg text-xs">Add</button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-xs text-sub hover:text-accent border border-dashed border-border hover:border-accent rounded-lg py-2 transition-colors"
              >
                + New party
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── PokemonDetail ──────────────────────────────────────────────────────────

const TABS = ['overview', 'moves', 'encounters']

export default function PokemonDetail({ pokemon, onClose, onSelectPokemon, initialTab = 'overview' }) {
  const [shiny, setShiny]               = useState(false)
  const [imgError, setImgError]         = useState(false)
  const [activeTab, setActiveTab]       = useState(initialTab)
  const [prevId, setPrevId]             = useState(pokemon.id)
  const [addToPartyOpen, setAddToPartyOpen] = useState(false)

  const activeGeneration = useUserStore((s) => s.activeGeneration)

  // Reset state when the displayed pokemon changes (store-previous-render pattern)
  if (prevId !== pokemon.id) {
    setPrevId(pokemon.id)
    setActiveTab(initialTab)
    setShiny(false)
    setImgError(false)
    setAddToPartyOpen(false)
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

  const types = pokemon.types.map((t) => t.type.name)

  const { data: species, isLoading: speciesLoading } = usePokemonSpecies(pokemon.id)
  const { data: evoChain } = useEvolutionChain(species?.evolution_chain?.url)
  const { data: rawMatrix } = useTypeChart()

  const matrix = useMemo(
    () => patchMatrixForGen(rawMatrix, activeGeneration),
    [rawMatrix, activeGeneration]
  )

  const weaknesses  = matrix ? getWeaknesses(matrix, types)  : []
  const resistances = matrix ? getResistances(matrix, types) : []
  const immunities  = matrix ? getImmunities(matrix, types)  : []

  const evolution  = evoChain ? flattenChain(evoChain.chain) : []
  const totalStats = pokemon.stats.reduce((s, { base_stat }) => s + base_stat, 0)
  const artworkUrl = shiny ? shinyArtworkUrl(pokemon.id) : officialArtworkUrl(pokemon.id)

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" aria-label={`${formatName(pokemon.name)} details`}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-surface border border-border2 rounded-2xl w-full max-w-2xl shadow-2xl my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="sticky top-0 bg-surface rounded-t-2xl z-10 border-b border-border">
              <div className="flex items-start justify-between p-5 pb-3">
                <div>
                  <span className="text-dim font-mono text-xs">#{padId(pokemon.id)}</span>
                  <h2 className="text-fg font-bold text-2xl">{formatName(pokemon.name)}</h2>
                  <div className="flex gap-1.5 mt-1.5">
                    {types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}
                  </div>
                </div>
                <button onClick={onClose} aria-label="Close"
                  className="p-1.5 rounded-lg text-sub hover:text-fg hover:bg-card transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-5 gap-1">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm border-b-2 transition-colors capitalize ${
                      activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-sub hover:text-fg'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* ── OVERVIEW ─────────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <>
                  {/* Shiny toggle + hint — top right */}
                  <div className="flex justify-end items-center gap-2 mb-1">
                    <p className="text-dim text-[10px]">Middle-click sprite to add to a party</p>
                    <button
                      onClick={() => { setShiny((s) => !s); setImgError(false) }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        shiny ? 'border-yellow-400 text-yellow-300 bg-yellow-400/10' : 'border-border2 text-sub hover:text-fg'
                      }`}
                    >
                      ✨ {shiny ? 'Shiny' : 'Default'}
                    </button>
                  </div>

                  {/* Artwork */}
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={imgError ? frontSpriteUrl(pokemon.id) : artworkUrl}
                      alt={formatName(pokemon.name)}
                      onError={() => setImgError(true)}
                      onMouseDown={(e) => {
                        if (e.button === 1) { e.preventDefault(); setAddToPartyOpen(true) }
                      }}
                      key={artworkUrl}
                      className="w-48 h-48 object-contain cursor-pointer"
                      title="Middle-click to add to a party"
                    />
                  </div>

                  {/* Base stats */}
                  <section>
                    <h3 className="text-fg font-semibold mb-3">Base Stats</h3>
                    <div className="space-y-2">
                      {pokemon.stats.map(({ stat, base_stat }) => (
                        <StatBar key={stat.name} statKey={stat.name} value={base_stat} />
                      ))}
                    </div>
                    <p className="text-dim text-xs text-right mt-2">Total: {totalStats}</p>
                  </section>

                  {/* Type matchups */}
                  {matrix && (
                    <section>
                      <h3 className="text-fg font-semibold mb-3">Type Matchups</h3>
                      <div className="space-y-3">
                        {weaknesses.length > 0 && (
                          <div>
                            <p className="text-dim text-xs mb-1">Weak to</p>
                            <div className="flex flex-wrap gap-1">
                              {weaknesses.map(([type, mult]) => (
                                <span key={type} className="flex items-baseline gap-0.5">
                                  <TypeBadge type={type} size="xs" />
                                  {mult > 2 && <sup className="text-fg text-[9px]">{mult}×</sup>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {resistances.length > 0 && (
                          <div>
                            <p className="text-dim text-xs mb-1">Resists</p>
                            <div className="flex flex-wrap gap-1">
                              {resistances.map(([type]) => <TypeBadge key={type} type={type} size="xs" />)}
                            </div>
                          </div>
                        )}
                        {immunities.length > 0 && (
                          <div>
                            <p className="text-dim text-xs mb-1">Immune to</p>
                            <div className="flex flex-wrap gap-1">
                              {immunities.map((t) => <TypeBadge key={t} type={t} size="xs" />)}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Abilities */}
                  <section>
                    <h3 className="text-fg font-semibold mb-3">Abilities</h3>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.abilities.map(({ ability, is_hidden }) => (
                        <AbilityBadge key={ability.name} abilityName={ability.name} isHidden={is_hidden} />
                      ))}
                    </div>
                  </section>

                  {/* Physical data */}
                  {!speciesLoading && species && (
                    <section className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Height',   value: `${(pokemon.height / 10).toFixed(1)} m` },
                        { label: 'Weight',   value: `${(pokemon.weight / 10).toFixed(1)} kg` },
                        { label: 'Base Exp', value: pokemon.base_experience ?? '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-card rounded-lg p-3 text-center border border-border">
                          <p className="text-dim text-xs mb-1">{label}</p>
                          <p className="text-fg font-semibold">{value}</p>
                        </div>
                      ))}
                    </section>
                  )}

                  {/* Evolution chain — larger sprites, clickable */}
                  {evolution.length > 1 && (
                    <section>
                      <h3 className="text-fg font-semibold mb-4">Evolution Chain</h3>
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {evolution.map((stage, i) => (
                          <div key={stage.id} className="flex items-center gap-2">
                            {i > 0 && <ChevronRight size={18} className="text-dim shrink-0" />}
                            <button
                              onClick={() => stage.id !== pokemon.id && onSelectPokemon?.(stage.id)}
                              className={`flex flex-col items-center rounded-xl p-2 transition-all ${
                                stage.id === pokemon.id
                                  ? 'ring-2 ring-accent bg-accent2 cursor-default'
                                  : 'hover:bg-card cursor-pointer hover:scale-105'
                              }`}
                            >
                              <img
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${stage.id}.png`}
                                alt={stage.name}
                                className="w-20 h-20 object-contain"
                                loading="lazy"
                              />
                              <span className={`text-xs mt-0.5 ${stage.id === pokemon.id ? 'text-accent font-semibold' : 'text-sub'}`}>
                                {formatName(stage.name)}
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* ── MOVES ────────────────────────────────────────────────── */}
              {activeTab === 'moves' && (
                <section>
                  <p className="text-dim text-xs mb-4">
                    {activeGeneration
                      ? `Showing moves for Generation ${activeGeneration}. Hover a move name for details.`
                      : 'No generation selected — showing Gen IX. Hover a move name for details.'}
                  </p>
                  <Learnset
                    moves={pokemon.moves}
                    activeGeneration={activeGeneration}
                    onSelectPokemon={onSelectPokemon}
                    currentPokemonId={pokemon.id}
                  />
                </section>
              )}

              {/* ── ENCOUNTERS ───────────────────────────────────────────── */}
              {activeTab === 'encounters' && (
                <section>
                  <p className="text-dim text-xs mb-4">
                    {activeGeneration
                      ? `Wild encounter locations in Generation ${activeGeneration}.`
                      : 'Wild encounter locations across all generations (up to Gen VII).'}
                  </p>
                  <EncounterList pokemonId={pokemon.id} activeGeneration={activeGeneration} />
                </section>
              )}
            </div>
          </div>
        </div>
      </div>

      {addToPartyOpen && (
        <AddToPartyModal
          pokemonId={pokemon.id}
          pokemonName={pokemon.name}
          onClose={() => setAddToPartyOpen(false)}
        />
      )}
    </div>
  )
}
