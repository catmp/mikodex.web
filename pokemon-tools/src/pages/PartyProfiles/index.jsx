import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Tv2, Download } from 'lucide-react'
import { useParties } from '../../hooks/useUserData'
import { usePokemon } from '../../hooks/usePokemon'
import PokemonPicker from '../../components/PokemonPicker'
import PokemonDetail from '../Pokedex/PokemonDetail'
import { officialArtworkUrl, shinyArtworkUrl } from '../../utils/formatting'
import { getPokemon } from '../../api/pokemon'
import { TYPE_COLORS } from '../../constants/types'

const NATURES = [
  'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
  'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
  'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky',
]

const EMPTY_MEMBER = {
  pokemonId: null, nickname: '', nature: '', heldItem: '', notes: '', shiny: false,
}

// ── Showdown import parser ────────────────────────────────────────────────────

function parseShowdownMember(text) {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return null

  // Line 1: "Nickname (Species) @ Item" | "Species @ Item" | "Species"
  let rawName = lines[0]
  let heldItem = ''
  let nickname = ''

  const atIdx = rawName.lastIndexOf(' @ ')
  if (atIdx !== -1) {
    heldItem = rawName.slice(atIdx + 3).trim()
    rawName  = rawName.slice(0, atIdx).trim()
  }
  const parenMatch = rawName.match(/^(.+?)\s*\((.+?)\)$/)
  if (parenMatch) {
    nickname = parenMatch[1].trim()
    rawName  = parenMatch[2].trim()
  }

  // Normalize to PokeAPI slug (lowercase, spaces/special chars → hyphens)
  const pokemonSlug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  let nature = ''
  let shiny  = false
  const moves = []
  let evText  = ''
  let ivText  = ''

  for (const line of lines.slice(1)) {
    if (line.startsWith('- ')) {
      moves.push(line.slice(2).trim())
    } else if (/^Shiny:\s*Yes/i.test(line)) {
      shiny = true
    } else if (/^(\w+)\s+Nature$/i.test(line)) {
      nature = line.match(/^(\w+)\s+Nature$/i)[1]
    } else if (/^EVs:/i.test(line)) {
      evText = line.replace(/^EVs:/i, '').trim()
    } else if (/^IVs:/i.test(line)) {
      ivText = line.replace(/^IVs:/i, '').trim()
    }
  }

  const noteParts = []
  if (moves.length) noteParts.push(`Moves: ${moves.join(', ')}`)
  if (evText) noteParts.push(`EVs: ${evText}`)
  if (ivText) noteParts.push(`IVs: ${ivText}`)

  return { pokemonSlug, nickname, heldItem, nature, shiny, notes: noteParts.join('\n') }
}

// ── Idle Mode ─────────────────────────────────────────────────────────────────

const INFO_MODE_LABELS = ['Sprites', 'Types', 'Types + Items', 'Types + Items + Moves']

function extractMoves(notes) {
  if (!notes) return []
  const line = notes.split('\n').find((l) => /^Moves:/i.test(l))
  if (line) return line.replace(/^Moves:/i, '').trim().split(',').map((m) => m.trim()).filter(Boolean)
  return []
}

