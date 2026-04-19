import { useState, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Search, X, Upload, Users } from 'lucide-react'
import { usePokemonList } from '../../hooks/usePokemonList'
import { usePokemon, useMoveList } from '../../hooks/usePokemon'
import { useTypeChart } from '../../hooks/useTypeChart'
import { useUserStore } from '../../store/userStore'
import TypeBadge from '../../components/TypeBadge'
import { getMove } from '../../api/moves'
import { formatName, frontSpriteUrl } from '../../utils/formatting'
import { patchMatrixForGen } from '../../utils/typeEffectiveness'
import { parseShowdownSet } from '../../utils/parseShowdown'
import { GEN_INFO } from '../../constants/generations'

// ── Constants ───────────────────────────────────────────────────────────────

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const STAT_ABBR = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Spe' }

// [boosted stat, nerfed stat] or null for neutral
const NATURES = {
  Hardy: null, Lonely: ['attack','defense'], Brave: ['attack','speed'],
  Adamant: ['attack','special-attack'], Naughty: ['attack','special-defense'],
  Bold: ['defense','attack'], Docile: null, Relaxed: ['defense','speed'],
  Impish: ['defense','special-attack'], Lax: ['defense','special-defense'],
  Timid: ['speed','attack'], Hasty: ['speed','defense'], Serious: null,
  Jolly: ['speed','special-attack'], Naive: ['speed','special-defense'],
  Modest: ['special-attack','attack'], Mild: ['special-attack','defense'],
  Quiet: ['special-attack','speed'], Bashful: null, Rash: ['special-attack','special-defense'],
  Calm: ['special-defense','attack'], Gentle: ['special-defense','defense'],
  Sassy: ['special-defense','speed'], Careful: ['special-defense','special-attack'], Quirky: null,
}

const ITEMS = {
  '': { label: 'No Item' },
  'choice-band':   { label: 'Choice Band',    atkMult: 1.5 },
  'choice-specs':  { label: 'Choice Specs',   spaMult: 1.5 },
  'life-orb':      { label: 'Life Orb',       dmgMult: 1.3 },
  'expert-belt':   { label: 'Expert Belt',    superEffMult: 1.2 },
  'muscle-band':   { label: 'Muscle Band',    physMult: 1.1 },
  'wise-glasses':  { label: 'Wise Glasses',   specMult: 1.1 },
  'eviolite':      { label: 'Eviolite',       defMult: 1.5, spdMult: 1.5 },
  'assault-vest':  { label: 'Assault Vest',   spdMult: 1.5 },
  'charcoal':      { label: 'Charcoal',       typeMult: { fire: 1.2 } },
  'mystic-water':  { label: 'Mystic Water',   typeMult: { water: 1.2 } },
  'miracle-seed':  { label: 'Miracle Seed',   typeMult: { grass: 1.2 } },
  'magnet':        { label: 'Magnet',         typeMult: { electric: 1.2 } },
  'nevermeltice':  { label: 'Never-Melt Ice', typeMult: { ice: 1.2 } },
  'twisted-spoon': { label: 'Twisted Spoon',  typeMult: { psychic: 1.2 } },
  'dragon-fang':   { label: 'Dragon Fang',    typeMult: { dragon: 1.2 } },
  'black-belt':    { label: 'Black Belt',     typeMult: { fighting: 1.2 } },
  'poison-barb':   { label: 'Poison Barb',    typeMult: { poison: 1.2 } },
  'soft-sand':     { label: 'Soft Sand',      typeMult: { ground: 1.2 } },
  'hard-stone':    { label: 'Hard Stone',     typeMult: { rock: 1.2 } },
  'silver-powder': { label: 'Silver Powder',  typeMult: { bug: 1.2 } },
  'spell-tag':     { label: 'Spell Tag',      typeMult: { ghost: 1.2 } },
  'metal-coat':    { label: 'Metal Coat',     typeMult: { steel: 1.2 } },
  'silk-scarf':    { label: 'Silk Scarf',     typeMult: { normal: 1.2 } },
  'sharp-beak':    { label: 'Sharp Beak',     typeMult: { flying: 1.2 } },
  'pixie-plate':   { label: 'Pixie Plate',    typeMult: { fairy: 1.2 } },
  'black-glasses': { label: 'Black Glasses',  typeMult: { dark: 1.2 } },
  'leftovers':     { label: 'Leftovers' },
  'black-sludge':  { label: 'Black Sludge' },
  'rocky-helmet':  { label: 'Rocky Helmet' },
  'heavy-duty-boots': { label: 'Heavy-Duty Boots' },
}

