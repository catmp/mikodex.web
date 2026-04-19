import { useState, useMemo } from 'react'
import { usePokemonList } from '../../hooks/usePokemonList'
import { useUserStore } from '../../store/userStore'
import { GENERATIONS } from '../../constants/types'
import { GEN_INFO } from '../../constants/generations'
import { formatName, padId, officialArtworkUrl, shinyArtworkUrl } from '../../utils/formatting'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PER_PAGE = 30

function ShinyCard({ pokemon }) {
  const [defaultErr, setDefaultErr] = useState(false)
  const [shinyErr, setShinyErr]     = useState(false)

  const defaultSrc = defaultErr
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`
    : officialArtworkUrl(pokemon.id)
  const shinySrc = shinyErr
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`
    : shinyArtworkUrl(pokemon.id)

  return (
    <div className="bg-surface border border-border hover:border-border2 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex gap-1 mb-2">
        <div className="flex-1 relative">
          <img src={defaultSrc} alt={`${pokemon.name} default`} onError={() => setDefaultErr(true)}
            loading="lazy" className="w-full aspect-square object-contain" />
          <span className="absolute bottom-0 left-0 text-[9px] text-dim">Default</span>
        </div>
        <div className="flex-1 relative">
          <img src={shinySrc} alt={`${pokemon.name} shiny`} onError={() => setShinyErr(true)}
            loading="lazy" className="w-full aspect-square object-contain" />
          <span className="absolute bottom-0 right-0 text-[9px] text-yellow-400">✨ Shiny</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-dim text-[10px] font-mono">#{padId(pokemon.id)}</p>
        <p className="text-fg text-xs font-medium">{formatName(pokemon.name)}</p>
      </div>
    </div>
  )
}

export default function ShinyGallery() {
  const { data: allPokemon, isLoading } = usePokemonList()
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  const genInfo          = activeGeneration ? GEN_INFO[activeGeneration] : null

  const [genFilter, setGenFilter] = useState(activeGeneration ?? '')
  const [page, setPage]           = useState(0)

  const filtered = useMemo(() => {
    if (!allPokemon) return []
    if (!genFilter) return allPokemon
    const gen = GENERATIONS.find((g) => g.value === genFilter)
    return gen ? allPokemon.filter((p) => p.id >= gen.min && p.id <= gen.max) : allPokemon
  }, [allPokemon, genFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage  = Math.min(page, pageCount - 1)
  const visible   = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE)

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-bold">Shiny Gallery</h1>
          <p className="text-sub text-sm mt-1">Default vs shiny side-by-side for every Pokémon</p>
        </div>
        {genInfo && genFilter === activeGeneration && (
          <span
            className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full mt-1"
            style={{ backgroundColor: genInfo.color + '20', color: genInfo.color }}
          >
            Gen {genInfo.number}
          </span>
        )}
      </div>

      {/* Gen filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          onClick={() => { setGenFilter(''); setPage(0) }}
          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
            !genFilter ? 'border-accent text-accent bg-accent2' : 'border-border text-sub hover:text-fg'
          }`}
        >
          All
        </button>
        {GENERATIONS.map((g) => (
          <button
            key={g.value}
            onClick={() => { setGenFilter(g.value); setPage(0) }}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              genFilter === g.value ? 'border-accent text-accent bg-accent2' : 'border-border text-sub hover:text-fg'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-3 aspect-[3/4] animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          <p className="text-dim text-xs mb-3">{filtered.length} Pokémon</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visible.map((p) => <ShinyCard key={p.id} pokemon={p} />)}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
                className="p-2 rounded-lg border border-border text-sub hover:text-fg disabled:opacity-30 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sub text-sm">{safePage + 1} / {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage === pageCount - 1}
                className="p-2 rounded-lg border border-border text-sub hover:text-fg disabled:opacity-30 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
