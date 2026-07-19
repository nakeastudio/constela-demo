/** @type {import('tailwindcss').Config} */

// Los valores viven en src/index.css como variables CSS (formato "R G B").
// Este helper los expone a Tailwind conservando el modificador de alpha
// (bg-marca/15), y hace que cada token cambie solo con el tema.
const token = (nombre) => `rgb(var(--${nombre}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class', // modo oscuro por clase en <html>
  theme: {
    extend: {
      fontFamily: {
        // Geist como fuente principal de toda la app
        sans: ['"Geist Variable"', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        // ---- Superficies ----
        fondo: token('fondo'), // fondo de la app
        superficie: token('superficie'), // tarjetas
        'superficie-alta': token('superficie-alta'), // inputs y bloques anidados

        // ---- Texto ----
        texto: token('texto'),
        'texto-soft': token('texto-soft'),
        contraste: token('contraste'), // tinta sobre rellenos de marca/completo

        // ---- Bordes (nunca texto) ----
        borde: token('borde'),

        // ---- Acentos ----
        // Marca = guinda (identidad). `marca` legible para texto/borde/aro;
        // `marca-fuerte` es el relleno saturado con tinta blanca.
        marca: token('marca'), // guinda legible: texto, íconos, bordes, nav activa
        'marca-fuerte': token('marca-fuerte'), // guinda saturado: rellenos de CTA
        completo: token('completo'), // turquesa: SOLO progreso y estados completados
        'contraste-fuerte': token('contraste-fuerte'), // tinta blanca sobre rellenos -fuerte
        cardio: token('cardio'), // azure legible
        'cardio-fuerte': token('cardio-fuerte'), // azure saturado: rellenos
        peligro: token('peligro'), // solo acciones destructivas (texto/ícono)
        'peligro-fuerte': token('peligro-fuerte'), // relleno destructivo (tinta blanca)

        // ---- Tintes de categoría de comida (nutrición) ----
        'tinte-agua': token('tinte-agua'),
        'tinte-lavanda': token('tinte-lavanda'),
        'tinte-cardo': token('tinte-cardo'),
        'tinte-orquidea': token('tinte-orquidea'),
        'tinte-ink': token('tinte-ink') // tinta sobre relleno pastel
      },
      boxShadow: {
        // Sobre casi-negro la sombra difusa no se lee: se mantiene contenida.
        suave: '0 1px 2px 0 rgb(0 0 0 / 0.25)',
        flotante: '0 6px 20px -6px rgb(0 0 0 / 0.55)'
      },
      borderRadius: {
        '2xl': '1.1rem',
        '3xl': '1.5rem'
      }
    }
  },
  plugins: []
}
