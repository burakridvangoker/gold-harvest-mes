/*
 * Fabrikalar ve hatlar.
 *
 * Merkez fabrikanın hatları SABİT — sahada gerçekten bu üç makine var,
 * yeni bir tanesi kurulursa `LINE_CODES`'a eklenir, başka yer değişmez.
 *
 * Şok fabrikası şu an DENEME aşamasında: hangi makinelerde kullanılacağı
 * belli değil, o yüzden sabit liste yok — makine kodu sahada elle girilir
 * ve `line_status`'a kaydedilir (bkz. LineSelect). Bir kere girilen makine
 * sonraki açılışlarda listede çıkar.
 *
 * Ayrım bilinçli olarak şema düzeyinde DEĞİL: `line_status`'a bir
 * "fabrika" kolonu eklemek migration gerektirirdi ve Şok tarafı henüz
 * kalıcı değil. Merkez'in listesi zaten tek kaynak olduğu için, o listede
 * OLMAYAN her kod tanımı gereği Şok/deneme makinesidir. Şok kalıcı hale
 * gelirse doğru hamle `line_status.fabrika` kolonu eklemektir.
 */
export const LINE_CODES = ['PFM-4', 'PFM-10', 'PFM-11']

export const FABRIKALAR = [
  { kod: 'merkez', ad: 'Merkez Fabrika', alt: 'PFM hatları' },
  { kod: 'sok', ad: 'Şok Fabrikası', alt: 'Deneme' },
]

/* Bir hat kodu Merkez'in sabit listesinde mi? Değilse Şok/deneme. */
export const isMerkezLine = (code) => LINE_CODES.includes(code)

/*
 * Elle girilen makine kodunu tek biçime sokar — aynı makinenin "sok-1",
 * "SOK-1 ", "Sok-1" diye üç ayrı kayıt olmasını engeller.
 * Türkçe'ye duyarlı büyütme: "i" → "İ" (toUpperCase() bunu "I" yapardı).
 */
export const normalizeLineCode = (raw) => (raw ?? '').trim().toLocaleUpperCase('tr')
