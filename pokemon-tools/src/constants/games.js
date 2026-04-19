// Regional dex options available per generation in DexTracker.
// dexName values are PokéAPI /pokedex/{name} slugs.
export const GAMES_BY_GEN = {
  '1': [
    { label: 'Kanto',                         dexName: 'kanto' },
  ],
  '2': [
    { label: 'Johto (HeartGold / SoulSilver)', dexName: 'updated-johto' },
  ],
  '3': [
    { label: 'Hoenn (Omega Ruby / Alpha Sapphire)', dexName: 'updated-hoenn' },
  ],
  '4': [
    { label: 'Sinnoh',                        dexName: 'updated-sinnoh' },
  ],
  '5': [
    { label: 'Unova (Black 2 / White 2)',      dexName: 'updated-unova' },
  ],
  '6': [
    { label: 'Kalos (Central)',                dexName: 'kalos-central' },
    { label: 'Kalos (Coastal)',                dexName: 'kalos-coastal' },
    { label: 'Kalos (Mountain)',               dexName: 'kalos-mountain' },
  ],
  '7': [
    { label: 'Alola',                          dexName: 'alola' },
    { label: "Let's Go Kanto",                 dexName: 'letsgo-kanto' },
  ],
  '8': [
    { label: 'Galar',                          dexName: 'galar' },
    { label: 'Sinnoh (BDSP)',                  dexName: 'updated-sinnoh' },
  ],
  '9': [
    { label: 'Paldea',                         dexName: 'paldea' },
  ],
}

// Cumulative national dex upper bound per gen.
// Used to filter the /pokedex/national endpoint for "National Dex (Gen N)" view.
export const GEN_NATIONAL_MAX = {
  '1': 151,
  '2': 251,
  '3': 386,
  '4': 493,
  '5': 649,
  '6': 721,
  '7': 809,
  '8': 905,
  '9': 1025,
}
