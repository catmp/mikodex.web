// Shared Pokémon Showdown set parser.
//
// Handles the standard Smogon/Showdown format:
//   Nickname (Species) @ Item   ← nickname optional; parens required when present
//   Ability: Name
//   Shiny: Yes
//   Level: 50
//   EVs: 252 HP / 4 Def / 252 Spe
//   IVs: 0 Atk
//   Modest Nature
//   - Move 1
//   - Move 2
//
// Returns a normalised object with both display-ready and API-slug forms of
// every field so consumers (DamageCalc, PartyProfiles) don't need to
// re-normalise anything themselves.

const SD_STAT = {
  HP: 'hp', Atk: 'attack', Def: 'defense',
  SpA: 'special-attack', SpD: 'special-defense', Spe: 'speed',
}

const EMPTY_STATS = () => ({
  hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0,
})

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseStatBlock(raw) {
  const stats = EMPTY_STATS()
  raw.split('/').forEach((part) => {
    const m = part.trim().match(/^(\d+)\s+(\S+)$/)
    if (!m) return
    const key = SD_STAT[m[2]]
    if (key) stats[key] = parseInt(m[1], 10) || 0
  })
  return stats
}

// Returns null if the text is empty or unparseable.
export function parseShowdownSet(text) {
  if (!text?.trim()) return null
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return null

  // ── Line 1: name / item ───────────────────────────────────────────────────
  let rawName = lines[0]
  let heldItemRaw = ''
  let nickname = ''

  const atIdx = rawName.lastIndexOf(' @ ')
  if (atIdx !== -1) {
    heldItemRaw = rawName.slice(atIdx + 3).trim()
    rawName     = rawName.slice(0, atIdx).trim()
  }

  const parenMatch = rawName.match(/^(.+?)\s*\((.+?)\)$/)
  if (parenMatch) {
    nickname = parenMatch[1].trim()
    rawName  = parenMatch[2].trim()
  }

  const pokemonSlug  = toSlug(rawName)
  const heldItemSlug = heldItemRaw
    ? heldItemRaw.toLowerCase().replace(/[\s']+/g, '-').replace(/-+/g, '-')
    : ''

  // ── Remaining lines ───────────────────────────────────────────────────────
  let level   = 100
  let nature  = 'Hardy'
  let shiny   = false
  let ability = ''
  const evs   = EMPTY_STATS()
  const ivs   = { hp: 31, attack: 31, defense: 31, 'special-attack': 31, 'special-defense': 31, speed: 31 }
  const moves = []   // display names, e.g. 'Water Spout'

  for (const line of lines.slice(1)) {
    if (line.startsWith('- ')) {
      moves.push(line.slice(2).trim())
    } else if (/^EVs:/i.test(line)) {
      Object.assign(evs, parseStatBlock(line.replace(/^EVs:/i, '').trim()))
    } else if (/^IVs:/i.test(line)) {
      Object.assign(ivs, parseStatBlock(line.replace(/^IVs:/i, '').trim()))
    } else if (/^Level:/i.test(line)) {
      level = parseInt(line.replace(/^Level:/i, '').trim(), 10) || 100
    } else if (/^Shiny:\s*Yes/i.test(line)) {
      shiny = true
    } else if (/^Ability:/i.test(line)) {
      ability = line.replace(/^Ability:/i, '').trim()
    } else if (/\bNature$/i.test(line)) {
      nature = line.replace(/\s*Nature$/i, '').trim()
    }
  }

  return {
    pokemonSlug,          // 'wailord'            — PokeAPI lookup key
    nickname,             // 'Big Boy'             — raw nickname (empty string if none)
    heldItemRaw,          // 'Choice Specs'        — display name (use in PartyProfiles)
    heldItemSlug,         // 'choice-specs'        — API/ITEMS key (use in DamageCalc)
    level,                // 100
    nature,               // 'Modest'
    shiny,                // false
    ability,              // 'Pressure'
    evs,                  // { hp: 0, attack: 0, ... }
    ivs,                  // { hp: 31, attack: 31, ... }
    moves,                // ['Water Spout', 'Ice Beam', ...]  display names
    moveSlugs: moves.map(toSlug),  // ['water-spout', 'ice-beam', ...] API slugs
  }
}
