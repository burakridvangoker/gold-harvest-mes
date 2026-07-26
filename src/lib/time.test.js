import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { aktifVardiyaNo, fromTimeInputValue, vardiyaBaslangici } from './time.js'

/* 2026-07-26 öğlen UTC, güvenli bir gün-ortası çapa; T() bu günün TR duvar
 * saatini üretir (fromTimeInputValue ile aynı dönüşüm, testte de o kullanılır). */
const ANKARA_GUNU = Date.UTC(2026, 6, 26, 12, 0)
const pad2 = (n) => String(n).padStart(2, '0')
const T = (saat, dakika) => fromTimeInputValue(ANKARA_GUNU, `${pad2(saat)}:${pad2(dakika)}`)

describe('vardiyaBaslangici', () => {
  it('vardiya kendi saati içindeyken bugünün başlangıcını verir', () => {
    // Vardiya 1 (07-15), şu an 09:00 — bugün 07:00 döner
    assert.equal(vardiyaBaslangici('1', T(9, 0)), T(7, 0))
  })

  it('vardiya saati henüz gelmemişse dünkü başlangıca düşer', () => {
    // Şu an 05:00, vardiya 3 (23-07) hâlâ sürüyor olmalı — dün 23:00'ten
    // başlamış olmalı, bugünün 23:00'ü henüz gelmedi.
    const dun23 = T(23, 0) - 24 * 60 * 60 * 1000
    assert.equal(vardiyaBaslangici('3', T(5, 0)), dun23)
  })

  it('vardiya 3 gece yarısını yeni geçtiyse bugünkü başlangıcı verir', () => {
    // Şu an 23:10, vardiya 3 az önce başladı — bugün 23:00 döner.
    assert.equal(vardiyaBaslangici('3', T(23, 10)), T(23, 0))
  })

  it('tanımsız vardiya için null döner', () => {
    assert.equal(vardiyaBaslangici('9', T(9, 0)), null)
  })
})

describe('aktifVardiyaNo', () => {
  it('vardiya sınırlarının içinde doğru vardiyayı verir', () => {
    assert.equal(aktifVardiyaNo(T(9, 0)), 1)
    assert.equal(aktifVardiyaNo(T(16, 0)), 2)
    assert.equal(aktifVardiyaNo(T(2, 0)), 3)
  })

  it('sınır saatlerinde bir sonraki vardiyaya geçer', () => {
    assert.equal(aktifVardiyaNo(T(6, 59)), 3)
    assert.equal(aktifVardiyaNo(T(7, 0)), 1)
    assert.equal(aktifVardiyaNo(T(14, 59)), 1)
    assert.equal(aktifVardiyaNo(T(15, 0)), 2)
    assert.equal(aktifVardiyaNo(T(22, 59)), 2)
    assert.equal(aktifVardiyaNo(T(23, 0)), 3)
  })
})
