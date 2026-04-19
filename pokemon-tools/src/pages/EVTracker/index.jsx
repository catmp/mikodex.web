import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useEVData } from '../../hooks/useUserData'
import { useUserStore } from '../../store/userStore'
import { usePokemon } from '../../hooks/usePokemon'
import PokemonPicker from '../../components/PokemonPicker'
import { STAT_LABELS, STAT_COLORS } from '../../utils/statHelpers'
import { formatName, officialArtworkUrl } from '../../utils/formatting'

const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const EV_MAX   = 252
const EV_TOTAL = 510

// ── EV Farming ─────────────────────────────────────────────────────────────
// Power items: each boosts one specific stat by +4 (Gen 4-5) or +8 (Gen 6+)
const POWER_ITEMS = [
  { id: 'power-weight',  label: 'Power Weight',  stat: 'hp' },
  { id: 'power-bracer',  label: 'Power Bracer',  stat: 'attack' },
  { id: 'power-belt',    label: 'Power Belt',     stat: 'defense' },
  { id: 'power-lens',    label: 'Power Lens',     stat: 'special-attack' },
  { id: 'power-band',    label: 'Power Band',     stat: 'special-defense' },
  { id: 'power-anklet',  label: 'Power Anklet',   stat: 'speed' },
]

// Returns per-stat EV gains for one battle with current settings.
// Formula (Gen 3+):
//   ev = base_ev × (macho_brace ? 2 : 1)              [macho brace doubles base]
//   ev += power_item_bonus (if item matches stat)      [power items add flat bonus]
//   ev *= (pokerus ? 2 : 1)                            [pokérus doubles total]
// Note: you can only hold one item, so macho brace and power items are exclusive.
function calcGains(foeData, count, heldItem, pokerus, gen) {
  if (!foeData) return {}
  const powerBonus = gen >= 6 ? 8 : 4
  const gains = {}

  for (const s of foeData.stats) {
    const statName = s.stat.name
    let ev = s.effort

    if (heldItem === 'macho-brace') {
      ev *= 2
    } else {
      const powerItem = POWER_ITEMS.find((p) => p.id === heldItem)
      if (powerItem?.stat === statName) ev += powerBonus
    }

    if (pokerus) ev *= 2
    gains[statName] = Math.floor(ev) * count
  }

  return gains
}

