// Maps PokéAPI version names → generation number (integer).
// Used to filter encounter data by generation.
export const VERSION_TO_GEN = {
  red: 1, blue: 1, yellow: 1,
  gold: 2, silver: 2, crystal: 2,
  ruby: 3, sapphire: 3, emerald: 3, firered: 3, leafgreen: 3,
  diamond: 4, pearl: 4, platinum: 4, heartgold: 4, soulsilver: 4,
  black: 5, white: 5, 'black-2': 5, 'white-2': 5,
  x: 6, y: 6, 'omega-ruby': 6, 'alpha-sapphire': 6,
  sun: 7, moon: 7, 'ultra-sun': 7, 'ultra-moon': 7,
  'lets-go-pikachu': 7, 'lets-go-eevee': 7,
}

// Human-readable labels for PokéAPI version names.
export const VERSION_LABELS = {
  red: 'Red', blue: 'Blue', yellow: 'Yellow',
  gold: 'Gold', silver: 'Silver', crystal: 'Crystal',
  ruby: 'Ruby', sapphire: 'Sapphire', emerald: 'Emerald',
  firered: 'FireRed', leafgreen: 'LeafGreen',
  diamond: 'Diamond', pearl: 'Pearl', platinum: 'Platinum',
  heartgold: 'HeartGold', soulsilver: 'SoulSilver',
  black: 'Black', white: 'White', 'black-2': 'Black 2', 'white-2': 'White 2',
  x: 'X', y: 'Y', 'omega-ruby': 'Omega Ruby', 'alpha-sapphire': 'Alpha Sapphire',
  sun: 'Sun', moon: 'Moon', 'ultra-sun': 'Ultra Sun', 'ultra-moon': 'Ultra Moon',
  'lets-go-pikachu': "Let's Go Pikachu", 'lets-go-eevee': "Let's Go Eevee",
}

// Maps each generation number to PokéAPI version group names.
// Used to filter pokemon.moves[].version_group_details to the right games.
export const GEN_VERSION_GROUPS = {
  '1': ['red-blue', 'yellow'],
  '2': ['gold-silver', 'crystal'],
  '3': ['ruby-sapphire', 'emerald', 'firered-leafgreen'],
  '4': ['diamond-pearl', 'platinum', 'heartgold-soulsilver'],
  '5': ['black-white', 'black-2-white-2'],
  '6': ['x-y', 'omega-ruby-alpha-sapphire'],
  '7': ['sun-moon', 'ultra-sun-ultra-moon', 'lets-go-pikachu-lets-go-eevee'],
  '8': ['sword-shield', 'brilliant-diamond-and-shining-pearl', 'legends-arceus'],
  '9': ['scarlet-violet'],
}

// Full generation metadata — ID ranges live in constants/types.js (GENERATIONS array)
export const GEN_INFO = {
  '1': {
    number:  'I',
    region:  'Kanto',
    games:   'Red · Blue · Yellow',
    count:   151,
    starters:[1, 4, 7],        // Bulbasaur, Charmander, Squirtle
    dexName: 'kanto',
    color:   '#e74c3c',
  },
  '2': {
    number:  'II',
    region:  'Johto',
    games:   'Gold · Silver · Crystal',
    count:   100,
    starters:[152, 155, 158],  // Chikorita, Cyndaquil, Totodile
    dexName: 'updated-johto',
    color:   '#f39c12',
  },
  '3': {
    number:  'III',
    region:  'Hoenn',
    games:   'Ruby · Sapphire · Emerald',
    count:   135,
    starters:[252, 255, 258],  // Treecko, Torchic, Mudkip
    dexName: 'updated-hoenn',
    color:   '#27ae60',
  },
  '4': {
    number:  'IV',
    region:  'Sinnoh',
    games:   'Diamond · Pearl · Platinum',
    count:   107,
    starters:[387, 390, 393],  // Turtwig, Chimchar, Piplup
    dexName: 'updated-sinnoh',
    color:   '#3498db',
  },
  '5': {
    number:  'V',
    region:  'Unova',
    games:   'Black · White · Black 2 · White 2',
    count:   156,
    starters:[495, 498, 501],  // Snivy, Tepig, Oshawott
    dexName: 'updated-unova',
    color:   '#95a5a6',
  },
  '6': {
    number:  'VI',
    region:  'Kalos',
    games:   'X · Y',
    count:   72,
    starters:[650, 653, 656],  // Chespin, Fennekin, Froakie
    dexName: 'kalos-central',
    color:   '#9b59b6',
  },
  '7': {
    number:  'VII',
    region:  'Alola',
    games:   'Sun · Moon · Ultra Sun · Ultra Moon',
    count:   88,
    starters:[722, 725, 728],  // Rowlet, Litten, Popplio
    dexName: 'alola',
    color:   '#e67e22',
  },
  '8': {
    number:  'VIII',
    region:  'Galar',
    games:   'Sword · Shield',
    count:   96,
    starters:[810, 813, 816],  // Grookey, Scorbunny, Sobble
    dexName: 'galar',
    color:   '#1abc9c',
  },
  '9': {
    number:  'IX',
    region:  'Paldea',
    games:   'Scarlet · Violet',
    count:   120,
    starters:[906, 909, 912],  // Sprigatito, Fuecoco, Quaxly
    dexName: 'paldea',
    color:   '#e91e8c',
  },
}
