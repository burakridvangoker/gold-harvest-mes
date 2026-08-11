import { AbsoluteFill, Interactive, useCurrentFrame } from "remotion";
import { Ekran, LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

/*
 * Müdür panosu — duvara asılan tek ekran. Kanıt sahnesi olduğu için
 * porselen zemin; görsel neredeyse tam genişlikte, metin üstte kısa.
 */
export const S5Mudur: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Mudur"
      style={{
        backgroundColor: C.paper,
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 120,
        paddingRight: 120,
      }}
    >
      <LambaBandi renk={C.red} />

      <Interactive.Div
        name="Ust"
        style={{ width: "100%", maxWidth: 1560, textAlign: "center" }}
      >
        <Interactive.Div
          name="PlakaSatir"
          style={{ display: "flex", justifyContent: "center" }}
        >
          <Plaka gecikme={8} renk={C.onPaper}>
            AYNI ANDA — MÜDÜR PANOSU
          </Plaka>
        </Interactive.Div>

        <Interactive.Div
          name="Baslik"
          style={{
            fontFamily: F.data,
            fontWeight: 700,
            fontSize: 68,
            lineHeight: 1.14,
            letterSpacing: "-0.028em",
            color: C.ink,
            marginTop: 20,
            ...yukselerek(frame, 20),
          }}
        >
          Hat durduğu anda ekran kırmızıya döner.
        </Interactive.Div>

        <Interactive.Div
          name="AltMetin"
          style={{
            fontFamily: F.data,
            fontWeight: 400,
            fontSize: 36,
            lineHeight: 1.4,
            color: C.onPaper,
            marginTop: 16,
            ...yukselerek(frame, 40),
          }}
        >
          Amir ya da yönetici, fabrikada olsun olmasın, aynı anda görür.
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div
        name="PanoAlani"
        style={{ marginTop: 44, display: "flex", justifyContent: "center", width: "100%" }}
      >
        {/* 1200px genişlik ≈ 750px yükseklik (kare 1600×1000 oranında).
            Üstteki metinle birlikte 1080'e sığması için bu üst sınır. */}
        <Ekran dosya="mudur.png" genislik={1200} gecikme={62} />
      </Interactive.Div>
    </AbsoluteFill>
  );
};
