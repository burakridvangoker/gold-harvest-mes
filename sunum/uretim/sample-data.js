/*
 * Sunum/video düzeneği için başlangıç verisi.
 *
 * Öğretici videoda vardiya, ürün, olay ve paletler ÖNCEDEN HAZIR DEĞİL —
 * hepsi videonun içinde uygulamanın kendisi tarafından oluşturuluyor
 * (bkz. tanitim.cjs). Burada sadece uygulamanın "zaten var" saydığı
 * referans veriler duruyor: hatlar ve personel listesi.
 */

export const LINE_CODES = ['PFM-4', 'PFM-10', 'PFM-11']

/* Vardiya 07:00'da başlar; sürücü sahte saati buna göre kurar. */
const vardiyaBasi = new Date()
vardiyaBasi.setHours(7, 0, 0, 0)
export const SHIFT_START_MS = vardiyaBasi.getTime()

/*
 * PFM-4 / 1. vardiyada BİLEREK iki "Paketleme Operatörü" var: ShiftWizard
 * tek operatör olduğunda alanı kendiliğinden dolduruyor, iki kişide
 * doldurmuyor (bkz. CLAUDE.md "Otomatik ekip ataması"). İki kişi olması
 * videoda operatörün çipe dokunarak seçmesini gösterebilmemizi sağlıyor.
 */
/* `aktif: true` ŞART — usePersonnel sorgusu `.eq('aktif', true)` içeriyor,
 * alan olmayınca liste boş dönüyor ve ekip çipleri hiç görünmüyor. */
export const personnel = [
  { id: 'p1', ad_soyad: 'Levent Yıldız', sicil_no: 'GH-104', departman: 'Paketleme Operatörü', line_code: 'PFM-4', vardiya_no: 1, aktif: true },
  { id: 'p2', ad_soyad: 'Kadir Gülerer', sicil_no: 'GH-118', departman: 'Paketleme Operatörü', line_code: 'PFM-4', vardiya_no: 1, aktif: true },
  { id: 'p3', ad_soyad: 'Serkan Aydın', sicil_no: 'GH-127', departman: 'Paketleme', line_code: 'PFM-4', vardiya_no: 1, aktif: true },
  { id: 'p4', ad_soyad: 'Emine Toprak', sicil_no: 'GH-133', departman: 'Paketleme', line_code: 'PFM-4', vardiya_no: 1, aktif: true },
]
