/*
 * Porselen Andon — uygulamanın kendi tasarım dili (src/styles/andon.css).
 * Videoda ritim: KOYU sahneler anlatı/iddia, PORSELEN sahneler kanıt
 * (gerçek ekran görüntüsü). Sinyal renkleri uygulamadaki anlamlarını
 * korur: yeşil üretim, amber mola/hedef, kırmızı duruş.
 */
export const C = {
  ink: "#0f1512",
  inkDeep: "#0a0e0c",
  paper: "#f8faf7",
  paperDim: "#eef1ee",
  /* Koyu zeminde soluk metin */
  onInk: "rgba(248,250,247,0.62)",
  /* Açık zeminde soluk metin */
  onPaper: "#566059",

  /* Ham sinyal renkleri — dolgu/lamba için */
  green: "#009440",
  amber: "#ffb000",
  red: "#e02718",

  /* Metne dönüşen sinyaller — açık zeminde okunur derin varyantlar */
  greenText: "#00722f",
  amberText: "#8a5f00",
  redText: "#c31f10",
} as const;

export const F = {
  data: "'IBM Plex Sans', system-ui, sans-serif",
  plate: "'Saira Condensed', 'Arial Narrow', sans-serif",
} as const;
