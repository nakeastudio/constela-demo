# Constela

Tracker personal de hábitos. PWA mobile-first y modular: hoy gimnasio y nutrición,
más adelante skincare.

El nombre viene de *constancia* + *constelación* + *estela*. Una estrella sola es un
punto sin sentido; la constelación aparece cuando se mira de lejos y se traza la línea.
Eso es el reporte semanal.

## Tesis

**Constancia > perfección.** El promedio de la semana le gana a cualquier día perfecto.
La app está diseñada alrededor de esto: un día incompleto se ve neutro, nunca en rojo.
Solo el progreso se ilumina.

## Módulos

**Gimnasio** — rutina de 4 días editable · registro de peso y reps por serie · series de
aproximación · cronómetro de descanso automático (vibra y suena al llegar a 0) ·
auto-relleno con los valores de la última vez · cardio con protocolo de
inclinación/velocidad · core por tiempo · PRs automáticos · volumen semanal por grupo
muscular vs objetivo.

**Nutrición** — plan semanal por día · comidas checkeables con notas · carbos
intercambiables (uno por almuerzo) · suplementos · registro de agua.

El **día** es la unidad de registro y cruza todos los módulos. Todo es editable hacia
atrás, incluida la fecha y hora del registro.

## Arquitectura

```
src/
  modules/
    gym/        screens · components · data · lib · hooks
    nutricion/  screens · components · data · lib
  core/
    components · hooks · layout · lib · screens
  App.jsx  main.jsx  index.css
```

`core/` no importa de `modules/` — nunca. Cada módulo aporta su porción de persistencia
y de backup a través de un registry, así que agregar un módulo no toca core.

La navegación se organiza **por horizonte temporal**, no por módulo: Hoy · Reporte ·
Historial · Ajustes. Cuatro destinos, para siempre. Un módulo es una tarjeta en Hoy y
una sección en Reporte/Historial — nunca un ítem de nav. Su dashboard se abre desde su
tarjeta, fuera del nav.

## Reporte semanal

Se exporta de dos formas: **PNG** para compartir con una persona, y **texto estructurado**
(markdown) para pegarle a una IA y pedirle sugerencias. El texto lleva los números
exactos, que es lo que una IA necesita para responder algo útil; una imagen pierde
fidelidad numérica.

No hay IA dentro de la app, por diseño: sin API keys en el cliente, sin backend de
modelos, sin costo por uso. Y el reporte, al ser texto, sirve para cualquier destino.

## Stack

React 18 · Vite 6 · Tailwind 3 · lucide-react · Geist · vite-plugin-pwa · Supabase

Los colores son **tokens semánticos** definidos como CSS vars en `index.css` y mapeados
en `tailwind.config.js`. Los nombres son estables entre temas y los valores cambian.
Nunca hardcodear un hex.

## Desarrollo

Se necesita Node 18+ y [pnpm](https://pnpm.io) 10+.

> Usamos pnpm en vez de npm: aísla las dependencias de forma estricta (sin phantom deps)
> y bloquea los scripts de instalación arbitrarios por defecto. Mismo registry, mejor
> higiene de supply-chain.

```bash
pnpm install
pnpm dev              # http://localhost:5173
pnpm dev --host       # para abrirla desde el celular en la misma WiFi
pnpm build            # genera /dist
pnpm preview          # sirve /dist
```

> **Gotcha:** si al verificar un cambio ves código viejo, desregistrá el service worker
> primero. `vite-plugin-pwa` corre en modo `autoUpdate` y sirve el precache anterior.

## Instalar como PWA

Sirve la app por HTTPS (Vercel/Netlify ya lo hacen), ábrela en el celular y usa
**"Agregar a la pantalla de inicio"**.

## Desplegar

Vercel o Netlify detectan Vite y pnpm solos. Build: `pnpm build` · Output: `dist`.

## Accesibilidad

Todo par texto/fondo cumple **WCAG AA** (4.5:1 body, 3:1 large) en ambos temas, con los
ratios calculados y no estimados. El token `borde` es solo para bordes y divisores:
falla AA como texto.

## Tus datos

Hoy viven en `localStorage`; Supabase se conecta en la próxima tanda. **Ajustes →
Exportar JSON** hace un backup completo, e **Importar JSON** lo restaura. El formato de
backup está versionado y los backups viejos siguen importando.
