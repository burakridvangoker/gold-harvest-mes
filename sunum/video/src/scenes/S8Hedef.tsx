import { AbsoluteFill, Interactive, useCurrentFrame } from "remotion";
import { LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

/*
 * Gelecek zamanlı sahne — bilerek KOYU zeminde ve amber lambayla.
 * "Şimdi" (porselen, kanıt) sahneleriyle karışmasın diye ayrı bir
 * görsel dünyada duruyor: bunlar henüz yapılmadı.
 */
const ADIMLAR = [
  [
    "Planlama entegrasyonu",
    "Üretim planları sistem üzerinden tanımlansın, planlama birimi üretimi anlık izleyip revizeyi dinamik şekillendirsin.",
  ],
  [
    "Doğrudan makine verisi",
    "Veri girişi operatörünün elle aktardığı veriler, makineden doğrudan ve otomatik gelsin.",
  ],
  [
    "Personel/devamsızlık entegrasyonu",
    "Kart okuma verisiyle devamsızlık kaynaklı eksik personel doğrudan sistemde görünsün.",
  ],
];

export const S8Hedef: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Hedef"
      style={{
        backgroundColor: C.ink,
        justifyContent: "center",
        paddingLeft: 150,
        paddingRight: 150,
      }}
    >
      <LambaBandi renk={C.amber} />

      <Plaka gecikme={8}>HEDEFLİYORUZ</Plaka>

      <Interactive.Div
        name="Baslik"
        style={{
          fontFamily: F.data,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.1,
          letterSpacing: "-0.028em",
          color: C.paper,
          marginTop: 26,
          ...yukselerek(frame, 20),
        }}
      >
        Sıradaki üç adım.
      </Interactive.Div>

      <Interactive.Div name="Adimlar" style={{ marginTop: 66 }}>
        {ADIMLAR.map(([ad, aciklama], i) => (
          <Interactive.Div
            key={ad}
            name={ad}
            style={{
              display: "flex",
              gap: 44,
              alignItems: "baseline",
              marginBottom: 48,
              ...yukselerek(frame, 52 + i * 34),
            }}
          >
            <Interactive.Div
              name={`${ad}-no`}
              style={{
                fontFamily: F.plate,
                fontWeight: 700,
                fontSize: 56,
                lineHeight: 1,
                letterSpacing: "0.04em",
                color: C.amber,
                minWidth: 78,
              }}
            >
              0{i + 1}
            </Interactive.Div>
            <Interactive.Div name={`${ad}-govde`} style={{ maxWidth: 1350 }}>
              <Interactive.Div
                name={`${ad}-ad`}
                style={{
                  fontFamily: F.data,
                  fontWeight: 600,
                  fontSize: 52,
                  lineHeight: 1.2,
                  color: C.paper,
                  marginBottom: 10,
                }}
              >
                {ad}
              </Interactive.Div>
              <Interactive.Div
                name={`${ad}-aciklama`}
                style={{
                  fontFamily: F.data,
                  fontWeight: 400,
                  fontSize: 38,
                  lineHeight: 1.42,
                  color: C.onInk,
                }}
              >
                {aciklama}
              </Interactive.Div>
            </Interactive.Div>
          </Interactive.Div>
        ))}
      </Interactive.Div>
    </AbsoluteFill>
  );
};
