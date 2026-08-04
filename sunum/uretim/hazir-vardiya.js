/*
 * PDF sunumunun ekran görüntüleri için HAZIR (önceden doldurulmuş)
 * vardiya. Sadece `?hazir=1` ile yüklenir — öğretici video bunu
 * KULLANMAZ, orada her kayıt tıklanarak oluşturulur.
 *
 * Rakamlar kullanıcının paylaştığı gerçek PFM-4 vardiya görüntülerine
 * yakın (açık kalma ~%55, hız verimi ~%67, palet 9+5, koli 482+234,
 * paket 5784+2808). Parlak ama gerçekçi olmayan rakam uydurulmadı.
 */

import { SHIFT_START_MS } from './sample-data.js'

const LINE = 'PFM-4'
const SHIFT_ID = 'shift-1'
const RUN1 = 'run-1'
const RUN2 = 'run-2'
const MIN = 60 * 1000

const iso = (dakika) => new Date(SHIFT_START_MS + dakika * MIN).toISOString()

export const shift = {
  id: SHIFT_ID,
  line_code: LINE,
  vardiya: '1',
  operator: 'Levent Yıldız',
  started_at: iso(0),
  planlanan_bitis: iso(480),
  ended_at: null,
  hedef_koli: null,
}

export const product_runs = [
  {
    id: RUN1,
    shift_id: SHIFT_ID,
    line_code: LINE,
    sira: 1,
    urun_adi: 'Topzcorn Çilek',
    parti_no: 'TC-2608',
    gramaj: 40,
    koli_ici_adet: 12,
    calisma_hizi_pkt_dk: 55,
    koli_per_palet: 54,
    hedef_koli: 500,
    bos_paket_agirlik_g: 2.4,
    dolu_paket_baslangic: 128400,
    bos_paket_baslangic: 3100,
    dolu_paket_bitis: 134310,
    bos_paket_bitis: 3244,
    ortalama_gramaj_g: 40.6,
  },
  {
    id: RUN2,
    shift_id: SHIFT_ID,
    line_code: LINE,
    sira: 2,
    urun_adi: 'Natura Karışık',
    parti_no: 'NK-1142',
    gramaj: 50,
    koli_ici_adet: 12,
    calisma_hizi_pkt_dk: 70,
    koli_per_palet: 47,
    hedef_koli: 400,
    bos_paket_agirlik_g: 2.6,
    dolu_paket_baslangic: 134310,
    bos_paket_baslangic: 3244,
    dolu_paket_bitis: null,
    bos_paket_bitis: null,
    ortalama_gramaj_g: null,
  },
]

const OLAYLAR = [
  [0, 'durus', 'Temizlik', RUN1],
  [34, 'uretim', null, RUN1],
  [56, 'durus', 'Bobin değişimi', RUN1],
  [70, 'uretim', null, RUN1],
  [88, 'durus', 'Ambalaj ayarı', RUN1],
  [101, 'uretim', null, RUN1],
  [116, 'mola', null, null],
  [134, 'durus', 'Moladan dönüş', RUN1],
  [139, 'uretim', null, RUN1],
  [161, 'durus', 'Bobin değişimi', RUN1],
  [175, 'uretim', null, RUN1],
  [196, 'durus', 'Ürün sıkışması', RUN1],
  [212, 'uretim', null, RUN1],
  [232, 'durus', 'Ambalaj ayarı', RUN1],
  [248, 'uretim', null, RUN1],
  [257, 'mola', null, null],
  [294, 'durus', 'Moladan dönüş', RUN1],
  [299, 'uretim', null, RUN1],
  [318, 'durus', 'Bobin değişimi', RUN1],
  [332, 'uretim', null, RUN1],
  [346, 'durus', 'Ürün değişimi', RUN1],
  [372, 'uretim', null, RUN2],
  [396, 'durus', 'Terazi ayarı', RUN2],
  [409, 'uretim', null, RUN2],
  [420, 'mola', null, null],
  [435, 'durus', 'Moladan dönüş', RUN2],
  [440, 'uretim', null, RUN2],
  [465, 'durus', 'Temizlik', RUN2],
]

export const timeline_events = OLAYLAR.map(([dakika, kind, note, runId], i) => ({
  id: `ev-${i}`,
  line_code: LINE,
  shift_id: SHIFT_ID,
  product_run_id: runId,
  at: iso(dakika),
  kind,
  note,
}))

const PALETLER = [
  [52, RUN1, 54], [84, RUN1, 54], [112, RUN1, 54], [155, RUN1, 54], [190, RUN1, 54],
  [226, RUN1, 54], [253, RUN1, 54], [312, RUN1, 52], [342, RUN1, 52],
  [385, RUN2, 47], [394, RUN2, 47], [414, RUN2, 47], [452, RUN2, 47], [463, RUN2, 46],
]

export const pallet_records = PALETLER.map(([dakika, runId, koli], i) => ({
  id: `pal-${i}`,
  line_code: LINE,
  shift_id: SHIFT_ID,
  product_run_id: runId,
  completed_at: iso(dakika),
  koli_count: koli,
}))

/* Tek bir duruşun içinde çakışan sebepler. */
export const stop_reason_segments = [
  { id: 'seg-1', shift_id: SHIFT_ID, line_code: LINE, event_id: 'ev-20', note: 'Ürün değişimi', start_at: iso(346), end_at: iso(366) },
  { id: 'seg-2', shift_id: SHIFT_ID, line_code: LINE, event_id: 'ev-20', note: 'Bobin değişimi', start_at: iso(352), end_at: iso(372) },
  { id: 'seg-3', shift_id: SHIFT_ID, line_code: LINE, event_id: 'ev-20', note: 'Terazi ayarı', start_at: iso(358), end_at: iso(370) },
]

export const manager_dashboard_visits = [
  { id: 'v1', line_code: LINE, opened_at: iso(430), last_seen_at: iso(437) },
  { id: 'v2', line_code: LINE, opened_at: iso(300), last_seen_at: iso(312) },
]

/* Bu tablolarda "şimdi"den sonraki satırlar kırpılır — hazır vardiyada
 * ekran, saatin sabitlendiği anın tutarlı halini göstersin diye. */
export const ZAMAN_SUTUNU = {
  timeline_events: 'at',
  pallet_records: 'completed_at',
  stop_reason_segments: 'start_at',
  manager_dashboard_visits: 'opened_at',
}
