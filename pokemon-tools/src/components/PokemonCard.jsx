import { useState } from 'react'
import { usePokemon } from '../hooks/usePokemon'
import TypeBadge from './TypeBadge'
import { padId, officialArtworkUrl, shinyArtworkUrl, frontSpriteUrl, shinySpriteUrl } from '../utils/formatting'

function Skeleton() {
  return (
    <div className="bg-surface rounded-xl p-4 animate-pulse">
      <div className="w-full aspect-square bg-card rounded-lg mb-3" />
      <div className="h-3 bg-card rounded w-1/3 mx-auto mb-2" />
      <div className="h-4 bg-card rounded w-2/3 mx-auto mb-2" />
      <div className="flex gap-1 justify-center">
        <div className="h-4 w-12 bg-card rounded" />
      </div>
    </div>
  )
}

// spriteMode: 'normal' | 'shiny' | 'both'
export default function PokemonCard({ pokemon, onClick, spriteMode = 'normal' }) {
  const { data, isLoading, isError } = usePokemon(pokemon.id)
  const [defaultErr, setDefaultErr] = useState(false)
  const [shinyErr, setShinyErr]     = useState(false)

  if (isLoading) return <Skeleton />
  if (isError) {
    return (
      <div className="bg-surface rounded-xl p-4 text-center text-sub text-sm border border-border">
        <span className="text-dim font-mono text-xs">#{padId(pokemon.id)}</span>
        <p className="mt-1">Failed to load</p>
      </div>
    )
  }

  const name = data.name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  const defaultSrc = defaultErr ? frontSpriteUrl(pokemon.id) : officialArtworkUrl(pokemon.id)
  const shinySrc   = shinyErr   ? shinySpriteUrl(pokemon.id) : shinyArtworkUrl(pokemon.id)

  const activeSrc = spriteMode === 'shiny' ? shinySrc : defaultSrc
  const activeErr = spriteMode === 'shiny'
    ? () => setShinyErr(true)
    : () => setDefaultErr(true)

  return (
    <button
      onClick={() => onClick?.(data)}
      className="bg-surface hover:bg-card border border-border hover:border-border2 rounded-xl p-4 w-full text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group cursor-pointer"
    >
      <span className="text-dim font-mono text-xs">#{padId(pokemon.id)}</span>

      {spriteMode === 'both' ? (
        <div className="flex gap-1 mt-1 mb-2">
          <div className="flex-1 relative">
            <img
              src={defaultSrc}
              alt={`${name} default`}
              onError={() => setDefaultErr(true)}
              loading="lazy"
              className="w-full aspect-square object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute bottom-0 left-0 text-[9px] text-dim">Default</span>
          </div>
          <div className="flex-1 relative">
            <img
              src={shinySrc}
              alt={`${name} shiny`}
              onError={() => setShinyErr(true)}
              loading="lazy"
              className="w-full aspect-square object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute bottom-0 right-0 text-[9px] text-yellow-400">✨</span>
          </div>
        </div>
      ) : (
        <img
          src={activeSrc}
          alt={name}
          onError={activeErr}
          loading="lazy"
          className="w-full aspect-square object-contain transition-transform duration-200 group-hover:scale-105"
        />
      )}

      <p className="text-fg font-semibold text-center text-sm mt-1 mb-2">{name}</p>
      <div className="flex gap-1 justify-center flex-wrap">
        {data.types.map(({ type }) => (
          <TypeBadge key={type.name} type={type.name} />
        ))}
      </div>
    </button>
  )
}
