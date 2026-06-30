"use client";

import { useMemo } from "react";
import { Player } from "@remotion/player";
import { useTranslations } from "next-intl";
import { GlideVideo } from "@/remotion/GlideVideo";
import { FPS, HEIGHT, WIDTH, totalDurationInFrames } from "@/remotion/types";
import { clipsToGlideProps } from "@/lib/remotion/to-props";
import type { Clip } from "@/lib/firebase/clips";

/** 에디터 미리보기 — 최종 렌더와 동일한 Remotion 컴포지션을 Player로 재생. */
export function RemotionPreview({ clips }: { clips: Clip[] }) {
  const t = useTranslations("editor.preview");
  const props = useMemo(() => clipsToGlideProps(clips), [clips]);
  const duration = useMemo(
    () => totalDurationInFrames(props.clips),
    [props.clips],
  );

  if (props.clips.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-line bg-surface text-sm text-muted">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-black">
      <Player
        component={GlideVideo}
        inputProps={props}
        durationInFrames={duration}
        fps={FPS}
        compositionWidth={WIDTH}
        compositionHeight={HEIGHT}
        controls
        loop
        acknowledgeRemotionLicense
        style={{ width: "100%", aspectRatio: "16 / 9" }}
      />
    </div>
  );
}