function IdleSlot({ pokemonId, pokemonName, displayName, types, shiny, heldItem, moves, infoMode, onViewDetail }) {
  const [hasSprite, setHasSprite] = useState(true)

  const showdownName = (pokemonName ?? String(pokemonId)).replace(/-/g, '')
  const gen5Url = shiny
    ? `https://play.pokemonshowdown.com/sprites/gen5ani-shiny/${showdownName}.gif`
    : `https://play.pokemonshowdown.com/sprites/gen5ani/${showdownName}.gif`

  const color1 = TYPE_COLORS[types[0]]?.bg ?? '#ffffff'
  const color2 = types[1] ? (TYPE_COLORS[types[1]]?.bg ?? color1) : null

  const nameStyle = color2
    ? {
        background: `linear-gradient(90deg, ${color1}, ${color2})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : { color: color1 }

  const middleClick = (e) => {
    if (e.button === 1) { e.preventDefault(); onViewDetail?.(pokemonId) }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      {/* Fixed-size container — sprite renders at natural size, never upscaled */}
      <div
        className="flex items-center justify-center cursor-pointer"
        style={{ width: 96, height: 96 }}
        onMouseDown={middleClick}
        title="Middle-click to view details"
      >
        {hasSprite ? (
          <img
            src={gen5Url}
            alt={displayName}
            style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated', objectFit: 'contain' }}
            onError={() => setHasSprite(false)}
          />
        ) : (
          <span className="text-lg font-bold text-center leading-tight break-words px-1" style={nameStyle}>
            {displayName}
          </span>
        )}
      </div>

      <span className="text-white/40 text-[10px] text-center leading-tight">{displayName}</span>

      {infoMode >= 1 && types.length > 0 && (
        <div className="flex gap-1 justify-center flex-wrap">
          {types.map((t) => (
            <span
              key={t}
              className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: TYPE_COLORS[t]?.bg ?? '#888', color: TYPE_COLORS[t]?.text ?? '#fff' }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {infoMode >= 2 && heldItem && (
        <span className="text-white/45 text-[9px] text-center leading-tight">{heldItem}</span>
      )}

      {infoMode >= 3 && moves.length > 0 && (
        <div className="text-center space-y-0.5">
          {moves.map((m) => (
            <div key={m} className="text-white/35 text-[8px] leading-tight">{m}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function IdleMode({ party, onClose, onViewDetail }) {
  const [infoMode, setInfoMode] = useState(0)

  const members = useMemo(
    () => (party.members ?? []).filter((m) => m?.pokemonId),
    [party.members]
  )

  const memberIds = useMemo(() => members.map((m) => m.pokemonId), [members])

  const pokemonResults = useQueries({
    queries: memberIds.map((id) => ({
      queryKey: ['pokemon', String(id)],
      queryFn:  () => getPokemon(id),
      staleTime: Infinity,
    })),
  })

  const pokemonMap = useMemo(() => {
    const map = {}
    memberIds.forEach((id, i) => {
      if (pokemonResults[i]?.data) map[id] = pokemonResults[i].data
    })
    return map
  }, [memberIds, pokemonResults])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === ' ') { e.preventDefault(); setInfoMode((m) => (m + 1) % 4) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        aria-label="Exit idle mode"
        className="absolute top-5 right-5 text-white/30 hover:text-white/80 transition-colors"
      >
        <X size={22} />
      </button>

      <p className="text-white/20 text-xs tracking-[0.3em] uppercase mb-10 font-semibold">
        {party.name}
      </p>

      {members.length === 0 ? (
        <p className="text-white/30 text-sm">No Pokémon in this party.</p>
      ) : (
        <div className="flex flex-nowrap justify-center gap-8 px-8 items-start">
          {members.map((member) => {
            const pokemon     = pokemonMap[member.pokemonId]
            const types       = pokemon?.types?.map((t) => t.type.name) ?? []
            const displayName = member.nickname || pokemon?.name || `#${member.pokemonId}`
            const moves       = extractMoves(member.notes)
            return (
              <IdleSlot
                key={member.pokemonId}
                pokemonId={member.pokemonId}
                pokemonName={pokemon?.name}
                displayName={displayName}
                types={types}
                shiny={member.shiny ?? false}
                heldItem={member.heldItem || ''}
                moves={moves}
                infoMode={infoMode}
                onViewDetail={onViewDetail}
              />
            )
          })}
        </div>
      )}

      <div className="absolute bottom-5 flex flex-col items-center gap-1">
        <p className="text-white/25 text-[10px] tracking-wide">{INFO_MODE_LABELS[infoMode]}</p>
        <p className="text-white/15 text-[10px]">Space to cycle info · Esc to exit · Middle-click for details</p>
      </div>
    </div>,
    document.body
  )
}

// ── Party components ──────────────────────────────────────────────────────────

