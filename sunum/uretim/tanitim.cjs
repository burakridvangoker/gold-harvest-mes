/*
 * Öğretici tanıtım videosu — uygulamayı GERÇEKTEN kullanan demo.
 *
 * İlk video (video.cjs) hazır veriyi hızlandırıyordu; burada hiçbir kayıt
 * önceden yok: vardiya, ürün, olay ve paletler senaryo boyunca gerçek
 * arayüze tıklanarak oluşturuluyor (mock-supabase.js artık yazılabilir).
 *
 * İki temel karar:
 *  - TIKLAMA koordinatla değil `el.click()` ile yapılır. iframe'ler
 *    `transform: scale` taşıyor; koordinat bazlı tıklama orada kırılgan.
 *    İmleç yalnızca GÖRSEL — işlem her hâlükârda çalışır.
 *  - İMLEÇ KONUMU elle hesaplanır: frame içindeki elemanın rect'i × ölçek
 *    + iframe'in sayfadaki rect'i. Playwright'ın koordinatlarına
 *    güvenilmez (aynı sebep).
 *
 * Kullanım (vite sunucusu ayakta olmalı):
 *   npx vite dev --config sunum/uretim/vite.config.js --port 5199
 *   node sunum/uretim/tanitim.cjs          # tam video
 *   HIZLI=1 node sunum/uretim/tanitim.cjs  # sadece senaryo doğrulama
 */
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const HIZLI = !!process.env.HIZLI
const FPS = 12
const KARE_DIZIN = path.join(__dirname, 'kareler')
const CIKTI = path.join(__dirname, '..', 'gold-harvest-mes-tanitim.mp4')
const BASE = 'http://localhost:5199'

