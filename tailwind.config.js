/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./editor.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Dynamic classes used in ImageGeneratorPanel/AIGenerationPanel
    'bg-blue-50', 'border-blue-200', 'border-blue-500',
    'bg-green-50', 'border-green-200', 'border-green-500',
    'bg-amber-50', 'border-amber-200', 'border-amber-500',
    'bg-red-50', 'border-red-200', 'border-dashed',
    'border-2', 'rotate-180',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}