function MemberSlot({ member, onUpdate, onRemove, onViewDetail }) {
  const [picking, setPicking]       = useState(false)
  const [importing, setImporting]   = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  const queryClient = useQueryClient()

  const spriteUrl = member.pokemonId
    ? (member.shiny ? shinyArtworkUrl(member.pokemonId) : officialArtworkUrl(member.pokemonId))
    : null

  const handleImport = async () => {
    const parsed = parseShowdownMember(importText)
    if (!parsed) { setImportError('Could not parse set. Check the format.'); return }
    setImportLoading(true)
    setImportError('')
    try {
      const pokemon = await queryClient.fetchQuery({
        queryKey: ['pokemon', parsed.pokemonSlug],
        queryFn:  () => getPokemon(parsed.pokemonSlug),
        staleTime: Infinity,
      })
      onUpdate({
        pokemonId: pokemon.id,
        nickname:  parsed.nickname || '',
        nature:    parsed.nature || '',
        heldItem:  parsed.heldItem || '',
        shiny:     parsed.shiny,
        notes:     parsed.notes,
      })
      setImporting(false)
      setImportText('')
    } catch {
      setImportError('Pokémon not found. Check the name and try again.')
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-3">
        {/* Sprite / picker trigger */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => setPicking(true)}
            onMouseDown={(e) => {
              if (e.button === 1 && member.pokemonId) {
                e.preventDefault()
                onViewDetail?.(member.pokemonId)
              }
            }}
            title={member.pokemonId ? 'Left-click to change · Middle-click for details' : 'Pick a Pokémon'}
            className="w-16 h-16 bg-surface rounded-lg border border-border hover:border-border2 flex items-center justify-center overflow-hidden"
          >
            {spriteUrl ? (
              <img src={spriteUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <Plus size={20} className="text-dim" />
            )}
          </button>

          {member.pokemonId && (
            <button
              onClick={() => onUpdate({ shiny: !member.shiny })}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                member.shiny
                  ? 'border-yellow-400/60 text-yellow-300 bg-yellow-400/10'
                  : 'border-border text-dim hover:text-sub'
              }`}
            >
              ✨ {member.shiny ? 'Shiny' : 'Default'}
            </button>
          )}
        </div>

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

      {/* Showdown import panel */}
      {importing ? (
        <div className="space-y-1.5">
          <textarea
            autoFocus
            value={importText}
            onChange={(e) => { setImportText(e.target.value); setImportError('') }}
            placeholder={"Paste a Pokémon Showdown set here…\n\nIncineroar @ Sitrus Berry\nAbility: Intimidate\nShiny: Yes\nEVs: 252 HP / 252 Def / 4 SpD\nJolly Nature\n- Fake Out\n- Knock Off"}
            rows={5}
            className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2 resize-none font-mono"
          />
          {importError && <p className="text-red-400 text-[10px]">{importError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={importLoading || !importText.trim()}
              className="px-3 py-1 bg-accent text-white rounded-lg text-xs disabled:opacity-50"
            >
              {importLoading ? 'Importing…' : 'Import'}
            </button>
            <button
              onClick={() => { setImporting(false); setImportText(''); setImportError('') }}
              className="px-3 py-1 text-sub text-xs hover:text-fg border border-border rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setImporting(true)}
          className="flex items-center gap-1.5 text-dim hover:text-sub text-[10px] transition-colors"
        >
          <Download size={10} />
          Import from Pokémon Showdown
        </button>
      )}

      {picking && (
        <PokemonPicker
          onSelect={(p) => { onUpdate({ pokemonId: p.id }); setPicking(false) }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}

function PartyCard({ party, onUpdate, onDelete, onIdle, onViewDetail }) {
  const [expanded, setExpanded] = useState(false)
  const [editName, setEditName] = useState(false)
  const [name, setName]         = useState(party.name)

  const members = useMemo(() => {
    const filled = party.members ?? []
    return Array.from({ length: 6 }, (_, i) => filled[i] ?? { ...EMPTY_MEMBER })
  }, [party.members])

  const updateMember = (index, updates) => {
    const next = members.map((m, i) => (i === index ? { ...m, ...updates } : m))
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

  const hasMembers = (party.members ?? []).some((m) => m?.pokemonId)

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
          <div className="flex gap-0.5">
            {(party.members ?? []).slice(0, 6).map((m, i) =>
              m?.pokemonId ? (
                <img
                  key={i}
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.pokemonId}.png`}
                  alt=""
                  className="w-6 h-6 object-contain"
                />
              ) : null
            )}
          </div>

          {hasMembers && (
            <button
              onClick={(e) => { e.stopPropagation(); onIdle() }}
              aria-label="Idle mode"
              title="Idle mode"
              className="text-dim hover:text-accent transition-colors"
            >
              <Tv2 size={14} />
            </button>
          )}

          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-dim hover:text-accent">
            <Trash2 size={14} />
          </button>
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
              onViewDetail={onViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartyProfiles() {
  const { parties, addParty, updateParty, deleteParty } = useParties()
  const [newName, setNewName]     = useState('')
  const [creating, setCreating]   = useState(false)
  const [idleParty, setIdleParty] = useState(null)
  const [detailId, setDetailId]   = useState(null)

  const { data: detailPokemon } = usePokemon(detailId)

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
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
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
            onIdle={() => setIdleParty(party)}
            onViewDetail={(id) => setDetailId(id)}
          />
        ))}
      </div>

      {idleParty && (
        <IdleMode
          party={idleParty}
          onClose={() => setIdleParty(null)}
          onViewDetail={(id) => { setIdleParty(null); setDetailId(id) }}
        />
      )}

      {detailId && detailPokemon && (
        <PokemonDetail
          pokemon={detailPokemon}
          onClose={() => setDetailId(null)}
          onSelectPokemon={(id) => setDetailId(id)}
        />
      )}
    </div>
  )
}
