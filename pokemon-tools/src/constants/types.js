export const TYPE_COLORS = {
  normal:   { bg: '#A8A878', text: '#fff' },
  fire:     { bg: '#F08030', text: '#fff' },
  water:    { bg: '#6890F0', text: '#fff' },
  electric: { bg: '#F8D030', text: '#fff' },
  grass:    { bg: '#78C850', text: '#fff' },
  ice:      { bg: '#98D8D8', text: '#fff' },
  fighting: { bg: '#C03028', text: '#fff' },
  poison:   { bg: '#A040A0', text: '#fff' },
  ground:   { bg: '#E0C068', text: '#fff' },
  flying:   { bg: '#A890F0', text: '#fff' },
  psychic:  { bg: '#F85888', text: '#fff' },
  bug:      { bg: '#A8B820', text: '#fff' },
  rock:     { bg: '#B8A038', text: '#fff' },
  ghost:    { bg: '#705898', text: '#fff' },
  dragon:   { bg: '#7038F8', text: '#fff' },
  dark:     { bg: '#705848', text: '#fff' },
  steel:    { bg: '#B8B8D0', text: '#fff' },
  fairy:    { bg: '#EE99AC', text: '#fff' },
}

export const TYPE_LIST = Object.keys(TYPE_COLORS)

export const GENERATIONS = [
  { label: 'Gen I',   value: '1', min: 1,   max: 151  },
  { label: 'Gen II',  value: '2', min: 152,  max: 251  },
  { label: 'Gen III', value: '3', min: 252,  max: 386  },
  { label: 'Gen IV',  value: '4', min: 387,  max: 493  },
  { label: 'Gen V',   value: '5', min: 494,  max: 649  },
  { label: 'Gen VI',  value: '6', min: 650,  max: 721  },
  { label: 'Gen VII', value: '7', min: 722,  max: 809  },
  { label: 'Gen VIII',value: '8', min: 810,  max: 905  },
  { label: 'Gen IX',  value: '9', min: 906,  max: 1025 },
]
