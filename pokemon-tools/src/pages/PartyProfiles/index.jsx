import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Tv2, Download, Link2, Clipboard, Check } from 'lucide-react'
import { useParties } from '../../hooks/useUserData'
import { usePokemon } from '../../hooks/usePokemon'
import PokemonPicker from '../../components/PokemonPicker'
import PokemonDetail from '../Pokedex/PokemonDetail'
import { frontSpriteUrl, shinySpriteUrl, formatName } from '../../utils/formatting'
import { getPokemon } from '../../api/pokemon'
import { parseShowdownSet } from '../../utils/parseShowdown'
import { TYPE_COLORS, GENERATIONS } from '../../constants/types'

const NATURES = [
  'Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed',
  'Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild',
  'Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky',
]

const EMPTY_MEMBER = {
  pokemonId: null, nickname: '', nature: '', heldItem: '', notes: '', shiny: false,
}

// PokeAPI `past_types` entries mean "these types applied up to and including [generation]".
// Walk oldest-first and return the first entry whose generation index >= targetGen index.
const GEN_ORDER = [
  'generation-i','generation-ii','generation-iii','generation-iv',
  'generation-v','generation-vi','generation-vii','generation-viii','generation-ix',
]
const NUM_TO_GEN_NAME = {
  '1':'generation-i','2':'generation-ii','3':'generation-iii','4':'generation-iv',
  '5':'generation-v','6':'generation-vi','7':'generation-vii','8':'generation-viii','9':'generation-ix',
}
function getTypesForGen(pokemon, gen) {
  if (!pokemon) return []
  const current = pokemon.types.slice().sort((a, b) => a.slot - b.slot).map((t) => t.type.name)
  if (!gen) return current
  const targetGenName = NUM_TO_GEN_NAME[String(gen)]
  if (!targetGenName) return current
  const targetIdx = GEN_ORDER.indexOf(targetGenName)
  for (const entry of (pokemon.past_types ?? [])) {
    const entryIdx = GEN_ORDER.indexOf(entry.generation.name)
    if (targetIdx <= entryIdx) {
      return entry.types.slice().sort((a, b) => a.slot - b.slot).map((t) => t.type.name)
    }
  }
  return current
}

const STAT_ABBR = {
  hp: 'HP', attack: 'Atk', defense: 'Def',
  'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe',
}

// URL-safe base64 encoding for share links — handles unicode via encodeURIComponent
function encodeParty(party) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(party)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  } catch { return '' }
}

function decodeParty(encoded) {
  try {
    const pad = encoded.length % 4 ? '='.repeat(4 - encoded.length % 4) : ''
    return JSON.parse(decodeURIComponent(atob(encoded.replace(/-/g, '+').replace(/_/g, '/') + pad)))
  } catch { return null }
}

// Serialise one party member back to Pokémon Showdown set format.
// Ability is not stored per-member so it is omitted; Showdown picks the first.
function exportMemberToShowdown(member, pokemonName) {
  const lines = []
  const species = pokemonName ? formatName(pokemonName) : `#${member.pokemonId}`
  const header  = member.nickname ? `${member.nickname} (${species})` : species
  lines.push(member.heldItem ? `${header} @ ${member.heldItem}` : header)

  const noteLines = (member.notes || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const evsLine   = noteLines.find((l) => /^EVs:/i.test(l))
  const ivsLine   = noteLines.find((l) => /^IVs:/i.test(l))
  const moves     = noteLines.filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim())

  if (member.shiny) lines.push('Shiny: Yes')
  if (evsLine) lines.push(evsLine)
  if (ivsLine) lines.push(ivsLine)
  if (member.nature) lines.push(`${member.nature} Nature`)
  moves.forEach((m) => lines.push(`- ${m}`))
  return lines.join('\n')
}

// ── Idle Mode ─────────────────────────────────────────────────────────────────

const INFO_MODE_LABELS = ['Sprites', 'Types', 'Types + Items', 'Types + Items + Moves']

