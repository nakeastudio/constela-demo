// ============================================================
//  ICONOS — capa fina sobre lucide-react
// ============================================================
// Un único punto de intercambio: los sitios de uso importan los nombres
// `Icon*` y no saben qué librería hay detrás. Se importa ícono por ícono
// para que el tree-shaking descarte el resto del set.
import React from 'react'
import {
  House,
  ChartColumn,
  TrendingUp,
  Settings,
  Flame,
  Footprints,
  StickyNote,
  Trophy,
  Check,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Moon,
  Sun,
  Dumbbell,
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Pencil,
  UtensilsCrossed,
  Droplet,
  Pill,
  Coffee,
  Info,
  Salad,
  User
} from 'lucide-react'

// Los sitios de uso pasan el tamaño por className (h-5 w-5, etc.).
// `size={undefined}` evita que lucide fije width/height inline y le gane a la clase.
const icono =
  (Componente, extra = {}) =>
  ({ className = 'h-6 w-6', ...props }) => (
    <Componente size={undefined} className={className} aria-hidden="true" {...extra} {...props} />
  )

export const IconHome = icono(House)
export const IconChart = icono(ChartColumn)
export const IconTrend = icono(TrendingUp)
export const IconSettings = icono(Settings)
export const IconFlame = icono(Flame)
export const IconRun = icono(Footprints)
export const IconNote = icono(StickyNote)
export const IconTrophy = icono(Trophy)
export const IconCheck = icono(Check)
export const IconPlus = icono(Plus)
export const IconMinus = icono(Minus)
export const IconChevronLeft = icono(ChevronLeft)
export const IconChevronRight = icono(ChevronRight)
export const IconChevronDown = icono(ChevronDown)
export const IconChevronUp = icono(ChevronUp)
export const IconDownload = icono(Download)
export const IconUpload = icono(Upload)
export const IconMoon = icono(Moon)
export const IconSun = icono(Sun)
export const IconDumbbell = icono(Dumbbell)
export const IconCalendar = icono(Calendar)
export const IconClock = icono(Clock)
// Play/Pause se leen mejor macizos en los controles del cronómetro.
export const IconPlay = icono(Play, { fill: 'currentColor' })
export const IconPause = icono(Pause, { fill: 'currentColor' })
export const IconTrash = icono(Trash2)
export const IconEdit = icono(Pencil)
export const IconMeal = icono(UtensilsCrossed)
export const IconWater = icono(Droplet)
export const IconPill = icono(Pill)
export const IconCoffee = icono(Coffee)
export const IconInfo = icono(Info)
export const IconSalad = icono(Salad)
export const IconUser = icono(User)
