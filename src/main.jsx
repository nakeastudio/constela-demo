import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AuthGate from './core/screens/AuthGate.jsx'
// Registra los módulos y el mapa de sync en core antes de renderizar.
import './modules/registro.js'
import './index.css'

// AuthGate envuelve a App y no al revés: App lee la rutina en su useState
// inicial, y esa lectura necesita el uid ya fijado (ver core/lib/storage.js).
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>{(sesion) => <App sesion={sesion} />}</AuthGate>
  </React.StrictMode>
)
