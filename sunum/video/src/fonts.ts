import { continueRender, delayRender, staticFile } from "remotion";

/*
 * Belge dili Türkçe olmak ZORUNDA: `text-transform: uppercase` dile
 * duyarlıdır ve dil belirtilmezse "i" → "I" olur. Etiketler bu yüzden
 * "SIPARIŞ", "ÜRETIM", "ZINCIRDEKI YERIMIZ" diye çıkıyordu (yaşandı,
 * ilk render'da görüldü). lang="tr" ile doğrusu geliyor: "SİPARİŞ",
 * "ÜRETİM", "ZİNCİRDEKİ YERİMİZ".
 */
document.documentElement.lang = "tr";

/*
 * Yazı tipleri CSS dosyasından DEĞİL, buradan yükleniyor. Sebep: bir .css
 * dosyasındaki url('/fonts/...') ifadesini webpack'in css-loader'ı derleme
 * anında modül olarak çözmeye çalışıp paketlemeyi kırıyor. staticFile()
 * ile üretilen yolu çalışma anında <style> olarak enjekte etmek hem bu
 * sorunu bitiriyor hem de Remotion'ın kendi varlık yolu mantığını kullanıyor.
 *
 * latin ve latin-ext AYRI AYRI tanımlanmak zorunda: Türkçe ğ/ı/ş/İ
 * latin-ext'te. unicode-range olmadan iki alt küme birbirini ezer ve
 * harfler sessizce yedek fonta düşer.
 *
 * @remotion/fonts'un loadFont'u burada kullanılamaz — unicode-range
 * seçeneği yok.
 */
const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2122,U+2212";
const EXT =
  "U+0100-024F,U+0259,U+1E00-1EFF,U+2020,U+20A0-20AB,U+2113,U+2C60-2C7F,U+A720-A7FF";

const YUZLER: [aile: string, agirlik: number, dosya: string, aralik: string][] = [
  ["IBM Plex Sans", 400, "ibm-plex-sans-latin-400-normal.woff2", LATIN],
  ["IBM Plex Sans", 400, "ibm-plex-sans-latin-ext-400-normal.woff2", EXT],
  ["IBM Plex Sans", 600, "ibm-plex-sans-latin-600-normal.woff2", LATIN],
  ["IBM Plex Sans", 600, "ibm-plex-sans-latin-ext-600-normal.woff2", EXT],
  ["IBM Plex Sans", 700, "ibm-plex-sans-latin-700-normal.woff2", LATIN],
  ["IBM Plex Sans", 700, "ibm-plex-sans-latin-ext-700-normal.woff2", EXT],
  ["Saira Condensed", 700, "saira-condensed-latin-700-normal.woff2", LATIN],
  ["Saira Condensed", 700, "saira-condensed-latin-ext-700-normal.woff2", EXT],
];

const css = YUZLER.map(
  ([aile, agirlik, dosya, aralik]) =>
    `@font-face{font-family:'${aile}';font-style:normal;font-weight:${agirlik};` +
    `font-display:block;src:url('${staticFile(`fonts/${dosya}`)}') format('woff2');` +
    `unicode-range:${aralik}}`,
).join("\n");

const stil = document.createElement("style");
stil.textContent = css;
document.head.appendChild(stil);

/*
 * document.fonts.ready TEK BAŞINA yetmez: o fontu kullanan metin henüz
 * yoksa yükleme hiç başlamamış olur ve söz anında çözülür. Bu yüzden her
 * aile/ağırlık için hem latin hem latin-ext karakter içeren bir örnek
 * metinle açıkça load() çağrılıyor.
 */
const ORNEK = "AĞIŞğışİ0123";
const handle = delayRender("Yazı tipleri yükleniyor");

Promise.all([
  document.fonts.load(`400 16px "IBM Plex Sans"`, ORNEK),
  document.fonts.load(`600 16px "IBM Plex Sans"`, ORNEK),
  document.fonts.load(`700 16px "IBM Plex Sans"`, ORNEK),
  document.fonts.load(`700 16px "Saira Condensed"`, ORNEK),
])
  .then(() => document.fonts.ready)
  .then(() => continueRender(handle))
  .catch(() => continueRender(handle));
