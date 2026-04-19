import { pokeApiFetch } from './pokeapi'

export const getMove     = (idOrName) => pokeApiFetch(`move/${idOrName}`)
export const getMoveList = (limit = 900) => pokeApiFetch(`move?limit=${limit}`)
// url is the full machine URL from move.machines[].machine.url
export const getMachine  = (url) => pokeApiFetch(url)
