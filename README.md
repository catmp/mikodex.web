# MikoDex — Pokémon Tools Hub

A portfolio-grade single-page application built with React 19 and Vite, aggregating Pokémon data from the [PokéAPI](https://pokeapi.co) into a suite of interconnected tools. Designed to demonstrate real-world React skills: API integration, global state management, client-side data manipulation, and polished UI/UX.

---

## Live Features

### Pokédex
Search and browse every Pokémon with a debounced search bar (by name or number), type filters, and a paginated grid. Clicking any card opens a full detail view with:

- Official artwork with a default/shiny toggle
- Base stat bars
- Type weaknesses and resistances computed client-side from the full type chart
- Abilities (hidden ability flagged)
- Learnset (level-up, TM, egg moves, tutor), sortable by level, alphabetically, by type, or by TM number
- Egg move breeder display — sprite thumbnails of compatible breeders with click-through to their detail view
- Encounter locations with percentage rates and time-of-day breakdowns, with direct links to the corresponding Bulbapedia page

### Type Matchup Chart
A full 18×18 effectiveness grid, color-coded from immune (0×) to super effective (4×). Supports an attacker view (select a move type to see what it hits) and a defender view (select one or two types to see all incoming multipliers). The full matrix is fetched once from the API and flattened client-side.

Generation-aware: the chart adjusts automatically for the active generation (Gen 1 removes Steel/Dark/Fairy and corrects Ghost→Psychic; Gen 2–5 removes Fairy and adjusts Steel interactions).

### Shiny Gallery
Browse every Pokémon's shiny sprite alongside its default, filterable by generation and type. Lazy-loaded images with skeleton placeholders. Each entry links back to the Pokédex detail view.

### Team Builder
Build a team of up to six Pokémon with type coverage analysis — shows which types the team hits super-effectively and which types it is weak to. Teams are named and saved to localStorage. Supports loading and deleting saved teams.

### Party Profiles
Named snapshots of real trained teams. Each slot supports a nickname, nature, held item (free text), and notes. Separate from Team Builder — this is for tracking Pokémon you've actually raised, not theory-crafting. Full CRUD, persisted to localStorage.

### EV Tracker
Select any Pokémon from your Party Profiles and track its EV spread per stat (HP, Atk, Def, SpA, SpD, Spe). Visual progress bars show the 252-per-stat cap and 510-total cap with a warning when the total is exceeded. Supports logging EV farming sessions with a description and per-stat gains.

### Damage Calculator
A full damage calculator following the active generation's ruleset:

- **Gen-aware stat formula** — Gen 3+ uses IVs (0–31), EVs (0–252, /4), and nature multipliers. Gen 1–2 uses DVs (0–15) and stat experience with no natures.
- **Gen-aware type chart** — same generation patching as the Type Chart tool.
- **Gen-aware critical hit multiplier** — 2× for Gen 1–5, 1.5× for Gen 6+.
- Full stat inputs (base, IV, EV, level) for both attacker and defender, plus per-stat stage boosts (−6 to +6).
- Held items: Choice Band/Specs, Life Orb, Eviolite, and all 18 type-boosting items.
- Weather: Sun, Rain, Sand, Snow (and Harsh Sun / Heavy Rain for Gen 6+).
- Burn (halves physical damage), critical hits.
- All four moves per Pokémon — add moves by name search and switch between them for calculation.
- Pokémon Showdown paste import for quick set entry.
- Party Profile import — select any saved party member directly.
- Full 16-roll breakdown (85–100%) with each roll highlighted red if it KOs. Displays OHKO and 2HKO probability.

### Pokédex Tracker
Track Pokédex completion per game. Follows the active generation — only shows games from that generation. Options include the regional dex(es) for that gen and a National Dex view filtered to the Pokémon introduced up to that generation (progress is tracked independently per gen).

Left-click any sprite to toggle caught. Middle-click to open that Pokémon's full detail view on the encounters tab. Progress is persisted to localStorage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (custom dark theme) |
| Server state / caching | TanStack Query v5 |
| Client state / persistence | Zustand v5 + localStorage |
| Icons | Lucide React |
| Data source | PokéAPI (free, no auth) |

---

## Architecture Notes

- **No backend.** All data comes from PokéAPI at runtime. User data (teams, EVs, dex progress) is persisted entirely in localStorage via Zustand's persist middleware.
- **TanStack Query** handles all PokéAPI fetching with `staleTime: Infinity` — data is cached for the session and never re-fetched unnecessarily. Shared query keys across components mean a Pokémon fetched in the Pokédex is already cached when the Damage Calculator needs it.
- **Generation awareness** is a first-class concern. A global `activeGeneration` value in Zustand propagates through every tool: the type chart patches its matrix, the damage calculator adjusts its formula and multipliers, the dex tracker shows only relevant games, and the Pokédex filters its learnset display accordingly.
- **Portal-based tooltips** render into `document.body` to escape overflow clipping in deeply nested layouts. Positions are computed in event handlers, not during render, to comply with React Compiler lint rules.

---

## Running Locally

```bash
npm install
npm run dev       # Vite dev server at localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

No environment variables or API keys required.

---

## Known Issues

- Damage calculator does not show megas FIX: will revamp whole page using: https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator
- Various sprites (paldean shinies, regional forms, megas) display at different sizes FIX: standardize sprite rendering across whole website
- Poor mobile support FIX: modify layouts for mobile support in mind
- No easy way to remove EVs in EV training tool FIX: redesign whole page 

## Future Features

**Minor**
- Animated starter sprites on landing page
- More granular control of what generation each tool references

**Major**
- Pop out of each tool
- Consolidate team builder and party profiles
- better team building support tools
- Live Pokemon Champions and VGC data analysis tools 

---

## License

MIT License.
