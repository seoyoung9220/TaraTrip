import { Route, Routes } from 'react-router-dom'
import InputPage from './pages/InputPage.tsx'
import PlacePage from './pages/PlacePage.tsx'
import ResultPage from './pages/ResultPage.tsx'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<InputPage />} />
        <Route path="/route" element={<ResultPage />} />
        <Route path="/places/:placeId" element={<PlacePage />} />
      </Routes>
    </div>
  )
}
