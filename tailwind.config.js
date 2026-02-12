/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FDFBF7',      // 宣纸白
        sandalwood: '#8B5A2B', // 檀木褐
        cinnabar: '#C44E46',   // 朱砂红
        bamboo: '#5D7A47',     // 竹青绿
        walnut: '#4A3228',     // 胡桃木深（药柜柜体）
        chestnut: '#6B4C3B',   // 栗壳棕（抽屉面板）
        brass: '#B8860B',      // 铜拉手
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'SimSun', '宋体', 'serif'],
      },
      boxShadow: {
        'paper': '0 1px 3px 0 rgb(139 90 43 / 0.08), 0 1px 2px -1px rgb(139 90 43 / 0.06)',
        'card': '0 2px 8px -2px rgb(139 90 43 / 0.12), 0 4px 12px -4px rgb(139 90 43 / 0.08)',
      },
      backgroundImage: {
        'wood-grain': `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
}
