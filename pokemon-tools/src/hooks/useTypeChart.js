import { useQuery } from '@tanstack/react-query'
import { getAllTypes } from '../api/types'
import { buildEffectivenessMatrix } from '../utils/typeEffectiveness'

export function useTypeChart() {
  return useQuery({
    queryKey: ['type-chart'],
    queryFn: async () => {
      const types = await getAllTypes()
      const relations = {}
      for (const t of types) relations[t.name] = t.damage_relations
      return buildEffectivenessMatrix(relations)
    },
    staleTime: Infinity,
  })
}
