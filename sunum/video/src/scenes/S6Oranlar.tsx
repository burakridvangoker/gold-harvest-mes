import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { LambaBandi, Plaka, yukselerek } from "../components/Ortak";
import { C, F } from "../theme";

/*
 * Sunumun en değerli ayrımı: makinenin ÇALIŞMASI ile VERİMLİ çalışması
 * aynı şey değil. İki oran sayarak belirir, aradaki fark isimlendirilir.
 * Rakamlar kullanıcının verdiği örnek hesap: 8 saatlik vardiya, 6 saat
 * açık (%75), o 6 saatte hıza göre 5 saatlik iş (%83).
 *
 * Buraya bir de duruş sebepleri ekran görüntüsü konmuştu; kadrajda
 * okunamayacak kadar küçük kalıp dokuya dönüştüğü için kaldırıldı —
 * sahnenin tek işi iki rakamı karşılaştırmak. O ekran zaten 5. sahnedeki
 * müdür panosunun içinde tam boy görünüyor.
 */
export const S6Oranlar: React.FC = () => {
  const frame = useCurrentFrame();

  const acik = Math.round(
    interpolate(frame, [56, 116], [0, 75], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );
  const hiz = Math.round(
    interpolate(frame, [96, 156], [0, 83], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  );

  return (
    <AbsoluteFill
      name="Oranlar"
      style={{
        backgroundColor: C.ink,
        justifyContent: "center",
        paddingLeft: 150,
        paddingRight: 150,
      }}
    >
      <LambaBandi renk={C.amber} />

      <Plaka gecikme={8}>FAYDA 1 — ARIZA MI, YAVAŞLAMA MI</Plaka>

      <Interactive.Div
        name="Baslik"
        style={{
          fontFamily: F.data,
          fontWeight: 700,
          fontSize: 88,
          lineHeight: 1.1,
          letterSpacing: "-0.028em",
          color: C.paper,
          marginTop: 26,
          maxWidth: 1500,
          ...yukselerek(frame, 20),
        }}
      >
        Makinenin çalışması ile verimli çalışması aynı şey değil.
      </Interactive.Div>

      <Interactive.Div
        name="OranSatiri"
        style={{ display: "flex", gap: 190, marginTop: 84, alignItems: "flex-start" }}
      >
        <Interactive.Div name="AcikKalma" style={{ ...yukselerek(frame, 50) }}>
          <Interactive.Div
            name="AcikSayi"
            style={{
              fontFamily: F.data,
              fontWeight: 700,
              fontSize: 148,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              color: C.paper,
            }}
          >
            %{acik}
          </Interactive.Div>
          <Interactive.Div
            name="AcikEtiket"
            style={{
              fontFamily: F.plate,
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: "0.16em",
              color: C.green,
              marginTop: 16,
            }}
          >
            AÇIK KALMA
          </Interactive.Div>
          <Interactive.Div
            name="AcikAciklama"
            style={{
              fontFamily: F.data,
              fontWeight: 400,
              fontSize: 34,
              lineHeight: 1.42,
              color: C.onInk,
              marginTop: 16,
              maxWidth: 460,
            }}
          >
            8 saatlik vardiyada makine 6 saat açık kaldı.
          </Interactive.Div>
        </Interactive.Div>

        <Interactive.Div name="HizVerimi" style={{ ...yukselerek(frame, 90) }}>
          <Interactive.Div
            name="HizSayi"
            style={{
              fontFamily: F.data,
              fontWeight: 700,
              fontSize: 148,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              color: C.paper,
            }}
          >
            %{hiz}
          </Interactive.Div>
          <Interactive.Div
            name="HizEtiket"
            style={{
              fontFamily: F.plate,
              fontWeight: 700,
              fontSize: 32,
              letterSpacing: "0.16em",
              color: C.amber,
              marginTop: 16,
            }}
          >
            HIZ VERİMİ
          </Interactive.Div>
          <Interactive.Div
            name="HizAciklama"
            style={{
              fontFamily: F.data,
              fontWeight: 400,
              fontSize: 34,
              lineHeight: 1.42,
              color: C.onInk,
              marginTop: 16,
              maxWidth: 460,
            }}
          >
            Ama o 6 saatte hıza göre yalnızca 5 saatlik iş üretildi.
          </Interactive.Div>
        </Interactive.Div>

      </Interactive.Div>

      <Interactive.Div
        name="Sonuc"
        style={{
          fontFamily: F.data,
          fontWeight: 400,
          fontSize: 46,
          lineHeight: 1.42,
          color: C.onInk,
          marginTop: 70,
          maxWidth: 1450,
          ...yukselerek(frame, 250),
        }}
      >
        Aradaki fark{" "}
        <span style={{ color: C.paper, fontWeight: 600 }}>
          gözden kaçan küçük duruşlar ve fireye giden süre
        </span>
        . Bu ayrım olmadan “bugün az ürettik” cümlesinin arkasında ne
        olduğu anlaşılmaz.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
