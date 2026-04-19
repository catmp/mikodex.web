import { pokeApiFetch } from './pokeapi'

export const getPokemonList      = (limit = 1025, offset = 0) => pokeApiFetch(`pokemon?limit=${limit}&offset=${offset}`)
export const getPokemon          = (idOrName) => pokeApiFetch(`pokemon/${idOrName}`)
export const getPokemonSpecies   = (idOrName) => pokeApiFetch(`pokemon-species/${idOrName}`)
export const getEvolutionChain   = (url)      => pokeApiFetch(url)
export const getPokedex          = (dexName)  => pokeApiFetch(`pokedex/${dexName}`)
export const getAbility          = (name)     => pokeApiFetch(`ability/${name}`)
export const getPokemonEncounters= (id)       => pokeApiFetch(`pokemon/${id}/encounters`)
