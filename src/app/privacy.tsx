import { ShieldCheck } from "lucide-react-native";

import { PRIVACY } from "@/core/legal/legalContent";
import { LegalDocument } from "@/features/legal/LegalDocument";

/** سياسة الخصوصية, native and offline; the text is the website's (src/core/legal/legalContent.ts). */
export default function PrivacyScreen() {
  return <LegalDocument document={PRIVACY} icon={ShieldCheck} />;
}
