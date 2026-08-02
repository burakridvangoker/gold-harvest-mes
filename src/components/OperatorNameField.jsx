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
 * inputClassName: alan, gömüldüğü yüzeyin kendi input stilini taşır
 * (wizard-input / sheet-input) — bu bileşen yalnızca çiplerin stilini getirir.
 */

const MAX_CHIPS = 6

function OperatorNameField({ value, onChange, personnel, inputClassName, placeholder = 'Ad Soyad' }) {
  const query = value.trim().toLocaleLowerCase('tr')

  const matches = personnel.filter(
    (person) => query === '' || person.ad_soyad.toLocaleLowerCase('tr').includes(query),
  )

  /* Çip zaten seçildiyse (alan bir adla birebir doluysa) çipleri gizle. */
  const picked = matches.length === 1 && matches[0].ad_soyad === value.trim()
  const chips = picked ? [] : matches.slice(0, MAX_CHIPS)

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
        <div className="opname-chips">
          {chips.map((person) => (
            <button
              key={person.id}
              type="button"
              className="opname-chip"
              onClick={() => onChange(person.ad_soyad)}
            >
              {person.ad_soyad}
              {person.departman && <span className="opname-chip-dept">{person.departman}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default OperatorNameField