/* sahne.css'teki ölçeklerle BİREBİR aynı olmalı — imleç konumu buna bağlı. */
const OLCEK = { telefon: 0.979, pano: 0.845 }
const CERCEVE = { telefon: '.sahne-telefon-ic', pano: '.sahne-duvar-ic' }

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
  /* localStorage BİLEREK boş: iki ekran da hat seçiminden başlasın. */
  await ctx.clock.install({ time: at(7, 0) })

  const page = await ctx.newPage()
  page.on('pageerror', (e) =>
    console.log('  [sayfa hatası]', String(e.message).slice(0, 160), '\n     ', String(e.stack).split('\n').slice(1, 5).join('\n      ')),
  )
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [konsol]', m.text().slice(0, 240))
  })
  await page.goto(`${BASE}/?ekran=sahne`)
  await page.waitForSelector('.sahne-telefon-ic')
  await page.waitForTimeout(2500)

  const frame = (hangi) =>
    page.frames().find((f) => f.url().includes(hangi === 'telefon' ? 'ekran=operator' : 'ekran=mudur'))

  /* ---------- kare altyapısı ---------- */
  let sayac = 0
  const kareYaz = (buf, adet = 1) => {
    if (HIZLI) return
    for (let i = 0; i < adet; i++) {
      fs.writeFileSync(path.join(KARE_DIZIN, `k-${String(sayac++).padStart(5, '0')}.jpg`), buf)
    }
  }
  const kare = async () => (HIZLI ? null : page.screenshot({ type: 'jpeg', quality: 88 }))
  const cek = async (adet = 1) => kareYaz(await kare(), adet)
  const bekle = async (saniye) => cek(Math.max(1, Math.round(FPS * saniye)))

  /* ---------- imleç ---------- */
  const imlec = async (x, y, gorunur = true) =>
    page.evaluate(
      ({ x, y, gorunur }) => {
        const i = document.querySelector('.sahne-imlec')
        i.style.transform = `translate(${x}px, ${y}px)`
        i.style.opacity = gorunur ? '1' : '0'
      },
      { x, y, gorunur },
    )

  const halka = async (x, y, evre) =>
    page.evaluate(
      ({ x, y, evre }) => {
        const h = document.querySelector('.sahne-tiklama')
        h.style.transform = `translate(${x}px, ${y}px) scale(${1 + evre * 2.4})`
        h.style.opacity = String(Math.max(0, 0.9 - evre))
      },
      { x, y, evre },
    )

  /* Konum: frame içi rect × ölçek + iframe'in sayfadaki rect'i. */
  async function konum(hangi, secici) {
    const f = frame(hangi)
    /*
     * scrollIntoView KULLANILMAZ (yaşanmış hata): çerçeve sınırını aşıp
     * ana belgeyi de kaydırıyor ve sahnenin üst şeridi (altyazı, saat,
     * ilerleme çubuğu) kadraj dışına çıkıyordu. Bunun yerine yalnızca
     * frame'in KENDİ görünümü kaydırılıyor.
     */
    const ic = await f.evaluate((s) => {
      const n = document.querySelector(s)
      if (!n) return null
      const ilk = n.getBoundingClientRect()
      const sabit = n.closest('.wizard-overlay, .sheet-overlay, .timesheet-overlay, .stopnote-overlay')
      if (!sabit) {
        const hedef = window.scrollY + ilk.top - (window.innerHeight - ilk.height) / 2
        window.scrollTo(0, Math.max(0, hedef))
      }
      const r = n.getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    }, secici)
    if (!ic) throw new Error(`Bulunamadı [${hangi}]: ${secici}`)

    /* scrollIntoView çerçeve sınırını aşıp ana belgeyi de kaydırabiliyor;
     * ölçmeden önce sahneyi başa sabitle (bkz. sahne.css'teki not). */
    const dis = await page.evaluate((s) => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      const r = document.querySelector(s).getBoundingClientRect()
      return { x: r.x, y: r.y }
    }, CERCEVE[hangi])

    return { x: dis.x + ic.x * OLCEK[hangi], y: dis.y + ic.y * OLCEK[hangi] }
  }

  let sonKonum = { x: 960, y: 540 }

  async function imlecGit(hedef, adim = 9) {
    if (HIZLI) {
      sonKonum = hedef
      return
    }
    const bas = sonKonum
    for (let i = 1; i <= adim; i++) {
      const t = i / adim
      const yumusak = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      await imlec(bas.x + (hedef.x - bas.x) * yumusak, bas.y + (hedef.y - bas.y) * yumusak)
      await cek()
    }
    sonKonum = hedef
  }

  async function tikla(hangi, secici, { once = 0.25, sonra = 0.55 } = {}) {
    const f = frame(hangi)
    await f.waitForSelector(secici, { timeout: 15000 })
    const hedef = await konum(hangi, secici)
    await imlecGit(hedef)
    if (once) await bekle(once)

    for (let i = 0; i < 4; i++) {
      await halka(hedef.x, hedef.y, i / 4)
      await cek()
    }
    await page.evaluate(() => {
      document.querySelector('.sahne-tiklama').style.opacity = '0'
    })

    await f.evaluate((s) => document.querySelector(s)?.click(), secici)
    await page.waitForTimeout(HIZLI ? 120 : 260)
    if (sonra) await bekle(sonra)
  }

  /* React kontrollü alanlara yazma: yerel setter + input olayı şart. */
  async function yaz(hangi, secici, metin, { harfBasi = 2 } = {}) {
    const f = frame(hangi)
    await f.waitForSelector(secici, { timeout: 15000 })
    await imlecGit(await konum(hangi, secici), 7)

    for (let i = 1; i <= metin.length; i++) {
      await f.evaluate(
        ({ s, v }) => {
          const el = document.querySelector(s)
          const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
          Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, v)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        },
        { s: secici, v: metin.slice(0, i) },
      )
      if (!HIZLI && i % harfBasi === 0) await cek()
    }
    await cek(3)
  }

  const anlat = async (baslik, alt, saniye = 1.1) => {
    await page.evaluate(([b, a]) => window.__sahneAnlat?.(b, a), [baslik, alt])
    await bekle(saniye)
  }

  const odak = async (mod) => {
    await page.evaluate((m) => {
      document.body.classList.remove('odak-telefon', 'odak-pano')
      if (m) document.body.classList.add(`odak-${m}`)
    }, mod)
  }

  const zamanAtla = async (dakika, { kare: k = 2 } = {}) => {
    await ctx.clock.fastForward(dakika * 60 * 1000)
    for (const f of page.frames()) {
      await f.evaluate(() => window.__mesYenile && window.__mesYenile()).catch(() => {})
    }
    await page.waitForTimeout(HIZLI ? 60 : 160)
    await cek(k)
  }

  const kartSinifi = (sinif) =>
    page.evaluate((s) => {
      document.body.classList.remove('kart-acilis', 'kart-kapanis')
      if (s) document.body.classList.add(s)
      document.body.style.setProperty('--kart-opaklik', '1')
    }, sinif)

  const kartSoldur = async (adim = 8) => {
    for (let i = adim - 1; i >= 0; i--) {
      await page.evaluate((o) => document.body.style.setProperty('--kart-opaklik', String(o)), i / adim)
      await cek()
    }
    await kartSinifi(null)
  }

  /* Sihirbaz panelindeki n. girdi (tüm adımlar aynı anda DOM'da). */
  const wzInput = (panel, sira) =>
    `.wizard-track > .wizard-panel:nth-child(${panel}) label:nth-of-type(${sira}) .wizard-input`

  const ileri = (opts) => tikla('telefon', '.wizard-button--next', opts)

  /* =====================  SENARYO  ===================== */

  await kartSinifi('kart-acilis')
  await page.waitForTimeout(200)
  await bekle(2.4)
  await kartSoldur()

  // 1 — Hat seçimi
  await odak('telefon')
  await anlat('Hat seçimi', 'Operatör telefonunda hangi hattı çalıştıracağını seçer.', 1.4)
  await tikla('telefon', '.line-select-list button:nth-child(1)')

  // 2 — Vardiya açma
  await anlat('Vardiya açılıyor', 'Açık vardiya yok. Tek buton: VARDİYA BAŞLAT.', 1.2)
  await tikla('telefon', '.action-primary--start')
  await anlat('Vardiya ve operatör', 'Vardiya numarası saate göre önceden seçili; ekip listeden geliyor.', 1.4)
  /* Çipi metne göre işaretleyip öyle tıklıyoruz — sıra sabit değil ve
   * sahnenin başlığındaki adla tutarlı olması gerekiyor. */
  await frame('telefon').evaluate(() => {
    const c = [...document.querySelectorAll('.opname-chip')].find((e) =>
      e.textContent.includes('Levent'),
    )
    if (c) c.setAttribute('data-hedef', 'operator')
  })
  await tikla('telefon', '.opname-chip[data-hedef="operator"]')
  await bekle(0.5)
  await ileri()

  // 3 — Müdür panosunda hat "aktif" oluyor
  await odak('pano')
  await anlat('Müdür tarafında', 'Vardiya açılır açılmaz hat "aktif" olarak işaretlendi.', 1.6)
  await tikla('pano', '.line-select-list button:nth-child(1)', { sonra: 1.1 })

  // 4 — Duruş sebebi
  {
    const t = await frame('telefon').evaluate(() => {
      const d = window.__mesVeri()
      return {
        kok: document.querySelector('#root > div')?.className ?? '(yok)',
        vardiya: d.shifts.length,
        olay: d.timeline_events.length,
        sebepBtn: !!document.querySelector('.reason-segments-add'),
        metin: (document.body.innerText || '').slice(0, 110).replace(/\n/g, ' | '),
      }
    })
    console.log('  telefon teşhis:', JSON.stringify(t))
  }
  await odak('telefon')
  await anlat('Vardiya duruştan başlar', 'Sahada ilk dakikalar temizlik ve hazırlıktır — sistem bunu varsayar.', 1.5)
  await tikla('telefon', '.reason-segments-add')
  await yaz('telefon', '.stopnote-input', 'Hazırlık')
  await tikla('telefon', '.stopnote-button--save', { sonra: 0.9 })

  // 5 — İlk ürün
  await zamanAtla(26)
  await anlat('Ürün bilgisi', 'Operatör hazır olunca ürünü girer — vardiyayı açmak için beklemez.', 1.4)
  await tikla('telefon', '.action-primary')

  await yaz('telefon', wzInput(1, 1), 'Topzcorn Çilek')
  await yaz('telefon', wzInput(1, 2), 'TC-2608')
  await ileri()

  await anlat('Üretim parametreleri', 'Koli içi adet paket sayısını, boş paket ağırlığı ambalaj firesini hesaplar.', 1.2)
  await yaz('telefon', wzInput(2, 1), '40')
  await yaz('telefon', wzInput(2, 2), '12')
  await yaz('telefon', wzInput(2, 3), '2.4')
  await ileri()

  await yaz('telefon', wzInput(3, 1), '180')
  await yaz('telefon', wzInput(3, 2), '800')
  await ileri()

  await anlat('Numaratör başlangıcı', 'Ambalaj firesi bu iki sayaçtan otomatik çıkarılacak.', 1.2)
  await yaz('telefon', wzInput(4, 1), '128400')
  await yaz('telefon', wzInput(4, 2), '3100')
  await ileri()

  await anlat('Özet', 'Girilenler tek ekranda; saat bir sonraki adımda düzeltilebiliyor.', 1.3)
  await ileri()
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 1.0 })

  await odak('pano')
  await anlat('Üretim başladı', 'Ürün adı ve hedefi müdür panosunda da belirdi.', 1.8)

  // 5b — Çalışma hızı: kurulumda sorulmaz, istenildiği an girilir
  await odak('telefon')
  await zamanAtla(7)
  await anlat('Çalışma hızı', 'Sabit bir hedef değil — anlık değer. Hız verimi bunun üstünden hesaplanır.', 1.4)
  await tikla('telefon', '.speed-row')
  await yaz('telefon', '.sheet-panel .sheet-input', '65')
  await bekle(0.6)
  await tikla('telefon', '.sheet-button--primary', { sonra: 0.9 })

  // 6 — Günlük kullanım
  await zamanAtla(12)
  await anlat('Palet çıkışı', 'Koli adedi üründen geliyor; yarım palet çıkarsa elle düzeltilir.', 1.2)
  await tikla('telefon', '.action-secondary:last-child')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.7 })

  await zamanAtla(13)
  await anlat('Duruş', 'DURDUR’a basıldığı an sayaç işlemeye başlar, sonra sebep sorulur.', 1.2)
  await tikla('telefon', '.action-primary')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.5 })
  await yaz('telefon', '.stopnote-input', 'Bobin değişimi')
  await tikla('telefon', '.stopnote-button--save', { sonra: 0.8 })

  await odak('pano')
  await anlat('Panoda anında', 'Ekran kırmızıya döndü, duruş sebebi listeye düştü.', 1.6)

  await odak('telefon')
  await zamanAtla(11)
  await tikla('telefon', '.action-primary')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.6 })

  await zamanAtla(24)
  await tikla('telefon', '.action-secondary:last-child')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.6 })

  await zamanAtla(8)
  await anlat('Mola', 'Mola amber renkte — planlı ara, arıza değil. Açık kalma oranına girmez.', 1.3)
  await tikla('telefon', '.action-secondary:first-child')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.8 })

  await zamanAtla(18)
  await anlat('Moladan dönüş', 'Makine anında çalışmaz; aradaki boşluk gerçek bir duruş olarak kaydedilir.', 1.3)
  await tikla('telefon', '.action-primary')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.6 })

  await zamanAtla(5)
  await tikla('telefon', '.action-primary')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.6 })

  console.log('  ✓ günlük kullanım tamam')

  // 7 — Ürün değişimi
  await zamanAtla(46)
  await tikla('telefon', '.action-secondary:last-child')
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 0.5 })

  await zamanAtla(38)
  await anlat('Ürün değişimi', 'Ürün biterken numaratör bitişleri alınır, ambalaj firesi anında hesaplanır.', 1.5)
  await tikla('telefon', '.operator-secondary .ghost-button:nth-child(2)')

  /* RunEndSheet: dolu bitiş / boş bitiş / ortalama gramaj — üç `label`. */
  const runEnd = (sira) => `.sheet-panel label.sheet-field:nth-of-type(${sira}) .sheet-input`
  await yaz('telefon', runEnd(1), '134950')
  await yaz('telefon', runEnd(2), '3244')
  await yaz('telefon', runEnd(3), '40.6')
  await bekle(1.1)
  await tikla('telefon', '.sheet-button--primary', { sonra: 0.9 })

  await anlat('Yeni ürün', 'Sayaçlar karışmaz: yeni ürün sıfırdan başlar, vardiya toplamı korunur.', 1.4)
  await yaz('telefon', wzInput(1, 1), 'Natura Karışık')
  await yaz('telefon', wzInput(1, 2), 'NK-1142')
  await ileri()
  await yaz('telefon', wzInput(2, 1), '50')
  await yaz('telefon', wzInput(2, 2), '12')
  await ileri()
  await yaz('telefon', wzInput(3, 1), '180')
  await yaz('telefon', wzInput(3, 2), '1400')
  await ileri()
  await ileri()
  await ileri()
  await tikla('telefon', '.timesheet-button--confirm', { sonra: 1.0 })

  /* Yeni ürünün de kendi çalışma hızı var — hız verimi buna göre hesaplanır. */
  await tikla('telefon', '.speed-row', { once: 0.15, sonra: 0.3 })
  await yaz('telefon', '.sheet-panel .sheet-input', '85', { harfBasi: 1 })
  await tikla('telefon', '.sheet-button--primary', { sonra: 0.6 })

  console.log('  ✓ ürün değişimi tamam')

  // 8 — Vardiyanın kalanı hızlandırılmış
  await odak(null)
  await anlat('Vardiya devam ediyor', 'Kalan saatler hızlandırılmış: her duruş, mola ve palet kayda geçiyor.', 1.4)

  /*
   * `dk` = bu adımdan ÖNCE geçen süre. Bir 'baslat' adımından önceki
   * süre = duruşun uzunluğu; vardiya 15:00'e yaklaşsın ve açık kalma
   * oranı sahadaki gerçekçi bandda (%55-65) kalsın diye buna göre
   * dengelendi.
   */
  const hizliDongu = [
    { dk: 22, aksiyon: 'palet' },
    { dk: 14, aksiyon: 'durdur', not: 'Ambalaj ayarı' },
    { dk: 16, aksiyon: 'baslat' },
    { dk: 26, aksiyon: 'palet' },
    { dk: 12, aksiyon: 'durdur', not: 'Terazi ayarı' },
    { dk: 14, aksiyon: 'baslat' },
    { dk: 20, aksiyon: 'palet' },
    { dk: 15, aksiyon: 'mola' },
    { dk: 15, aksiyon: 'molabitti' },
    { dk: 6, aksiyon: 'baslat' },
    { dk: 24, aksiyon: 'palet' },
    { dk: 13, aksiyon: 'durdur', not: 'Bobin değişimi' },
    { dk: 17, aksiyon: 'baslat' },
    { dk: 28, aksiyon: 'palet' },
    { dk: 16, aksiyon: 'durdur', not: 'Temizlik' },
    { dk: 12, aksiyon: 'baslat' },
    { dk: 25, aksiyon: 'palet' },
  ]

  for (const adim of hizliDongu) {
    await zamanAtla(adim.dk, { kare: 3 })
    const f = frame('telefon')
    if (adim.aksiyon === 'palet') {
      await f.evaluate(() => document.querySelector('.action-secondary:last-child')?.click())
    } else if (adim.aksiyon === 'mola') {
      await f.evaluate(() => document.querySelector('.action-secondary:first-child')?.click())
    } else {
      await f.evaluate(() => document.querySelector('.action-primary')?.click())
    }
    await page.waitForTimeout(HIZLI ? 80 : 150)
    await f.evaluate(() => document.querySelector('.timesheet-button--confirm')?.click())
    await page.waitForTimeout(HIZLI ? 80 : 150)
    if (adim.not) {
      await f
        .evaluate((n) => {
          const el = document.querySelector('.stopnote-input')
          if (!el) return
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, n)
          el.dispatchEvent(new Event('input', { bubbles: true }))
          setTimeout(() => document.querySelector('.stopnote-button--save')?.click(), 0)
        }, adim.not)
        .catch(() => {})
      await page.waitForTimeout(HIZLI ? 80 : 200)
      await f.evaluate(() => document.querySelector('.stopnote-button--save')?.click()).catch(() => {})
    }
    await page.waitForTimeout(HIZLI ? 60 : 120)
    await cek(2)
  }
  console.log('  ✓ hızlı döngü tamam')

  // 9 — Müdür panosu etkileşimi
  {
    const teshis = await frame('pano').evaluate(() => ({
      url: location.search,
      kok: document.querySelector('#root > div')?.className ?? '(yok)',
      clockbar: !!document.querySelector('.clockbar'),
      segment: document.querySelectorAll('.clockbar-seg').length,
      durus: document.querySelectorAll('.clockbar-seg--durus').length,
      metin: (document.body.innerText || '').slice(0, 120).replace(/\n/g, ' | '),
    }))
    console.log('  pano teşhis:', JSON.stringify(teshis))
  }
  await odak('pano')
  await anlat('Saat çubuğu', 'Vardiyanın tamamı saat ekseninde. Bir bloğa dokununca sebebi açılıyor.', 1.6)
  await tikla('pano', '.clockbar-seg--durus', { sonra: 1.8 })
  await anlat('Blok blok gezinme', 'Çok kısa duruşlara parmakla isabet etmek zor — oklarla tek tek gezilir.', 1.4)
  await tikla('pano', '.clockbar-nav-button:last-of-type', { sonra: 1.2 })
  await tikla('pano', '.clockbar-nav-button:last-of-type', { sonra: 1.2 })
  await tikla('pano', '.clockbar-nav-button:last-of-type', { sonra: 1.4 })

  await odak(null)
  await imlec(0, 0, false)
  await anlat('Vardiya tamamlandı', 'Sekiz saatin tamamı — kim, ne zaman, ne kadar, neden.', 1.8)

  // 10 — Kapanış
  const pano = frame('pano')
  const ozet = await pano.evaluate(() => {
    const oranlar = [...document.querySelectorAll('.oran-group .radial-gauge-value')].map((e) =>
      e.textContent.trim(),
    )
    const figurler = [...document.querySelectorAll('.figure-value, dd')].map((e) => e.textContent.trim())
    return { oranlar, figurler }
  })
  console.log('  pano özeti:', JSON.stringify(ozet).slice(0, 200))
  const planSatirlari = await pano.evaluate(() =>
    [...document.querySelectorAll('.plan-row')].map((r) =>
      r.innerText.replace(/\n+/g, ' | ').slice(0, 150),
    ),
  )
  for (const s of planSatirlari) console.log('  ürün:', s)

  const paketToplam = (ozet.figurler[ozet.figurler.length - 1] ?? '')
    .split('+')
    .map((p) => parseInt(p.replace(/\D/g, ''), 10) || 0)
    .reduce((a, b) => a + b, 0)

  await page.evaluate(
    ({ o, paket }) => {
      const y = (k, v) => {
        const el = document.querySelector(`[data-kapanis="${k}"]`)
        if (el && v) el.textContent = v
      }
      y('acik', o.oranlar[0])
      y('hiz', o.oranlar[1])
      y('paket', paket ? String(paket) : null)
    },
    { o: ozet, paket: paketToplam },
  )

  await kartSinifi('kart-kapanis')
  await page.waitForTimeout(200)
  await bekle(3.4)

  const veri = await frame('telefon').evaluate(() => {
    const d = window.__mesVeri()
    return {
      vardiya: d.shifts.length,
      urun: d.product_runs.length,
      olay: d.timeline_events.length,
      palet: d.pallet_records.length,
      sebep: d.stop_reason_segments.length,
    }
  })
  console.log('  oluşan kayıtlar:', JSON.stringify(veri))

  await browser.close()

  if (HIZLI) {
    console.log('\n✓ HIZLI mod: senaryo baştan sona hatasız koştu (kare üretilmedi).')
    return
  }

  const ffmpeg = require('ffmpeg-static')
  execFileSync(
    ffmpeg,
    ['-y', '-framerate', String(FPS), '-i', path.join(KARE_DIZIN, 'k-%05d.jpg'),
     '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
     '-pix_fmt', 'yuv420p', '-movflags', '+faststart', CIKTI],
    { stdio: 'pipe' },
  )

  const mb = (fs.statSync(CIKTI).size / 1048576).toFixed(1)
  console.log(`\n✓ ${path.basename(CIKTI)} — ${sayac} kare, ${(sayac / FPS).toFixed(1)} sn, ${mb} MB`)
  fs.rmSync(KARE_DIZIN, { recursive: true, force: true })
}

main().catch((e) => {
  console.error('\n✗ ' + e.message)
  process.exit(1)
})
