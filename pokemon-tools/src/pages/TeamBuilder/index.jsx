import { useState, useMemo } from 'react'
import { Plus, Trash2, X, Share2 } from 'lucide-react'
import { useTeams } from '../../hooks/useUserData'
import { useTypeChart } from '../../hooks/useTypeChart'
import { usePokemon } from '../../hooks/usePokemon'
import PokemonPicker from '../../components/PokemonPicker'
import TypeBadge from '../../components/TypeBadge'
import { TYPE_LIST } from '../../constants/types'
import { formatName, officialArtworkUrl } from '../../utils/formatting'

function Slot({ pokemonId, onRemove, onAdd }) {
  const { data } = usePokemon(pokemonId)
  if (!pokemonId) {
    return (
      <button
        onClick={onAdd}
        className="flex flex-col items-center justify-center w-full aspect-square bg-card border-2 border-dashed border-border hover:border-border2 rounded-xl transition-colors text-dim hover:text-sub"
        aria-label="Add Pokémon"
      >
        <Plus size={24} />
        <span className="text-xs mt-1">Add</span>
      </button>
    )
  }
  return (
    <div className="relative group">
      <div className="bg-card border border-border rounded-xl p-2">
        {data ? (
          <>
            <img src={officialArtworkUrl(pokemonId)} alt={formatName(data.name)} className="w-full aspect-square object-contain" />
            <p className="text-fg text-xs text-center font-medium mt-1 truncate">{formatName(data.name)}</p>
            <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
              {data.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} size="xs" />)}
            </div>
          </>
        ) : (
          <div className="aspect-square bg-surface rounded-lg animate-pulse" />
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-accent text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// Hooks must be called unconditionally — load all 6 slots' data here
function TeamCoverage({ pokemonIds, matrix }) {
  const p0 = usePokemon(pokemonIds[0])
  const p1 = usePokemon(pokemonIds[1])
  const p2 = usePokemon(pokemonIds[2])
  const p3 = usePokemon(pokemonIds[3])
  const p4 = usePokemon(pokemonIds[4])
  const p5 = usePokemon(pokemonIds[5])

  const allData = [p0, p1, p2, p3, p4, p5].map((q) => q.data).filter(Boolean)

  const coverage = useMemo(() => {
    if (!matrix || allData.length === 0) return null
    const result = {}
    for (const atk of TYPE_LIST) {
      let weakCount = 0, resistCount = 0
      for (const poke of allData) {
        const types = poke.types.map((t) => t.type.name)
        let mult = 1
        for (const def of types) mult *= matrix[atk][def] ?? 1
        if (mult > 1) weakCount++
        if (mult < 1) resistCount++
      }
      result[atk] = { weakCount, resistCount }
    }
    return result
  // allData.length is the stable dependency — allData itself rebuilds every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, allData.length])

  if (!coverage) return null

  const weaknesses  = TYPE_LIST.filter((t) => coverage[t].weakCount >= 2)
  const resistances = TYPE_LIST.filter((t) => coverage[t].resistCount >= 3)

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mt-4">
      <h3 className="text-fg font-semibold mb-3">Team Coverage</h3>
      {weaknesses.length > 0 && (
        <div className="mb-2">
          <p className="text-dim text-xs mb-1">2+ members weak to:</p>
          <div className="flex flex-wrap gap-1">{weaknesses.map((t) => <TypeBadge key={t} type={t} size="xs" />)}</div>
        </div>
      )}
      {resistances.length > 0 && (
        <div>
          <p className="text-dim text-xs mb-1">3+ members resist:</p>
          <div className="flex flex-wrap gap-1">{resistances.map((t) => <TypeBadge key={t} type={t} size="xs" />)}</div>
        </div>
      )}
      {weaknesses.length === 0 && resistances.length === 0 && allData.length > 0 && (
        <p className="text-sub text-xs">Great coverage — no shared weaknesses detected.</p>
      )}
      {allData.length === 0 && (
        <p className="text-sub text-xs">Add Pokémon to see coverage analysis.</p>
      )}
    </div>
  )
}

export default function TeamBuilder() {
  const { teams, addTeam, updateTeam, deleteTeam } = useTeams()
  const { data: matrix } = useTypeChart()

  const [activeTeamId, setActiveTeamId] = useState(null)
  const [pickerSlot, setPickerSlot]     = useState(null)
  const [newTeamName, setNewTeamName]   = useState('')
  const [showNewTeam, setShowNewTeam]   = useState(false)

  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0]
  const slots = Array.from({ length: 6 }, (_, i) => activeTeam?.pokemonIds?.[i] ?? null)

  const addPokemon = (slot, pokemon) => {
    if (!activeTeam) return
    const ids = [...(activeTeam.pokemonIds ?? [])]
    ids[slot] = pokemon.id
    updateTeam(activeTeam.id, { pokemonIds: ids.filter(Boolean) })
  }

  const removePokemon = (slot) => {
    if (!activeTeam) return
    const ids = [...(activeTeam.pokemonIds ?? [])]
    ids.splice(slot, 1)
    updateTeam(activeTeam.id, { pokemonIds: ids })
  }

  const createTeam = () => {
    if (!newTeamName.trim()) return
    addTeam(newTeamName.trim())
    setNewTeamName('')
    setShowNewTeam(false)
  }

  const shareTeam = () => {
    if (!activeTeam) return
    const params = new URLSearchParams({ ids: activeTeam.pokemonIds.join(',') })
    navigator.clipboard
      .writeText(`${window.location.origin}/team-builder?${params}`)
      .then(() => alert('Team URL copied!'))
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-fg text-2xl font-bold">Team Builder</h1>
        <p className="text-sub text-sm mt-1">Build, save, and analyse teams of 6</p>
      </div>

      {/* Team tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {teams.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTeamId(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              activeTeam?.id === t.id
                ? 'border-accent text-accent bg-accent2'
                : 'border-border text-sub hover:text-fg'
            }`}
          >
            {t.name}
          </button>
        ))}
        {!showNewTeam ? (
          <button
            onClick={() => setShowNewTeam(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-dashed border-border text-dim hover:text-sub"
          >
            <Plus size={14} /> New Team
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createTeam()}
              placeholder="Team name…"
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-fg text-sm focus:outline-none focus:border-border2 w-36"
            />
            <button onClick={createTeam} className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm">Save</button>
            <button onClick={() => setShowNewTeam(false)} className="text-sub px-2"><X size={16} /></button>
          </div>
        )}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-16 text-sub">
          <p className="text-4xl mb-3">👥</p>
          <p>Create a team to get started.</p>
        </div>
      )}

      {activeTeam && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-fg font-semibold">{activeTeam.name}</h2>
            <div className="flex gap-3">
              <button onClick={shareTeam} className="flex items-center gap-1.5 text-sub text-xs hover:text-fg">
                <Share2 size={14} /> Share
              </button>
              <button
                onClick={() => { deleteTeam(activeTeam.id); setActiveTeamId(null) }}
                className="flex items-center gap-1.5 text-dim text-xs hover:text-accent"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-2">
            {slots.map((id, i) => (
              <Slot
                key={i}
                pokemonId={id}
                onRemove={() => removePokemon(i)}
                onAdd={() => setPickerSlot(i)}
              />
            ))}
          </div>
          <p className="text-dim text-xs text-right">{activeTeam.pokemonIds?.length ?? 0} / 6</p>

          <TeamCoverage pokemonIds={slots} matrix={matrix} />
        </>
      )}

      {pickerSlot !== null && (
        <PokemonPicker
          onSelect={(p) => addPokemon(pickerSlot, p)}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  )
}
