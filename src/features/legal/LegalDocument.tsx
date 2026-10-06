import { router } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { Linking, Text, View } from "react-native";

import { splitEmails, type LegalDocumentData, type LegalRun } from "@/core/legal/legalContent";
import { toArabicDigits } from "@/core/text/arabic";
import { Screen, Section } from "@/components/ui/Screen";
import { useScaledText } from "@/theme/textScale";

import { BackHeader } from "./BackHeader";

/** A paragraph's runs: plain text, emails as mailto links, and links to the other legal page. */
function Runs({ runs }: { runs: LegalRun[] }) {
  return runs.map((run, index) => {
    if (typeof run !== "string") {
      return (
        <Text
          key={index}
          accessibilityRole="link"
          onPress={() => router.push(run.route)}
          className="font-sans-bold text-primary underline"
        >
          {run.text}
        </Text>
      );
    }
    return splitEmails(run).map((part, partIndex) =>
      part.kind === "email" ? (
        <Text
          key={`${index}-${partIndex}`}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`mailto:${part.text}`)}
          className="font-sans-bold text-primary underline"
        >
          {part.text}
        </Text>
      ) : (
        part.text
      ),
    );
  });
}

/** The website's LegalDocument: "آخر تحديث", then numbered sections of a paragraph or bullets. */
export function LegalDocument({ document, icon }: { document: LegalDocumentData; icon: LucideIcon }) {
  const body = useScaledText(16, 30);
  const heading = useScaledText(20, 34);

  return (
    <Screen bleed>
      <BackHeader kicker={document.kicker} icon={icon} title={document.title} description={document.description} />
      <Section className="mt-6 gap-4">
        <Text className="font-sans text-sm text-fg-muted">آخر تحديث: {toArabicDigits(document.updated)}</Text>
        {document.sections.map((section, index) => (
          <View key={section.title} className="gap-2 rounded-3xl border border-border bg-surface p-5">
            <Text accessibilityRole="header" className="font-display-bold text-primary-strong" style={heading}>
              {toArabicDigits(index + 1)}. {section.title}
            </Text>
            {section.body && (
              <Text className="font-sans text-fg" style={body}>
                <Runs runs={section.body} />
              </Text>
            )}
            {section.bullets && (
              <View className="gap-2">
                {section.bullets.map((bullet) => (
                  <View key={bullet} className="flex-row gap-3">
                    <View className="size-1.5 rounded-full bg-gold" style={{ marginTop: body.lineHeight / 2 - 3 }} />
                    <Text className="flex-1 font-sans text-fg" style={body}>
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </Section>
    </Screen>
  );
}
