import { joinSegments } from "@/core/quran/joinSegments";

const ZWJ = String.fromCodePoint(0x200d);
const seg = (text: string, ruleClass: string | null = null) => ({ text, ruleClass });

describe("joinSegments", () => {
  it("joins a cut after a letter that connects forward", () => {
    // "ٱلرَّحۡمَ" + madd "ـٰ"-less dagger alif + "نِ": the dagger alif goes back onto the mim.
    const out = joinSegments([seg("ٱلرَّحۡمَ"), seg("ٰ", "madda_normal"), seg("نِ")]);
    expect(out.map((s) => s.text)).toEqual([`ٱلرَّحۡمَٰ${ZWJ}`, `${ZWJ}نِ`]);
  });

  it("leaves cuts after non-joining letters and at spaces alone", () => {
    const out = joinSegments([seg("ٱل"), seg("رَّ", "ham_wasl"), seg("حِيمِ "), seg("مَٰلِكِ")]);
    expect(out[0]!.text).toBe(`ٱل${ZWJ}`);
    expect(out[1]!.text).toBe(`${ZWJ}رَّ`);
    expect(out[2]!.text).toBe("حِيمِ ");
    expect(out[3]!.text).toBe("مَٰلِكِ");
  });

  it("keeps the colours of each segment", () => {
    const out = joinSegments([seg("بِسۡ"), seg("مِ", "ghunnah")]);
    expect(out.map((s) => s.ruleClass)).toEqual([null, "ghunnah"]);
  });
});
