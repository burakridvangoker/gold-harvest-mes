import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

const HALKALAR = ["SİPARİŞ", "PLANLAMA", "ÜRETİM", "LOJİSTİK"];

/*
 * Dürüst kapsam sahnesi. Sunumun en başındaki sınır burada görsel olarak
 * kuruluyor: dört halkadan YALNIZCA Üretim yanıyor, diğer üçü sönük ve
 * kesik çizgili. "Her şeyi yaptık" izlenimi bilerek verilmiyor.
 */
export const S3Zincir: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Zincir"
      style={{
        backgroundColor: C.ink,
        justifyContent: "center",
        paddingLeft: 150,
        paddingRight: 150,
      }}
    >
      <LambaBandi renk={C.amber} />

      <Plaka gecikme={8}>ZİNCİRDEKİ YERİMİZ</Plaka>

      <Interactive.Div
        name="Baslik"
        style={{
          fontFamily: F.data,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.1,
          letterSpacing: "-0.028em",
          color: C.paper,
          marginTop: 30,
          maxWidth: 1450,
          ...yukselerek(frame, 22),
        }}
      >
        Üretimin bir katmanındayız — hepsinde değil.
      </Interactive.Div>

      <Interactive.Div
        name="Halkalar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 26,
          marginTop: 84,
        }}
      >
        {HALKALAR.map((ad, i) => {
          const aktif = ad === "ÜRETİM";
          const gecikme = 56 + i * 16;
          return (
            <Interactive.Div
              key={ad}
              name={ad}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
              }}
            >
              <Interactive.Div
                name={`${ad}-kutu`}
                style={{
                  paddingTop: 34,
                  paddingBottom: 34,
                  paddingLeft: 52,
                  paddingRight: 52,
                  borderRadius: 16,
                  fontFamily: F.plate,
                  fontWeight: 700,
                  fontSize: 40,
                  letterSpacing: "0.1em",
                  color: aktif ? C.paper : "rgba(248,250,247,0.42)",
                  backgroundColor: aktif ? C.greenText : "transparent",
                  border: aktif
                    ? `2px solid ${C.green}`
                    : "2px dashed rgba(248,250,247,0.24)",
                  ...yukselerek(frame, gecikme),
                }}
              >
                {ad}
              </Interactive.Div>
              {i < HALKALAR.length - 1 ? (
                <Interactive.Div
                  name="Ok"
                  style={{
                    fontFamily: F.data,
                    fontSize: 40,
                    color: "rgba(248,250,247,0.3)",
                    opacity: interpolate(frame, [gecikme + 8, gecikme + 24], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                      easing: Easing.bezier(0.16, 1, 0.3, 1),
                    }),
                  }}
                >
                  →
                </Interactive.Div>
              ) : null}
            </Interactive.Div>
          );
        })}
      </Interactive.Div>

      <Interactive.Div
        name="Durustluk"
        style={{
          fontFamily: F.data,
          fontWeight: 400,
          fontSize: 48,
          lineHeight: 1.44,
          color: C.onInk,
          marginTop: 78,
          maxWidth: 1420,
          ...yukselerek(frame, 150),
        }}
      >
        Planlama ve lojistikte ne kullanıldığını henüz bilmiyoruz.{" "}
        <span style={{ color: C.paper, fontWeight: 600 }}>
          Bunu gizlemiyoruz, açıkça söylüyoruz.
        </span>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
