import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

/* Sahnenin tek işi: bilginin GEÇ ulaşmasının bir maliyeti olduğunu
 * göstermek. İki saat yan yana durur, aradaki boşluk kırmızıyla dolar. */
export const S2Kagit: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Kagit"
      style={{
        backgroundColor: C.ink,
        justifyContent: "center",
        paddingLeft: 150,
        paddingRight: 150,
      }}
    >
      <LambaBandi renk={C.red} />

      <Plaka gecikme={8}>BUGÜNE KADAR</Plaka>

      <Interactive.Div
        name="Baslik"
        style={{
          fontFamily: F.data,
          fontWeight: 700,
          fontSize: 96,
          lineHeight: 1.1,
          letterSpacing: "-0.028em",
          color: C.paper,
          marginTop: 30,
          maxWidth: 1500,
          ...yukselerek(frame, 22),
        }}
      >
        Makine durduğunda kimse bilmiyordu.
      </Interactive.Div>

      {/* İki saat ve aradaki boşluk */}
      <Interactive.Div
        name="ZamanEkseni"
        style={{ marginTop: 90, display: "flex", alignItems: "flex-end", gap: 0 }}
      >
        <Interactive.Div name="Durus" style={{ ...yukselerek(frame, 60) }}>
          <Interactive.Div
            name="DurusEtiket"
            style={{
              fontFamily: F.plate,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "0.16em",
              color: C.red,
              marginBottom: 12,
            }}
          >
            MAKİNE DURDU
          </Interactive.Div>
          <Interactive.Div
            name="DurusSaat"
            style={{
              fontFamily: F.data,
              fontWeight: 700,
              fontSize: 108,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              color: C.paper,
            }}
          >
            07:30
          </Interactive.Div>
        </Interactive.Div>

        {/* Kırmızı boşluk çubuğu — soldan sağa dolar */}
        <Interactive.Div
          name="Bosluk"
          style={{
            flex: 1,
            marginLeft: 46,
            marginRight: 46,
            marginBottom: 26,
            height: 14,
            borderRadius: 999,
            backgroundColor: "rgba(248,250,247,0.10)",
            overflow: "hidden",
          }}
        >
          <Interactive.Div
            name="BoslukDolgu"
            style={{
              height: "100%",
              backgroundColor: C.red,
              transformOrigin: "left center",
              scale: interpolate(frame, [86, 190], ["0 1", "1 1"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          />
        </Interactive.Div>

        <Interactive.Div name="Kagit" style={{ ...yukselerek(frame, 150), textAlign: "right" }}>
          <Interactive.Div
            name="KagitEtiket"
            style={{
              fontFamily: F.plate,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: "0.16em",
              color: C.onInk,
              marginBottom: 12,
            }}
          >
            KAĞIT MASAYA ULAŞTI
          </Interactive.Div>
          <Interactive.Div
            name="KagitSaat"
            style={{
              fontFamily: F.data,
              fontWeight: 700,
              fontSize: 108,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
              color: C.paper,
            }}
          >
            15:20
          </Interactive.Div>
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div
        name="Sonuc"
        style={{
          fontFamily: F.data,
          fontWeight: 400,
          fontSize: 50,
          lineHeight: 1.42,
          color: C.onInk,
          marginTop: 76,
          maxWidth: 1400,
          ...yukselerek(frame, 210),
        }}
      >
        Vardiya bittiğinde öğrenilen bir duruşa{" "}
        <span style={{ color: C.paper, fontWeight: 600 }}>müdahale edilemez</span>
        {" "}— o gün çoktan geçmiştir.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
