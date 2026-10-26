import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/cormorant/wght.css'
import '@fontsource-variable/cormorant/wght-italic.css'
import '@fontsource-variable/instrument-sans/wdth.css'
import './index.css'
import './styles/common.css'
import App from './App.jsx'
import { initPwa } from './lib/pwa.js'

initPwa()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
