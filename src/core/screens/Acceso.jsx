// ============================================================
//  ACCESO — quién puede entrar
// ============================================================
// "Crear un usuario" es insertar un mail acá. Nunca se maneja una credencial:
// el alta la termina la persona con su magic link.
//
// Esta pantalla se esconde a quien no es admin, PERO esconderla no es el
// control: el control es RLS. Las policies de `invitaciones` exigen
// privado.es_admin(); un no-admin que llame a la tabla a mano no lee ni escribe
// nada. La UI sólo evita ofrecer una puerta que no abre.
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { IconChevronLeft, IconPlus, IconTrash, IconUser } from '../components/icons.jsx'

// El error del proveedor nunca se muestra crudo: viene en inglés y no le sirve a
// nadie. Se traduce lo accionable y el resto va a consola.
function mensaje(e) {
  console.warn('[acceso]', e)
  const t = `${e?.message || ''} ${e?.code || ''}`
  if (/duplicate key|23505/.test(t)) return 'Ese correo ya estaba invitado.'
  if (/row-level security|permission|42501/i.test(t)) return 'No tienes permiso para gestionar el acceso.'
  return 'No se pudo completar la operación.'
}

export default function Acceso({ onSalir }) {
  const [invitaciones, setInvitaciones] = useState([])
  const [email, setEmail] = useState('')
  // Por defecto entra sin poder invitar a nadie más: dar acceso y repartir
  // acceso son dos permisos distintos, y el segundo se concede a propósito.
  const [rol, setRol] = useState('usuario')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = async () => {
    setCargando(true)
    const { data, error: e } = await supabase
      .from('invitaciones')
      .select('email, rol')
      .order('email')
    if (e) setError(mensaje(e))
    else { setInvitaciones(data || []); setError('') }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const invitar = async (e) => {
    e.preventDefault()
    const limpio = email.trim().toLowerCase()
    if (!limpio) return
    // `rol` es un valor de la base, no un texto de interfaz: la restricción solo
    // acepta 'usuario' o 'admin'. Si algún día se muestra en femenino, se traduce
    // al pintarlo; el valor guardado no cambia.
    const { error: e2 } = await supabase.from('invitaciones').insert({ email: limpio, rol })
    if (e2) { setError(mensaje(e2)); return }
    setEmail('')
    setRol('usuario')
    setError('')
    cargar()
  }

  const quitar = async (mail) => {
    if (!confirm(`¿Quitar el acceso de ${mail}? No borra sus datos.`)) return
    const { error: e2 } = await supabase.from('invitaciones').delete().eq('email', mail)
    if (e2) { setError(mensaje(e2)); return }
    setError('')
    cargar()
  }

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      <header className="flex items-center gap-2 pt-2">
        <button
          onClick={onSalir}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
          aria-label="Volver"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight text-texto">Acceso</h1>
      </header>

      <p className="px-1 text-xs font-medium leading-relaxed text-texto-soft">
        Solo estos correos pueden entrar. Invitar no crea una contraseña: la persona
        recibe un enlace la primera vez que entra.
      </p>

      <form onSubmit={invitar} className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Invitar correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alguien@ejemplo.com"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-borde/25 bg-superficie p-3 text-sm text-texto outline-none focus:border-marca"
          />
        </label>

        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Puede
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-borde/25 bg-superficie p-3 text-sm text-texto outline-none focus:border-marca"
          >
            <option value="usuario">Solo usar la aplicación</option>
            <option value="admin">Usar la aplicación y dar acceso a otras personas</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={!email.trim()}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-marca-fuerte px-3 text-sm font-bold text-contraste-fuerte active:scale-95 disabled:opacity-50"
        >
          <IconPlus className="h-4 w-4" /> Invitar
        </button>
      </form>

      {error && (
        <p className="rounded-xl bg-superficie-alta px-3 py-2 text-xs font-semibold text-texto-soft">{error}</p>
      )}

      <div className="space-y-2">
        {cargando && <p className="text-sm font-medium text-texto-soft">Cargando…</p>}
        {!cargando && invitaciones.length === 0 && !error && (
          <p className="text-sm font-medium text-texto-soft">Todavía no hay nadie invitado.</p>
        )}
        {/* Errores de la tabla: se informan, no se gritan. */}
        {invitaciones.map((i) => (
          <div key={i.email} className="flex items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3 shadow-suave">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca/10 text-marca">
              <IconUser className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-texto">{i.email}</span>
              <span className="block text-xs font-medium text-texto-soft">{i.rol}</span>
            </span>
            <button
              onClick={() => quitar(i.email)}
              aria-label={`Quitar ${i.email}`}
              className="flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-[11px] font-semibold text-peligro"
            >
              <IconTrash className="h-4 w-4" /> Quitar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
