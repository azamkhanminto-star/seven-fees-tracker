import React from "react";
import { Composition } from "remotion";
import { VIDEO } from "./config";
import { RDTLaunch } from "./RDTLaunch";

export function Root() {
  return (
    <Composition id="RDTLaunch" component={RDTLaunch} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps}
      durationInFrames={VIDEO.seconds * VIDEO.fps} />
  );
}
