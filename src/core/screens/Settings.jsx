// Ajustes: cuenta y sincronización, modo oscuro, módulos prendidos/apagados y
// los editores de cada módulo.
//
// Ya no hay backup JSON: existía cuando localStorage era el único almacén y la
// exportación manual era la única red. Ahora el respaldo es la sincronización.
// (El pegado de JSON en los editores de plan y rutina NO era backup y sigue: es
// la vuelta de "Copiar reporte para IA".)
import React, { useState } from 'react'
import { modulos, moduloActivo, setModuloActivo } from '../lib/modulos.js'
import {
  IconChevronLeft,
  IconChevronRight,
  IconMoon,
  IconSun,
  IconUser,
  IconUsers
} from '../components/icons.jsx'
import Toggle from '../components/Toggle.jsx'
import EstadoSync from '../components/EstadoSync.jsx'
import { useEstadoSync, fraseDondeViven } from '../hooks/useSync.js'

// Chip de icono reutilizable: cuadrado redondeado con tinte de marca.
function IconChip({ children }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marca/10 text-marca">
      {children}
    </span>
  )
}

export default function Settings({
  dark,
  onToggleDark,
  editores,
  email,
  esAdmin,
  onEditarPerfil,
  onAcceso,
  onCerrarSesion,
  onSalir,
  onModulosChange
}) {
  const estadoSync = useEstadoSync()
  // La lista sale del REGISTRO, no de una constante: el día que skincare se
  // registre, su interruptor aparece solo. Un interruptor que no prende nada
  // sería mentirle a quien lo toca.
  const [apagados, setApagados] = useState(() => modulos().filter((m) => !moduloActivo(m.id)).map((m) => m.id))

  const alternarModulo = (id) => {
    setModuloActivo(id, apagados.includes(id))
    setApagados(modulos().filter((m) => !moduloActivo(m.id)).map((m) => m.id))
    onModulosChange()
  }

  return (
    <div className="animate-in space-y-5 p-4 pb-24">
      <header className="flex items-center gap-2 pt-2">
        <button
          onClick={onSalir}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-texto-soft active:bg-superficie-alta"
          aria-label="Volver"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold tracking-tight text-texto">Ajustes</h1>
      </header>

      {/* ---- Cuenta ---- */}
      <div className="space-y-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-texto-soft">Cuenta</h2>

        <EstadoSync />

        <div className="flex items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave">
          <IconChip><IconUser className="h-5 w-5" /></IconChip>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold tracking-tight text-texto">{email || 'Sin sesión'}</p>
            <p className="text-xs font-medium text-texto-soft">{esAdmin ? 'Administradora' : 'Sesión iniciada'}</p>
          </div>
        </div>

        {/* Sólo admin. Esconderlo NO es el control — lo es RLS en `invitaciones`
            (privado.es_admin()); esto sólo evita ofrecer una puerta que no abre. */}
        {esAdmin && (
          <button
            onClick={onAcceso}
            className="flex w-full items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave active:scale-[0.99]"
          >
            <IconChip><IconUsers className="h-5 w-5" /></IconChip>
            <div className="flex-1 text-left">
              <p className="font-bold tracking-tight text-texto">Acceso</p>
              <p className="text-xs font-medium text-texto-soft">Quién puede entrar a la app</p>
            </div>
            <IconChevronRight className="h-5 w-5 shrink-0 text-texto-soft" />
          </button>
        )}

        {/* El costo va ANTES del botón, no debajo: sin contraseñas, salir es la
            acción más cara de la app —la única vuelta es otro correo—, y eso hay
            que saberlo para decidir, no después de haber decidido.
            No es un modal ni va en rojo a propósito: no se pierde nada, así que
            no es un peligro, es información. La hoja de confirmación en esta app
            está reservada para lo irreversible ("¿Borrar esta sesión? No se
            puede deshacer"); gastarla acá abarataría esas advertencias. Y salir es una
            necesidad real cuando dos personas comparten el navegador. */}
        <p className="px-1 text-xs font-medium leading-relaxed text-texto-soft">
          No se borra nada: los datos siguen en este dispositivo. Para volver a entrar se necesita
          un enlace nuevo por correo.
        </p>
        <button
          onClick={onCerrarSesion}
          className="min-h-[44px] w-full rounded-xl py-2 text-sm font-semibold text-texto-soft"
        >
          Cerrar sesión
        </button>
      </div>

      {/* ---- Preferencias ---- */}
      <div className="space-y-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-texto-soft">Preferencias</h2>

        {/* Modo oscuro */}
        <button
          onClick={onToggleDark}
          role="switch"
          aria-checked={dark}
          className="flex w-full items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave transition-transform active:scale-[0.99]"
        >
          <IconChip>{dark ? <IconMoon className="h-5 w-5" /> : <IconSun className="h-5 w-5" />}</IconChip>
          <div className="flex-1 text-left">
            <p className="font-bold tracking-tight text-texto">{dark ? 'Modo oscuro' : 'Modo claro'}</p>
            <p className="text-xs font-medium text-texto-soft">Toca para cambiar el tema</p>
          </div>
          <Toggle checked={dark} />
        </button>

        {/* Perfil */}
        <button
          onClick={onEditarPerfil}
          className="flex w-full items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave active:scale-[0.99]"
        >
          <IconChip><IconUser className="h-5 w-5" /></IconChip>
          <div className="flex-1 text-left">
            <p className="font-bold tracking-tight text-texto">Perfil</p>
            <p className="text-xs font-medium text-texto-soft">Nombre, edad, peso, altura y objetivo</p>
          </div>
          <IconChevronRight className="h-5 w-5 shrink-0 text-texto-soft" />
        </button>

        {/* Editores de cada módulo. Los arma App (la raíz de composición) y ya
            vienen filtrados: un módulo apagado no deja editor acá. */}
        {editores.map((e) => (
          <button
            key={e.id}
            onClick={e.onAbrir}
            className="flex w-full items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave active:scale-[0.99]"
          >
            <IconChip><e.Icon className="h-5 w-5" /></IconChip>
            <div className="flex-1 text-left">
              <p className="font-bold tracking-tight text-texto">{e.titulo}</p>
              <p className="text-xs font-medium text-texto-soft">{e.detalle}</p>
            </div>
            <IconChevronRight className="h-5 w-5 shrink-0 text-texto-soft" />
          </button>
        ))}
      </div>

      {/* ---- Módulos ---- */}
      <div className="space-y-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-texto-soft">Módulos</h2>
        {modulos().map((m) => {
          const activo = !apagados.includes(m.id)
          return (
            <button
              key={m.id}
              onClick={() => alternarModulo(m.id)}
              role="switch"
              aria-checked={activo}
              className="flex w-full items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave transition-transform active:scale-[0.99]"
            >
              <div className="flex-1 text-left">
                <p className="font-bold tracking-tight text-texto">{m.nombre}</p>
                <p className="text-xs font-medium text-texto-soft">
                  {activo ? 'Se muestra en Hoy, Reporte e Historial' : 'Escondido · tus datos siguen guardados'}
                </p>
              </div>
              <Toggle checked={activo} />
            </button>
          )
        })}
        <p className="px-1 text-xs font-medium text-texto-soft">
          Apagar un módulo solo lo esconde. Nada se borra: al prenderlo vuelve tal cual estaba.
        </p>
      </div>


      {/* Dónde viven los datos NO puede ser una constante: era cierto cuando
          localStorage era el único almacén y deja de serlo al iniciar sesión.
          Sale del mismo estado que muestra EstadoSync, no de una segunda fuente. */}
      <p className="pt-2 text-center text-xs font-medium leading-relaxed text-texto-soft">
        Constela
        <span className="mt-0.5 block">{fraseDondeViven(estadoSync, email)}</span>
      </p>
    </div>
  )
}
