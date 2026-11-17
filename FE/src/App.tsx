import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Splash from './components/Splash.tsx'
import InputPage from './pages/InputPage.tsx'
import MerchantFormPage from './pages/MerchantFormPage.tsx'
import MerchantPage from './pages/MerchantPage.tsx'
import PlacePage from './pages/PlacePage.tsx'
import ResultPage from './pages/ResultPage.tsx'

const SPLASH_KEY = 'taratrip.splashSeen'

// The splash plays once per browser session, over whichever page was opened.
function splashSeen(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !splashSeen())

  const finishSplash = () => {
    try {
      sessionStorage.setItem(SPLASH_KEY, '1')
    } catch {
      // Storage blocked: the splash simply plays again next time.
    }
    setShowSplash(false)
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<InputPage />} />
        <Route path="/route" element={<ResultPage />} />
        <Route path="/places/:placeId" element={<PlacePage />} />
        <Route path="/merchant" element={<MerchantPage />} />
        <Route path="/merchant/new" element={<MerchantFormPage />} />
        <Route path="/merchant/edit/:placeId" element={<MerchantFormPage />} />
      </Routes>
      {showSplash && <Splash onDone={finishSplash} />}
    </div>
  )
}
