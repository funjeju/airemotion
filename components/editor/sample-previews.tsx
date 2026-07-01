"use client";

import { useMemo } from "react";
import { Player } from "@remotion/player";
import { GlideVideo } from "@/remotion/GlideVideo";
import { SAMPLE_A, SAMPLE_B } from "@/remotion/sample";
import {
  FPS,
  totalDurationInFrames,
  type AnimationKind,
  type GlideVideoProps,
  type RClip,
  type RTransitionDirection,
  type RTransitionType,
} from "@/remotion/types";

const PREVIEW_W = 1280;
const PREVIEW_H = 720;

function MiniPlayer({
  props,
  duration,
}: {
  props: GlideVideoProps;
  duration: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-black">
      <Player
        component={GlideVideo}
        inputProps={props}
        durationInFrames={duration}
        fps={FPS}
        compositionWidth={PREVIEW_W}
        compositionHeight={PREVIEW_H}
        autoPlay
        loop
        acknowledgeRemotionLicense
        style={{ width: "100%", aspectRatio: "16 / 9" }}
        // 미리보기는 조작 불가(클릭 통과 방지).
        clickToPlay={false}
        doubleClickToFullscreen={false}
      />
    </div>
  );
}

/** 선택한 켄 번스 효과를 샘플 이미지로 미리보기. */
export function EffectPreview({ animation }: { animation: AnimationKind }) {
  const { props, duration } = useMemo(() => {
    const clip: RClip = {
      type: "image",
      src: SAMPLE_A,
      durationInFrames: 2 * FPS,
      animation,
      caption: { text: "" },
    };
    const p: GlideVideoProps = {
      clips: [clip],
      audioTracks: [],
      subtitles: [],
      transitionType: "none",
      transitionDirection: "from-left",
      transitionDurationInFrames: 0,
      aspectRatio: "16:9",
    };
    return { props: p, duration: totalDurationInFrames(p.clips, 0) };
  }, [animation]);

  return <MiniPlayer props={props} duration={duration} />;
}

/** 선택한 화면 전환을 두 샘플 이미지 사이에서 미리보기. */
export function TransitionPreview({
  type,
  direction,
}: {
  type: RTransitionType;
  direction: RTransitionDirection;
}) {
  const { props, duration } = useMemo(() => {
    const mk = (src: string): RClip => ({
      type: "image",
      src,
      durationInFrames: Math.round(1.2 * FPS),
      animation: "static",
      caption: { text: "" },
    });
    const transFrames = type === "none" ? 0 : 15;
    const p: GlideVideoProps = {
      clips: [mk(SAMPLE_A), mk(SAMPLE_B)],
      audioTracks: [],
      subtitles: [],
      transitionType: type,
      transitionDirection: direction,
      transitionDurationInFrames: transFrames,
      aspectRatio: "16:9",
    };
    return { props: p, duration: totalDurationInFrames(p.clips, transFrames) };
  }, [type, direction]);

  return <MiniPlayer props={props} duration={duration} />;
}
