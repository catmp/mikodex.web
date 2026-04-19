import { useQuery } from '@tanstack/react-query'
import { getPokemonList } from '../api/pokemon'

export function usePokemonList() {
  return useQuery({
    queryKey: ['pokemon-list'],
    queryFn: () => getPokemonList(1025, 0),
    staleTime: Infinity,
    select: (data) =>
      data.results.map((p) => {
        const id = parseInt(p.url.split('/').filter(Boolean).at(-1), 10)
        return { name: p.name, id }
      }),
  })
}