function EVFarmingPanel({ currentEvs, onApplyGains }) {
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  const gen = parseInt(activeGeneration ?? '9', 10)
  const modernEVs = gen >= 3  // Gen 1-2 used "stat experience", not the modern EV system

  const [showPicker, setShowPicker] = useState(false)
  const [foe, setFoe]               = useState(null)   // { id, name }
  const [count, setCount]           = useState(1)
  const [heldItem, setHeldItem]     = useState('')     // '' | 'macho-brace' | 'power-*'
  const [pokerus, setPokerus]       = useState(false)

  // Always call the hook — enabled only when a foe is selected
  const { data: foeData } = usePokemon(foe?.id ?? null)

  const gains = useMemo(
    () => calcGains(foeData, count, heldItem, pokerus, gen),
    [foeData, count, heldItem, pokerus, gen]
  )

  const hasGains = Object.values(gains).some((v) => v > 0)

  const apply = () => {
    if (!hasGains) return
    onApplyGains(gains, foe?.name ?? '', heldItem, pokerus, count)
  }

  if (!modernEVs) {
    return (
      <div className="bg-card border border-border rounded-lg p-3">
        <p className="text-dim text-xs">
          Gen I–II used Stat Experience, not the modern EV system. Switch to Gen III+ to use EV farming.
        </p>
      </div>
    )
  }

  const hasPowerItems = gen >= 4

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-3">
      {/* Foe selector */}
      <div className="flex items-center gap-2">
        <span className="text-sub text-xs w-16 shrink-0">Defeated</span>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs hover:border-border2 transition-colors"
        >
          {foe ? (
            <>
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${foe.id}.png`}
                alt=""
                className="w-5 h-5 object-contain"
              />
              <span className="text-fg">{formatName(foe.name)}</span>
            </>
          ) : (
            <span className="text-dim">Select Pokémon…</span>
          )}
        </button>
        <span className="text-sub text-xs">×</span>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
          min={1}
          max={999}
          className="w-14 bg-surface border border-border rounded-lg px-2 py-1.5 text-fg text-xs text-center focus:outline-none focus:border-border2"
        />
      </div>

      {/* Held item */}
      <div className="flex items-center gap-2">
        <span className="text-sub text-xs w-16 shrink-0">Held item</span>
        <select
          value={heldItem}
          onChange={(e) => setHeldItem(e.target.value)}
          className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-fg text-xs focus:outline-none focus:border-border2"
        >
          <option value="">None</option>
          <option value="macho-brace">Macho Brace (×2 all EVs)</option>
          {hasPowerItems && POWER_ITEMS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} (+{gen >= 6 ? 8 : 4} {STAT_LABELS[item.stat]} EV)
            </option>
          ))}
        </select>
      </div>

      {/* Pokérus toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={pokerus}
          onChange={(e) => setPokerus(e.target.checked)}
          className="accent-accent w-3.5 h-3.5"
        />
        <span className="text-xs text-fg">Pokérus <span className="text-dim">(×2 all EVs)</span></span>
      </label>

      {/* Gains preview */}
      {foe && foeData && (
        <div className="border-t border-border pt-3">
          <p className="text-dim text-[10px] mb-2 uppercase tracking-wide">EV gain per apply</p>
          <div className="grid grid-cols-3 gap-1">
            {STAT_KEYS.map((key) => {
              const amount = gains[key] ?? 0
              const current = currentEvs[key] ?? 0
              const wouldExceedStat  = current + amount > EV_MAX
              const totalNow = STAT_KEYS.reduce((s, k) => s + (currentEvs[k] || 0), 0)
              const wouldExceedTotal = totalNow + Object.values(gains).reduce((s, v) => s + v, 0) > EV_TOTAL
              const warn = wouldExceedStat || wouldExceedTotal
              return (
                <div key={key} className={`rounded-lg px-2 py-1 text-center ${amount > 0 ? 'bg-surface' : 'opacity-30 bg-surface'}`}>
                  <p className="text-[9px] text-sub">{STAT_LABELS[key]}</p>
                  <p className={`text-xs font-mono font-semibold ${warn && amount > 0 ? 'text-red-400' : 'text-fg'}`}>
                    {amount > 0 ? `+${amount}` : '—'}
                  </p>
                </div>
              )
            })}
          </div>
          {hasGains && (
            <p className="text-dim text-[10px] mt-1.5">
              {Object.values(gains).reduce((s, v) => s + v, 0)} total EVs this apply
            </p>
          )}
        </div>
      )}

      <button
        onClick={apply}
        disabled={!hasGains}
        className="w-full py-2 bg-accent text-white rounded-lg text-xs font-medium disabled:opacity-30 hover:bg-accent/90 transition-colors"
      >
        Apply EVs
      </button>

      {showPicker && (
        <PokemonPicker
          onSelect={(p) => { setFoe(p); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

// ── EVBar ──────────────────────────────────────────────────────────────────

function EVBar({ statKey, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sub text-xs w-8 text-right">{STAT_LABELS[statKey]}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.min(EV_MAX, Math.max(0, Number(e.target.value))))}
        min={0}
        max={EV_MAX}
        className="w-14 bg-card border border-border rounded px-2 py-0.5 text-fg text-xs focus:outline-none focus:border-border2 text-center"
      />
      <div className="flex-1 bg-card rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${Math.min((value / EV_MAX) * 100, 100)}%`, backgroundColor: STAT_COLORS[statKey] }}
        />
      </div>
      <span className="text-dim text-[10px] w-8 text-right">{EV_MAX}</span>
    </div>
  )
}

// ── EVEntry ────────────────────────────────────────────────────────────────

