import { normalizeOtp } from "@/features/account/OtpInput";
import { scorePassword } from "@/features/account/PasswordStrength";

describe("scorePassword", () => {
  it("shows nothing before typing", () => {
    expect(scorePassword("")).toBeNull();
  });

  it("is weak under the 8-character minimum or for one repeated character", () => {
    expect(scorePassword("Ab1!")).toBe("weak");
    expect(scorePassword("aaaaaaaaaaaa")).toBe("weak");
  });

  it("is weak for a single kind of character", () => {
    expect(scorePassword("abcdefgh")).toBe("weak");
    expect(scorePassword("12345678")).toBe("weak");
  });

  it("is ok when letters and digits are mixed", () => {
    expect(scorePassword("abcd1234")).toBe("ok");
    expect(scorePassword("كلمةسر١٢٣٤")).toBe("ok");
  });

  it("is strong with varied kinds and length", () => {
    expect(scorePassword("Abcd1234!")).toBe("strong");
    expect(scorePassword("abcd1234efgh5678")).toBe("strong");
  });
});

describe("normalizeOtp", () => {
  it("turns Arabic-Indic and Persian digits into Latin", () => {
    expect(normalizeOtp("١٢٣٤٥٦")).toBe("123456");
    expect(normalizeOtp("۱۲۳۴۵۶")).toBe("123456");
    expect(normalizeOtp("12٣4۵6")).toBe("123456");
  });

  it("drops spaces and labels from pasted text and trims to the length", () => {
    expect(normalizeOtp("Code: 123 456")).toBe("123456");
    expect(normalizeOtp("123-456-789")).toBe("123456");
    expect(normalizeOtp(" 12 34 ", 4)).toBe("1234");
  });

  it("keeps partial input", () => {
    expect(normalizeOtp("12")).toBe("12");
    expect(normalizeOtp("abc")).toBe("");
  });
});
