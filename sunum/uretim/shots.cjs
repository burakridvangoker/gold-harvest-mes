/*
 * Sunum ekran görüntülerini üretir. Saat 14:52'ye sabitlenir
 * (vardiya sürüyor, veri dolu) — böylece her çalıştırmada aynı görüntü.
 */
const { chromium } = require('playwright')
const path = require('path')

const OUT = path.join(__dirname, '..', 'gorseller')
const BASE = 'http://localhost:5199'

/*
 * time.js görüntülemede Europe/Istanbul'u sabitliyor ama container UTC —
 * tarayıcı saat dilimi de İstanbul'a sabitlenmeli, yoksa örnek veri
 * (setHours(7)) UTC'de kurulup ekranda 10:00 olarak görünüyor.
 * İstanbul yıl boyu UTC+3, bu yüzden 14:52 İstanbul = 11:52 UTC.
 */
/*
 * İstanbul yıl boyu UTC+3; container UTC olduğu için saatler UTC olarak
 * kurulur. Operatör ekranı ÜRETİMDE (yeşil), müdür panosu DURDU (kırmızı)
 * anında yakalanıyor — hem iki durum da sunumda görünsün hem de andon
 * renk dili anlaşılsın.
 */
const at = (istanbulHour, minute) => {
  const d = new Date()
  d.setUTCHours(istanbulHour - 3, minute, 0, 0)
  return d
}

async function newPage(browser, viewport, deviceScaleFactor, time) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  })
  await context.addInitScript(() => {
    localStorage.setItem('gh-mes-line-code', 'PFM-4')
  })
  const page = await context.newPage()
  await page.clock.install({ time })
  return page
}

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

  /* 1) Operatör ekranı — GERÇEK telefon kadrajı (fullPage değil: sunumda
   * telefonda ne görünüyorsa o görünsün). ÜRETİMDE anı (yeşil).
   * Üst: durum + saat çubuğu. Alt: büyük aksiyon butonları. */
  const phone = await newPage(browser, { width: 400, height: 860 }, 3, at(14, 35))
  await phone.goto(`${BASE}/?ekran=operator`)
  await phone.waitForSelector('.operator-actions', { timeout: 15000 })
  await phone.waitForTimeout(900)
  await phone.screenshot({ path: path.join(OUT, 'operator-ust.png') })
  console.log('✓ operator-ust.png')

  await phone.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await phone.waitForTimeout(500)
  await phone.screenshot({ path: path.join(OUT, 'operator-alt.png') })
  console.log('✓ operator-alt.png')

  // 2) Müdür panosu — geniş ekran, DURDU anı (kırmızı)
  const wall = await newPage(browser, { width: 1600, height: 1000 }, 2, at(14, 52))
  await wall.goto(`${BASE}/?ekran=mudur`)
  await wall.waitForSelector('.zone--now', { timeout: 15000 })
  await wall.waitForTimeout(900)
  await wall.screenshot({ path: path.join(OUT, 'mudur.png') })
  console.log('✓ mudur.png')

  // 3) Saat çubuğu — kırpma
  const clockbar = await wall.locator('.clockbar').first()
  await clockbar.screenshot({ path: path.join(OUT, 'saat-cubugu.png') })
  console.log('✓ saat-cubugu.png')

  // 4) Duruş sebepleri — kırpma
  const reasons = await wall.locator('.zone--reasons, .zone').filter({ hasText: 'Duruş sebepleri' }).first()
  await reasons.screenshot({ path: path.join(OUT, 'durus-sebepleri.png') })
  console.log('✓ durus-sebepleri.png')

  // 5) Ürün planı satırları — kırpma
  const plan = await wall.locator('.plan-stack').first()
  if (await plan.count()) {
    await plan.screenshot({ path: path.join(OUT, 'urun-plani.png') })
    console.log('✓ urun-plani.png')
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
