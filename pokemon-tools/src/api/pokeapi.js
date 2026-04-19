const BASE_URL = 'https://pokeapi.co/api/v2'

export async function pokeApiFetch(endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}/${endpoint}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`PokéAPI ${res.status}: ${url}`)
  return res.json()
}
