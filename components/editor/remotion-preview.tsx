"use client";

import { useEffect, useMemo, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { useTranslations } from "next-intl";
import { GlideVideo } from "@/remotion/GlideVideo";
import {
  DIMENSIONS,
  FPS,
  totalDurationInFrames,
  type AspectRatio,
} from "@/remotion/types";
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
  aspectRatio,
  endFadeOut,
  seekClipId,
}: {
  clips: Clip[];
  captions: Caption[];
  transition: TransitionSettings;
  aspectRatio: AspectRatio;
  endFadeOut: boolean;
  seekClipId?: string | null;
}) {
  const t = useTranslations("editor.preview");
  const dims = DIMENSIONS[aspectRatio];
  const playerRef = useRef<PlayerRef>(null);
  const props = useMemo(
    () => clipsToGlideProps(clips, captions, transition, aspectRatio, endFadeOut),
    [clips, captions, transition, aspectRatio, endFadeOut],
  );
  const duration = useMemo(
    () =>
      totalDurationInFrames(
        props.clips,
        props.transitionType === "none" ? 0 : props.transitionDurationInFrames,
      ),
    [props.clips, props.transitionType, props.transitionDurationInFrames],
  );

  // 클립을 선택하면 플레이어를 그 클립 시작 지점으로 이동.
  const visualClips = useMemo(
    () => clips.filter((c) => c.type === "image" || c.type === "video"),
    [clips],
  );
  useEffect(() => {
    if (!seekClipId || !playerRef.current) return;
    const index = visualClips.findIndex((c) => c.id === seekClipId);
    if (index < 0) return;
    const transFrames =
      props.transitionType === "none" ? 0 : props.transitionDurationInFrames;
    let start = 0;
    for (let j = 0; j < index; j++) start += props.clips[j].durationInFrames;
    start = Math.max(0, start - index * transFrames);
    playerRef.current.seekTo(start);
  }, [
    seekClipId,
    visualClips,
    props.clips,
    props.transitionType,
    props.transitionDurationInFrames,
  ]);

  // 세로(9:16)는 너무 길지 않게 높이를 제한.
  const isPortrait = aspectRatio === "9:16";

  if (props.clips.length === 0) {
    return (
      <div
        className="mx-auto flex items-center justify-center rounded-2xl border border-line bg-surface text-sm text-muted"
        style={{
          aspectRatio: aspectRatio.replace(":", " / "),
          maxHeight: isPortrait ? "70vh" : undefined,
          width: isPortrait ? "auto" : "100%",
          height: isPortrait ? "70vh" : undefined,
        }}
      >
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="flex justify-center overflow-hidden rounded-2xl border border-line bg-black">
      <Player
        ref={playerRef}
        component={GlideVideo}
        inputProps={props}
        durationInFrames={duration}
        fps={FPS}
        compositionWidth={dims.width}
        compositionHeight={dims.height}
        controls
        loop
        acknowledgeRemotionLicense
        style={
          isPortrait
            ? { height: "70vh", aspectRatio: "9 / 16" }
            : { width: "100%", aspectRatio: "16 / 9" }
        }
      />
    </div>
  );
}