function EVEntry({ instanceId, entry, onUpdate, onDelete }) {
  const { addEVLog } = useEVData()
  const [logEntry, setLogEntry]     = useState('')
  const [showFarming, setShowFarming] = useState(false)

  const evs   = entry.evs ?? {}
  const log   = entry.log ?? []
  const total = STAT_KEYS.reduce((s, k) => s + (evs[k] || 0), 0)
  const over  = total > EV_TOTAL

  const updateEV = (stat, value) => onUpdate({ evs: { ...evs, [stat]: value } })

  const addLog = () => {
    if (!logEntry.trim()) return
    addEVLog(instanceId, { date: new Date().toISOString().slice(0, 10), description: logEntry.trim() })
    setLogEntry('')
  }

  // Called by EVFarmingPanel when the user presses Apply
  const applyGains = (gains, foeName, heldItem, pokerus, count) => {
    const newEvs = { ...evs }
    let runningTotal = total
    const applied = {}

    for (const statKey of STAT_KEYS) {
      const amount  = gains[statKey] ?? 0
      if (amount <= 0) continue
      const current = newEvs[statKey] ?? 0
      const roomStat  = EV_MAX - current
      const roomTotal = EV_TOTAL - runningTotal
      const actual    = Math.min(amount, roomStat, roomTotal)
      if (actual <= 0) continue
      newEvs[statKey]  = current + actual
      runningTotal    += actual
      applied[statKey] = actual
    }

    if (Object.keys(applied).length === 0) return

    onUpdate({ evs: newEvs })

    const gains_str = Object.entries(applied)
      .map(([k, v]) => `+${v} ${STAT_LABELS[k]}`)
      .join(', ')
    const itemNote  = heldItem ? ` [${heldItem.replace(/-/g, ' ')}]` : ''
    const pkrsNote  = pokerus ? ' + Pokérus' : ''
    addEVLog(instanceId, {
      date: new Date().toISOString().slice(0, 10),
      description: `${count}× ${formatName(foeName)}${itemNote}${pkrsNote} → ${gains_str}`,
    })
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {entry.pokemonId && (
          <img src={officialArtworkUrl(entry.pokemonId)} alt="" className="w-12 h-12 object-contain" />
        )}
        <div className="flex-1">
          <p className="text-fg font-semibold">
            {entry.nickname || formatName(String(entry.pokemonId ?? 'Unknown'))}
          </p>
          <p className={`text-xs font-mono ${over ? 'text-red-400' : 'text-sub'}`}>
            Total: {total} / {EV_TOTAL}{over && ' — OVER LIMIT!'}
          </p>
        </div>
        <button onClick={onDelete} className="text-dim hover:text-accent"><Trash2 size={14} /></button>
      </div>

      {/* Stat bars */}
      <div className="space-y-1">
        {STAT_KEYS.map((key) => (
          <EVBar key={key} statKey={key} value={evs[key] ?? 0} onChange={(v) => updateEV(key, v)} />
        ))}
      </div>

      {/* Total bar */}
      <div className="bg-card rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${Math.min((total / EV_TOTAL) * 100, 100)}%`,
            backgroundColor: over ? '#f87171' : '#60a5fa',
          }}
        />
      </div>

      {/* EV Farming toggle */}
      <div>
        <button
          onClick={() => setShowFarming((v) => !v)}
          className="flex items-center gap-1.5 text-sub text-xs hover:text-fg transition-colors mb-2"
        >
          <Zap size={12} />
          EV Farming
          {showFarming ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showFarming && (
          <EVFarmingPanel
            currentEvs={evs}
            onApplyGains={applyGains}
          />
        )}
      </div>

      {/* Session Log */}
      <div>
        <p className="text-sub text-xs mb-2">Session Log</p>
        <div className="space-y-0.5 mb-2 max-h-28 overflow-y-auto">
          {log.map((l, i) => (
            <p key={i} className="text-xs text-dim">
              <span className="text-border2 mr-2">{l.date}</span>{l.description}
            </p>
          ))}
          {log.length === 0 && <p className="text-dim text-xs italic">No entries yet.</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={logEntry}
            onChange={(e) => setLogEntry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLog()}
            placeholder="e.g. 10 Chansey → +10 HP EV"
            className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-fg text-xs placeholder:text-dim focus:outline-none focus:border-border2"
          />
          <button
            onClick={addLog}
            className="px-3 py-1.5 bg-card border border-border text-sub hover:text-fg rounded-lg text-xs"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ── EVTracker page ─────────────────────────────────────────────────────────

export default function EVTracker() {
  const { evData, upsertEVEntry, deleteEVEntry } = useEVData()
  const [showPicker, setShowPicker]       = useState(false)
  const [pendingPokemon, setPendingPokemon] = useState(null)
  const [pendingNick, setPendingNick]       = useState('')

  const entries = Object.entries(evData)

  const startAdd = (pokemon) => {
    setPendingPokemon(pokemon)
    setPendingNick(formatName(pokemon.name))
  }

  const confirmAdd = () => {
    if (!pendingPokemon) return
    const id = crypto.randomUUID()
    upsertEVEntry(id, {
      pokemonId: pendingPokemon.id,
      nickname:  pendingNick || formatName(pendingPokemon.name),
      evs:  {},
      log:  [],
    })
    setPendingPokemon(null)
    setPendingNick('')
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-fg text-2xl font-bold">EV Tracker</h1>
          <p className="text-sub text-sm mt-1">Track and log EVs for your trained Pokémon</p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/90"
        >
          <Plus size={16} /> Add Pokémon
        </button>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-16 text-sub">
          <p className="text-4xl mb-3">📊</p>
          <p>No Pokémon tracked yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {entries.map(([id, entry]) => (
          <EVEntry
            key={id}
            instanceId={id}
            entry={entry}
            onUpdate={(u) => upsertEVEntry(id, u)}
            onDelete={() => deleteEVEntry(id)}
          />
        ))}
      </div>

      {/* Add Pokémon picker */}
      {showPicker && (
        <PokemonPicker
          onSelect={(p) => { startAdd(p); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Nickname confirm */}
      {pendingPokemon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border2 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <img src={officialArtworkUrl(pendingPokemon.id)} alt="" className="w-16 h-16 object-contain" />
              <div>
                <p className="text-fg font-semibold">{formatName(pendingPokemon.name)}</p>
                <p className="text-sub text-xs">Give it a nickname?</p>
              </div>
            </div>
            <input
              autoFocus
              value={pendingNick}
              onChange={(e) => setPendingNick(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
              placeholder="Nickname…"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-border2 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={confirmAdd} className="flex-1 py-2 bg-accent text-white rounded-lg text-sm">
                Add to tracker
              </button>
              <button
                onClick={() => setPendingPokemon(null)}
                className="px-4 py-2 border border-border text-sub rounded-lg text-sm hover:text-fg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
