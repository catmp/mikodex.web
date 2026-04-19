import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import {
  BookOpen, Grid3X3, Zap, Sparkles, Users,
  UserCheck, BarChart2, CheckSquare, Globe,
} from 'lucide-react'
import { useUserStore } from '../store/userStore'
import { GEN_INFO } from '../constants/generations'

const NAV = [
  { to: '/pokedex',        icon: BookOpen,    label: 'Pokédex' },
  { to: '/type-chart',     icon: Grid3X3,     label: 'Type Chart' },
  { to: '/damage-calc',    icon: Zap,         label: 'Damage Calc' },
  { to: '/shiny-gallery',  icon: Sparkles,    label: 'Shiny Gallery' },
  { to: '/team-builder',   icon: Users,       label: 'Team Builder' },
  { to: '/party-profiles', icon: UserCheck,   label: 'Party Profiles' },
  { to: '/ev-tracker',     icon: BarChart2,   label: 'EV Tracker' },
  { to: '/dex-tracker',    icon: CheckSquare, label: 'Dex Tracker' },
]

function NavItem({ to, icon, label, mobile = false }) {
  const Icon = icon
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        mobile
          ? `flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] transition-colors ${isActive ? 'text-accent' : 'text-sub'}`
          : `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-0.5 transition-colors ${
              isActive
                ? 'bg-accent2 text-accent font-medium'
                : 'text-sub hover:bg-card hover:text-fg'
            }`
      }
    >
      <Icon size={mobile ? 18 : 16} aria-hidden="true" />
      <span>{mobile ? label.split(' ')[0] : label}</span>
    </NavLink>
  )
}

function GenBadge() {
  const location         = useLocation()
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  const genInfo          = activeGeneration ? GEN_INFO[activeGeneration] : null

  return (
    <Link
      to="/select-generation"
      state={{ from: location.pathname }}
      className="block mx-2 mb-2 p-3 rounded-lg border border-border hover:border-border2 transition-colors group"
    >
      {genInfo ? (
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: genInfo.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-fg text-xs font-medium truncate">
              Gen {genInfo.number} · {genInfo.region}
            </p>
            <p className="text-dim text-[10px] group-hover:text-sub transition-colors">
              Change generation →
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sub group-hover:text-fg transition-colors">
          <Globe size={13} />
          <span className="text-xs">All generations</span>
          <span className="text-dim text-[10px] ml-auto">Change →</span>
        </div>
      )}
    </Link>
  )
}

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-base flex">
      {/* ── Sidebar (desktop) ────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 fixed inset-y-0 left-0 bg-surface border-r border-border z-40">
        <div className="p-5 border-b border-border">
          <Link to="/select-generation" state={{ from: location.pathname }} className="block hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold text-fg tracking-tight">
              <span className="text-accent">Miko</span>Dex
            </h1>
            <p className="text-dim text-xs mt-0.5">Pokémon Tools Hub</p>
          </Link>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto" aria-label="Main navigation">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t border-border pt-2 pb-3">
          <GenBadge />
          <p className="text-dim text-[10px] px-4">Data: PokéAPI</p>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-56 pb-16 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* ── Bottom nav (mobile) ───────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-40 flex"
        aria-label="Mobile navigation"
      >
        {NAV.slice(0, 5).map((item) => (
          <NavItem key={item.to} {...item} mobile />
        ))}
      </nav>
    </div>
  )
}