const WEATHER = { none: 'Clear', sun: '☀ Harsh Sun', rain: '🌧 Rain', sand: '🌪 Sand', hail: '❄ Hail' }

const STATUSES = { '': 'None', burned: 'Burned', poisoned: 'Poisoned', paralyzed: 'Paralyzed', frozen: 'Frozen', asleep: 'Asleep' }

// Gen 3+ boost multiplier table (numerator/8, denominator always 2)
const BOOST_MULT = {
  '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
  '0': 1, '1': 3/2, '2': 4/2, '3': 5/2, '4': 6/2, '5': 7/2, '6': 8/2,
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

function getNatureMult(nature, stat) {
  const n = NATURES[nature]
  if (!n) return 1
  if (n[0] === stat) return 1.1
  if (n[1] === stat) return 0.9
  return 1
}

// Gen-aware stat formula.
// Gen 1-2: uses DVs (0–15), max stat experience (contributes +63), no natures.
// Gen 3+:  uses IVs (0–31), EVs (0–252), natures.
function calcStatValue(base, statKey, slot, gen) {
  const oldGen = parseInt(gen ?? '9') <= 2
  const lv     = slot.level ?? 50
  const iv     = oldGen ? Math.min(slot.ivs[statKey] ?? 15, 15) : (slot.ivs[statKey] ?? 31)
  const evAdd  = oldGen ? 63 : Math.floor((slot.evs[statKey] ?? 0) / 4)
  const inner  = Math.floor(((2 * base + iv + evAdd) * lv) / 100)
  if (statKey === 'hp') return inner + lv + 10
  return Math.floor((inner + 5) * (oldGen ? 1 : getNatureMult(slot.nature, statKey)))
}

function applyBoost(val, boost) {
  return val * (BOOST_MULT[String(boost)] ?? 1)
}

function weatherMult(weather, moveType) {
  if (weather === 'sun')  return moveType === 'fire' ? 1.5 : moveType === 'water' ? 0.5 : 1
  if (weather === 'rain') return moveType === 'water' ? 1.5 : moveType === 'fire' ? 0.5 : 1
  return 1
}

function itemAtkMult(itemKey, move) {
  const cfg = ITEMS[itemKey]
  if (!cfg || !move) return 1
  const isPhys = move.damage_class === 'physical'
  const isSpec = move.damage_class === 'special'
  if (cfg.atkMult  && isPhys) return cfg.atkMult
  if (cfg.spaMult  && isSpec) return cfg.spaMult
  if (cfg.physMult && isPhys) return cfg.physMult
  if (cfg.specMult && isSpec) return cfg.specMult
  if (cfg.typeMult?.[move.type]) return cfg.typeMult[move.type]
  return 1
}

function itemDefMult(itemKey, statKey) {
  const cfg = ITEMS[itemKey]
  if (!cfg) return 1
  if (statKey === 'defense'        && cfg.defMult) return cfg.defMult
  if (statKey === 'special-defense' && cfg.spdMult) return cfg.spdMult
  return 1
}

function runCalc({ atkSlot, defSlot, atkPokemon, defPokemon, moveData, weather, crit, matrix, gen }) {
  if (!atkPokemon || !defPokemon || !moveData?.power) return null

  const isPhys   = moveData.damage_class === 'physical'
  const atkStat  = isPhys ? 'attack' : 'special-attack'
  const defStat  = isPhys ? 'defense' : 'special-defense'

  const getBase = (poke, key) => poke.stats.find((s) => s.stat.name === key)?.base_stat ?? 50

  // Compute actual stats including boosts and item modifiers
  let A = calcStatValue(getBase(atkPokemon, atkStat), atkStat, atkSlot, gen)
  let D = calcStatValue(getBase(defPokemon, defStat), defStat, defSlot, gen)
  const defHP = calcStatValue(getBase(defPokemon, 'hp'), 'hp', defSlot, gen)

  A = Math.floor(applyBoost(A, atkSlot.boosts[atkStat] ?? 0) * itemAtkMult(atkSlot.heldItem, moveData))
  D = Math.floor(applyBoost(D, defSlot.boosts[defStat] ?? 0) * itemDefMult(defSlot.heldItem, defStat))

  const atkTypes = atkPokemon.types.map((t) => t.type.name)
  const defTypes = defPokemon.types.map((t) => t.type.name)

  const stab       = atkTypes.includes(moveData.type) ? 1.5 : 1
  const typeEff    = defTypes.reduce((acc, dt) => acc * (matrix?.[moveData.type]?.[dt] ?? 1), 1)
  const wMult      = weatherMult(weather, moveData.type)
  const critMult   = crit ? (parseInt(gen ?? '9') <= 5 ? 2 : 1.5) : 1
  const burnMult   = atkSlot.status === 'burned' && isPhys ? 0.5 : 1
  const dmgMult    = ITEMS[atkSlot.heldItem]?.dmgMult ?? 1
  const expertMult = (atkSlot.heldItem === 'expert-belt' && typeEff > 1) ? 1.2 : 1

  // Gen 3+ base damage (identical structure to Gen 1-2 at this step)
  const lv   = atkSlot.level ?? 50
  const base = Math.floor(Math.floor((Math.floor(2 * lv / 5 + 2) * moveData.power * A) / D) / 50) + 2

  const modded = base * critMult * wMult * stab * typeEff * dmgMult * expertMult * burnMult

  // 16 damage rolls: random factor of 85–100 (each equally likely)
  const rolls = Array.from({ length: 16 }, (_, i) => Math.floor(modded * (85 + i) / 100))

  return { rolls, min: rolls[0], max: rolls[15], defHP, A, D, stab, typeEff, wMult, critMult }
}

// ── Showdown parser ──────────────────────────────────────────────────────────

// ── Slot factory ─────────────────────────────────────────────────────────────

const makeSlot = () => ({
  pokemonId: null,
  level:  50,
  nature: 'Hardy',
  ivs:    { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 },
  evs:    { hp: 0,  attack: 0,  defense: 0,  'special-attack': 0,  'special-defense': 0,  speed: 0  },
  heldItem: '',
  boosts:   { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
  status: '',
  moves:  [],   // string move names, max 4
})

// ── Sub-components ────────────────────────────────────────────────────────────

function PokeSearch({ initialName, onSelect, placeholder }) {
  const [query, setQuery] = useState(initialName ?? '')
  const [open, setOpen]   = useState(false)
  const { data: list }    = usePokemonList()

  const results = useMemo(() => {
    if (!query || !list) return []
    const q = query.toLowerCase()
    return list.filter((p) => p.name.includes(q) || String(p.id).includes(q)).slice(0, 8)
  }, [query, list])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
        <input value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? 'Search Pokémon…'}
          className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-1.5 text-fg text-sm placeholder:text-dim focus:outline-none focus:border-border2"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface border border-border2 rounded-lg shadow-xl overflow-hidden">
          {results.map((p) => (
            <li key={p.id}>
              <button onMouseDown={() => { onSelect(p); setQuery(formatName(p.name)); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-sm text-fg hover:bg-card flex items-center gap-2">
                <img src={frontSpriteUrl(p.id)} alt="" className="w-6 h-6 object-contain" />
                {formatName(p.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MoveAdder({ onAdd, existing }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const { data: moveList } = useMoveList()

  const results = useMemo(() => {
    if (!query || !moveList) return []
    const q = query.toLowerCase()
    return moveList
      .filter((m) => m.name.includes(q) && !existing.includes(m.name))
      .slice(0, 8)
  }, [query, moveList, existing])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
        <input value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Add move…"
          className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-1 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface border border-border2 rounded-lg shadow-xl overflow-hidden">
          {results.map((m) => (
            <li key={m.name}>
              <button onMouseDown={() => { onAdd(m.name); setQuery(''); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-card">
                {formatName(m.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── StatTable ─────────────────────────────────────────────────────────────────

function StatTable({ baseStats, slot, gen, onIV, onEV, onBoost }) {
  const oldGen = parseInt(gen ?? '9') <= 2
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-dim border-b border-border">
          <th className="text-left pb-1 w-8">Stat</th>
          <th className="text-right pb-1 w-10">Base</th>
          <th className="text-right pb-1 w-12">{oldGen ? 'DV' : 'IV'}</th>
          {!oldGen && <th className="text-right pb-1 w-12">EV</th>}
          <th className="text-right pb-1 w-12">Final</th>
          <th className="text-right pb-1 w-16">Boost</th>
        </tr>
      </thead>
      <tbody>
        {STAT_KEYS.map((key) => {
          const base    = baseStats?.[key]
          const actual  = base != null ? calcStatValue(base, key, slot, gen) : null
          const boosted = (actual != null && key !== 'hp')
            ? Math.floor(applyBoost(actual, slot.boosts[key] ?? 0)) : actual
          const boost   = slot.boosts[key] ?? 0
          return (
            <tr key={key} className="border-b border-border/40">
              <td className="py-0.5 font-medium text-sub">{STAT_ABBR[key]}</td>
              <td className="py-0.5 text-right font-mono text-dim">{base ?? '—'}</td>
              <td className="py-0.5 text-right">
                <input type="number" value={slot.ivs[key]} min={0} max={oldGen ? 15 : 31}
                  onChange={(e) => onIV(key, Math.min(oldGen ? 15 : 31, Math.max(0, +e.target.value)))}
                  className="w-10 bg-card border border-border rounded px-1 py-px text-fg text-right text-[11px] focus:outline-none"
                />
              </td>
              {!oldGen && (
                <td className="py-0.5 text-right">
                  <input type="number" value={slot.evs[key]} min={0} max={252}
                    onChange={(e) => onEV(key, Math.min(252, Math.max(0, +e.target.value)))}
                    className="w-10 bg-card border border-border rounded px-1 py-px text-fg text-right text-[11px] focus:outline-none"
                  />
                </td>
              )}
              <td className="py-0.5 text-right font-mono text-fg font-medium">{boosted ?? '—'}</td>
              <td className="py-0.5 text-right">
                {key !== 'hp' && (
                  <select value={boost} onChange={(e) => onBoost(key, +e.target.value)}
                    className={`w-14 bg-card border border-border rounded px-1 py-px text-[11px] focus:outline-none ${boost > 0 ? 'text-green-400' : boost < 0 ? 'text-red-400' : 'text-sub'}`}>
                    {[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map((b) => (
                      <option key={b} value={b}>{b > 0 ? `+${b}` : b}</option>
                    ))}
                  </select>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── SlotPanel ─────────────────────────────────────────────────────────────────

function SlotPanel({ label, slot, pokemonData, moveMap, gen, parties, pokemonList,
  onSetPokemon, onChange, onIV, onEV, onBoost, onAddMove, onRemoveMove }) {
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [showParty,  setShowParty]  = useState(false)

  const oldGen   = parseInt(gen ?? '9') <= 2
  const baseStats = pokemonData
    ? Object.fromEntries(pokemonData.stats.map((s) => [s.stat.name, s.base_stat]))
    : null

  const doImport = () => {
    const parsed = parseShowdownSet(importText)
    if (!parsed) return
    const match = pokemonList?.find((p) => p.name === parsed.pokemonSlug)
    if (match) onSetPokemon(match)
    onChange('level',    parsed.level)
    onChange('nature',   parsed.nature in NATURES ? parsed.nature : 'Hardy')
    onChange('evs',      parsed.evs)
    onChange('ivs',      parsed.ivs)
    onChange('heldItem', parsed.heldItemSlug in ITEMS ? parsed.heldItemSlug : '')
    onChange('moves',    parsed.moveSlugs.slice(0, 4))
    setImportText('')
    setShowImport(false)
  }

  const importPartyMember = (member) => {
    const pokemon = pokemonList?.find((p) => p.id === member.pokemonId)
    if (!pokemon) { setShowParty(false); return }

    // Reconstruct a Showdown set string from stored party fields so the shared
    // parser handles all normalisation (item slugging, move slugging, stat parsing).
    const lines = [`${pokemon.name}${member.heldItem ? ` @ ${member.heldItem}` : ''}`]
    if (member.nature) lines.push(`${member.nature} Nature`)
    if (member.notes) {
      for (const noteLine of member.notes.split('\n')) {
        const t = noteLine.trim()
        if (t.startsWith('- ') || /^(EVs|IVs):/i.test(t)) lines.push(t)
      }
    }

    const parsed = parseShowdownSet(lines.join('\n'))
    if (!parsed) { setShowParty(false); return }

    onSetPokemon(pokemon)
    onChange('nature',   parsed.nature in NATURES ? parsed.nature : 'Hardy')
    onChange('heldItem', parsed.heldItemSlug in ITEMS ? parsed.heldItemSlug : '')
    onChange('evs',      parsed.evs)
    onChange('ivs',      parsed.ivs)
    onChange('moves',    parsed.moveSlugs.slice(0, 4))
    setShowParty(false)
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-fg font-semibold">{label}</h2>
        <div className="flex gap-1.5">
          <button onClick={() => { setShowImport((v) => !v); setShowParty(false) }}
            title="Import Showdown set"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${showImport ? 'border-accent text-accent bg-accent2' : 'border-border text-sub hover:text-fg'}`}>
            <Upload size={13} />
          </button>
          {parties.length > 0 && (
            <button onClick={() => { setShowParty((v) => !v); setShowImport(false) }}
              title="Import from Party Profiles"
              className={`p-1.5 rounded-lg border text-xs transition-colors ${showParty ? 'border-accent text-accent bg-accent2' : 'border-border text-sub hover:text-fg'}`}>
              <Users size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Showdown import panel */}
      {showImport && (
        <div className="space-y-2">
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste Pokémon Showdown set here…"
            rows={6}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2 font-mono resize-none"
          />
          <button onClick={doImport}
            className="w-full py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors">
            Import
          </button>
        </div>
      )}

      {/* Party profile selector */}
      {showParty && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {parties.flatMap((party) =>
            party.members.map((member, mi) => (
              <button key={`${party.id}-${mi}`}
                onClick={() => importPartyMember(member)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-fg hover:bg-card border border-transparent hover:border-border flex items-center gap-2">
                {member.pokemonId && (
                  <img src={frontSpriteUrl(member.pokemonId)} alt="" className="w-6 h-6 object-contain" />
                )}
                <span className="flex-1">{member.nickname || formatName(pokemonList?.find((p) => p.id === member.pokemonId)?.name ?? '')}</span>
                <span className="text-dim">{party.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Pokémon search */}
      <PokeSearch key={pokemonData?.name ?? slot.pokemonId ?? 'empty'}
        initialName={pokemonData ? formatName(pokemonData.name) : ''}
        onSelect={onSetPokemon}
      />

      {pokemonData && (
        <div className="flex items-center gap-2">
          <img src={frontSpriteUrl(pokemonData.id)} alt={pokemonData.name} className="w-10 h-10 object-contain" />
          <div className="flex gap-1 flex-wrap">
            {pokemonData.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} size="xs" />)}
          </div>
        </div>
      )}

      {/* Level + Nature + Status + Item */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-dim text-[10px] block mb-0.5">Level</label>
          <input type="number" value={slot.level} min={1} max={100}
            onChange={(e) => onChange('level', Math.min(100, Math.max(1, +e.target.value)))}
            className="w-full bg-card border border-border rounded-lg px-2 py-1 text-fg text-xs focus:outline-none focus:border-border2"
          />
        </div>
        <div>
          <label className="text-dim text-[10px] block mb-0.5">Status</label>
          <select value={slot.status} onChange={(e) => onChange('status', e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-2 py-1 text-fg text-xs focus:outline-none">
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {!oldGen && (
          <div className="col-span-2">
            <label className="text-dim text-[10px] block mb-0.5">Nature</label>
            <select value={slot.nature} onChange={(e) => onChange('nature', e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-2 py-1 text-fg text-xs focus:outline-none">
              {Object.keys(NATURES).map((n) => (
                <option key={n} value={n}>
                  {n}{NATURES[n] ? ` (+${STAT_ABBR[NATURES[n][0]]} −${STAT_ABBR[NATURES[n][1]]})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="col-span-2">
          <label className="text-dim text-[10px] block mb-0.5">Held Item</label>
          <select value={slot.heldItem} onChange={(e) => onChange('heldItem', e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-2 py-1 text-fg text-xs focus:outline-none">
            {Object.entries(ITEMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {oldGen && <p className="text-dim text-[10px]">Gen 1–2: DVs 0–15, max Stat Exp assumed, no natures.</p>}

      {/* Stats table */}
      <StatTable baseStats={baseStats} slot={slot} gen={gen}
        onIV={(key, val) => onIV(key, val)}
        onEV={(key, val) => onEV(key, val)}
        onBoost={(key, val) => onBoost(key, val)}
      />

      {/* Moves */}
      <div>
        <p className="text-dim text-[10px] mb-1.5">Moves</p>
        <div className="space-y-1 mb-2">
          {slot.moves.map((name) => {
            const move = moveMap[name]
            return (
              <div key={name} className="flex items-center gap-2 bg-card rounded-lg px-2 py-1 border border-border">
                {move?.type && <TypeBadge type={move.type.name} size="xs" />}
                <span className="text-fg text-xs flex-1">{formatName(name)}</span>
                {move?.power && <span className="text-dim text-[10px] font-mono">{move.power}</span>}
                <button onClick={() => onRemoveMove(name)} className="text-dim hover:text-fg ml-1">
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
        {slot.moves.length < 4 && (
          <MoveAdder onAdd={onAddMove} existing={slot.moves} />
        )}
      </div>
    </div>
  )
}

// ── ResultPanel ───────────────────────────────────────────────────────────────

function ResultPanel({ result, defPokemon }) {
  if (!result) return null

  const { min, max, rolls, defHP, stab, typeEff, wMult, critMult } = result
  const pctMin = defHP > 0 ? ((min / defHP) * 100).toFixed(1) : null
  const pctMax = defHP > 0 ? ((max / defHP) * 100).toFixed(1) : null
  const ohkos  = rolls.filter((r) => r >= defHP).length
  const twoHKO = rolls.filter((r) => r * 2 >= defHP).length

  return (
    <div className="bg-surface border border-accent/30 rounded-xl p-5">
      <h2 className="text-fg font-semibold mb-4">Result</h2>

      {/* Damage range */}
      <div className="text-center mb-5">
        <p className="text-5xl font-bold text-accent tracking-tight">{min}–{max}</p>
        <p className="text-sub text-xs mt-1">damage · min/max rolls (85%–100%)</p>
        {pctMin && (
          <p className="text-fg text-sm mt-2 font-medium">
            {pctMin}% – {pctMax}% of {formatName(defPokemon?.name ?? '')} HP ({defHP})
          </p>
        )}
      </div>

      {/* HP bar */}
      {defHP > 0 && (
        <div className="mb-4">
          <div className="bg-card rounded-full h-3 overflow-hidden relative">
            <div className="h-3 rounded-full bg-accent/40 transition-all absolute"
              style={{ width: `${Math.min(100, (min / defHP) * 100)}%` }} />
            <div className="h-3 rounded-full bg-accent transition-all absolute"
              style={{ width: `${Math.min(100, (max / defHP) * 100)}%` }} />
          </div>
          {/* KO chances */}
          <div className="flex gap-4 mt-2 text-xs text-sub">
            {ohkos > 0 && (
              <span>1HKO: <span className="text-red-400 font-semibold">{ohkos}/16 ({Math.round(ohkos*100/16)}%)</span></span>
            )}
            {ohkos < 16 && twoHKO > 0 && (
              <span>2HKO: <span className="text-orange-400 font-semibold">{twoHKO}/16 ({Math.round(twoHKO*100/16)}%)</span></span>
            )}
            {twoHKO === 0 && <span className="text-dim">No guaranteed 2HKO</span>}
          </div>
        </div>
      )}

      {/* Roll breakdown */}
      <div className="mb-4">
        <p className="text-dim text-[10px] mb-1">All 16 rolls</p>
        <div className="flex flex-wrap gap-1">
          {rolls.map((r, i) => (
            <span key={i}
              className={`font-mono text-[10px] px-1 py-px rounded ${r >= defHP ? 'bg-red-500/20 text-red-400' : 'bg-card text-sub'}`}>
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Modifier breakdown */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-sub border-t border-border pt-3">
        <span>Atk stat: <span className="text-fg font-mono">{result.A}</span></span>
        <span>Def stat: <span className="text-fg font-mono">{result.D}</span></span>
        <span>STAB: <span className="text-fg">{stab}×</span></span>
        <span>Type eff: <span className={`font-semibold ${typeEff > 1 ? 'text-green-400' : typeEff < 1 ? 'text-red-400' : 'text-fg'}`}>{typeEff}×</span></span>
        {wMult !== 1 && <span>Weather: <span className="text-fg">{wMult}×</span></span>}
        {critMult !== 1 && <span>Crit: <span className="text-fg">{critMult}×</span></span>}
      </div>

      <p className="text-dim text-[10px] mt-3">
        Formula: ⌊(⌊(⌊(2×Lv/5+2)×Pwr×A/D⌋/50)+2) × mods × roll/100⌋
      </p>
    </div>
  )
}

// ── Main DamageCalc ───────────────────────────────────────────────────────────

export default function DamageCalc() {
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  const parties          = useUserStore((s) => s.parties)
  const gen              = activeGeneration ?? '9'
  const genInfo          = GEN_INFO[gen]

  const { data: pokemonList }  = usePokemonList()
  const { data: rawMatrix }    = useTypeChart()
  const matrix = useMemo(() => patchMatrixForGen(rawMatrix, gen), [rawMatrix, gen])

  const [slots, setSlots] = useState({ atk: makeSlot(), def: makeSlot() })
  const [selMoveIdx, setSelMoveIdx] = useState(0)
  const [weather, setWeather] = useState('none')
  const [crit, setCrit]       = useState(false)

  const { data: atkPokemon } = usePokemon(slots.atk.pokemonId)
  const { data: defPokemon } = usePokemon(slots.def.pokemonId)

  // Batch-fetch all move data for both slots
  const allMoveNames = useMemo(
    () => [...new Set([...slots.atk.moves, ...slots.def.moves])],
    [slots.atk.moves, slots.def.moves]
  )
  const moveResults = useQueries({
    queries: allMoveNames.map((name) => ({
      queryKey: ['move', name],
      queryFn:  () => getMove(name),
      staleTime: Infinity,
    })),
  })
  const moveMap = useMemo(() => {
    const map = {}
    allMoveNames.forEach((name, i) => {
      if (moveResults[i]?.data) map[name] = moveResults[i].data
    })
    return map
  }, [allMoveNames, moveResults])

  // Slot mutators
  const setSlot  = (side, field, val)         => setSlots((s) => ({ ...s, [side]: { ...s[side], [field]: val } }))
  const setNested = (side, group, key, val)   => setSlots((s) => ({ ...s, [side]: { ...s[side], [group]: { ...s[side][group], [key]: val } } }))
  const setPokemon = (side, p)                => setSlots((s) => ({ ...s, [side]: { ...s[side], pokemonId: p.id } }))
  const addMove   = (side, name)              => setSlots((s) => {
    const sl = s[side]
    if (sl.moves.includes(name) || sl.moves.length >= 4) return s
    return { ...s, [side]: { ...sl, moves: [...sl.moves, name] } }
  })
  const removeMove = (side, name)             => setSlots((s) => ({
    ...s, [side]: { ...s[side], moves: s[side].moves.filter((m) => m !== name) },
  }))

  // Selected move for calculation
  const selMoveName = slots.atk.moves[selMoveIdx]
  const selMoveRaw  = selMoveName ? moveMap[selMoveName] : null
  const selMove     = useMemo(() => selMoveRaw ? {
    type: selMoveRaw.type?.name,
    power: selMoveRaw.power,
    damage_class: selMoveRaw.damage_class?.name,
  } : null, [selMoveRaw])

  const result = useMemo(() => runCalc({
    atkSlot: slots.atk, defSlot: slots.def,
    atkPokemon, defPokemon,
    moveData: selMove,
    weather, crit, matrix, gen,
  }), [slots, atkPokemon, defPokemon, selMove, weather, crit, matrix, gen])

  const slotProps = (side) => ({
    slot:        slots[side],
    pokemonData: side === 'atk' ? atkPokemon : defPokemon,
    moveMap,
    gen,
    parties,
    pokemonList,
    onSetPokemon: (p) => setPokemon(side, p),
    onChange:     (f, v) => setSlot(side, f, v),
    onIV:         (k, v) => setNested(side, 'ivs', k, v),
    onEV:         (k, v) => setNested(side, 'evs', k, v),
    onBoost:      (k, v) => setNested(side, 'boosts', k, v),
    onAddMove:    (name) => addMove(side, name),
    onRemoveMove: (name) => removeMove(side, name),
  })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-bold">Damage Calculator</h1>
          <p className="text-sub text-sm mt-1">Gen 3+ formula · full IVs/EVs/natures/items</p>
        </div>
        {genInfo && (
          <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full mt-1"
            style={{ backgroundColor: genInfo.color + '20', color: genInfo.color }}>
            Gen {genInfo.number} · {genInfo.region}
          </span>
        )}
      </div>

      {/* Attacker / Defender panels */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <SlotPanel label="Attacker" {...slotProps('atk')} />
        <SlotPanel label="Defender" {...slotProps('def')} />
      </div>

      {/* Field conditions */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <h2 className="text-fg font-semibold mb-3">Field Conditions</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-dim text-[10px] block mb-1">Weather</label>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(WEATHER).map(([k, v]) => (
                <button key={k} onClick={() => setWeather(k)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${weather === k ? 'border-accent text-accent bg-accent2' : 'border-border text-sub hover:text-fg'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)}
              className="accent-accent w-3.5 h-3.5" />
            <span className="text-sub text-sm">Critical Hit</span>
          </label>
        </div>
      </div>

      {/* Move selector (from attacker's moveset) */}
      {slots.atk.moves.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <h2 className="text-fg font-semibold mb-3">Move to Calculate</h2>
          <div className="flex gap-2 flex-wrap">
            {slots.atk.moves.map((name, i) => {
              const mv = moveMap[name]
              return (
                <button key={name} onClick={() => setSelMoveIdx(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${selMoveIdx === i ? 'border-accent text-accent bg-accent2' : 'border-border text-sub hover:text-fg'}`}>
                  {mv?.type && <TypeBadge type={mv.type.name} size="xs" />}
                  {formatName(name)}
                  {mv?.power && <span className="text-dim font-mono text-[10px]">{mv.power}</span>}
                </button>
              )
            })}
          </div>
          {selMove && !selMove.power && (
            <p className="text-dim text-xs mt-2">Selected move has no power (status move).</p>
          )}
        </div>
      )}

      {/* Result */}
      <ResultPanel result={result} defPokemon={defPokemon} move={selMoveRaw} />
    </div>
  )
}
