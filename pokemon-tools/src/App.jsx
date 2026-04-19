import { Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './store/userStore'
import Layout from './components/Layout'
import GenerationSelect from './pages/GenerationSelect'
import Pokedex from './pages/Pokedex'
import TypeChart from './pages/TypeChart'
import DamageCalc from './pages/DamageCalc'
import ShinyGallery from './pages/ShinyGallery'
import TeamBuilder from './pages/TeamBuilder'
import PartyProfiles from './pages/PartyProfiles'
import EVTracker from './pages/EVTracker'
import DexTracker from './pages/DexTracker'

// Redirect to generation select if no generation has been chosen yet
function Root() {
  const activeGeneration = useUserStore((s) => s.activeGeneration)
  return activeGeneration
    ? <Navigate to="/pokedex" replace />
    : <Navigate to="/select-generation" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/select-generation" element={<GenerationSelect />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Root />} />
        <Route path="pokedex"        element={<Pokedex />} />
        <Route path="type-chart"     element={<TypeChart />} />
        <Route path="damage-calc"    element={<DamageCalc />} />
        <Route path="shiny-gallery"  element={<ShinyGallery />} />
        <Route path="team-builder"   element={<TeamBuilder />} />
        <Route path="party-profiles" element={<PartyProfiles />} />
        <Route path="ev-tracker"     element={<EVTracker />} />
        <Route path="dex-tracker"    element={<DexTracker />} />
      </Route>
    </Routes>
  )
}
