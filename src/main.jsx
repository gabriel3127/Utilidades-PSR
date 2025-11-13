import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppWithRoutes from './AppWithRoutes.jsx' // ← Mudou

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppWithRoutes /> {/* ← Mudou */}
  </StrictMode>,
)