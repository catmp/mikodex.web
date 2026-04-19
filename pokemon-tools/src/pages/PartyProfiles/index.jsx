import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useParties } from '../../hooks/useUserData'
import PokemonPicker from '../../components/PokemonPicker'
import { officialArtworkUrl } from '../../utils/formatting'

const NATURES = [
  'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
  'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
  'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky',
]

const EMPTY_MEMBER = { pokemonId: null, nickname: '', nature: '', heldItem: '', notes: '' }

function MemberSlot({ member, onUpdate, onRemove }) {
  const [picking, setPicking] = useState(false)

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        {/* Sprite / picker trigger */}
        <button
          onClick={() => setPicking(true)}
          className="shrink-0 w-16 h-16 bg-surface rounded-lg border border-border hover:border-border2 flex items-center justify-center overflow-hidden"
        >
          {member.pokemonId ? (
            <img src={officialArtworkUrl(member.pokemonId)} alt="" className="w-full h-full object-contain" />
          ) : (
            <Plus size={20} className="text-dim" />
          )}
        </button>

        <div className="flex-1 space-y-1.5">
          <input
            value={member.nickname}
            onChange={(e) => onUpdate({ nickname: e.target.value })}
            placeholder={member.pokemonId ? 'Nickname' : 'Pick a Pokémon first'}
            className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-fg text-sm placeholder:text-dim focus:outline-none focus:border-border2"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={member.nature}
              onChange={(e) => onUpdate({ nature: e.target.value })}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-fg text-xs focus:outline-none"
            >
              <option value="">Nature…</option>
              {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input
              value={member.heldItem}
              onChange={(e) => onUpdate({ heldItem: e.target.value })}
              placeholder="Held item"
              className="bg-surface border border-border rounded-lg px-2 py-1 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2"
            />
          </div>
        </div>

        <button onClick={onRemove} className="text-dim hover:text-accent mt-0.5" aria-label="Remove slot">
          <X size={14} />
        </button>
      </div>

      <textarea
        value={member.notes}
        onChange={(e) => onUpdate({ notes: e.target.value })}
        placeholder="Notes (moveset, EVs, strategy…)"
        rows={2}
        className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2 resize-none"
      />

      {picking && (
        <PokemonPicker
          onSelect={(p) => { onUpdate({ pokemonId: p.id }); setPicking(false) }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}

function PartyCard({ party, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [editName, setEditName] = useState(false)
  const [name, setName]         = useState(party.name)

  // Always render 6 slots (pad with empty if needed)
  const members = useMemo(() => {
    const filled = party.members ?? []
    return Array.from({ length: 6 }, (_, i) => filled[i] ?? { ...EMPTY_MEMBER })
  }, [party.members])

  const updateMember = (index, updates) => {
    const next = members.map((m, i) => (i === index ? { ...m, ...updates } : m))
    // Trim trailing completely-empty slots before saving
    let lastFilled = next.length - 1
    while (lastFilled > 0 && !next[lastFilled].pokemonId && !next[lastFilled].nickname) {
      lastFilled--
    }
    onUpdate({ members: next.slice(0, lastFilled + 1) })
  }

  const removeMember = (index) => {
    const next = [...members]
    next[index] = { ...EMPTY_MEMBER }
    let lastFilled = next.length - 1
    while (lastFilled > 0 && !next[lastFilled].pokemonId && !next[lastFilled].nickname) {
      lastFilled--
    }
    onUpdate({ members: next.slice(0, lastFilled + 1) })
  }

  const saveName = () => {
    if (name.trim()) onUpdate({ name: name.trim() })
    setEditName(false)
  }

  return (
    <div className="bg-surface border border-border rounded-xl">
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {editName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              className="bg-card border border-border2 rounded px-2 py-0.5 text-fg text-sm focus:outline-none"
            />
          ) : (
            <h3 className="text-fg font-semibold">{party.name}</h3>
          )}
          <button onClick={(e) => { e.stopPropagation(); setEditName(true) }} className="text-dim hover:text-sub">
            <Edit2 size={12} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Sprite preview row */}
          <div className="flex gap-0.5">
            {(party.members ?? []).slice(0, 6).map((m, i) =>
              m?.pokemonId ? (
                <img key={i} src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.pokemonId}.png`} alt="" className="w-6 h-6 object-contain" />
              ) : null
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-dim hover:text-accent"><Trash2 size={14} /></button>
          {expanded ? <ChevronUp size={16} className="text-sub" /> : <ChevronDown size={16} className="text-sub" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {members.map((member, i) => (
            <MemberSlot
              key={i}
              member={member}
              onUpdate={(u) => updateMember(i, u)}
              onRemove={() => removeMember(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PartyProfiles() {
  const { parties, addParty, updateParty, deleteParty } = useParties()
  const [newName, setNewName]   = useState('')
  const [creating, setCreating] = useState(false)

  const create = () => {
    if (!newName.trim()) return
    addParty(newName.trim())
    setNewName('')
    setCreating(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-fg text-2xl font-bold">Party Profiles</h1>
          <p className="text-sub text-sm mt-1">Named snapshots of your actual trained parties</p>
        </div>
        {!creating ? (
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90">
            <Plus size={16} /> New Party
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Party name…"
              className="bg-card border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-border2"
            />
            <button onClick={create} className="px-3 py-2 bg-accent text-white rounded-lg text-sm">Save</button>
            <button onClick={() => setCreating(false)} className="text-sub px-2"><X size={16} /></button>
          </div>
        )}
      </div>

      {parties.length === 0 && (
        <div className="text-center py-16 text-sub">
          <p className="text-4xl mb-3">🎮</p>
          <p>No parties yet. Create one to track your real roster.</p>
        </div>
      )}

      <div className="space-y-3">
        {parties.map((party) => (
          <PartyCard
            key={party.id}
            party={party}
            onUpdate={(u) => updateParty(party.id, u)}
            onDelete={() => deleteParty(party.id)}
          />
        ))}
      </div>
    </div>
  )
}
