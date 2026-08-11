import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

export const S1Acilis: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Acilis"
      style={{
        backgroundColor: C.ink,
        justifyContent: "center",
        paddingLeft: 150,
        paddingRight: 150,
      }}
    >
      <LambaBandi renk={C.green} />

      <Plaka gecikme={10}>GOLD HARVEST</Plaka>

      <Interactive.Div
        name="Baslik"
        style={{
          fontFamily: F.data,
          fontWeight: 700,
          fontSize: 132,
          lineHeight: 1.04,
          letterSpacing: "-0.03em",
          color: C.paper,
          marginTop: 34,
          maxWidth: 1400,
          ...yukselerek(frame, 26),
        }}
      >
        Üretim Takip Sistemi
      </Interactive.Div>

      <Interactive.Div
        name="AltBaslik"
        style={{
          fontFamily: F.data,
          fontWeight: 400,
          fontSize: 52,
          lineHeight: 1.4,
          color: C.onInk,
          marginTop: 40,
          maxWidth: 1250,
          ...yukselerek(frame, 46),
        }}
      >
        PFM-4, PFM-10 ve PFM-11 hatlarında — şu anda, gerçek verilerle
        çalışıyor.
      </Interactive.Div>

      {/* Üç hattın "çalışıyor" noktası — sırayla yanar, andon mantığı. */}
      <Interactive.Div
        name="Hatlar"
        style={{ display: "flex", gap: 54, marginTop: 66 }}
      >
        {["PFM-4", "PFM-10", "PFM-11"].map((hat, i) => (
          <Interactive.Div
            key={hat}
            name={hat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: F.plate,
              fontWeight: 700,
              fontSize: 34,
              letterSpacing: "0.14em",
              color: C.paper,
              opacity: interpolate(frame, [70 + i * 14, 88 + i * 14], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              }),
            }}
          >
            <Interactive.Div
              name="Nokta"
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                backgroundColor: C.green,
              }}
            />
            {hat}
          </Interactive.Div>
        ))}
      </Interactive.Div>
    </AbsoluteFill>
  );
};
