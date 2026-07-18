// ============================================================
//  AUTH GATE — resuelve la sesión ANTES de montar la app
// ============================================================
// Esto no es sólo estética de carga: es una condición del namespacing.
// `clave()` es SÍNCRONA (leer nunca espera) y necesita el uid ya fijado. App lee
// la rutina en el useState inicial, así que si montáramos App antes de resolver
// la sesión, leería con el prefijo equivocado — o peor, con el de otra persona.
//
// Por eso: sesión → setUsuarioActual → reclamo del legado → recién ahí App.
import React, { useEffect, useState } from 'react'
import Login from './Login.jsx'
import { supabase, hayBackend } from '../lib/supabase.js'
import { iniciarSync, detenerSync, hidratar, reclamarLegado, clavesSincronizables } from '../lib/sync.js'

export default function AuthGate({ children }) {
  const [fase, setFase] = useState('resolviendo') // 'resolviendo' | 'fuera' | 'dentro'
  const [sesion, setSesion] = useState(null)

  useEffect(() => {
    // ── Bypass de desarrollo ────────────────────────────────────────────────
    // Cada magic-link cuesta un correo, y en `pnpm dev` se entra decenas de
    // veces por día. Solo en DEV se salta la autenticación con un pseudo-usuario
    // estable, así el árbol monta directo. `import.meta.env.DEV` es de tiempo de
    // compilación: Vite lo reemplaza por `false` en el build de producción y
    // elimina esta rama entera (verificado con grep sobre dist/). El uid es fijo
    // para que el namespacing de storage (appgym:u:<uid>:…) sea coherente y los
    // datos de dev no choquen con un login real. La ruta real de producción
    // (abajo) queda intacta.
    if (import.meta.env.DEV) {
      const sesionDev = { user: { id: 'dev-usuario-local', email: 'dev@constela.local' } }
      iniciarSync(sesionDev.user.id)
      reclamarLegado(sesionDev.user.id, clavesSincronizables())
      setSesion(sesionDev)
      setFase('dentro')
      return
    }

    if (!hayBackend) { setFase('fuera'); return }

    let vivo = true

    const aplicar = async (s) => {
      if (!vivo) return
      if (!s?.user) {
        detenerSync()
        setSesion(null)
        setFase('fuera')
        return
      }
      const uid = s.user.id
      // 1. El uid manda ANTES de cualquier lectura.
      iniciarSync(uid)
      // 2. El legado (datos de antes del login) se reclama una sola vez y sólo
      //    por el primer usuario. Ver reclamarLegado() para el porqué.
      reclamarLegado(uid, clavesSincronizables())
      setSesion(s)
      setFase('dentro')
      // 3. Recién ahora se habla con la red. La app ya es usable sin esto.
      hidratar()
    }

    supabase.auth.getSession().then(({ data }) => aplicar(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => { aplicar(s) })

    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [])

  if (fase === 'resolviendo') {
    return (
      <div className="mx-auto flex min-h-full max-w-md items-center justify-center p-8">
        <p className="text-sm font-medium text-texto-soft">Cargando…</p>
      </div>
    )
  }

  if (fase === 'fuera') return <Login />

  // `key` por usuario: cambiar de persona re-monta todo el árbol, así ningún
  // estado de React sobrevive al cambio y nadie ve datos del anterior.
  return <React.Fragment key={sesion.user.id}>{children(sesion)}</React.Fragment>
}
