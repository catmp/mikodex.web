export const STAT_LABELS = {
  hp:               'HP',
  attack:           'Atk',
  defense:          'Def',
  'special-attack': 'SpA',
  'special-defense':'SpD',
  speed:            'Spe',
}

export const STAT_COLORS = {
  hp:               '#FF5959',
  attack:           '#F5AC78',
  defense:          '#FAE078',
  'special-attack': '#9DB7F5',
  'special-defense':'#A7DB8D',
  speed:            '#FA92B2',
}

export const STAT_MAX = 255

// Gen 3+ actual stat formula
export function calcHPStat(base, iv = 31, ev = 0, level = 50) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
}

export function calcStat(base, iv = 31, ev = 0, level = 50, natureMult = 1) {
  return Math.floor(
    (Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureMult
  )
}

// Gen 9 damage formula — returns {min, max} at 85%–100% rolls
export function calcDamage({ attackerLevel = 50, power, attack, defense, stabMult = 1, typeEff = 1 }) {
  const base =
    Math.floor(
      (Math.floor((Math.floor((2 * attackerLevel) / 5 + 2) * power * attack) / defense) / 50)
    ) + 2
  const min = Math.floor(base * 0.85 * stabMult * typeEff)
  const max = Math.floor(base * stabMult * typeEff)
  return { min, max }
}
