/** @type {import('tailwindcss').Config} */
module.exports = {
  // Define os arquivos que o Tailwind deve escanear para aplicar as classes
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Inclui todos os arquivos JS/JSX/TS/TSX na pasta src
  ],
  theme: {
    extend: {
      // Extensão de cores personalizadas para um design mais sofisticado
      colors: {
        indigo: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5", // Usado como cor principal ativa
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af", // Usado para textos secundários
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151", // Usado para textos principais
          800: "#1f2937",
          900: "#111827",
        },
      },

      // Extensão de animações para transições suaves
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out", // Animação de entrada para submenus
        "slide-up": "slideUp 0.4s ease-out",  // Animação opcional para elementos subindo
        pulse: "pulse 1.5s infinite",         // Animação de pulsação para badges
      },

      // Definição dos keyframes para as animações
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },

      // Extensão de fontes para maior elegância
      fontFamily: {
        sans: ["Inter", "sans-serif"], // Fonte moderna e limpa
      },

      // Ajustes de espaçamento para consistência
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },

      // Ajustes de sombras para profundidade
      boxShadow: {
        "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "indigo": "0 4px 14px rgba(79, 70, 229, 0.2)", // Sombra personalizada para itens ativos
      },

      // Ajustes de bordas para um design mais arredondado
      borderRadius: {
        "xl": "1rem", // Bordas mais pronunciadas
      },

      // Transições personalizadas
      transitionProperty: {
        "height": "height",
        "spacing": "margin, padding",
      },
    },
  },

  // Plugins adicionais (opcional)
  plugins: [
    // Adicione plugins aqui se necessário, como @tailwindcss/forms ou @tailwindcss/typography
  ],

  // Habilita o modo JIT (Just-In-Time) para builds mais rápidas (opcional, dependendo da versão do Tailwind)
  mode: "jit",
};