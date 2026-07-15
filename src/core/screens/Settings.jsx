// Ajustes: modo oscuro, backup (export/import JSON), editar rutina.
import React, { useRef } from 'react'
import { exportarTodo, importarTodo } from '../lib/modulos.js'
import {
  IconChevronLeft,
  IconChevronRight,
  IconMoon,
  IconSun,
  IconDumbbell,
  IconSalad,
  IconUser,
  IconDownload,
  IconUpload
} from '../components/icons.jsx'
import Toggle from '../components/Toggle.jsx'

// Chip de icono reutilizable: cuadrado redondeado con tinte de marca.
function IconChip({ children }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-marca/10 text-marca">
      {children}
    </span>
  )
}

export default function Settings({ dark, onToggleDark, onEditarRutina, onEditarPlan, onEditarPerfil, onSalir, onImportado }) {
  const fileRef = useRef(null)

  // Descarga todos los datos como JSON (backup)
  const exportarJSON = () => {
    const data = exportarTodo()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `appgym_backup_${new Date().toISOString().slice(0, 10)}.json`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  // Importa un backup JSON (reemplaza los datos actuales)
  const importarJSON = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importarTodo(JSON.parse(reader.result))
        alert('Backup importado correctamente. Se recargará la app.')
        onImportado()
      } catch (err) {
        alert('Error al importar: ' + err.message)
      }
    }
    reader.readAsText(file)
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
            <p className="text-xs font-medium text-texto-soft">Tocá para cambiar el tema</p>
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

        {/* Editar rutina */}
        <button
          onClick={onEditarRutina}
          className="flex w-full items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave active:scale-[0.99]"
        >
          <IconChip><IconDumbbell className="h-5 w-5" /></IconChip>
          <div className="flex-1 text-left">
            <p className="font-bold tracking-tight text-texto">Editar rutina</p>
            <p className="text-xs font-medium text-texto-soft">Pesos, reps, descansos y ejercicios</p>
          </div>
          <IconChevronRight className="h-5 w-5 shrink-0 text-texto-soft" />
        </button>

        {/* Editar plan */}
        <button
          onClick={onEditarPlan}
          className="flex w-full items-center gap-3 rounded-2xl border border-borde/25 bg-superficie p-3.5 shadow-suave active:scale-[0.99]"
        >
          <IconChip><IconSalad className="h-5 w-5" /></IconChip>
          <div className="flex-1 text-left">
            <p className="font-bold tracking-tight text-texto">Editar plan</p>
            <p className="text-xs font-medium text-texto-soft">Comidas, objetivos, suplementos y carbos</p>
          </div>
          <IconChevronRight className="h-5 w-5 shrink-0 text-texto-soft" />
        </button>
      </div>

      {/* ---- Backup ---- */}
      <div className="space-y-3">
        <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-texto-soft">Backup de datos</h2>
        <div className="rounded-2xl border border-borde/25 bg-superficie p-4 shadow-suave">
          <div className="mb-3 flex items-center gap-3">
            <IconChip><IconDownload className="h-5 w-5" /></IconChip>
            <p className="text-sm font-medium text-texto-soft">
              Exportá todo (sesiones, PRs, rutina) o importá desde otro celular.
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={exportarJSON}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-completo py-3 font-bold text-contraste active:scale-95"
            >
              <IconDownload className="h-5 w-5" /> Exportar JSON
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-borde/25 py-3 font-bold text-texto active:scale-95"
            >
              <IconUpload className="h-5 w-5" /> Importar JSON
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" onChange={importarJSON} className="hidden" />
        </div>
      </div>

      <p className="pt-2 text-center text-xs font-medium text-texto-soft">Constela · datos guardados solo en este dispositivo</p>
    </div>
  )
}
