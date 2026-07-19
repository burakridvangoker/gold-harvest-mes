import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import OperatorPanel from './pages/OperatorPanel.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/operator" element={<OperatorPanel />} />
        <Route path="/mudur" element={<ManagerDashboard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
