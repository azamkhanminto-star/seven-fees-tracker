import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./config";
import { RDTLaunch } from "./RDTLaunch";
import { SevenTeaser } from "./teaser/Teaser";
import { T_DURATION } from "./teaser/config";

export function Root() {
  return (
    <>
      <Composition id="RDTLaunch" component={RDTLaunch} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={VIDEO.seconds * VIDEO.fps} />
      <Composition id="SevenTeaser" component={SevenTeaser} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={T_DURATION * VIDEO.fps} />
    </>
  );
}
