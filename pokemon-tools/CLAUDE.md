# CLAUDE.md — Pokémon Tools Hub

## Project Purpose

A portfolio-grade, React + Vite single-page application that aggregates Pokémon data from the PokéAPI into a suite of interconnected tools. The goal is to demonstrate real-world React skills to employers: API integration, state management, component design, routing, and UI/UX polish — all in a domain that's fun and recognizable.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, modern JSX, easy deployment |
| Routing | React Router v6 | SPA navigation between tools |
| Styling | Tailwind CSS + shadcn/ui | Polished portfolio look without writing CSS from scratch |
| State / Cache | TanStack Query (React Query) | Handles API fetching, caching, and loading states cleanly — important for PokeAPI's paginated endpoints |
| Global state | Zustand | Lightweight store for user data (teams, party profiles, Pokédex progress, EV logs) |
| Persistence | localStorage via Zustand persist middleware | All user data survives page refreshes without a backend |
| Data source | PokéAPI (https://pokeapi.co) | Free, no auth, comprehensive |
| Testing | Vitest + React Testing Library | Unit and integration tests |

---

## Project Structure

```
src/
├── api/                    # All PokéAPI fetch logic lives here
│   ├── pokeapi.js          # Base fetcher with error handling
│   ├── pokemon.js          # Fetchers: getPokemon, getPokemonList, getSpecies, etc.
│   ├── moves.js            # Move data fetchers
│   └── types.js            # Type relationship fetchers
│
├── components/
│   ├── ui/                 # Reusable primitives (cards, badges, search bar, etc.)
│   ├── PokemonCard.jsx     # Used everywhere — sprite, name, types, base stats
│   ├── TypeBadge.jsx       # Colored type pill (used in Pokédex, matchup chart, etc.)
│   └── Layout.jsx          # Nav + page shell
│
├── hooks/
│   ├── usePokemon.js       # TanStack Query wrapper for single Pokémon
│   ├── usePokemonList.js   # Paginated list query
│   ├── useTypeChart.js     # Fetches and flattens full type effectiveness matrix
│   └── useUserData.js      # Zustand selectors for user's saved data
│
├── store/
│   └── userStore.js        # Zustand store: teams, parties, EV logs, dex progress
│
├── pages/
│   ├── Pokedex/            # Search & browse tool
│   ├── TypeChart/          # Type matchup chart
│   ├── DamageCalc/         # Move / damage calculator
│   ├── ShinyGallery/       # Shiny sprite viewer
│   ├── TeamBuilder/        # Build and save teams of 6
│   ├── PartyProfiles/      # Named party snapshots with notes
│   ├── EVTracker/          # Track EV spread per Pokémon
│   └── DexTracker/         # Game-specific Pokédex completion tracker
│
├── utils/
│   ├── typeEffectiveness.js # Pure functions: getWeaknesses, getResistances, calcDamage
│   ├── statHelpers.js       # Stat calculations (base stat → actual stat formula)
│   └── formatting.js        # Name formatting, ID padding, etc.
│
├── constants/
│   ├── games.js             # Game → regional dex mapping (Scarlet/Violet, etc.)
│   └── types.js             # Type color map for consistent badge colors
│
├── App.jsx
└── main.jsx
```

---

## PokéAPI Usage Rules

**Always use TanStack Query for any PokéAPI call.** Never fetch inside `useEffect` manually — React Query handles deduplication, caching, and retries.

**Base URL:** `https://pokeapi.co/api/v2/`

**Key endpoints to know:**

```
GET /pokemon/{id or name}         → sprites, stats, types, moves, abilities
GET /pokemon-species/{id or name} → flavor text, gender rate, catch rate, evolution chain URL
GET /type/{name}                  → damage_relations (the type chart data)
GET /move/{id or name}            → power, accuracy, type, damage_class, effect
GET /evolution-chain/{id}         → full evo chain tree
GET /pokedex/{name}               → game-specific dex entries (e.g., "national", "paldea")
GET /version-group/{name}         → which games are in a version group
```

**Sprite URLs follow a predictable pattern — prefer these over the API's sprite object for shiny gallery:**
```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/{id}.png
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png         (front default)
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/{id}.png  (front shiny)
```

**Caching strategy:** Set `staleTime: 1000 * 60 * 60` (1 hour) on all PokéAPI queries — the data never changes.

**Rate limiting:** PokéAPI is generous but not unlimited. For bulk operations (e.g. loading the full national dex), paginate using `/pokemon?limit=100&offset=0` and fetch individual records lazily on demand, not all at once.

---

## Feature Specifications

### 1. Pokédex (`/pokedex`)
- Search by name or number (debounced input, 300ms)
- Filter by type (one or two types), generation, and legendary/mythical status
- Paginated grid of `PokemonCard` components (20 per page)
- Clicking a card opens a detail modal or `/pokemon/:id` page with:
  - Official artwork (default + shiny toggle)
  - Base stats bar chart
  - Type badges with weaknesses/resistances computed client-side
  - Abilities with hidden ability flagged
  - Flavor text from latest game
  - Evolution chain display

### 2. Type Matchup Chart (`/type-chart`)
- Full 18×18 effectiveness grid, color-coded (immune → 4×)
- "Attacker view": select a move type → see what it hits for what multiplier
- "Defender view": select one or two types → see all incoming multipliers
- Built by fetching all 18 type endpoints and flattening `damage_relations`
- Cache the full matrix in TanStack Query with a long stale time — don't re-fetch per interaction

### 3. Damage Calculator (`/damage-calc`)
- Inputs: attacker, move, defender (all searchable dropdowns)
- Computes damage using the official Gen 9 damage formula:
  `Damage = floor(floor(floor(2 * Level / 5 + 2) * Power * A/D) / 50) + 2`
  Then apply modifiers: STAB (1.5x), type effectiveness, weather, held items (stretch goal)
- Show damage range (min/max rolls at 85%–100%), KO probability
- Clearly label which formula is used and any simplifications

### 4. Shiny Gallery (`/shiny-gallery`)
- Browse every Pokémon's shiny vs default sprite side by side
- Filter by generation, type, or "drastically different" shinies (manually curated list in constants)
- Clicking a Pokémon links to its Pokédex entry
- Lazy-load images; show skeleton loaders

### 5. Team Builder (`/team-builder`)
- Drag-and-drop (or click-to-add) up to 6 Pokémon
- Shows team type coverage: what types your team hits super-effectively, what it's weak to
- Save named teams to Zustand store (persisted to localStorage)
- Load / delete saved teams
- Export team as a shareable URL (encode team IDs in query params)

### 6. Party Profiles (`/party-profiles`)
- Named snapshots of a team of up to 6 Pokémon
- Each slot can have: nickname, nature, held item (free text), and notes
- Not a damage calculator — this is for tracking "mons I've actually trained"
- CRUD operations, all persisted in Zustand + localStorage
- Distinct from Team Builder (which is theory-crafting); Party Profiles are your real roster

### 7. EV Tracker (`/ev-tracker`)
- Select a Pokémon from your Party Profiles or search
- Input current EVs per stat (HP, Atk, Def, SpA, SpD, Spe)
- Visual bar shows progress toward 252 cap and 510 total cap
- Warn when total exceeds 510
- Log EV farming sessions: "defeated 10 Chansey → +10 HP EV"
- Per-Pokémon EV data persisted in Zustand store

### 8. Pokédex Tracker (`/dex-tracker`)
- Select a game from a dropdown (mapped to its regional dex via `/pokedex/{name}` endpoint)
- Supported games: Scarlet/Violet (Paldea), Sword/Shield (Galar), BDSP (Sinnoh), etc.
- Grid of all Pokémon in that dex — check them off as "seen" or "caught"
- Progress bar showing completion percentage
- Filter to show only uncaught
- Progress persisted per game in Zustand store

---

## Zustand Store Shape

```js
// store/userStore.js
{
  // Team Builder
  teams: [
    { id: string, name: string, pokemonIds: number[] }  // max 6 ids
  ],

  // Party Profiles
  parties: [
    {
      id: string,
      name: string,
      members: [
        {
          pokemonId: number,
          nickname: string,
          nature: string,
          heldItem: string,
          notes: string
        }
      ]
    }
  ],

  // EV Tracker
  evData: {
    [pokemonInstanceId: string]: {
      pokemonId: number,
      nickname: string,
      evs: { hp: number, atk: number, def: number, spa: number, spd: number, spe: number },
      log: [{ date: string, description: string, evGains: {...} }]
    }
  },

  // Dex Tracker
  dexProgress: {
    [gameDexName: string]: {
      seen: number[],    // array of national dex IDs
      caught: number[]
    }
  }
}
```

---

## Design Guidelines (Portfolio-Grade)

- **Color palette:** Dark theme primary. Use Pokémon type colors (see `constants/types.js`) as accent colors throughout — type badges, borders, highlights.
- **Typography:** Clean sans-serif. Suggest Inter or DM Sans via Google Fonts.
- **Sprite presentation:** Always use official artwork for cards/detail views. Use pixel sprites only in gallery or as stylistic choice.
- **Loading states:** Every async component must have a skeleton loader — no blank screens or raw spinners. Use shadcn/ui `Skeleton` component.
- **Error states:** If a PokéAPI call fails, show a friendly error card with a retry button. Never let errors crash the page silently.
- **Responsiveness:** Mobile-first. The Pokédex grid and type chart especially must work on small screens.
- **Animations:** Subtle only — fade-ins on card load, smooth tab transitions. No flashy animations that distract from the data.
- **Accessibility:** All interactive elements must have aria labels. Type badges must not rely on color alone (include the type name text).

---

## Code Conventions

- **Component files:** PascalCase, one component per file. Co-locate styles if using CSS modules; prefer Tailwind classes in JSX.
- **Hooks:** Prefix with `use`, live in `src/hooks/`.
- **Utility functions:** Pure functions only in `src/utils/`. No React imports allowed there.
- **API functions:** All in `src/api/`. Each returns raw data or throws — no UI logic.
- **No `any` or implicit state mutation.** Zustand actions must return new state, not mutate.
- **Prop validation:** Use PropTypes or TypeScript — pick one and be consistent. TypeScript preferred for portfolio credibility.
- **Comments:** Explain *why*, not *what*. The damage formula and type chart flattening logic especially need inline comments.

---

## Development Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build locally
npm run test      # Run Vitest
npm run lint      # ESLint
```

---

## What NOT to Do

- **Don't build a backend.** Everything is localStorage + PokéAPI. A backend would add complexity with no portfolio benefit here.
- **Don't fetch all 1000+ Pokémon on load.** Always paginate or lazy-load. The app must feel fast.
- **Don't store sprites locally.** Link directly to PokeAPI's GitHub sprite repo CDN.
- **Don't skip loading/error states** to ship faster — they are part of what employers evaluate.
- **Don't mix user data (Zustand) with server data (React Query).** Keep these concerns strictly separated.

---

## Suggested Build Order

Build in this order to avoid rework — each phase delivers something visible and usable:

1. **Foundation** — Vite + React + Router + Tailwind + shadcn/ui + TanStack Query + Zustand wired up. Deploy a shell with nav.
2. **Pokédex** — First real feature. Validates the API layer and `PokemonCard` component that everything else reuses.
3. **Type Chart** — Pure data manipulation, no user state. Good confidence booster.
4. **Shiny Gallery** — Mostly UI, proves image loading and lazy loading patterns.
5. **Team Builder** — First Zustand feature. Reuses Pokédex search.
6. **Damage Calculator** — Most logic-heavy. Do after Team Builder so formula can be tested with real teams.
7. **Party Profiles** — Extends Team Builder's Zustand patterns.
8. **EV Tracker** — Extends Party Profiles.
9. **Dex Tracker** — Last because it requires understanding the `/pokedex/` endpoint, which is quirky.
