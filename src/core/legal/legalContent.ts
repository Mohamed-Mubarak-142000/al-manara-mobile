// Ported from eslam-platform/src/app/(site)/privacy/page.tsx and eslam-platform/src/app/(site)/terms/page.tsx — keep in sync by hand.

/**
 * The website's privacy policy and terms as plain data, so the app shows them natively (and offline).
 * A paragraph is a list of runs: plain text, or a link to another legal page. Email addresses inside
 * plain text become mailto links when rendered.
 */

export const CONTACT_EMAIL = "mohamedmubarak142000m@gmail.com";

export type LegalRoute = "/privacy" | "/terms";

export type LegalRun = string | { text: string; route: LegalRoute };

export interface LegalSection {
  title: string;
  /** One paragraph. */
  body?: LegalRun[];
  bullets?: string[];
}

export interface LegalDocumentData {
  kicker: string;
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}

export const PRIVACY: LegalDocumentData = {
  kicker: "الخصوصية",
  title: "سياسة الخصوصية",
  description: "ما البيانات التي نحتفظ بها، ولماذا، وكيف تتحكّم فيها.",
  updated: "28 سبتمبر 2026",
  sections: [
    {
      title: "من نحن",
      body: [
        "المنارة منصة عربية مجانية لقراءة القرآن الكريم والاستماع إليه وحفظه، مع مساحة تعليمية للأطفال. توضّح هذه الصفحة البيانات التي نحتفظ بها وسبب ذلك.",
      ],
    },
    {
      title: "الاستخدام بدون حساب",
      body: [
        "يمكنك استخدام معظم أقسام المنصة دون تسجيل. في هذه الحالة يُحفظ تقدّمك (مثل آخر صفحة قرأتها ونتائج ألعاب الأطفال) على جهازك فقط في ذاكرة المتصفح، ولا يصل إلينا.",
      ],
    },
    {
      title: "البيانات التي نجمعها عند إنشاء حساب",
      bullets: [
        "البريد الإلكتروني والاسم، والاسم الذي يُكتب على الشهادات.",
        "عند الدخول بحساب Google: الاسم والبريد الإلكتروني فقط كما يرسلهما Google، ولا نصل إلى أي بيانات أخرى في حسابك.",
        "أسماء الأطفال الذين تضيفهم وسنة ميلادهم اختياريًا.",
        "بيانات التقدّم: الآيات المحفوظة، ومواعيد المراجعة، وآخر موضع قراءة، وأيام النشاط، ونتائج الألعاب والتسميع.",
        "محاولات الامتحانات ونتائجها، والشهادات الصادرة.",
      ],
    },
    {
      title: "كيف نستخدم البيانات",
      bullets: [
        "لتسجيل دخولك ومزامنة تقدّمك بين أجهزتك.",
        "لتصحيح الامتحانات وإصدار الشهادات، وللتحقق من صحة الشهادة عبر رمزها.",
        "لإرسال رسائل ضرورية فقط، مثل رموز التأكيد واستعادة كلمة المرور.",
      ],
    },
    {
      title: "ما لا نفعله",
      bullets: [
        "لا نبيع بياناتك ولا نشاركها مع معلنين، ولا نعرض إعلانات.",
        "تسجيلات الصوت في قسم الأطفال تبقى على جهازك أثناء الجلسة فقط، ولا تُرفع ولا تُحفظ.",
      ],
    },
    {
      title: "الشهادات",
      body: [
        "صفحة التحقق من الشهادة متاحة لكل من يملك رمزها، وتعرض فقط ما هو مطبوع على الشهادة: اسم الحامل، ورقم الجزء، والدرجة، وتاريخ الإصدار.",
      ],
    },
    {
      title: "أين تُخزَّن البيانات",
      body: [
        "تُخزَّن بيانات الحسابات لدى Supabase مع تفعيل صلاحيات تمنع أي مستخدم من رؤية بيانات غيره، ويُستضاف الموقع على Vercel. تُستخدم ملفات تعريف الارتباط (Cookies) فقط لإبقائك مسجّل الدخول وتذكّر المتعلّم النشط.",
      ],
    },
    {
      title: "حقوقك وحذف الحساب",
      body: [
        "يمكنك تعديل اسمك وأسماء أطفالك أو حذفهم في أي وقت من صفحة الحساب. ويمكنك حذف حسابك نهائيًا من صفحة الحساب أيضًا، فتُحذف معه كل بياناتك وبيانات أطفالك وتقدّمهم وشهاداتهم.",
      ],
    },
    {
      title: "الأطفال",
      body: ["حسابات الأطفال يديرها وليّ الأمر من حسابه، ولا يُطلب من الطفل بريد إلكتروني أو أي بيانات تواصل."],
    },
    {
      title: "التعديلات والتواصل",
      body: [`قد نحدّث هذه السياسة، وسيظهر تاريخ آخر تحديث أعلى الصفحة. لأي استفسار عن الخصوصية راسلنا على ${CONTACT_EMAIL}.`],
    },
  ],
};

