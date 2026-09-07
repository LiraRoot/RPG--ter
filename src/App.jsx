import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RoleGate from './components/RoleGate'
import WorldListPage from './pages/WorldListPage'
import CreateWorldPage from './pages/CreateWorldPage'
import EditWorldPage from './pages/EditWorldPage'
import CharacterListPage from './pages/CharacterListPage'
import CampaignTablePage from './pages/CampaignTablePage'
import CreateCharacterPage from './pages/CreateCharacterPage'
import CharacterSheetPage from './pages/CharacterSheetPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <RoleGate>
        <div className="container">
          <Routes>
            <Route path="/" element={<WorldListPage />} />
            <Route path="/mundos/novo" element={<CreateWorldPage />} />
            <Route path="/mundos/:mundoId/editar" element={<EditWorldPage />} />
            <Route path="/mundo/:mundoId" element={<CharacterListPage />} />
            <Route path="/mundo/:mundoId/mesa" element={<CampaignTablePage />} />
            <Route path="/mundo/:mundoId/novo" element={<CreateCharacterPage />} />
            <Route path="/novo" element={<CreateCharacterPage />} />
            <Route path="/personagem/:id" element={<CharacterSheetPage />} />
          </Routes>
        </div>
      </RoleGate>
    </BrowserRouter>
  )
}
