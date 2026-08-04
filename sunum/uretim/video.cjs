/*
 * Vardiya videosu — operatörün telefonu ve müdür panosu yan yana,
 * 07:00'dan vardiya sonuna kadar hızlandırılmış.
 *
 * Nasıl çalışıyor: Playwright'ın sahte saati (context.clock) adım adım
 * ileri sarılır; her adımda mock realtime tetiklenir (window.__mesYenile)
 * ve iki ekran da yeniden çekip render eder. Her adımda bir kare alınır,
 * ffmpeg kareleri H.264/mp4'e çevirir.
 *
 * Duraklamalar gerçek kare değil, aynı karenin kopyası — anlatı
 * başlıklarının okunmasına zaman tanır ve üretimi hızlandırır.
 *
 * Kullanım (vite sunucusu ayakta olmalı):
 *   npx vite dev --config sunum/uretim/vite.config.js --port 5199
 *   node sunum/uretim/video.cjs
 */
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const FPS = 12
const ADIM_DK = 3 // kare başına kaç vardiya dakikası
const TOPLAM_DK = 480 // 07:00 → 15:00
const DURAKLAMA = 14 // sahne değişiminde kaç kare beklensin (~1.2 sn)

const KARE_DIZIN = path.join(__dirname, 'kareler')
const CIKTI = path.join(__dirname, '..', 'gold-harvest-mes-vardiya.mp4')
const BASE = 'http://localhost:5199'

/* Sahne.jsx'teki tabloyla aynı dakikalar — burada sadece "duraklat"
 * sinyali olarak kullanılıyor. */
const SAHNE_DK = [0, 34, 56, 70, 116, 139, 212, 257, 346, 372, 420, 440, 465]

const at = (saat, dakika) => {
  const d = new Date()
  d.setUTCHours(saat - 3, dakika, 0, 0) // İstanbul = UTC+3
  return d
}

async function main() {
  fs.rmSync(KARE_DIZIN, { recursive: true, force: true })
  fs.mkdirSync(KARE_DIZIN, { recursive: true })

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  })
  await ctx.addInitScript(() => localStorage.setItem('gh-mes-line-code', 'PFM-4'))
  await ctx.clock.install({ time: at(7, 0) })

  const page = await ctx.newPage()
  await page.goto(`${BASE}/?ekran=sahne`)
  await page.waitForSelector('.sahne-duvar-ic')
  await page.waitForTimeout(3500) // iki iframe de ilk veriyi çeksin

  let sayac = 0
  const yaz = (buf, adet = 1) => {
    for (let i = 0; i < adet; i++) {
      fs.writeFileSync(path.join(KARE_DIZIN, `k-${String(sayac++).padStart(5, '0')}.jpg`), buf)
    }
  }
  const kare = () => page.screenshot({ type: 'jpeg', quality: 92 })

  const kartSinifi = (sinif) =>
    page.evaluate((s) => {
      document.body.classList.remove('kart-acilis', 'kart-kapanis')
      if (s) document.body.classList.add(s)
      document.body.style.setProperty('--kart-opaklik', '1')
    }, sinif)

  const kartSoldur = async (adim = 8) => {
    for (let i = adim - 1; i >= 0; i--) {
      await page.evaluate((o) => document.body.style.setProperty('--kart-opaklik', String(o)), i / adim)
      yaz(await kare())
    }
    await kartSinifi(null)
  }

  // --- Açılış kartı (2 sn sabit + geçiş) ---
  await kartSinifi('kart-acilis')
  await page.waitForTimeout(250)
  yaz(await kare(), FPS * 2)
  await kartSoldur()
  console.log('✓ açılış')

  // --- Vardiya akışı ---
  const toplamAdim = Math.ceil(TOPLAM_DK / ADIM_DK)
  yaz(await kare(), Math.round(FPS * 1.2)) // 07:00'da bir nefes

  for (let adim = 1; adim <= toplamAdim; adim++) {
    await ctx.clock.fastForward(ADIM_DK * 60 * 1000)
    for (const f of page.frames()) {
      await f.evaluate(() => window.__mesYenile && window.__mesYenile()).catch(() => {})
    }
    await page.waitForTimeout(45)

    const buf = await kare()
    const dk = adim * ADIM_DK
    // Bu adımda bir sahne sınırı geçildiyse duraklat
    const sinirGecildi = SAHNE_DK.some((s) => s > dk - ADIM_DK && s <= dk)
    yaz(buf, sinirGecildi ? DURAKLAMA : 1)

    if (adim % 20 === 0) console.log(`  ${dk}/${TOPLAM_DK} dk · ${sayac} kare`)
  }
  console.log('✓ vardiya akışı')

  // --- Kapanış kartı: rakamları panodan oku, karta yaz ---
  const panoFrame = page.frames().find((f) => f.url().includes('ekran=mudur'))
  const ozet = await panoFrame.evaluate(() => {
    const metin = (sel) => document.querySelector(sel)?.textContent?.trim() ?? '—'
    const oranlar = [...document.querySelectorAll('.oran-group .radial-gauge-value')]
      .map((e) => e.textContent.trim())
      .filter(Boolean)
    const figurler = [...document.querySelectorAll('.figure-value, .today-figures dd, dd')].map((e) =>
      e.textContent.trim(),
    )
    return { oranlar, figurler, ilk: metin('.now-run-product') }
  })
  console.log('  pano özeti:', JSON.stringify(ozet).slice(0, 220))

  /* Pano paketi "5784+2808" gibi ürün bazlı kırılımla gösteriyor; kapanış
   * kartında tek bir toplam daha okunaklı, o yüzden toplanıyor. */
  const paketToplam = (ozet.figurler[ozet.figurler.length - 1] ?? '')
    .split('+')
    .map((p) => parseInt(p.replace(/\D/g, ''), 10) || 0)
    .reduce((a, b) => a + b, 0)

  await page.evaluate(
    ({ o, paket }) => {
      const yaz = (anahtar, deger) => {
        const el = document.querySelector(`[data-kapanis="${anahtar}"]`)
        if (el && deger) el.textContent = deger
      }
      yaz('acik', o.oranlar[0])
      yaz('hiz', o.oranlar[1])
      yaz('paket', paket ? String(paket) : null)
    },
    { o: ozet, paket: paketToplam },
  )

  await kartSinifi('kart-kapanis')
  await page.waitForTimeout(250)
  yaz(await kare(), Math.round(FPS * 3.5))
  console.log('✓ kapanış')

  await browser.close()

  // --- ffmpeg ---
  const ffmpeg = require('ffmpeg-static')
  execFileSync(
    ffmpeg,
    [
      '-y', '-framerate', String(FPS),
      '-i', path.join(KARE_DIZIN, 'k-%05d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      CIKTI,
    ],
    { stdio: 'pipe' },
  )

  const mb = (fs.statSync(CIKTI).size / 1048576).toFixed(1)
  console.log(`\n✓ ${path.basename(CIKTI)} — ${sayac} kare, ${(sayac / FPS).toFixed(1)} sn, ${mb} MB`)
  fs.rmSync(KARE_DIZIN, { recursive: true, force: true })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
