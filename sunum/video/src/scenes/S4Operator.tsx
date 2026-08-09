import { AbsoluteFill, Interactive, useCurrentFrame } from "remotion";
import { Ekran, LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

const MADDELER = [
  ["Tek bakışta durum", "Ekranın rengi hattın durumu: yeşil üretim, kırmızı duruş, amber mola."],
  ["İki büyük tuş", "Eldivenle, hattın yanında kullanılmak üzere tasarlandı."],
  ["Geç girişi kabul eder", "“07:30'da durdu, 07:35'te girdim” sahada kuraldır."],
];

/* Kanıt sahnesi — porselen zemin, gerçek telefon ekranı. */
export const S4Operator: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Operator"
      style={{
        backgroundColor: C.paper,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 140,
        paddingRight: 140,
        gap: 110,
      }}
    >
      <LambaBandi renk={C.green} />

      <Interactive.Div name="Metin" style={{ flex: 1, maxWidth: 900 }}>
        <Plaka gecikme={8} renk={C.onPaper}>
          NE YAPTIK — SAHA
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
            ...yukselerek(frame, 22),
          }}
        >
          Operatör telefonundan iki tuş.
        </Interactive.Div>

        <Interactive.Div name="Maddeler" style={{ marginTop: 58 }}>
          {MADDELER.map(([ad, aciklama], i) => (
            <Interactive.Div
              key={ad}
              name={ad}
              style={{ marginBottom: 40, ...yukselerek(frame, 58 + i * 30) }}
            >
              <Interactive.Div
                name={`${ad}-ad`}
                style={{
                  fontFamily: F.data,
                  fontWeight: 600,
                  fontSize: 44,
                  lineHeight: 1.25,
                  color: C.ink,
                  marginBottom: 8,
                }}
              >
                {ad}
              </Interactive.Div>
              <Interactive.Div
                name={`${ad}-aciklama`}
                style={{
                  fontFamily: F.data,
                  fontWeight: 400,
                  fontSize: 36,
                  lineHeight: 1.45,
                  color: C.onPaper,
                }}
              >
                {aciklama}
              </Interactive.Div>
            </Interactive.Div>
          ))}
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div
        name="Telefonlar"
        style={{ position: "relative", width: 660, height: 880 }}
      >
        {/* Ana telefon — üretimdeki hat. Genişlik yüksekliğe göre seçildi:
            kare 400×860 oranında, 390px genişlik ≈ 840px yükseklik. */}
        <Interactive.Div
          name="AnaTelefon"
          style={{ position: "absolute", left: 0, top: 20 }}
        >
          <Ekran dosya="operator-ust.png" genislik={390} gecikme={30} />
        </Interactive.Div>

        {/* Saat çarkı — geç girişin gerçek karşılığı, telefonun sağ alt
            köşesine binerek öne gelir. Sağda 30px pay bırakılıyor ki
            hafif yaklaşma kadraj dışına taşmasın. */}
        <Interactive.Div
          name="SaatPaneli"
          style={{ position: "absolute", right: 30, top: 330 }}
        >
          <Ekran dosya="saat-girisi-panel.png" genislik={330} gecikme={120} />
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
