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

## Catálogo de ejercicios

El botón "Agregar ejercicio" abre un selector con 1324 ejercicios: búsqueda y filtro por
grupo muscular. No es cosmética, es integridad de datos. Los récords se guardan por
nombre (`prs[nombre]`), así que "Hip Thrust" y "Hip thrust" escritos a mano son dos
ejercicios distintos para la app: el historial se parte y los récords desaparecen. Y un
grupo muscular equivocado corrompe el volumen semanal en silencio. Elegir de un catálogo
no valida esos errores: hace que no puedan pasar. El `grupo` sale siempre del catálogo.

Los nombres quedan en **inglés**, tal como vienen del dataset. No se traducen: el
vocabulario de gimnasio ya es inglés. La búsqueda ignora acentos y mayúsculas.

Sigue habiendo carga a mano para lo que no está en el catálogo — guía, no encierra. Las
rutinas ya guardadas no se tocan ni se migran.

### Fuente y licencia

Datos: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset),
bajo **licencia MIT** — Copyright (c) 2026 Hasan Emir Yıldırım. La nota de copyright y el
permiso completos están en la cabecera de `src/modules/gym/data/catalogo.js`.

De cada entrada se guardan solo cuatro campos (`nombre`, `grupo`, `equipo`, `media_id`).
Las instrucciones en nueve idiomas se descartan: son megabytes que la app no muestra.
Regenerar con `node scripts/gen-catalogo.mjs`, que es también donde vive el mapeo de la
taxonomía del dataset a los grupos de la app.

**Las imágenes son © [Gym visual](https://gymvisual.com/) y NO se redistribuyen.** Quedan
explícitamente fuera del permiso MIT del dataset. Este repo no copia, ni vendorea, ni
re-hostea ningún archivo de media: guarda la clave mínima (`media_id`) y **referencia la
URL de upstream** al renderizar, a 180×180, con la atribución visible en el selector.
Enlazar no es redistribuir. Su uso se rige por los
[términos de Gym visual](https://gymvisual.com/content/3-terms-and-conditions-of-use),
no por la MIT.
