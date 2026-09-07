import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CharacterListPage from './pages/CharacterListPage'
import CreateCharacterPage from './pages/CreateCharacterPage'
import CharacterSheetPage from './pages/CharacterSheetPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="container">
        <Routes>
          <Route path="/" element={<CharacterListPage />} />
          <Route path="/novo" element={<CreateCharacterPage />} />
          <Route path="/personagem/:id" element={<CharacterSheetPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
