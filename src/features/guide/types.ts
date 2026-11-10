import type { Href } from "expo-router";

import type { SectionArt } from "@/features/home/sectionArt";
import type { SectionTone } from "@/features/home/sections";

/** What a feature needs (or offers), shown as small badges at the top of its guide page. */
export type GuideBadge = "offline" | "internet" | "login" | "location" | "notifications" | "microphone" | "background";

export interface GuideStep {
  title: string;
  body: string;
  /**
   * The screenshot for this step: a file in assets/images/guide named `<shot>.png` (or .jpg/.webp).
   * `npm run build:guide-shots` wires the files that exist into shots.ts; a step whose file is missing
   * shows its text only (and, in development, a placeholder naming the file to capture).
   */
  shot?: string;
}

export interface GuideEntry {
  /** URL-safe, stable: /guide/<id>. */
  id: string;
  title: string;
  art: SectionArt;
  tone: SectionTone;
  /** One of GUIDE_GROUPS' titles. */
  group: string;
  /** What it is, in one or two sentences. */
  summary: string;
  /** How to get there, one hop per item: ["الرئيسية", "المصحف"]. */
  path: readonly string[];
  /** The screen it opens with "افتح القسم"; left out for guides that are not one screen. */
  href?: Href;
  steps: readonly GuideStep[];
  /** What it can do, one short line each. */
  features: readonly string[];
  /** Things people miss: gestures, long-presses, hidden settings. */
  tips?: readonly string[];
  badges?: readonly GuideBadge[];
}
