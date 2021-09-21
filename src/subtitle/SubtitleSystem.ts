import type { NodeCue } from "subtitle/parser/index";
import { parseSync } from "subtitle/parser/index";
export type { NodeCue } from "subtitle/parser/index";

export interface IndexedNodeCue extends NodeCue {
  index: number;
}

export class SubtitleSystem implements ISystem {
  static readonly INVALID_OFFSET: number = -1;

  offsetMs: number = 0;
  paused: boolean = false;
  maxEndOffsetMs: number = 0;

  cueList: IndexedNodeCue[] = [];
  firedCues: number[] = [];

  constructor() {}

  /**
   * Parse a string in SRT or VVT format,
   * @param subtitleStr
   * @param autoMaxOffset
   * @returns boolean success
   */
  setSubtitlesString(subtitleStr: string, autoMaxOffset: boolean = true) {
    try {
      const ordededCue = (
        parseSync(subtitleStr).filter(
          (value) => value.type == "cue"
        ) as IndexedNodeCue[]
      ).sort((a, b) => a.data.start - b.data.start);

      this.cueList = ordededCue.map((value, index) => ({ ...value, index }));
      if (autoMaxOffset) {
        this.maxEndOffsetMs = Math.max(...this.cueList.map(($) => $.data.end));
      }

      this.offsetMs = 0;
      this.firedCues = [];
      this.paused = false;
      return true;
    } catch {
      this.cueList = [];
      this.offsetMs = SubtitleSystem.INVALID_OFFSET;
      this.maxEndOffsetMs = SubtitleSystem.INVALID_OFFSET;
      this.paused = false;
      log(`Couldn't load the subtitles. Please verify the subtitle format.`);
      return false;
    }
  }

  /**
   * Update the new
   * @param newOffset
   * @returns
   */
  setOffset(newOffset: number) {
    const previousOffset = this.offsetMs;
    if (
      previousOffset == newOffset ||
      newOffset == SubtitleSystem.INVALID_OFFSET
    ) {
      return;
    }

    this.offsetMs = newOffset;

    // Filter by cues with time window in 'newOffset'
    const currentCues = this.cueList.filter(
      ($) => newOffset >= $.data.start && newOffset < $.data.end
    );

    // Filter currentCues by cues hasn't fired yet
    const firableCues = currentCues.filter(($) =>
      this.firedCues.indexOf($.index) == -1
    );

    // Filter firedCues by cues there aren't anymore in currentCues
    const endedCues = this.firedCues
      .filter((i) => currentCues.filter(($) => $.index == i).length == 0)
      .map((index) => this.cueList[index]);

    // log(newOffset,this.firedCues, currentCues, firableCues, endedCues)

    // Fire old cues end
    endedCues.forEach((cue) => {
      this.onCueEnd(cue);
    });

    // Fire new cues start
    firableCues.forEach((cue) => {
      this.onCueBegin(cue);
    });

    // Update the firedEvents
    if (endedCues.length > 0 || firableCues.length > 0) {
      this.firedCues = currentCues.map(($) => $.index);
    }
  }

  /**
   * Event fired when the offset enters in a cue windows
   * @param cue NodeCue from subtitle, the times are in milliseconds
   */
  protected onCueBegin(cue: NodeCue) {}

  /**
   * Event fired when the offset exits in a cue windows
   * @param cue NodeCue from subtitle, the times are in milliseconds
   */
  protected onCueEnd(cue: NodeCue) {}

  clearFiredEvents() {
    this.firedCues = [];
  }

  /**
   * The new value indicates the last offset
   * @param value new max length value
   */
  setMaxLength(value: number) {
    this.maxEndOffsetMs = value;
  }

  /**
   * Stop offset proccesing every frame, to restore call resume()
   */
  pause() {
    this.paused = true;
  }

  /**
   * Resume pause loop
   */
  resume() {
    this.paused = false;
  }

  /**
   *
   * @returns
   */
  getOffsetMs() {
    return this.offsetMs;
  }

  update(dt: number) {
    if (this.offsetMs != SubtitleSystem.INVALID_OFFSET && !this.paused) {
      let newOffset = (this.offsetMs + (dt * 1000.0));
      while (newOffset > this.maxEndOffsetMs) {
        newOffset -= this.maxEndOffsetMs;
      }
      this.setOffset(newOffset);
    }
  }
}
