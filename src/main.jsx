import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Registra los módulos en core antes de renderizar (backup, día compuesto).
import './modules/registro.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
