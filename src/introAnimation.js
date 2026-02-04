/**
 * 入场动画：中草药泡泡向中心汇聚，白屏转场后显示首页
 * 图片路径使用 /photo/xxx.jpg（public 目录）
 */
const INTRO_ITEMS = [
  '阿魏', '巴豆', '半夏', '草芍药', '当归', '地黄', '丁香', '茯苓',
  '甘草', '红花', '金盏花', '茜草', '人参', '三七', '小蓟',
  '本草纲目', '黄帝内经', '神农本草经'
]

const INTRO_STORAGE_KEY = 'intro_done'

export function shouldRunIntro() {
  return !sessionStorage.getItem(INTRO_STORAGE_KEY)
}

export function runIntroAnimation() {
  return new Promise((resolve) => {
    const overlay = document.getElementById('intro-overlay')
    const container = document.getElementById('intro-container')
    const flash = document.getElementById('intro-white-flash')

    if (!overlay || !container || !flash) {
      resolve()
      return
    }

    INTRO_ITEMS.forEach((name, index) => {
      const img = document.createElement('img')
      img.src = `/photo/${name}.jpg`
      img.alt = name
      img.className = 'intro-bubble-img'

      const angle = Math.random() * Math.PI * 2
      const dist = window.innerWidth > 800 ? 800 : 400
      img.style.left = `calc(50% + ${Math.cos(angle) * dist}px)`
      img.style.top = `calc(50% + ${Math.sin(angle) * dist}px)`
      img.style.width = '100px'
      img.style.height = '100px'

      container.appendChild(img)

      setTimeout(() => {
        img.style.opacity = '1'
        img.style.left = '50%'
        img.style.top = '50%'
        img.style.width = '0px'
        img.style.height = '0px'
        img.style.transform = 'translate(-50%, -50%) rotate(720deg)'
      }, 100 + index * 100)
    })

    // 泡泡汇聚后白屏，再淡出 overlay，显示首页
    setTimeout(() => {
      flash.style.transition = 'opacity 0.6s ease-out'
      flash.style.opacity = '1'

      setTimeout(() => {
        overlay.style.opacity = '0'
        overlay.style.pointerEvents = 'none'

        setTimeout(() => {
          overlay.remove()
          sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
          resolve()
        }, 1200)
      }, 600)
    }, 3800)
  })
}

export function removeIntroOverlay() {
  const overlay = document.getElementById('intro-overlay')
  if (overlay) overlay.remove()
}
