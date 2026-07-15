// ============================================================
//  APP  — orquesta las vistas (router por estado, sin librería extra)
// ============================================================
// La barra inferior es por horizonte de tiempo (Hoy / Reporte / Historial /
// Ajustes) y no crece. Los tableros de cada módulo — `gym`, `nutricion`,
// `routine` — viven FUERA de la barra: se abren desde su tarjeta en Hoy (o
// desde Ajustes, en el caso de la rutina) y la ocultan mientras están abiertos.
import React, { useEffect, useMemo, useState } from 'react'
import Hoy from './core/screens/Hoy.jsx'
import Historial from './core/screens/Historial.jsx'
import Home from './modules/gym/screens/Home.jsx'
import Session from './modules/gym/screens/Session.jsx'
import History from './modules/gym/screens/History.jsx'
import Report from './modules/gym/screens/Report.jsx'
import Routine from './modules/gym/screens/Routine.jsx'
import RestTimer from './modules/gym/components/RestTimer.jsx'
import { useRestTimer } from './modules/gym/hooks/useRestTimer.js'
import Nutricion from './modules/nutricion/screens/Nutricion.jsx'
import PlanEditor from './modules/nutricion/screens/PlanEditor.jsx'
import Settings from './core/screens/Settings.jsx'
import Perfil from './core/screens/Perfil.jsx'
import Acceso from './core/screens/Acceso.jsx'
import BottomNav from './core/layout/BottomNav.jsx'
import { moduloActivo } from './core/lib/modulos.js'
import { supabase, cerrarSesion } from './core/lib/supabase.js'
import { detenerSync } from './core/lib/sync.js'
import { useTheme } from './core/hooks/useTheme.js'
import { getRutina } from './modules/gym/lib/storage.js'
import { resumenHoy as resumenGym } from './modules/gym/lib/session.js'
import { resumenHoy as resumenNutricion } from './modules/nutricion/lib/storage.js'
import { hoyISO } from './core/lib/dates.js'
import { IconTrophy, IconDumbbell, IconSalad } from './core/components/icons.jsx'

// Vistas a pantalla completa: tableros de módulo y la sesión. Mientras están
// abiertas, la barra se esconde.
// `gymHistory` es el historial DEL GYM: se abre desde el Historial cruzado (que
// sí vive en la barra), igual que un tablero de módulo.
const SIN_BARRA = ['session', 'routine', 'gym', 'nutricion', 'perfil', 'plan', 'gymHistory', 'acceso']

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

export default function App({ sesion }) {
  const { dark, toggle } = useTheme()
  const [rutina, setRutina] = useState(() => getRutina())
  // El rol sale de `perfiles`, donde RLS deja leer SOLO la fila propia. No se
  // deriva del mail ni de nada del cliente: eso sería creerle al navegador.
  // Ojo: esto decide qué se MUESTRA. Lo que protege `invitaciones` es RLS.
  const [rol, setRol] = useState(null)
  const [vista, setVista] = useState('hoy')
  const [diaKey, setDiaKey] = useState(null)
  const [toast, setToast] = useState('')
  // Cambia al volver a Hoy: fuerza recalcular los resúmenes de las tarjetas.
  const [sello, setSello] = useState(0)
  // Fecha con la que se abre una pantalla de módulo desde el Historial.
  // null = hoy (el caso normal, entrando desde Hoy).
  const [fechaFoco, setFechaFoco] = useState(null)

  // El descanso vive ACÁ y no en Session: es parte del entrenamiento, no de una
  // pantalla. Adentro de Session, navegar la desmontaba y el cronómetro moría a
  // mitad del descanso (y soltaba el wake lock). App no se desmonta nunca.
  const timer = useRestTimer()
  const gymActivo = moduloActivo('gym')

  // Si apaga el gym con un descanso corriendo, el panel no puede quedar colgado
  // ni el wake lock tomado por un módulo que ya no se muestra.
  useEffect(() => {
    if (!gymActivo) timer.detener()
  }, [gymActivo, timer.detener])

  useEffect(() => {
    if (!supabase || !sesion?.user) return
    let vivo = true
    supabase
      .from('perfiles')
      .select('rol')
      .eq('user_id', sesion.user.id)
      .maybeSingle()
      .then(({ data }) => { if (vivo) setRol(data?.rol ?? null) })
    return () => { vivo = false }
  }, [sesion])

  // Salir NO borra nada local: sus claves quedan bajo su namespace y vuelven
  // enteras en el próximo login.
  const salir = async () => {
    detenerSync()
    await cerrarSesion()
  }

  const irA = (v) => {
    if (v === 'hoy') setSello((n) => n + 1)
    setFechaFoco(null)
    setVista(v)
  }

  const seleccionarDia = (key) => {
    setDiaKey(key)
    setVista('session')
  }

  // Historial → la pantalla del módulo, en esa fecha. No hay editor del pasado
  // aparte: es la pantalla de siempre mirando otro día. El mapeo id→vista vive
  // acá porque App es la raíz de composición (igual que `tarjetas`/`editores`).
  const abrirModuloEnFecha = (id, fecha) => {
    setFechaFoco(fecha)
    if (id === 'gym') setVista('gymHistory')
    else if (id === 'nutricion') setVista('nutricion')
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
      {/* `key` fuerza remontar al cambiar de fecha: la fecha inicial se lee en
          el useState de Nutricion y si no, abrir otro día no la movería. */}
      {vista === 'nutricion' && (
        <Nutricion
          key={fechaFoco || 'hoy'}
          fechaInicial={fechaFoco}
          onSalir={() => (fechaFoco ? irA('history') : irA('hoy'))}
        />
      )}
      {vista === 'session' && diaKey && (
        <Session rutina={rutina} diaKey={diaKey} timer={timer} onSalir={() => setVista('gym')} onFinalizada={finalizada} />
      )}
      {/* Historial cruzado: itera el registro y enruta a cada módulo. Ya no es
          "el historial del gym": el pasado es un horizonte, no un módulo. */}
      {vista === 'history' && (
        <Historial onAbrirModulo={abrirModuloEnFecha} onIrAjustes={() => setVista('settings')} />
      )}
      {vista === 'gymHistory' && <History fecha={fechaFoco} onSalir={() => irA('history')} />}
      {vista === 'report' && <Report onSalir={() => irA('hoy')} />}
      {vista === 'routine' && <Routine rutina={rutina} onChange={setRutina} onSalir={() => setVista('settings')} />}
      {vista === 'perfil' && <Perfil onSalir={() => setVista('settings')} />}
      {vista === 'acceso' && <Acceso onSalir={() => setVista('settings')} />}
      {vista === 'plan' && <PlanEditor onSalir={() => setVista('settings')} />}
      {vista === 'settings' && (
        <Settings
          dark={dark}
          onToggleDark={toggle}
          editores={editores}
          email={sesion?.user?.email}
          esAdmin={rol === 'admin'}
          onEditarPerfil={() => setVista('perfil')}
          onAcceso={() => setVista('acceso')}
          onCerrarSesion={salir}
          onSalir={() => irA('hoy')}
          onImportado={recargar}
          onModulosChange={() => setSello((n) => n + 1)}
        />
      )}

      {!SIN_BARRA.includes(vista) && <BottomNav vista={vista} onIr={irA} />}

      {/* Cronómetro de descanso: a nivel de app, así sobrevive a navegar entre
          pantallas. Con el gym apagado no se muestra (y el efecto de arriba ya
          lo detuvo, así que tampoco queda corriendo). */}
      {gymActivo && <RestTimer timer={timer} />}
    </div>
  )
}