function extractMoves(notes) {
  if (!notes) return []
  return notes.split('\n')
    .filter((l) => l.trim().startsWith('- '))
    .map((l) => l.trim().slice(2).trim())
    .filter(Boolean)
}

const IDLE_CONTAINER = 192

function IdleSlot({ pokemonId, pokemonName, displayName, types, shiny, heldItem, moves, infoMode, onViewDetail }) {
  const [spritePhase, setSpritePhase] = useState('gif')
  const [displaySrc, setDisplaySrc]   = useState('')
  // Natural pixel dimensions read on load — used to render at 2× while preserving relative sizes.
  const [spriteSize, setSpriteSize]   = useState(null)

  const showdownName = (pokemonName ?? String(pokemonId)).replace(/-/g, '')
  const gifUrl = shiny
    ? `https://play.pokemonshowdown.com/sprites/gen5ani-shiny/${showdownName}.gif`
    : `https://play.pokemonshowdown.com/sprites/gen5ani/${showdownName}.gif`
  const pngUrl = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemonId}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`

  // Defer src assignment so the browser always starts GIF animation from frame 1.
  useEffect(() => {
    setSpritePhase('gif')
    setDisplaySrc(gifUrl)
    setSpriteSize(null)
  }, [gifUrl])

  const handleLoad = (e) => {
    const w = Math.min(e.target.naturalWidth  * 2, IDLE_CONTAINER)
    const h = Math.min(e.target.naturalHeight * 2, IDLE_CONTAINER)
    setSpriteSize({ w, h })
  }

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
    <div className="flex flex-col items-center gap-3 w-48">
      <div
        className="flex items-center justify-center cursor-pointer"
        style={{ width: IDLE_CONTAINER, height: IDLE_CONTAINER }}
        onMouseDown={middleClick}
        title="Middle-click to view details"
      >
        {spritePhase !== 'text' && displaySrc ? (
          <img
            src={displaySrc}
            alt={displayName}
            style={{
              width:  spriteSize ? spriteSize.w : 'auto',
              height: spriteSize ? spriteSize.h : 'auto',
              maxWidth: '100%',
              maxHeight: '100%',
              imageRendering: 'pixelated',
              objectFit: 'contain',
            }}
            onLoad={handleLoad}
            onError={() => {
              if (spritePhase === 'gif') { setSpritePhase('png'); setDisplaySrc(pngUrl); setSpriteSize(null) }
              else { setSpritePhase('text') }
            }}
          />
        ) : (
          <span className="text-3xl font-bold text-center leading-tight break-words px-2" style={nameStyle}>
            {displayName}
          </span>
        )}
      </div>

      <span className="text-white/40 text-xl text-center leading-tight">{displayName}</span>

      {infoMode >= 1 && types.length > 0 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {types.map((t) => (
            <span
              key={t}
              className="text-base font-semibold px-3 py-1 rounded-full capitalize"
              style={{ backgroundColor: TYPE_COLORS[t]?.bg ?? '#888', color: '#fff' }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {infoMode >= 2 && heldItem && (
        <span className="text-white/45 text-lg text-center leading-tight">{heldItem}</span>
      )}

      {infoMode >= 3 && moves.length > 0 && (
        <div className="text-center space-y-1">
          {moves.map((m) => (
            <div key={m} className="text-white/35 text-base leading-tight">{m}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function IdleMode({ party, onClose, onViewDetail, detailOpen }) {
  const [infoMode, setInfoMode] = useState(0)
  const [copied, setCopied]     = useState(false)

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
      if (detailOpen) return // PokemonDetail owns the keyboard while it's open
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === ' ') { e.preventDefault(); setInfoMode((m) => (m + 1) % 4) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, detailOpen])

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        aria-label="Exit idle mode"
        className="absolute top-10 right-10 text-white/30 hover:text-white/80 transition-colors"
      >
        <X size={44} />
      </button>

      <p className="text-white/20 text-2xl tracking-[0.3em] uppercase mb-20 font-semibold">
        {party.name}
        {party.targetGen && (
          <span className="ml-4 text-lg tracking-normal normal-case opacity-60">Gen {party.targetGen}</span>
        )}
      </p>

      {members.length === 0 ? (
        <p className="text-white/30 text-lg">No Pokémon in this party.</p>
      ) : (
        <div className="flex flex-nowrap justify-center gap-16 px-16 items-start">
          {members.map((member) => {
            const pokemon     = pokemonMap[member.pokemonId]
            const types       = getTypesForGen(pokemon, party.targetGen)
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

      <div className="absolute bottom-10 flex flex-col items-center gap-4">
        <p className="text-white/25 text-xl tracking-wide">{INFO_MODE_LABELS[infoMode]}</p>
        <p className="text-white/15 text-lg">Space to cycle info · Esc to exit · Middle-click for details</p>
        <button
          onClick={() => {
            const sets = (party.members ?? [])
              .filter((m) => m?.pokemonId && pokemonMap[m.pokemonId])
              .map((m) => exportMemberToShowdown(m, pokemonMap[m.pokemonId]?.name))
              .join('\n\n')
            navigator.clipboard.writeText(sets)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="flex items-center gap-3 text-white/30 hover:text-white/70 transition-colors text-lg"
          title="Copy team as Showdown sets"
        >
          {copied ? <Check size={24} /> : <Clipboard size={24} />}
          {copied ? 'Copied!' : 'Copy team'}
        </button>
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
    ? (member.shiny ? shinySpriteUrl(member.pokemonId) : frontSpriteUrl(member.pokemonId))
    : null

  const handleImport = async () => {
    const parsed = parseShowdownSet(importText)
    if (!parsed) { setImportError('Could not parse set. Check the format.'); return }
    setImportLoading(true)
    setImportError('')
    try {
      const pokemon = await queryClient.fetchQuery({
        queryKey: ['pokemon', parsed.pokemonSlug],
        queryFn:  () => getPokemon(parsed.pokemonSlug),
        staleTime: Infinity,
      })

      // Rebuild notes in Showdown format so DamageCalc can re-parse them later
      const STAT_ABBR = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' }
      const noteParts = []
      if (parsed.moves.length) { noteParts.push('Moves:'); parsed.moves.forEach((m) => noteParts.push(`- ${m}`)) }
      const evParts = Object.entries(parsed.evs).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${STAT_ABBR[k]}`)
      if (evParts.length) noteParts.push(`EVs: ${evParts.join(' / ')}`)
      const ivParts = Object.entries(parsed.ivs).filter(([, v]) => v !== 31).map(([k, v]) => `${v} ${STAT_ABBR[k]}`)
      if (ivParts.length) noteParts.push(`IVs: ${ivParts.join(' / ')}`)

      onUpdate({
        pokemonId: pokemon.id,
        nickname:  parsed.nickname || '',
        nature:    parsed.nature || '',
        heldItem:  parsed.heldItemRaw || '',  // store display name in party profiles
        shiny:     parsed.shiny,
        notes:     noteParts.join('\n'),
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
        <div className="shrink-0">
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
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => member.pokemonId && onUpdate({ shiny: !member.shiny })}
              disabled={!member.pokemonId}
              title={member.shiny ? 'Shiny' : 'Default'}
              className={`shrink-0 w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition-colors ${
                member.shiny
                  ? 'border-yellow-400/60 bg-yellow-400/10'
                  : 'border-border text-dim hover:border-border2 disabled:opacity-30 disabled:cursor-default'
              }`}
            >
              ✨
            </button>
            <input
              value={member.nickname}
              onChange={(e) => onUpdate({ nickname: e.target.value })}
              placeholder={member.pokemonId ? 'Nickname' : 'Pick a Pokémon first'}
              className="flex-1 min-w-0 bg-surface border border-border rounded-lg px-2 py-1 text-fg text-sm placeholder:text-dim focus:outline-none focus:border-border2"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={member.nature}
              onChange={(e) => onUpdate({ nature: e.target.value })}
              className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-fg text-xs focus:outline-none"
            >
              <option value="">Nature…</option>
              {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input
              value={member.heldItem}
              onChange={(e) => onUpdate({ heldItem: e.target.value })}
              placeholder="Held item"
              className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2"
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
        rows={6}
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

function PartyCard({ party, onUpdate, onDelete, onIdle, onShare, onViewDetail }) {
  const [expanded, setExpanded]     = useState(false)
  const [editName, setEditName]     = useState(false)
  const [name, setName]             = useState(party.name)
  const [copiedShare, setCopiedShare] = useState(false)

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
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const encoded = encodeParty({ name: party.name, members: party.members ?? [] })
                  const url = `${window.location.origin}/party-profiles?shared=${encoded}`
                  navigator.clipboard.writeText(url)
                  setCopiedShare(true)
                  setTimeout(() => setCopiedShare(false), 2000)
                }}
                aria-label="Copy share link"
                title="Copy idle screen link"
                className="text-dim hover:text-accent transition-colors"
              >
                {copiedShare ? <Check size={14} /> : <Link2 size={14} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onIdle() }}
                aria-label="Idle mode"
                title="Idle mode"
                className="text-dim hover:text-accent transition-colors"
              >
                <Tv2 size={14} />
              </button>
            </>
          )}

          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-dim hover:text-accent">
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-sub" /> : <ChevronDown size={16} className="text-sub" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Per-party generation — affects historical types in idle mode */}
          <div className="flex items-center gap-2">
            <span className="text-dim text-xs">Team generation:</span>
            <select
              value={party.targetGen ?? ''}
              onChange={(e) => onUpdate({ targetGen: e.target.value || null })}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-lg px-2 py-0.5 text-xs text-fg focus:outline-none"
            >
              <option value="">Any / current</option>
              {GENERATIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  Gen {g.label.replace('Gen ', '')}
                </option>
              ))}
            </select>
            {party.targetGen && (
              <span className="text-dim text-[10px]">Types shown for Gen {party.targetGen} in idle mode</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PartyProfiles() {
  const { parties, addParty, updateParty, deleteParty, restoreParty, addPartyWithMembers } = useParties()
  const queryClient = useQueryClient()

  const [newName, setNewName]               = useState('')
  const [creating, setCreating]             = useState(false)
  const [importMode, setImportMode]         = useState(false)
  const [importText, setImportText]         = useState('')
  const [importError, setImportError]       = useState('')
  const [importLoading, setImportLoading]   = useState(false)
  const [detailId, setDetailId]             = useState(null)
  const [deletedParty, setDeletedParty]     = useState(null)
  const undoTimer = useRef(null)

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ?idle=<id>  — local party, pushed when user clicks TV button
  const idlePartyId = searchParams.get('idle')
  const idleParty   = idlePartyId ? (parties.find((p) => p.id === idlePartyId) ?? null) : null

  // ?shared=<encoded>  — external share link, decoded into a temporary party
  const sharedParam = searchParams.get('shared')
  const sharedParty = useMemo(() => sharedParam ? decodeParty(sharedParam) : null, [sharedParam])

  const activeIdleParty = sharedParty ?? idleParty

  const openIdle  = (party) => setSearchParams({ idle: party.id })
  const closeIdle = () => {
    if (sharedParam) { setSearchParams({}, { replace: true }); return }
    if (window.history.length > 1) navigate(-1)
    else setSearchParams({}, { replace: true })
  }

  const { data: detailPokemon } = usePokemon(detailId)

  const handleDelete = (partyId) => {
    const party = parties.find((p) => p.id === partyId)
    deleteParty(partyId)
    setDeletedParty(party)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setDeletedParty(null), 6000)
  }

  const handleUndo = () => {
    if (!deletedParty) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    restoreParty(deletedParty)
    setDeletedParty(null)
  }

  const cancelCreating = () => {
    setCreating(false); setImportMode(false)
    setImportText(''); setImportError('')
  }

  const create = async () => {
    if (!newName.trim()) return

    if (importMode && importText.trim()) {
      // Split on blank lines — each chunk is one Showdown set
      const chunks = importText.trim().split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean)
      const parsed = chunks.map((c) => parseShowdownSet(c)).filter(Boolean).slice(0, 6)
      if (!parsed.length) { setImportError('Could not parse any Pokémon sets. Check the format.'); return }

      setImportLoading(true)
      setImportError('')
      try {
        const pokemonData = await Promise.all(
          parsed.map((p) => queryClient.fetchQuery({
            queryKey: ['pokemon', p.pokemonSlug],
            queryFn:  () => getPokemon(p.pokemonSlug),
            staleTime: Infinity,
          }))
        )
        const members = parsed.map((p, i) => {
          const noteParts = []
          if (p.moves.length) { noteParts.push('Moves:'); p.moves.forEach((m) => noteParts.push(`- ${m}`)) }
          const evParts = Object.entries(p.evs).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${STAT_ABBR[k]}`)
          if (evParts.length) noteParts.push(`EVs: ${evParts.join(' / ')}`)
          const ivParts = Object.entries(p.ivs).filter(([, v]) => v !== 31).map(([k, v]) => `${v} ${STAT_ABBR[k]}`)
          if (ivParts.length) noteParts.push(`IVs: ${ivParts.join(' / ')}`)
          return {
            pokemonId: pokemonData[i].id,
            nickname:  p.nickname || '',
            nature:    p.nature   || '',
            heldItem:  p.heldItemRaw || '',
            shiny:     p.shiny,
            notes:     noteParts.join('\n'),
          }
        })
        addPartyWithMembers(newName.trim(), members)
        cancelCreating()
        setNewName('')
      } catch {
        setImportError('One or more Pokémon names were not found. Check the spelling and try again.')
      } finally {
        setImportLoading(false)
      }
      return
    }

    addParty(newName.trim())
    setNewName('')
    cancelCreating()
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-fg text-2xl font-bold">Party Profiles</h1>
          <p className="text-sub text-sm mt-1">Named snapshots of your actual trained parties</p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
          >
            <Plus size={16} /> New Party
          </button>
        )}
      </div>

      {creating && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !importMode) create() }}
            placeholder="Party name…"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-border2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setImportMode(false); setImportError('') }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${!importMode ? 'bg-accent2 border-accent text-accent' : 'border-border text-sub hover:text-fg'}`}
            >
              Empty
            </button>
            <button
              onClick={() => { setImportMode(true); setImportError('') }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${importMode ? 'bg-accent2 border-accent text-accent' : 'border-border text-sub hover:text-fg'}`}
            >
              Import from Showdown
            </button>
          </div>
          {importMode && (
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Paste full team in Pokémon Showdown format…\n\nPikachu @ Light Ball\nAbility: Static\n…\n\nCharizard @ Choice Specs\n…"}
              rows={8}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2 resize-none font-mono"
            />
          )}
          {importError && <p className="text-red-400 text-xs">{importError}</p>}
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={importLoading}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm disabled:opacity-50"
            >
              {importLoading ? 'Importing…' : 'Save'}
            </button>
            <button onClick={cancelCreating} className="text-sub px-2 text-sm hover:text-fg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {parties.length === 0 && !creating && (
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
            onDelete={() => handleDelete(party.id)}
            onIdle={() => openIdle(party)}
            onViewDetail={(id) => setDetailId(id)}
          />
        ))}
      </div>

      {activeIdleParty && (
        <IdleMode
          party={activeIdleParty}
          onClose={closeIdle}
          onViewDetail={(id) => setDetailId(id)}
          detailOpen={Boolean(detailId)}
        />
      )}

      {detailId && detailPokemon && (
        <PokemonDetail
          pokemon={detailPokemon}
          onClose={() => setDetailId(null)}
          onSelectPokemon={(id) => setDetailId(id)}
        />
      )}

      {deletedParty && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
          <span className="text-sub text-sm">"{deletedParty.name}" deleted.</span>
          <button
            onClick={handleUndo}
            className="text-accent text-sm font-semibold hover:text-fg transition-colors"
          >
            Undo
          </button>
          <button
            onClick={() => { clearTimeout(undoTimer.current); setDeletedParty(null) }}
            className="text-dim hover:text-sub transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
