// ============================================================
//  APP  — orquesta las vistas (router por estado, sin librería extra)
// ============================================================
// La barra inferior es por horizonte de tiempo (Hoy / Reporte / Historial /
// Ajustes) y no crece. Los tableros de cada módulo — `gym`, `nutricion`,
// `routine` — viven FUERA de la barra: se abren desde su tarjeta en Hoy (o
// desde Ajustes, en el caso de la rutina) y la ocultan mientras están abiertos.
import React, { useMemo, useState } from 'react'
import Hoy from './core/screens/Hoy.jsx'
import Home from './modules/gym/screens/Home.jsx'
import Session from './modules/gym/screens/Session.jsx'
import History from './modules/gym/screens/History.jsx'
import Report from './modules/gym/screens/Report.jsx'
import Routine from './modules/gym/screens/Routine.jsx'
import Nutricion from './modules/nutricion/screens/Nutricion.jsx'
import PlanEditor from './modules/nutricion/screens/PlanEditor.jsx'
import Settings from './core/screens/Settings.jsx'
import Perfil from './core/screens/Perfil.jsx'
import BottomNav from './core/layout/BottomNav.jsx'
import Vacio from './core/components/Vacio.jsx'
import { moduloActivo } from './core/lib/modulos.js'
import { useTheme } from './core/hooks/useTheme.js'
import { getRutina } from './modules/gym/lib/storage.js'
import { resumenHoy as resumenGym } from './modules/gym/lib/session.js'
import { resumenHoy as resumenNutricion } from './modules/nutricion/lib/storage.js'
import { hoyISO } from './core/lib/dates.js'
import { IconTrophy, IconDumbbell, IconSalad } from './core/components/icons.jsx'

// Vistas a pantalla completa: tableros de módulo y la sesión. Mientras están
// abiertas, la barra se esconde.
const SIN_BARRA = ['session', 'routine', 'gym', 'nutricion', 'perfil', 'plan']

// Toast simple para anunciar PRs al finalizar
function Toast({ mensaje, onClose }) {
  if (!mensaje) return null
  return (
    <div className="fixed inset-x-0 top-4 z-50 mx-auto flex max-w-md justify-center px-4">
      <button
        onClick={onClose}
        className="animate-in flex items-center gap-2 rounded-2xl bg-completo px-5 py-3 text-center text-sm font-bold text-fondo shadow-flotante"
      >
        <IconTrophy className="h-5 w-5 shrink-0" />
        {mensaje}
      </button>
    </div>
  )
}

export default function App() {
  const { dark, toggle } = useTheme()
  const [rutina, setRutina] = useState(() => getRutina())
  const [vista, setVista] = useState('hoy')
  const [diaKey, setDiaKey] = useState(null)
  const [toast, setToast] = useState('')
  // Cambia al volver a Hoy: fuerza recalcular los resúmenes de las tarjetas.
  const [sello, setSello] = useState(0)

  const irA = (v) => {
    if (v === 'hoy') setSello((n) => n + 1)
    setVista(v)
  }

  const seleccionarDia = (key) => {
    setDiaKey(key)
    setVista('session')
  }

  const finalizada = (nuevosPRs) => {
    if (nuevosPRs && nuevosPRs.length > 0) {
      setToast(`¡${nuevosPRs.length} récord(s) nuevo(s)! Bien ahí`)
      setTimeout(() => setToast(''), 4000)
    } else {
      setToast('Entrenamiento guardado')
      setTimeout(() => setToast(''), 2500)
    }
    irA('hoy')
  }

  // Tarjetas de Hoy: una por módulo PRENDIDO. Core no conoce los módulos; App,
  // que es la raíz de composición, los une y los filtra.
  const tarjetas = useMemo(() => {
    const gym = resumenGym()
    const nutri = resumenNutricion(hoyISO())
    return [
      {
        id: 'gym',
        titulo: 'Entrenamiento',
        detalle: gym.detalle,
        Icon: IconDumbbell,
        hecho: gym.hecho,
        total: gym.total,
        onAbrir: () => setVista('gym')
      },
      {
        id: 'nutricion',
        titulo: 'Nutrición',
        detalle: nutri.detalle,
        Icon: IconSalad,
        hecho: nutri.hecho,
        total: nutri.total,
        onAbrir: () => setVista('nutricion')
      }
    ].filter((t) => moduloActivo(t.id))
    // `rutina` y `sello` entran para recalcular al volver o al editar el plan.
    // `sello` también cubre prender/apagar un módulo desde Ajustes.
  }, [rutina, sello])

  // Editores que ofrece Ajustes: mismo idioma que las tarjetas de Hoy, y también
  // filtrados. Un módulo apagado no deja editor.
  const editores = [
    {
      id: 'gym',
      titulo: 'Editar rutina',
      detalle: 'Pesos, reps, descansos y ejercicios',
      Icon: IconDumbbell,
      onAbrir: () => setVista('routine')
    },
    {
      id: 'nutricion',
      titulo: 'Editar plan',
      detalle: 'Comidas, objetivos, suplementos y carbos',
      Icon: IconSalad,
      onAbrir: () => setVista('plan')
    }
  ].filter((e) => moduloActivo(e.id))

  // Tras importar backup: recargar para refrescar todo el estado
  const recargar = () => window.location.reload()

  return (
    <div className="mx-auto min-h-full max-w-md bg-fondo text-texto">
      <Toast mensaje={toast} onClose={() => setToast('')} />

      {vista === 'hoy' && <Hoy tarjetas={tarjetas} onIrAjustes={() => setVista('settings')} />}
      {vista === 'gym' && <Home rutina={rutina} onSelectDia={seleccionarDia} onSalir={() => irA('hoy')} />}
      {vista === 'nutricion' && <Nutricion onSalir={() => irA('hoy')} />}
      {vista === 'session' && diaKey && (
        <Session rutina={rutina} diaKey={diaKey} onSalir={() => setVista('gym')} onFinalizada={finalizada} />
      )}
      {/* Historial hoy es TODO del gym (lee sus sesiones directo). Con gym
          apagado no queda sección que mostrar: mejor decirlo que fingir. */}
      {vista === 'history' &&
        (moduloActivo('gym') ? (
          <History onSalir={() => irA('hoy')} />
        ) : (
          <Vacio
            mensaje="El historial vive en el módulo de entrenamiento, que está apagado. Tus sesiones siguen guardadas."
            onAjustes={() => setVista('settings')}
          />
        ))}
      {vista === 'report' && <Report onSalir={() => irA('hoy')} />}
      {vista === 'routine' && <Routine rutina={rutina} onChange={setRutina} onSalir={() => setVista('settings')} />}
      {vista === 'perfil' && <Perfil onSalir={() => setVista('settings')} />}
      {vista === 'plan' && <PlanEditor onSalir={() => setVista('settings')} />}
      {vista === 'settings' && (
        <Settings
          dark={dark}
          onToggleDark={toggle}
          editores={editores}
          onEditarPerfil={() => setVista('perfil')}
          onSalir={() => irA('hoy')}
          onImportado={recargar}
          onModulosChange={() => setSello((n) => n + 1)}
        />
      )}

      {!SIN_BARRA.includes(vista) && <BottomNav vista={vista} onIr={irA} />}
    </div>
  )
}
