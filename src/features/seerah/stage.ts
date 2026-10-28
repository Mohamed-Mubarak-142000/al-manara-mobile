import { WHOLE_MAP, routesAt, type PlaceId, type SeerahEvent } from "@/core/seerah/seerahContent";

import { stageFrame } from "./SeerahMap";

/**
 * What the corner map shows at a beat, as on the website: framed where the last map beat looked,
 * with every route drawn as far as the story has gone.
 */
export function mapAt(event: SeerahEvent, beat: number) {
  const lastMap = event.beats
    .slice(0, beat + 1)
    .map((entry) => entry.stage)
    .reverse()
    .find((stage) => stage.kind === "map");
  const current = event.beats[beat]!.stage;
  return {
    frame: lastMap?.kind === "map" ? stageFrame(lastMap) : WHOLE_MAP,
    named: lastMap?.kind === "map" ? [...new Set<PlaceId>([...lastMap.focus, ...(lastMap.glow ?? [])])] : [],
    glow: current.kind === "map" ? (current.glow ?? []) : [],
    routes: routesAt(event, beat),
  };
}
