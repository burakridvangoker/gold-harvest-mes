import { AbsoluteFill, Interactive, useCurrentFrame } from "remotion";
import { LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

export const S9Kapanis: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Kapanis"
      style={{
        backgroundColor: C.ink,
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 180,
        paddingRight: 180,
        textAlign: "center",
      }}
    >
      <LambaBandi renk={C.green} />

      <Plaka gecikme={8}>ÖNERİ</Plaka>

      <Interactive.Div
        name="Kapanis"
        style={{
          fontFamily: F.data,
          fontWeight: 700,
          fontSize: 92,
          lineHeight: 1.16,
          letterSpacing: "-0.03em",
          color: C.paper,
          marginTop: 40,
          maxWidth: 1560,
          ...yukselerek(frame, 24),
        }}
      >
        Bu katmanda kanıtlanan modelin, fabrika geneline
        yaygınlaştırılmasını öneriyoruz.
      </Interactive.Div>

      <Interactive.Div
        name="Not"
        style={{
          fontFamily: F.data,
          fontWeight: 400,
          fontSize: 42,
          lineHeight: 1.42,
          color: C.onInk,
          marginTop: 46,
          maxWidth: 1150,
          ...yukselerek(frame, 70),
        }}
      >
        Sistem bugün üç hatta çalışıyor ve sıfıra yakın ek maliyet
        üretiyor.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
