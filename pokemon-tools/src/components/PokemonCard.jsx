import { useState } from 'react'
import { usePokemon } from '../hooks/usePokemon'
import TypeBadge from './TypeBadge'
import { padId, officialArtworkUrl, frontSpriteUrl } from '../utils/formatting'

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

export default function PokemonCard({ pokemon, onClick }) {
  const { data, isLoading, isError } = usePokemon(pokemon.id)
  const [imgError, setImgError] = useState(false)

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

  return (
    <button
      onClick={() => onClick?.(data)}
      className="bg-surface hover:bg-card border border-border hover:border-border2 rounded-xl p-4 w-full text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group cursor-pointer"
    >
      <span className="text-dim font-mono text-xs">#{padId(pokemon.id)}</span>
      <img
        src={imgError ? frontSpriteUrl(pokemon.id) : officialArtworkUrl(pokemon.id)}
        alt={name}
        onError={() => setImgError(true)}
        loading="lazy"
        className="w-full aspect-square object-contain transition-transform duration-200 group-hover:scale-105"
      />
      <p className="text-fg font-semibold text-center text-sm mt-1 mb-2">{name}</p>
      <div className="flex gap-1 justify-center flex-wrap">
        {data.types.map(({ type }) => (
          <TypeBadge key={type.name} type={type.name} />
        ))}
      </div>
    </button>
  )
}
