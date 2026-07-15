// ============================================================
//  CLIENTE SUPABASE
// ============================================================
// Las dos variables VITE_ terminan dentro del bundle: es correcto y esperado.
// La publishable key está diseñada para ser pública. Lo que protege los datos NO
// es esconderla (es imposible): es Row Level Security, que exige usuario
// autenticado y limita cada fila a su dueño (auth.uid() = user_id).
//
// Acá NUNCA puede entrar una service_role key: saltea RLS y quedaría publicada.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Sin credenciales la app sigue andando 100% local. No se rompe: se queda
// offline. Es lo que ve alguien que clona el repo sin `.env`.
export const hayBackend = Boolean(url && publishableKey)

export const supabase = hayBackend
  ? createClient(url, publishableKey, {
      auth: {
        // Magic link: el token vuelve en la URL y hay que canjearlo.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

// Manda el magic link. No hay contraseñas en ningún lado de esta app: "crear
// usuario" es insertar un email en `invitaciones`, nunca manejar una credencial.
export async function enviarMagicLink(email) {
  if (!supabase) throw new Error('Sin backend configurado')
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: window.location.origin }
  })
  // Un email no invitado lo rechaza un trigger en auth.users. El mensaje que
  // devuelve Supabase es genérico; lo traducimos en la pantalla de login.
  if (error) throw error
}

export async function cerrarSesion() {
  if (!supabase) return
  await supabase.auth.signOut()
}
