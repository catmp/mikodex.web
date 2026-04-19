import { useQuery } from '@tanstack/react-query'
import { getPokemon, getPokemonSpecies, getEvolutionChain, getAbility, getPokemonEncounters } from '../api/pokemon'
import { getMove, getMachine, getMoveList } from '../api/moves'

export function usePokemon(idOrName) {
  return useQuery({
    queryKey: ['pokemon', String(idOrName)],
    queryFn: () => getPokemon(idOrName),
    enabled: Boolean(idOrName),
    staleTime: Infinity,
  })
}

export function usePokemonSpecies(idOrName) {
  return useQuery({
    queryKey: ['pokemon-species', String(idOrName)],
    queryFn: () => getPokemonSpecies(idOrName),
    enabled: Boolean(idOrName),
    staleTime: Infinity,
  })
}

export function useEvolutionChain(url) {
  return useQuery({
    queryKey: ['evolution-chain', url],
    queryFn: () => getEvolutionChain(url),
    enabled: Boolean(url),
    staleTime: Infinity,
  })
}

export function useMove(nameOrId) {
  return useQuery({
    queryKey: ['move', String(nameOrId ?? '')],
    queryFn: () => getMove(nameOrId),
    enabled: Boolean(nameOrId),
    staleTime: Infinity,
  })
}

export function useAbility(name) {
  return useQuery({
    queryKey: ['ability', name],
    queryFn: () => getAbility(name),
    enabled: Boolean(name),
    staleTime: Infinity,
  })
}

export function usePokemonEncounters(pokemonId) {
  return useQuery({
    queryKey: ['encounters', pokemonId],
    queryFn: () => getPokemonEncounters(pokemonId),
    enabled: Boolean(pokemonId),
    staleTime: Infinity,
  })
}

export function useMoveList() {
  return useQuery({
    queryKey: ['move-list'],
    queryFn:  () => getMoveList(1000),
    staleTime: Infinity,
    select:   (data) => data.results ?? [],
  })
}

// url is the full machine URL from move.machines[].machine.url (e.g. /api/v2/machine/5/)
export function useMachine(url) {
  return useQuery({
    queryKey: ['machine', url],
    queryFn: () => getMachine(url),
    enabled: Boolean(url),
    staleTime: Infinity,
  })
}
