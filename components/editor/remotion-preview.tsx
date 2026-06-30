"use client";

import { useMemo } from "react";
import { Player } from "@remotion/player";
import { useTranslations } from "next-intl";
import { GlideVideo } from "@/remotion/GlideVideo";
import { FPS, HEIGHT, WIDTH, totalDurationInFrames } from "@/remotion/types";
import {
  clipsToGlideProps,
  type TransitionSettings,
} from "@/lib/remotion/to-props";
import type { Clip } from "@/lib/firebase/clips";
import type { Caption } from "@/lib/firebase/captions";

/** 에디터 미리보기 — 최종 렌더와 동일한 Remotion 컴포지션을 Player로 재생. */
export function RemotionPreview({
  clips,
  captions,
  transition,
}: {
  clips: Clip[];
  captions: Caption[];
  transition: TransitionSettings;
}) {
  const t = useTranslations("editor.preview");
  const props = useMemo(
    () => clipsToGlideProps(clips, captions, transition),
    [clips, captions, transition],
  );
  const duration = useMemo(
    () =>
      totalDurationInFrames(
        props.clips,
        props.transitionType === "none" ? 0 : props.transitionDurationInFrames,
      ),
    [props.clips, props.transitionType, props.transitionDurationInFrames],
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
