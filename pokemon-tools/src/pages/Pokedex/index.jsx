import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, X, SlidersHorizontal } from 'lucide-react'
import { usePokemonList } from '../../hooks/usePokemonList'
import { usePokemon } from '../../hooks/usePokemon'
import { useUserStore } from '../../store/userStore'
import { GEN_INFO } from '../../constants/generations'
import PokemonCard from '../../components/PokemonCard'
import PokemonDetail from './PokemonDetail'
import TypeBadge from '../../components/TypeBadge'
import { TYPE_LIST, GENERATIONS } from '../../constants/types'
import { getType } from '../../api/types'

const PER_PAGE = 24

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'border-accent text-accent bg-accent2'
          : 'border-border2 text-sub hover:text-fg hover:border-border2'
      }`}
    >
      {label}
    </button>
  )
}

export default function Pokedex() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('selected')

  // Default gen filter to the active generation set on the landing page
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  const genInfo          = activeGeneration ? GEN_INFO[activeGeneration] : null

  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebounced] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [genFilter, setGenFilter]       = useState(activeGeneration ?? '')
  const [page, setPage]                 = useState(0)
  const [showFilters, setShowFilters]   = useState(false)

  // 300 ms debounce on text search
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: allPokemon, isLoading: listLoading } = usePokemonList()

  // Type filter: fetch all Pokémon for the selected type from PokéAPI
  const { data: typeSet } = useQuery({
    queryKey: ['type-pokemon-set', typeFilter],
    queryFn: async () => {
      const data = await getType(typeFilter)
      return new Set(data.pokemon.map(({ pokemon }) => pokemon.name))
    },
    enabled: Boolean(typeFilter),
    staleTime: Infinity,
  })

  const filtered = useMemo(() => {
    if (!allPokemon) return []
    let result = allPokemon

    if (genFilter) {
      const gen = GENERATIONS.find((g) => g.value === genFilter)
      if (gen) result = result.filter((p) => p.id >= gen.min && p.id <= gen.max)
    }
    if (typeFilter && typeSet) {
      result = result.filter((p) => typeSet.has(p.name))
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().trim()
      result = result.filter(
        (p) => p.name.includes(q) || String(p.id).padStart(4, '0').includes(q)
      )
    }

    return result
  }, [allPokemon, debouncedSearch, typeFilter, typeSet, genFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage  = Math.min(page, pageCount - 1)
  const visible   = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE)

  const { data: selectedPokemon } = usePokemon(selectedId ? Number(selectedId) : null)

  const openDetail  = (pokemon) => setSearchParams((p) => { p.set('selected', pokemon.id); return p })
  const closeDetail = () => setSearchParams((p) => { p.delete('selected'); return p })

  const clearFilters = () => { setTypeFilter(''); setGenFilter(''); setSearch('') }
  const hasFilters   = typeFilter || genFilter || debouncedSearch

  // Is the gen filter different from what was set by the active generation?
  const genOverridden = genFilter !== (activeGeneration ?? '')

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page title + gen mode badge */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-bold">Pokédex</h1>
          <p className="text-sub text-sm mt-1">
            {listLoading ? 'Loading…' : `${filtered.length.toLocaleString()} Pokémon`}
          </p>
        </div>
        {genInfo && !genOverridden && (
          <span
            className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full mt-1"
            style={{ backgroundColor: genInfo.color + '20', color: genInfo.color }}
          >
            Gen {genInfo.number} · {genInfo.region}
          </span>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            type="search"
            placeholder="Search by name or number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search Pokémon"
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-fg text-sm placeholder:text-dim focus:outline-none focus:border-border2"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-fg"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
            showFilters || hasFilters
              ? 'border-accent text-accent bg-accent2'
              : 'border-border text-sub hover:text-fg hover:border-border2'
          }`}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">Filters</span>
          {hasFilters && <span className="text-[10px] bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center">!</span>}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-5 space-y-4">
          <div>
            <p className="text-sub text-xs font-medium mb-2">Generation</p>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip label="All" active={!genFilter} onClick={() => { setGenFilter(''); setPage(0) }} />
              {GENERATIONS.map((g) => (
                <FilterChip
                  key={g.value}
                  label={g.label}
                  active={genFilter === g.value}
                  onClick={() => { setGenFilter(genFilter === g.value ? '' : g.value); setPage(0) }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sub text-xs font-medium mb-2">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_LIST.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(typeFilter === t ? '' : t); setPage(0) }}
                  style={{ opacity: typeFilter && typeFilter !== t ? 0.4 : 1 }}
                  className="transition-opacity"
                >
                  <TypeBadge type={t} size="sm" />
                </button>
              ))}
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-dim text-xs hover:text-sub underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {listLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="bg-surface rounded-xl p-4 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      )}

      {/* Grid */}
      {!listLoading && (
        <>
          {visible.length === 0 ? (
            <div className="text-center py-24 text-sub">
              <p className="text-4xl mb-3">🔍</p>
              <p>No Pokémon match your filters.</p>
              <button onClick={clearFilters} className="mt-3 text-accent text-sm underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {visible.map((pokemon) => (
                <PokemonCard key={pokemon.id} pokemon={pokemon} onClick={openDetail} />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label="Previous page"
                className="p-2 rounded-lg border border-border text-sub hover:text-fg hover:border-border2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sub text-sm">{safePage + 1} / {pageCount}</span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePage === pageCount - 1}
                aria-label="Next page"
                className="p-2 rounded-lg border border-border text-sub hover:text-fg hover:border-border2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedId && selectedPokemon && (
        <PokemonDetail
          pokemon={selectedPokemon}
          onClose={closeDetail}
          onSelectPokemon={(id) => openDetail({ id })}
        />
      )}
    </div>
  )
}
