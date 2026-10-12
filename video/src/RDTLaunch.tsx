import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { AUDIO, SCENES, VIDEO } from "./config";
import { useFonts } from "./lib";
import { Reveal } from "./Reveal";
import { Diagnosis, Hook, Report, RootCause, Twist, Upload } from "./scenes";

const f = (s: number) => Math.round(s * VIDEO.fps);

export function RDTLaunch() {
  useFonts();
  const scene = (key: keyof typeof SCENES, El: React.FC<{ duration: number }>) => {
    const { from, to } = SCENES[key];
    return <Sequence key={key} from={f(from)} durationInFrames={f(to - from)} name={key}><El duration={f(to - from)} /></Sequence>;
  };
  return (
    <AbsoluteFill style={{ backgroundColor: "#0E0F12" }}>
      {scene("hook", Hook)}
      {scene("twist", Twist)}
      {scene("upload", Upload)}
      {scene("diagnosis", Diagnosis)}
      {scene("rootCause", RootCause)}
      {scene("report", Report)}
      <Sequence from={f(SCENES.reveal.from)} durationInFrames={f(SCENES.reveal.to - SCENES.reveal.from)} name="reveal"><Reveal /></Sequence>

      {AUDIO.music ? <Audio src={staticFile(AUDIO.music)} volume={AUDIO.musicVolume} /> : null}
      {AUDIO.cues.map(([sec, file], i) => (
        <Sequence key={i} from={f(sec)} durationInFrames={f(3)} name={`sfx ${file}`}>
          <Audio src={staticFile(`sfx/${file}`)} volume={AUDIO.effectsVolume} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
