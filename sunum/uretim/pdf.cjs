/* sunum/<kaynak>.html → sunum/<kaynak>.pdf (ada göre)
 * Ayrıca her slaydın PNG önizlemesini üretir (görsel kontrol için).
 *
 * Kaynak dosya argümanla verilir, verilmezse hat müdürü sürümü:
 *   node sunum/uretim/pdf.cjs                          → sunum.html
 *   node sunum/uretim/pdf.cjs sunum-komuta-merkezi.html → o dosya
 * İki sunum iki ayrı seviye için (hat müdürü / genel müdür), ikisi de
 * elde çalışır kalmalı — bu yüzden tek betik, parametreli. */
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const SUNUM = path.join(__dirname, '..')

/* Hangi sunum? Argümansız çağrı eski davranışı birebir korur. */
const KAYNAK = process.argv[2] || 'sunum.html'
const CIKTI = KAYNAK === 'sunum.html'
  ? 'gold-harvest-mes-sunum.pdf'
  : KAYNAK.replace(/\.html$/, '') + '.pdf'
/* Önizlemeler sunum başına ayrı klasöre — biri diğerinin karelerini ezmesin. */
const KONTROL = path.join(__dirname, 'kontrol', KAYNAK.replace(/\.html$/, ''))

async function main() {
  fs.mkdirSync(KONTROL, { recursive: true })
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

  await page.goto('file://' + path.join(SUNUM, KAYNAK))
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)

  /* Taşma + sayfa numarası çakışması kontrolü. Bu oturumda üst üste binen
   * metin hataları defalarca yaşandı — gözle bakmak yetmiyor, ölçülüyor. */
  const kontrol = await page.evaluate(() =>
    [...document.querySelectorAll('.slayt')].map((s, i) => {
      const no = s.querySelector('.sayfa-no')
      const noKutu = no?.getBoundingClientRect()
      let cakisan = null
      if (noKutu) {
        for (const el of s.querySelectorAll('.govde *')) {
          if (!el.textContent.trim() && el.tagName !== 'IMG') continue
          const k = el.getBoundingClientRect()
          if (k.width === 0 || k.height === 0) continue
          if (
            k.left < noKutu.right && k.right > noKutu.left &&
            k.top < noKutu.bottom && k.bottom > noKutu.top
          ) {
            cakisan = el.className || el.tagName
            break
          }
        }
      }
      return {
        slayt: i + 1,
        icerik: s.scrollHeight,
        tasti: s.scrollHeight > s.clientHeight + 1,
        cakisan,
      }
    }),
  )
  let sorun = false
  console.log('Kontrol (taşma / sayfa no çakışması):')
  for (const t of kontrol) {
    const notlar = []
    if (t.tasti) notlar.push(`!! TAŞTI (${t.icerik}px)`)
    if (t.cakisan) notlar.push(`!! ÇAKIŞMA: ${t.cakisan}`)
    if (notlar.length) sorun = true
    console.log(`  ${String(t.slayt).padStart(2, '0')}  ${notlar.length ? notlar.join(' ') : 'ok'}`)
  }
  if (sorun) console.log('\n>>> Düzeltilmesi gereken slayt(lar) var.\n')

  const slaytlar = await page.locator('.slayt').all()
  for (let i = 0; i < slaytlar.length; i++) {
    await slaytlar[i].screenshot({
      path: path.join(KONTROL, `slayt-${String(i + 1).padStart(2, '0')}.png`),
    })
  }
  console.log(`✓ ${slaytlar.length} slayt önizlemesi`)

  await page.pdf({
    path: path.join(SUNUM, CIKTI),
    width: '1280px',
    height: '720px',
    printBackground: true,
    pageRanges: `1-${slaytlar.length}`,
  })
  console.log('✓ ' + CIKTI)

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
