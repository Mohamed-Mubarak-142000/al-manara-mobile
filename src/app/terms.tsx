import { TERMS } from "@/core/legal/legalContent";
import { SECTION_ART } from "@/features/home/sectionArt";
import { LegalDocument } from "@/features/legal/LegalDocument";

/** شروط الاستخدام, native and offline; the text is the website's (src/core/legal/legalContent.ts). */
export default function TermsScreen() {
  return <LegalDocument document={TERMS} art={SECTION_ART.terms} />;
}
