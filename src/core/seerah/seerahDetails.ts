import { DETAILS_PART1 } from "./details/part1";
import { DETAILS_PART2 } from "./details/part2";
import { DETAILS_PART3 } from "./details/part3";
import type { SeerahDetails } from "./seerahDetails.types";

export type { SeerahDetails } from "./seerahDetails.types";

/**
 * Each chapter's written "تفاصيل الحدث", by chapter id (see seerahDetails.types.ts and CONTENT.md). Split in
 * three files only to keep each one readable; copied unchanged into the app with seerahContent.ts.
 */
export const SEERAH_DETAILS: Record<string, SeerahDetails> = { ...DETAILS_PART1, ...DETAILS_PART2, ...DETAILS_PART3 };
