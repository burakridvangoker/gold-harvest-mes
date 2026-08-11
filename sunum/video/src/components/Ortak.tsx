import React from "react";
import { Easing, Img, Interactive, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, F } from "../theme";

/* Sahnelerin ortak yumuşak girişi — tek çeşit hareket: yukarı süzülerek belirme. */
export const yukselerek = (frame: number, gecikme: number) => ({
  opacity: interpolate(frame, [gecikme, gecikme + 18], [0, 1], {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  }),
  translate: interpolate(frame, [gecikme, gecikme + 18], ["0px 34px", "0px 0px"], {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  }),
});

/*
 * Büyük harf etiket — Saira Condensed, uygulamanın "plaka" rolü.
 *
 * DİKKAT: `text-transform: uppercase` BİLEREK kullanılmıyor. Türkçede
 * "i" → "İ" olmalı ama tarayıcı dil duyarlı büyütmeyi bu ortamda
 * uygulamadı; `lang="tr"` denendi, çözmedi (yaşandı: "ZİNCİRDEKİ
 * YERİMİZ" yerine "ZINCIRDEKI YERIMIZ" çıktı). Metinler kaynakta
 * doğrudan büyük harf yazılıyor — tek garantili yol.
 */
export const Plaka: React.FC<{
  children: React.ReactNode;
  renk?: string;
  gecikme?: number;
  boyut?: number;
}> = ({ children, renk = C.onInk, gecikme = 0, boyut = 30 }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Plaka"
      style={{
        fontFamily: F.plate,
        fontWeight: 700,
        fontSize: boyut,
        letterSpacing: "0.22em",
        color: renk,
        ...yukselerek(frame, gecikme),
      }}
    >
      {children}
    </Interactive.Div>
  );
};

/*
 * Gerçek ekran görüntüsü kartı. Görsellerin hepsi canlı uygulamadan
 * (sunum/uretim/shots.cjs) — videoda hiçbir arayüz yeniden çizilmiyor.
 */
export const Ekran: React.FC<{
  dosya: string;
  gecikme?: number;
  genislik?: number;
  kayma?: number;
}> = ({ dosya, gecikme = 0, genislik = 900, kayma = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="Ekran"
      style={{
        width: genislik,
        borderRadius: 22,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid rgba(18,24,21,0.14)",
        boxShadow: "0 40px 90px -40px rgba(0,0,0,0.75)",
        opacity: interpolate(frame, [gecikme, gecikme + 22], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        /* Hafif içeri doğru yaklaşma — sabit duran bir ekran görüntüsü
         * videoda ölü duruyor, çok yavaş bir yaklaşma canlı tutuyor.
         * Oran bilerek küçük: büyük bir yaklaşma görseli kadraj dışına
         * taşırıyor (ilk render'da müdür panosunun altı kesilmişti). */
        scale: interpolate(frame, [gecikme, gecikme + 220], [1, 1.03], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          output: "perceptual-scale",
        }),
        translate: interpolate(frame, [gecikme, gecikme + 22], [`${kayma}px 30px`, `${kayma}px 0px`], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <Img src={staticFile(`gorseller/${dosya}`)} style={{ width: "100%", display: "block" }} />
    </Interactive.Div>
  );
};

/* Üst kenardaki andon lamba bandı — uygulamanın imza öğesi. */
export const LambaBandi: React.FC<{ renk: string; gecikme?: number }> = ({ renk, gecikme = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name="LambaBandi"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: renk,
        transformOrigin: "left center",
        scale: interpolate(frame, [gecikme, gecikme + 30], ["0 1", "1 1"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    />
  );
};
