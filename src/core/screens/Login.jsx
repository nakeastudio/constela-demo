// ============================================================
//  LOGIN — solo magic link
// ============================================================
// No hay campo de contraseña en ninguna parte de esta app, a propósito: lo que
// no se maneja no se filtra. Entrar es pedir un link al mail.
//
// El alta tampoco pasa por acá: sólo pueden entrar los emails que ya están en
// `invitaciones` (lo corta un trigger en auth.users, no esta pantalla). Si el
// mail no está invitado, no llega ningún link.
import React, { useState } from 'react'
import { enviarMagicLink, hayBackend } from '../lib/supabase.js'
import { IconCheck } from '../components/icons.jsx'
import ConstelaMark from '../components/Constela.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [fase, setFase] = useState('form') // 'form' | 'enviando' | 'enviado' | 'error'
  const [error, setError] = useState('')

  const enviar = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setFase('enviando')
    setError('')
    try {
      await enviarMagicLink(email)
      setFase('enviado')
    } catch (err) {
      // No se distingue "no invitada" de otros errores: decir qué correos
      // existen sería filtrar quién usa la app. El detalle crudo va a consola.
      console.warn('[login]', err)
      setError('No se pudo enviar el enlace. Revisa la dirección e inténtalo de nuevo.')
      setFase('error')
    }
  }

  if (!hayBackend) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-3 p-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-texto">Constela</h1>
        <p className="text-sm font-medium leading-relaxed text-texto-soft">
          Falta configurar el backend. Copia <code className="font-mono text-texto">.env.example</code> a{' '}
          <code className="font-mono text-texto">.env</code> y completa las dos variables de Supabase.
        </p>
      </div>
    )
  }

  if (fase === 'enviado') {
    return (
      <div className="animate-in mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-completo/15 text-completo">
          <IconCheck className="h-8 w-8" />
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-texto">Revisa tu correo</h1>
        <p className="text-sm font-medium leading-relaxed text-texto-soft">
          Si <strong className="text-texto">{email}</strong> tiene acceso, le enviamos un enlace para entrar.
          Conviene abrirlo en este mismo dispositivo.
        </p>
        <button
          onClick={() => { setFase('form'); setEmail('') }}
          className="min-h-[44px] text-sm font-bold text-marca"
        >
          Usar otro correo
        </button>
      </div>
    )
  }

  return (
    <div className="animate-in mx-auto flex min-h-full max-w-md flex-col justify-center gap-8 p-8">
      <header className="text-center">
        {/* La constelación es la marca: puntos y líneas que ascienden. En guinda,
            a tono con el favicon. Reemplaza el ícono de cubiertos: esto no es
            una app de comida, es el día como constelación de hábitos. */}
        <span className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-marca/10 text-marca ring-1 ring-marca/20">
          <ConstelaMark className="h-12 w-12" titulo="Constela" />
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-texto">Constela</h1>
        <p className="mt-1.5 text-sm font-medium text-texto-soft">Constancia &gt; perfección.</p>
      </header>

      <form onSubmit={enviar} className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-texto-soft">
          Tu correo
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@ejemplo.com"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-borde/25 bg-superficie p-3 text-sm text-texto outline-none focus:border-marca"
          />
        </label>

        <button
          type="submit"
          disabled={fase === 'enviando' || !email.trim()}
          className="min-h-[44px] w-full rounded-xl bg-marca-fuerte py-3 text-sm font-bold text-contraste-fuerte transition-transform active:scale-95 disabled:opacity-50"
        >
          {fase === 'enviando' ? 'Enviando…' : 'Enviarme el enlace'}
        </button>

        {/* Un fallo no se grita: se dice. */}
        {fase === 'error' && (
          <p className="rounded-xl bg-superficie-alta px-3 py-2 text-xs font-semibold text-texto-soft">{error}</p>
        )}

        <p className="pt-1 text-center text-xs font-medium leading-relaxed text-texto-soft">
          Sin contraseñas: llega un enlace y listo. El acceso es por invitación.
        </p>
      </form>
    </div>
  )
}
