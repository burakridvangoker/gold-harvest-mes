import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
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
 * Anlatı sırası, sunumun 11 sayfalık onaylı içeriğinin video karşılığı:
 * kimlik → sorun → dürüst kapsam → ne yaptık (operatör + müdür) →
 * iki fayda → hedefler → öneri.
 *
 * Sahne süreleri bilerek satır içinde yazıldı; Studio'da doğrudan
 * sürüklenerek kısaltılıp uzatılabilsinler.
 */
export const Video: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={330} name="1 Açılış">
        <S1Acilis />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={600} name="2 Kağıt düzeni">
        <S2Kagit />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={510} name="3 Zincirdeki yerimiz">
        <S3Zincir />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={780} name="4 Operatör ekranı">
        <S4Operator />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={720} name="5 Müdür panosu">
        <S5Mudur />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={780} name="6 İki oran">
        <S6Oranlar />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={600} name="7 İzlenebilirlik">
        <S7Izlenebilirlik />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={630} name="8 Hedefliyoruz">
        <S8Hedef />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 20 })}
      />

      <TransitionSeries.Sequence durationInFrames={360} name="9 Kapanış">
        <S9Kapanis />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
