import './OperatorNameField.css'

/*
 * Operatör adı alanı: serbest metin + personel listesinden tek dokunuşluk
 * çipler (StopNoteSheet'in kanıtlanmış deseni — dropdown değil).
 *
 * Alan her zaman yazılabilir bir <input> olarak kalır; personel listesi
 * sadece eşleşen adları çip olarak altına serer, çipe dokunmak alanı
 * doldurur. Liste boşsa (tablo yok / sorgu hata verdi / eşleşme yok) çip
 * bölgesi hiç render edilmez — ekran, listenin var olmadığı günkü haliyle
 * birebir aynıdır. Operatör hiçbir durumda seçime zorlanmaz ya da
 * kilitlenmez: listede olmayan bir ad elle yazılıp kaydedilebilir.
 *
 * vardiyaNo verilirse (sihirbazın vardiya adımı, operatör sheet'leri):
 * alan boşken o vardiyaya atanmış EKİP "Bu vardiyanın ekibi" etiketiyle
 * listelenir (Paketleme Operatörü önce ve vurgulu), yazarken de eşleşmeler
 * ekip-önce sıralanır. Verilmezse davranış düz alfabetiktir.
 *
 * inputClassName: alan, gömüldüğü yüzeyin kendi input stilini taşır
 * (wizard-input / sheet-input) — bu bileşen yalnızca çiplerin stilini getirir.
 */

const MAX_CHIPS = 6
const OPERATOR_ROL = 'Paketleme Operatörü'

function OperatorNameField({
  value,
  onChange,
  personnel,
  inputClassName,
  vardiyaNo = null,
  placeholder = 'Ad Soyad',
}) {
  const query = value.trim().toLocaleLowerCase('tr')
  const vno = vardiyaNo != null && vardiyaNo !== '' ? Number(vardiyaNo) : null

  /* Ekip üyesi > operatör rolü > alfabetik (liste zaten ada göre sıralı). */
  const rank = (person) => {
    const ekip = vno != null && person.vardiya_no === vno ? 0 : 1
    const operator = person.departman === OPERATOR_ROL ? 0 : 1
    return ekip * 2 + operator
  }

  const matches = personnel
    .filter((person) => query === '' || person.ad_soyad.toLocaleLowerCase('tr').includes(query))
    .sort((a, b) => rank(a) - rank(b))

  /* Çip zaten seçildiyse (alan bir adla birebir doluysa) çipleri gizle. */
  const picked = matches.length === 1 && matches[0].ad_soyad === value.trim()

  /*
   * Vardiya belliyken ekip, alan otomatik dolu/seçilmişken de görünür
   * kalır — hem "ekip kim" bağlamı kaybolmasın hem başka üyeye tek
   * dokunuşla geçilebilsin diye (yalnızca yazarak ARARKEN süzgece döner).
   * Ekipte kesme uygulanmaz: ekip 6-7 kişi, birinin düşmesi "ekip eksik"
   * gibi okunur. Vardiya bağlamı yoksa eski davranış: seçilince gizle,
   * diğer durumlarda ilk 6 eşleşme.
   */
  const exact = personnel.some((person) => person.ad_soyad === value.trim())
  const ekip =
    vno != null && (query === '' || exact)
      ? personnel.filter((person) => person.vardiya_no === vno).sort((a, b) => rank(a) - rank(b))
      : []
  const showTeam = ekip.length > 0
  const chips = showTeam ? ekip : picked ? [] : matches.slice(0, MAX_CHIPS)

  return (
    <div className="opname-field">
      <input
        className={inputClassName}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {chips.length > 0 && (
        <div className="opname-suggest">
          {showTeam && <span className="opname-team-label plate">Bu vardiyanın ekibi</span>}
          <div className="opname-chips">
            {chips.map((person) => (
              <button
                key={person.id}
                type="button"
                className={`opname-chip${
                  person.departman === OPERATOR_ROL ? ' opname-chip--operator' : ''
                }`}
                onClick={() => onChange(person.ad_soyad)}
              >
                {person.ad_soyad}
                {person.departman && <span className="opname-chip-dept">{person.departman}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default OperatorNameField
