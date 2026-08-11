import { Composition, Folder } from "remotion";
import "./index.css";
import "./fonts";
import { Video } from "./Video";
import { S1Acilis } from "./scenes/S1Acilis";
import { S2Kagit } from "./scenes/S2Kagit";
import { S3Zincir } from "./scenes/S3Zincir";
import { S4Operator } from "./scenes/S4Operator";
import { S5Mudur } from "./scenes/S5Mudur";
import { S6Oranlar } from "./scenes/S6Oranlar";
import { S7Izlenebilirlik } from "./scenes/S7Izlenebilirlik";
import { S8Hedef } from "./scenes/S8Hedef";
import { S9Kapanis } from "./scenes/S9Kapanis";

/*
 * Toplam: sahnelerin toplamı (5310) eksi 8 geçişin çakışması (8 × 20).
 * Sahne süresi değiştirilirse bu sayı da güncellenmeli.
 */
const TOPLAM = 5310 - 8 * 20;

const SAHNELER = [
  ["1-Acilis", S1Acilis, 330],
  ["2-Kagit", S2Kagit, 600],
  ["3-Zincir", S3Zincir, 510],
  ["4-Operator", S4Operator, 780],
  ["5-Mudur", S5Mudur, 720],
  ["6-Oranlar", S6Oranlar, 780],
  ["7-Izlenebilirlik", S7Izlenebilirlik, 600],
  ["8-Hedef", S8Hedef, 630],
  ["9-Kapanis", S9Kapanis, 360],
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GoldHarvestMES"
        component={Video}
        durationInFrames={TOPLAM}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Her sahne ayrı ayrı da kayıtlı — ana zaman çizelgesinde bir
          sahneye çift tıklayınca doğrudan buraya atlanır. */}
      <Folder name="Sahneler">
        {SAHNELER.map(([id, component, sure]) => (
          <Composition
            key={id}
            id={id}
            component={component}
            durationInFrames={sure}
            fps={30}
            width={1920}
            height={1080}
          />
        ))}
      </Folder>
    </>
  );
};
