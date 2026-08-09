import { AbsoluteFill, Interactive, useCurrentFrame } from "remotion";
import { Ekran, LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

/* Gıda üretiminde izlenebilirlik kolaylık değil, denetim gerekliliği. */
export const S7Izlenebilirlik: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Izlenebilirlik"
      style={{
        backgroundColor: C.paper,
        justifyContent: "center",
        paddingLeft: 150,
        paddingRight: 150,
      }}
    >
      <LambaBandi renk={C.green} />

      <Plaka gecikme={8} renk={C.onPaper}>
        FAYDA 2 — İZLENEBİLİRLİK
      </Plaka>

      <Interactive.Div
        name="Baslik"
        style={{
          fontFamily: F.data,
          fontWeight: 700,
          fontSize: 88,
          lineHeight: 1.1,
          letterSpacing: "-0.028em",
          color: C.ink,
          marginTop: 26,
          maxWidth: 1450,
          ...yukselerek(frame, 20),
        }}
      >
        Her palet; hangi vardiyada, hangi üründe, hangi saatte.
      </Interactive.Div>

      <Interactive.Div
        name="Kanit"
        style={{ marginTop: 56, display: "flex", justifyContent: "center" }}
      >
        <Ekran dosya="palet-cikis-listesi.png" genislik={1440} gecikme={54} />
      </Interactive.Div>

      <Interactive.Div
        name="Sonuc"
        style={{
          fontFamily: F.data,
          fontWeight: 400,
          fontSize: 48,
          lineHeight: 1.42,
          color: C.onPaper,
          marginTop: 66,
          maxWidth: 1500,
          ...yukselerek(frame, 150),
        }}
      >
        Bir denetimde ya da müşteri şikayetinde{" "}
        <span style={{ color: C.ink, fontWeight: 600 }}>
          “bu ürün nasıl üretildi” sorusu saniyeler içinde cevaplanır
        </span>
        {" "}— kağıt arşivi taramaya gerek kalmadan.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
