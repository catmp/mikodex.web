import { useState, useMemo } from 'react'
import { useTypeChart } from '../../hooks/useTypeChart'
import { useUserStore } from '../../store/userStore'
import { GEN_INFO } from '../../constants/generations'
import TypeBadge from '../../components/TypeBadge'
import { TYPE_LIST } from '../../constants/types'
import { getDefenderMultipliers, patchMatrixForGen, getTypesForGen } from '../../utils/typeEffectiveness'

const MULT_STYLE = {
  0:    { bg: '#1a1a1a', text: '#555',    label: '0×'  },
  0.25: { bg: '#3d1010', text: '#f87171', label: '¼×'  },
  0.5:  { bg: '#2d1b10', text: '#fb923c', label: '½×'  },
  1:    { bg: 'transparent', text: '#606080', label: '1×' },
  2:    { bg: '#0f2d1a', text: '#4ade80', label: '2×'  },
  4:    { bg: '#0d2918', text: '#86efac', label: '4×'  },
}

function MultCell({ value }) {
  const style = MULT_STYLE[value] ?? MULT_STYLE[1]
  return (
    <td
      className="text-center text-xs font-mono w-8 h-8"
      style={{ backgroundColor: style.bg, color: style.text }}
      title={`${value}×`}
    >
      {value === 1 ? '·' : style.label}
    </td>
  )
}

export default function TypeChart() {
  const { data: rawMatrix, isLoading, isError } = useTypeChart()
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  const genInfo          = activeGeneration ? GEN_INFO[activeGeneration] : null

  const [mode, setMode]           = useState('grid')
  const [selectedAtk, setSelectedAtk] = useState('')
  const [selectedDef, setSelectedDef] = useState([])

  // Apply generation patches to the fetched matrix
  const matrix = useMemo(
    () => patchMatrixForGen(rawMatrix, activeGeneration),
    [rawMatrix, activeGeneration]
  )

  // Types that existed in the active generation
  const typeList = useMemo(
    () => getTypesForGen(TYPE_LIST, activeGeneration),
    [activeGeneration]
  )

  // Clamp stored selections to types that actually exist in the current gen.
  // Derived at render time rather than synced via effect to avoid cascading renders.
  const validAtk = typeList.includes(selectedAtk) ? selectedAtk : ''
  const validDef = selectedDef.filter((t) => typeList.includes(t))

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-fg text-2xl font-bold mb-2">Type Chart</h1>
        <p className="text-sub text-sm mb-6">Loading type data…</p>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-8 bg-surface rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return <div className="p-6 text-sub">Failed to load type data. Please refresh.</div>
  }

  const toggleDefType = (type) => {
    setSelectedDef((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : prev.length < 2
        ? [...prev, type]
        : [prev[1], type]
    )
  }

  const defMults = mode === 'defender' && validDef.length > 0
    ? getDefenderMultipliers(matrix, validDef)
    : null

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-fg text-2xl font-bold">Type Chart</h1>
          <p className="text-sub text-sm mt-1">
            {typeList.length < 18
              ? `${typeList.length} types · Gen ${genInfo?.number ?? activeGeneration}`
              : 'All 18-type effectiveness matchups'}
          </p>
        </div>
        {genInfo && (
          <span
            className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full mt-1"
            style={{ backgroundColor: genInfo.color + '20', color: genInfo.color }}
          >
            Gen {genInfo.number}
          </span>
        )}
      </div>

      {/* Gen 1 note about Ghost/Psychic */}
      {activeGeneration === '1' && (
        <div className="mb-4 p-3 bg-card border border-border rounded-lg text-xs text-sub">
          <span className="text-fg font-medium">Gen I note:</span> Ghost → Psychic shows 0× to reflect
          the actual in-game glitch (the type chart intended 2×, but the code made Ghost moves
          have no effect on Psychic-types).
        </div>
      )}

      {/* Mode selector */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'grid',     label: 'Full Grid'     },
          { id: 'attacker', label: 'Attacker View' },
          { id: 'defender', label: 'Defender View' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === id
                ? 'bg-accent2 border-accent text-accent'
                : 'border-border text-sub hover:text-fg hover:border-border2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Attacker view */}
      {mode === 'attacker' && (
        <div className="mb-5">
          <p className="text-sub text-sm mb-2">Select attacking type:</p>
          <div className="flex flex-wrap gap-1.5">
            {typeList.map((t) => (
              <button key={t} onClick={() => setSelectedAtk(t === validAtk ? '' : t)}>
                <span style={{ opacity: validAtk && validAtk !== t ? 0.4 : 1 }}>
                  <TypeBadge type={t} size="sm" />
                </span>
              </button>
            ))}
          </div>
          {validAtk && matrix && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {typeList.map((def) => {
                const mult  = matrix[validAtk]?.[def] ?? 1
                const style = MULT_STYLE[mult] ?? MULT_STYLE[1]
                return (
                  <div
                    key={def}
                    className="rounded-lg p-2 text-center border border-border text-xs"
                    style={{ backgroundColor: style.bg }}
                  >
                    <TypeBadge type={def} size="xs" />
                    <p className="mt-1 font-mono" style={{ color: style.text }}>
                      {mult === 1 ? '1×' : style.label}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Defender view */}
      {mode === 'defender' && (
        <div className="mb-5">
          <p className="text-sub text-sm mb-2">Select up to 2 defending types:</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {typeList.map((t) => (
              <button key={t} onClick={() => toggleDefType(t)}>
                <span style={{ opacity: validDef.length === 2 && !validDef.includes(t) ? 0.35 : 1 }}>
                  <TypeBadge type={t} size="sm" />
                </span>
              </button>
            ))}
          </div>
          {defMults && (
            <>
              <div className="flex gap-1.5 mb-3">
                {validDef.map((t) => <TypeBadge key={t} type={t} size="md" />)}
                <button onClick={() => setSelectedDef([])} className="text-dim text-xs ml-2 hover:text-sub underline">
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {typeList.map((atk) => {
                  const mult  = defMults[atk] ?? 1
                  const style = MULT_STYLE[mult] ?? MULT_STYLE[1]
                  return (
                    <div
                      key={atk}
                      className="rounded-lg p-2 text-center border border-border text-xs"
                      style={{ backgroundColor: style.bg }}
                    >
                      <TypeBadge type={atk} size="xs" />
                      <p className="mt-1 font-mono" style={{ color: style.text }}>
                        {mult === 1 ? '1×' : style.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Full grid */}
      {mode === 'grid' && matrix && (
        <div className="overflow-x-auto">
          <p className="text-dim text-xs mb-3">Row = Attacker · Column = Defender</p>
          <table className="border-collapse text-xs" aria-label="Type effectiveness grid">
            <thead>
              <tr>
                <th className="w-20 text-left pr-2 text-dim font-normal text-xs">ATK \ DEF</th>
                {typeList.map((t) => (
                  <th key={t} className="w-8 pb-1">
                    <div
                      className="w-8 text-[9px] font-medium"
                      title={t}
                      style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
                    >
                      {t}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {typeList.map((atk) => (
                <tr key={atk} className="hover:bg-card/50">
                  <td className="pr-2 py-0.5">
                    <TypeBadge type={atk} size="xs" />
                  </td>
                  {typeList.map((def) => (
                    <MultCell key={def} value={matrix[atk]?.[def] ?? 1} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-3 mt-4 flex-wrap text-xs text-sub">
            {Object.entries(MULT_STYLE).map(([v, s]) => (
              <span key={v} className="flex items-center gap-1">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: s.bg, border: '1px solid #353548' }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
