// ── Generation-aware patches ───────────────────────────────────────────────
//
// PokéAPI always returns the current (Gen IX) type chart. For historical
// generations we apply known differences as a post-process patch.
//
// Key differences:
//  Gen 1   — No Steel, Dark, or Fairy types.
//            Ghost→Psychic = 0× (famous code glitch; intended 2×).
//            Poison→Bug = 2× and Bug→Poison = 2× (both nerfed in Gen 2).
//  Gen 2-5 — No Fairy. Steel resisted Ghost and Dark (0.5×) until Gen 6.
//  Gen 6+  — Fairy added; Steel's Ghost/Dark resistance removed.

export function patchMatrixForGen(matrix, gen) {
  if (!matrix) return matrix
  const g = parseInt(gen ?? '9', 10)
  if (g >= 6) return matrix // current chart, no changes needed

  // Shallow-copy the outer object so we never mutate the cached original.
  const patched = { ...matrix }

  // Row/column removal: removes `typeName` as both attacker and defender.
  const removeType = (typeName) => {
    delete patched[typeName]
    for (const atk of Object.keys(patched)) {
      if (patched[atk] === matrix[atk]) patched[atk] = { ...matrix[atk] }
      delete patched[atk][typeName]
    }
  }

  // Targeted cell override (copy row first to preserve immutability).
  const setCell = (atk, def, value) => {
    if (!patched[atk] || !(def in patched[atk])) return
    if (patched[atk] === matrix[atk]) patched[atk] = { ...matrix[atk] }
    patched[atk][def] = value
  }

  if (g === 1) {
    removeType('steel')
    removeType('dark')
    removeType('fairy')
    setCell('ghost', 'psychic', 0)  // Gen 1 glitch (should be 2×, actually 0×)
    setCell('poison', 'bug', 2)     // nerfed to 1× in Gen 2
    setCell('bug', 'poison', 2)     // nerfed to 0.5× in Gen 2
  } else {
    // Gen 2–5
    removeType('fairy')
    setCell('ghost', 'steel', 0.5)  // Steel resisted Ghost until Gen 6
    setCell('dark', 'steel', 0.5)   // Steel resisted Dark until Gen 6
  }

  return patched
}

// Returns only the type names that existed in the given generation.
// Pass your full TYPE_LIST; returns a filtered subset.
export function getTypesForGen(allTypes, gen) {
  const g = parseInt(gen ?? '9', 10)
  if (g <= 1) return allTypes.filter((t) => t !== 'steel' && t !== 'dark' && t !== 'fairy')
  if (g <= 5) return allTypes.filter((t) => t !== 'fairy')
  return allTypes
}

// Builds an attacker→defender effectiveness matrix from PokéAPI damage_relations data.
// typeRelations: { [typeName]: { double_damage_to, half_damage_to, no_damage_to, ... } }
export function buildEffectivenessMatrix(typeRelations) {
  const types = Object.keys(typeRelations)
  const matrix = {}

  for (const atk of types) {
    matrix[atk] = {}
    for (const def of types) matrix[atk][def] = 1
  }

  for (const atk of types) {
    const rel = typeRelations[atk]
    for (const { name } of rel.double_damage_to) {
      if (name in matrix[atk]) matrix[atk][name] = 2
    }
    for (const { name } of rel.half_damage_to) {
      if (name in matrix[atk]) matrix[atk][name] = 0.5
    }
    for (const { name } of rel.no_damage_to) {
      if (name in matrix[atk]) matrix[atk][name] = 0
    }
  }

  return matrix
}

// Gets combined multiplier for each attacking type against a defender with 1 or 2 types.
export function getDefenderMultipliers(matrix, defTypes) {
  if (!matrix || defTypes.length === 0) return {}
  const result = {}
  for (const atk of Object.keys(matrix)) {
    let mult = 1
    for (const def of defTypes) mult *= matrix[atk][def] ?? 1
    result[atk] = mult
  }
  return result
}

export function getWeaknesses(matrix, types) {
  const mults = getDefenderMultipliers(matrix, types)
  return Object.entries(mults)
    .filter(([, m]) => m > 1)
    .sort(([, a], [, b]) => b - a)
}

export function getResistances(matrix, types) {
  const mults = getDefenderMultipliers(matrix, types)
  return Object.entries(mults)
    .filter(([, m]) => m > 0 && m < 1)
    .sort(([, a], [, b]) => a - b)
}

export function getImmunities(matrix, types) {
  const mults = getDefenderMultipliers(matrix, types)
  return Object.entries(mults)
    .filter(([, m]) => m === 0)
    .map(([type]) => type)
}
