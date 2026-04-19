import { useNavigate, useLocation } from 'react-router-dom'
import { useUserStore } from '../../store/userStore'
import { GEN_INFO } from '../../constants/generations'
import { frontSpriteUrl } from '../../utils/formatting'

function GenCard({ genKey, info, isActive, onSelect }) {
  return (
    <button
      onClick={() => onSelect(genKey)}
      className="relative group text-left p-5 rounded-2xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl focus:outline-none"
      style={{
        borderColor: isActive ? info.color : 'transparent',
        backgroundColor: isActive ? info.color + '15' : '#15151e',
        boxShadow: isActive ? `0 0 24px ${info.color}40` : undefined,
        outline: `1px solid ${isActive ? info.color + '60' : '#252535'}`,
      }}
    >
      {/* Active badge */}
      {isActive && (
        <span
          className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: info.color + '30', color: info.color }}
        >
          Active
        </span>
      )}

      {/* Gen label */}
      <div className="mb-3">
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
          style={{ color: info.color }}
        >
          Generation {info.number}
        </p>
        <h2 className="text-fg text-xl font-bold leading-tight">{info.region}</h2>
        <p className="text-sub text-xs mt-0.5">{info.games}</p>
      </div>

      {/* Starter sprites */}
      <div className="flex gap-0.5 mb-3">
        {info.starters.map((id, i) => (
          <img
            key={id}
            src={frontSpriteUrl(id)}
            alt=""
            aria-hidden="true"
            className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-200"
            style={{ transitionDelay: `${i * 40}ms` }}
          />
        ))}
      </div>

      {/* Count */}
      <p className="text-dim text-xs">{info.count} new Pokémon</p>

      {/* Hover accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: info.color }}
      />
    </button>
  )
}

export default function GenerationSelect() {
  const navigate            = useNavigate()
  const location            = useLocation()
  const returnTo            = location.state?.from ?? '/pokedex'
  const activeGeneration    = useUserStore((s) => s.activeGeneration)
  const setActiveGeneration = useUserStore((s) => s.setActiveGeneration)
  const clearGeneration     = useUserStore((s) => s.clearGeneration)

  const handleSelect = (genKey) => {
    setActiveGeneration(genKey)
    navigate(returnTo)
  }

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="text-center pt-14 pb-8 px-4">
        <h1 className="text-5xl font-bold tracking-tight text-fg">
          <span className="text-accent">Miko</span>Dex
        </h1>
        <p className="text-sub mt-3 text-base">Your Pokémon training companion</p>
        <p className="text-dim mt-1.5 text-sm">Select a generation to filter all tools</p>
      </header>

      {/* Generation grid */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(GEN_INFO).map(([key, info]) => (
            <GenCard
              key={key}
              genKey={key}
              info={info}
              isActive={activeGeneration === key}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-10 flex flex-col items-center gap-3">
          {activeGeneration ? (
            <>
              <button
                onClick={() => navigate(returnTo)}
                className="px-8 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors text-sm"
              >
                Continue with {GEN_INFO[activeGeneration]?.region} →
              </button>
              <button
                onClick={() => { clearGeneration(); navigate(returnTo) }}
                className="text-dim text-xs hover:text-sub underline"
              >
                Use all generations (no filter)
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate(returnTo)}
              className="text-dim text-xs hover:text-sub underline"
            >
              Skip — show all generations
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
