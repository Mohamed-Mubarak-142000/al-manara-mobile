import { PRIVACY } from "@/core/legal/legalContent";
import { SECTION_ART } from "@/features/home/sectionArt";
import { LegalDocument } from "@/features/legal/LegalDocument";

/** سياسة الخصوصية, native and offline; the text is the website's (src/core/legal/legalContent.ts). */
export default function PrivacyScreen() {
  return <LegalDocument document={PRIVACY} art={SECTION_ART.privacy} />;
}
