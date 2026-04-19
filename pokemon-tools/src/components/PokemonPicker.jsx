import { useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { usePokemonList } from '../hooks/usePokemonList'
import { useUserStore } from '../store/userStore'
import { GENERATIONS } from '../constants/types'
import { GEN_INFO } from '../constants/generations'
import { formatName } from '../utils/formatting'

// Shared Pokémon picker modal — automatically filters to the active generation.
// Props:
//   onSelect(pokemon: { id, name }) — called when user picks a Pokémon
//   onClose() — called to dismiss
//   title — optional header label
export default function PokemonPicker({ onSelect, onClose }) {
  const [query, setQuery]         = useState('')
  const activeGeneration          = useUserStore((s) => s.activeGeneration)
  const { data: list }            = usePokemonList()

  const genRange = activeGeneration
    ? GENERATIONS.find((g) => g.value === activeGeneration)
    : null
  const genInfo = activeGeneration ? GEN_INFO[activeGeneration] : null

  const filtered = useMemo(() => {
    if (!list) return []
    let result = genRange
      ? list.filter((p) => p.id >= genRange.min && p.id <= genRange.max)
      : list
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter((p) => p.name.includes(q) || String(p.id).includes(q))
    }
    return result.slice(0, 80)
  }, [list, query, genRange])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border2 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        {/* Search header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search size={14} className="text-dim shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search${genInfo ? ` Gen ${genInfo.number} (${genInfo.region})` : ''} Pokémon…`}
            className="flex-1 bg-transparent text-fg text-sm placeholder:text-dim focus:outline-none"
          />
          {genInfo && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: genInfo.color + '22', color: genInfo.color }}
            >
              Gen {genInfo.number}
            </span>
          )}
          <button onClick={onClose} aria-label="Close picker" className="text-sub hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {/* Pokémon grid */}
        <div className="overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-5 gap-2">
          {!list && Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-square bg-card rounded-lg animate-pulse" />
          ))}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); onClose() }}
              className="flex flex-col items-center bg-card hover:bg-card/80 border border-border hover:border-border2 rounded-lg p-2 transition-colors"
            >
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                alt={p.name}
                className="w-10 h-10 object-contain"
                loading="lazy"
              />
              <span className="text-fg text-[9px] text-center leading-tight mt-0.5">
                {formatName(p.name)}
              </span>
            </button>
          ))}
          {list && filtered.length === 0 && (
            <p className="col-span-5 text-center text-sub text-sm py-8">No Pokémon found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
