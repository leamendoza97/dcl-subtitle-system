import { subtitleString } from "./mockSubtitle";
import { SubtitleSystem, NodeCue } from "./subtitle/SubtitleSystem";

class CustomSubtitleSystem extends SubtitleSystem {
  constructor(text: string) {
    super();
    this.setSubtitlesString(text);
  }

  onCueBegin(cue: NodeCue) {
    log(`Show subtitle '${cue.data.text}`);
  }

  onCueEnd(cue: NodeCue) {
    log(`Hide subtitle '${cue.data.text}`);
  }
}

const mySubtitleSystem = new CustomSubtitleSystem(subtitleString)
engine.addSystem(mySubtitleSystem);

// We recommend call mySubtitleSystem.setOffset(offsetInMilliseconds)
// To sync video and animations or whatevers