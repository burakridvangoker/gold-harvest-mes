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
  await phone.goto(`${BASE}/?ekran=operator&hazir=1`)
  await phone.waitForSelector('.operator-actions', { timeout: 15000 })
  await phone.waitForTimeout(900)
  await phone.screenshot({ path: path.join(OUT, 'operator-ust.png') })
  console.log('✓ operator-ust.png')

  await phone.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await phone.waitForTimeout(500)
  await phone.screenshot({ path: path.join(OUT, 'operator-alt.png') })
  console.log('✓ operator-alt.png')

  /* 1b) TimeSheet — "Ne zaman durdu?" saat çarkı.
   * Hikaye sayfasının 7. bölümü için: sistemin geç girişi sorun etmeyip
   * gerçek saati sorduğu an. Operatör ekranı ?hazir=1 ile ÜRETİMDE
   * açılıyor; ana butona (DURDUR) basınca TimeSheet geliyor. */
  const ts = await newPage(browser, { width: 400, height: 860 }, 3, at(14, 35))
  await ts.goto(`${BASE}/?ekran=operator&hazir=1`)
  await ts.waitForSelector('.action-primary', { timeout: 15000 })
  await ts.locator('.action-primary').click()
  await ts.waitForSelector('.timesheet-sheet', { timeout: 10000 })
  await ts.waitForTimeout(800)
  await ts.screenshot({ path: path.join(OUT, 'saat-girisi.png') })
  console.log('✓ saat-girisi.png')

  /* Sadece saat çarkı paneli — hikaye sayfasında telefonun tamamı
   * masaüstünde okunamayacak kadar küçülüyordu (dar ve çok uzun bir
   * kare); kırpılmış panel aynı anlatıyı taşıyıp okunur kalıyor. */
  await ts.locator('.timesheet-sheet').screenshot({
    path: path.join(OUT, 'saat-girisi-panel.png'),
  })
  console.log('✓ saat-girisi-panel.png')

  // 2) Müdür panosu — geniş ekran, DURDU anı (kırmızı)
  const wall = await newPage(browser, { width: 1600, height: 1000 }, 2, at(14, 52))
  await wall.goto(`${BASE}/?ekran=mudur&hazir=1`)
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

  /* 6) Palet çıkış listesi — TEK ürünün kendi palet/saat listesi, kırpma.
   * urun-plani.png'nin aksine oran/ilerleme çubuğu taşımaz — genel müdür
   * sunumunun izlenebilirlik iddiası SADECE bu listeye odaklanmalı.
   * .plan-row-pallets-row'un fontu clamp(0.8rem,0.9vw,1.2rem) — duvar
   * ekranı için tasarlanmış, sunum sayfasının dar sütununa (~700px)
   * gömülünce vw tavanı bile yetmiyor (kaynak doğal genişliği ~2000px
   * CSS px, 700px'e sıkışınca metin küçülüyor). vw ile uğraşmak yerine
   * yakalama anında fontu doğrudan büyütüyoruz — sunum bağlamında bu
   * bir "gerçek ekran" iddiası değil, okunur bir kanıt kırpması. */
  const wide = await newPage(browser, { width: 950, height: 1100 }, 2, at(14, 52))
  await wide.goto(`${BASE}/?ekran=mudur&hazir=1`)
  await wide.waitForSelector('.plan-row-pallets', { timeout: 15000 })
  await wide.addStyleTag({
    content: `
      .plan-row-pallets-label { font-size: 15px !important; }
      .plan-row-pallets-row { font-size: 19px !important; padding: 8px 14px !important; }
      .plan-row-pallets-list { gap: 10px !important; }
    `,
  })
  await wide.waitForTimeout(900)
  const palletBlock = await wide.locator('.plan-row-pallets').first()
  if (await palletBlock.count()) {
    await palletBlock.screenshot({ path: path.join(OUT, 'palet-cikis-listesi.png') })
    console.log('✓ palet-cikis-listesi.png')
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
