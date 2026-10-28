/// <reference types="jest" />
import {
  AT_SEA,
  CHAPTERS,
  ERAS,
  HADITHS,
  MAP,
  PLACES,
  ROUTES,
  SEERAH_EVENTS,
  VERSES,
  frameAround,
  pointAlong,
  project,
  routeLength,
  routesAt,
  type PlaceId,
  type RouteId,
} from "@/core/seerah/seerahContent";

/** The land path's rings as point lists (it is only M, L and Z). */
const rings = MAP.land
  .split("Z")
  .filter(Boolean)
  .map((ring) =>
    ring
      .replace("M", "")
      .split("L")
      .map((pair) => pair.split(" ").map(Number) as [number, number]),
  );

/** Even–odd ray casting over every ring: on land when inside an odd number of them. */
function onLand(x: number, y: number): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

describe("seerah content", () => {
  it("keeps the timeline in order, every event in a known era", () => {
    const eras = new Set(ERAS.map((era) => era.id));
    SEERAH_EVENTS.forEach((event, index) => {
      expect(eras.has(event.era)).toBe(true);
      if (index > 0) expect(event.year).toBeGreaterThanOrEqual(SEERAH_EVENTS[index - 1]!.year);
    });
    expect(new Set(SEERAH_EVENTS.map((event) => event.id)).size).toBe(SEERAH_EVENTS.length);
  });

  it("cites only evidence the build fetched, and names every surah it quotes", () => {
    for (const event of SEERAH_EVENTS) {
      for (const beat of event.beats) {
        expect(beat.text.trim().length).toBeGreaterThan(0);
        if (beat.hadith) expect(HADITHS[beat.hadith]?.grade).toBeTruthy();
        if (beat.verse) expect(VERSES[beat.verse].surahName).toBeTruthy();
      }
    }
  });

  it("frames only known places and draws only known routes", () => {
    for (const event of CHAPTERS) {
      for (const { stage } of event.beats) {
        if (stage.kind !== "map") continue;
        stage.focus.forEach((id) => expect(PLACES[id]).toBeDefined());
        (stage.glow ?? []).forEach((id) => expect(PLACES[id]).toBeDefined());
        if (stage.route) expect(ROUTES[stage.route]).toBeDefined();
        if (stage.upTo !== undefined) expect(stage.upTo).toBeGreaterThan(0);
      }
    }
  });

  it("puts every place and every waypoint on land", () => {
    // The check itself tells sea from land: the middle of the Red Sea off Jeddah.
    const redSea = project(21.4, 38.6);
    expect(onLand(redSea.x, redSea.y)).toBe(false);
    for (const id of Object.keys(PLACES) as PlaceId[]) {
      const point = project(PLACES[id].lat, PLACES[id].lon);
      expect([id, onLand(point.x, point.y)]).toEqual([id, true]);
    }
    for (const route of Object.keys(ROUTES) as RouteId[]) {
      if (AT_SEA.includes(route)) continue;
      for (let share = 0; share <= 1; share += 0.02) {
        const point = pointAlong(route, share);
        expect([route, share, onLand(point.x, point.y)]).toEqual([route, share, true]);
      }
    }
  });

  it("draws a route as far as the furthest beat so far, and undraws it going back", () => {
    const hijrah = CHAPTERS.find((event) => event.id === "hijrah")!;
    const firstDrawn = hijrah.beats.findIndex(({ stage }) => stage.kind === "map" && stage.route === "hijrah");
    expect(routesAt(hijrah, firstDrawn - 1).hijrah).toBeUndefined();
    expect(routesAt(hijrah, firstDrawn).hijrah).toBe(0.35);
    expect(routesAt(hijrah, hijrah.beats.length - 1).hijrah).toBe(1);
  });

  it("walks a route from its first waypoint to its last", () => {
    const [start, end] = [pointAlong("hijrah", 0), pointAlong("hijrah", 1)];
    const quba = project(PLACES.quba.lat, PLACES.quba.lon);
    const thawr = project(PLACES.thawr.lat, PLACES.thawr.lon);
    expect(start.x).toBeCloseTo(thawr.x);
    expect(end.y).toBeCloseTo(quba.y);
    expect(routeLength("hijrah")).toBeGreaterThan(routeLength("to-thawr"));
  });

  it("never frames closer than asked", () => {
    expect(frameAround(["makkah", "thawr"], 24).width).toBeGreaterThanOrEqual(24);
    expect(frameAround(["makkah", "madinah"]).height).toBeGreaterThan(Math.abs(project(21.4, 39.8).y - project(24.5, 39.6).y));
  });

  it("tells every chapter across a panorama the camera and travellers stay within", () => {
    for (const event of CHAPTERS) {
      const panorama = event.panorama!;
      expect([event.id, panorama.width > 0]).toEqual([event.id, true]);
      for (const beat of event.beats) {
        expect([event.id, beat.pan! >= 0 && beat.pan! <= panorama.width]).toEqual([event.id, true]);
        if (beat.party !== undefined) expect([event.id, beat.party >= 0 && beat.party <= panorama.width]).toEqual([event.id, true]);
      }
      for (const mood of panorama.moods ?? []) expect(mood.from).toBeLessThan(mood.to);
    }
  });

  it("asks questions whose answers are among their options, and offers choices with one right answer", () => {
    for (const event of CHAPTERS) {
      expect([event.id, event.quiz!.length]).toEqual([event.id, 3]);
      for (const question of event.quiz!) {
        expect(question.options[question.answer]).toBeTruthy();
        expect(new Set(question.options).size).toBe(question.options.length);
      }
      for (const beat of event.beats) {
        const interaction = beat.interaction;
        if (interaction && interaction.kind !== "erase-tracks")
          expect(interaction.options.filter((option) => option.right)).toHaveLength(1);
      }
    }
  });
});
