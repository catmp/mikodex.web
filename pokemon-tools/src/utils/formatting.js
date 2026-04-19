export function formatName(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function padId(id) {
  return String(id).padStart(4, '0')
}

export function getIdFromUrl(url) {
  const parts = url.split('/').filter(Boolean)
  return parseInt(parts.at(-1), 10)
}

export function officialArtworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

export function shinyArtworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
}

export function frontSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function shinySpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`
}

export function formatFlavorText(text) {
  // PokeAPI flavor text has form-feed characters and newlines used as spaces
  return text?.replace(/[\f\n]/g, ' ') ?? ''
}