export const TERMS: LegalDocumentData = {
  kicker: "الشروط",
  title: "شروط الاستخدام",
  description: "القواعد التي تحكم استخدام المنارة وحساباتها وامتحاناتها وشهاداتها.",
  updated: "28 سبتمبر 2026",
  sections: [
    {
      title: "قبول الشروط",
      body: ["باستخدامك منصة المنارة فأنت توافق على هذه الشروط. إن لم توافق عليها فيُرجى عدم استخدام المنصة."],
    },
    {
      title: "الخدمة",
      body: [
        "المنارة منصة مجانية لقراءة القرآن الكريم والاستماع إليه وحفظه ومراجعته، مع ألعاب تعليمية للأطفال وامتحانات وشهادات لأجزاء القرآن. قد نضيف مزايا أو نعدّلها أو نوقفها في أي وقت.",
      ],
    },
    {
      title: "الحساب",
      bullets: [
        "أنت مسؤول عن صحة بياناتك وعن الحفاظ على سرية كلمة المرور.",
        "وليّ الأمر مسؤول عن حسابات الأطفال التي يضيفها ويديرها.",
        "يحق لنا إيقاف أي حساب يُساء استخدامه أو يخالف هذه الشروط.",
      ],
    },
    {
      title: "الامتحانات والشهادات",
      bullets: [
        "يجب أن تؤدي الامتحان بنفسك دون مساعدة من غيرك أو من المصحف.",
        "الشهادة تشجيعية وتثبت اجتياز امتحان المنصة، وليست إجازة أو شهادة رسمية معتمدة.",
        "يحق للإدارة إلغاء أي شهادة يثبت أنها صدرت بطريقة غير سليمة، وتظهر حينها ملغاة في صفحة التحقق.",
      ],
    },
    {
      title: "المحتوى ومصادره",
      body: [
        "نص المصحف والتفسير والتلاوات ومواقيت الصلاة مصدرها خدمات موثوقة مذكورة في أسفل الموقع. نحرص على دقة المحتوى، ونرحّب بأي ملاحظة على خطأ لتصحيحه.",
      ],
    },
    {
      title: "الاستخدام المقبول",
      bullets: [
        "لا تحاول الوصول إلى بيانات غيرك أو تعطيل المنصة أو التحايل على الامتحانات.",
        "لا تستخدم المنصة في أي غرض يخالف القانون أو يسيء إلى القرآن الكريم.",
      ],
    },
    {
      title: "حدود المسؤولية",
      body: ["تُقدَّم المنصة كما هي، ولا نضمن أن تعمل دون انقطاع. ويُنصح دائمًا بمراجعة الحفظ والتلاوة على معلّم متقن."],
    },
    {
      title: "الخصوصية",
      body: ["تعامُلنا مع بياناتك موضّح في ", { text: "سياسة الخصوصية", route: "/privacy" }, "."],
    },
    {
      title: "التعديلات والتواصل",
      body: [`قد نحدّث هذه الشروط، وسيظهر تاريخ آخر تحديث أعلى الصفحة. لأي استفسار راسلنا على ${CONTACT_EMAIL}.`],
    },
  ],
};

/** The privacy policy's "من نحن" paragraph, for the about screen. */
export function missionText(): string {
  const about = PRIVACY.sections[0]?.body ?? [];
  const text = about.map((run) => (typeof run === "string" ? run : run.text)).join("");
  // Keep the first sentence: the rest talks about "this page".
  const end = text.indexOf(".");
  return end === -1 ? text : text.slice(0, end + 1);
}

export type TextPart = { kind: "text"; text: string } | { kind: "email"; text: string };

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/** Splits plain text around email addresses, so they can be rendered as mailto links. */
export function splitEmails(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(EMAIL)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: text.slice(last, index) });
    parts.push({ kind: "email", text: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}
