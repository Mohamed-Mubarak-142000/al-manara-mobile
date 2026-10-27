// Ported from eslam-platform/src/features/umrah/umrahGuide.ts (and its generated umrahEvidence.json:
// see CONTENT.md). Keep both in sync by hand.
import evidence from "./umrahEvidence.json";

/*
 * The umrah, step by step. The duas are Hisn al-Muslim entries (core/adhkar, with their recordings)
 * and the evidence is built by the website's scripts/build-umrah.mjs; only the instructions are
 * written here, kept to what the scholars agree on — see CONTENT.md.
 */

/** The website stores the lucide icon itself; core stays free of UI imports, so the app maps this name to an icon. */
export type StepIcon = "luggage" | "map-pin" | "megaphone" | "door-open" | "refresh" | "footprints" | "route" | "scissors" | "badge-check";

export type HadithKey = keyof typeof evidence.hadiths;
export type VerseKey = keyof typeof evidence.verses;

export const HADITHS = evidence.hadiths as Record<HadithKey, { text: string; grade: string; attribution: string; url: string }>;
export const VERSES = evidence.verses as Record<VerseKey, { text: string; surah: number; ayah: number; partial: boolean; audio: number }>;

export type Block =
  | { kind: "text"; text: string }
  | { kind: "steps"; items: string[] }
  /** A Hisn al-Muslim entry by its id in the adhkar snapshot, read and heard. */
  | { kind: "dua"; id: string; when?: string }
  | { kind: "verse"; key: VerseKey; when?: string }
  | { kind: "evidence"; keys: HadithKey[] }
  | { kind: "note"; tone: "women" | "mistake" | "info"; title: string; items: string[] }
  | { kind: "miqat" }
  | { kind: "tawaf" }
  | { kind: "sai" };

export interface UmrahStep {
  id: string;
  /** Where the pilgrim is when doing it. */
  place: string;
  title: string;
  icon: StepIcon;
  summary: string;
  blocks: Block[];
}

export const UMRAH_STEPS: UmrahStep[] = [
  {
    id: "prepare",
    place: "قبل السفر",
    title: "النية والاستعداد",
    icon: "luggage",
    summary: "أخلص نيتك لله، وتعلّم ما ستفعله قبل أن تصل؛ فالعمرة أربعة أعمال: الإحرام، ثم الطواف، ثم السعي، ثم الحلق أو التقصير.",
    blocks: [
      {
        kind: "steps",
        items: [
          "جدّد التوبة، وردّ الحقوق إلى أهلها، واجعل نفقتك من مال حلال.",
          "اقرأ هذا الدليل كاملًا قبل سفرك، واحفظ التلبية ودعاء السفر.",
          "جهّز ملابس الإحرام: للرجل إزار ورداء أبيضان ونعلان، وللمرأة ما شاءت من الثياب الساترة.",
          "ودّع أهلك بدعاء المسافر للمقيم، وتجد أدعية الطريق كلها في تبويب «أدعية السفر».",
        ],
      },
      { kind: "dua", id: "hisn-207-general", when: "إذا ركبت وانطلقت" },
      { kind: "evidence", keys: ["umrah-expiation", "umrah-ramadan"] },
    ],
  },
  {
    id: "ihram",
    place: "عند الميقات",
    title: "الإحرام من الميقات",
    icon: "map-pin",
    summary: "الإحرام نية الدخول في العمرة. يكون من الميقات، ولا يجوز لمن أراد العمرة أن يتجاوزه دون إحرام.",
    blocks: [
      { kind: "miqat" },
      {
        kind: "steps",
        items: [
          "اغتسل وتنظّف قبل الإحرام، ويتطيّب الرجل في بدنه لا في ثياب الإحرام.",
          "يلبس الرجل الإزار والرداء، وتلبس المرأة ثيابها المعتادة الساترة دون نقاب ولا قفازين.",
          "انوِ بقلبك الدخول في العمرة وقل: «لَبَّيْكَ عُمْرَةً»، ثم ابدأ التلبية.",
          "إن خفت ألا تُتمّ عمرتك لمرض أو نحوه فقل عند نيتك: «فإن حبسني حابس فمحلّي حيث حبستني».",
        ],
      },
      {
        kind: "note",
        tone: "info",
        title: "ما يُمنع منه المحرم حتى يتحلّل",
        items: [
          "إزالة الشعر، وتقليم الأظفار.",
          "الطيب في البدن أو الثوب بعد الإحرام.",
          "للرجل: تغطية الرأس بما يلاصقه، ولبس المخيط المفصّل على البدن كالقميص والسراويل.",
          "للمرأة: النقاب والقفازان، وتستر وجهها عن الرجال الأجانب بغيرهما.",
          "الصيد، وعقد النكاح، والجماع ومقدّماته.",
          "من وقع في شيء منها فليسأل أهل العلم عمّا يلزمه.",
        ],
      },
      { kind: "evidence", keys: ["mawaqit", "ihram-clothes", "ihram-perfume"] },
    ],
  },
  {
    id: "talbiya",
    place: "في الطريق إلى مكة",
    title: "التلبية",
    icon: "megaphone",
    summary: "أكثِر من التلبية من إحرامك حتى تبدأ الطواف؛ فهي شعار العمرة.",
    blocks: [
      { kind: "dua", id: "hisn-233-general", when: "ردّدها في طريقك" },
      {
        kind: "steps",
        items: ["يرفع الرجل صوته بالتلبية، وتخفض المرأة صوتها.", "تقطع التلبية حين تبدأ الطواف."],
      },
      { kind: "evidence", keys: ["talbiya"] },
    ],
  },
  {
    id: "haram",
    place: "عند باب المسجد الحرام",
    title: "دخول المسجد الحرام",
    icon: "door-open",
    summary: "ادخل برجلك اليمنى بدعاء دخول المسجد، ثم اتجه إلى الحجر الأسود لتبدأ الطواف؛ فالطواف تحية البيت.",
    blocks: [
      { kind: "dua", id: "hisn-20-general", when: "عند الدخول" },
      {
        kind: "note",
        tone: "mistake",
        title: "تنبيه",
        items: ["لم يثبت دعاء مخصوص عند رؤية الكعبة، فادعُ بما شئت من خير."],
      },
    ],
  },
  {
    id: "tawaf",
    place: "في المطاف",
    title: "الطواف سبعة أشواط",
    icon: "refresh",
    summary: "تبدأ من الحجر الأسود وتنتهي إليه، والكعبة عن يسارك. استعمل العدّاد ليحفظ لك الأشواط.",
    blocks: [
      { kind: "tawaf" },
      {
        kind: "steps",
        items: [
          "كن على وضوء.",
          "يكشف الرجل كتفه الأيمن طوال هذا الطواف (الاضطباع): يجعل وسط الرداء تحت إبطه الأيمن وطرفيه على كتفه الأيسر.",
          "استقبل الحجر الأسود، واستلمه وقبّله إن تيسّر، وإلا فأشر إليه بيدك وقل: «الله أكبر»، ولا تزاحم.",
          "يُسرع الرجل في مشيه مع مقاربة الخطى في الأشواط الثلاثة الأولى (الرَّمَل)، ويمشي في الباقي.",
          "استلم الركن اليماني بيدك إن تيسّر دون تقبيل، ولا تُشر إليه إن لم تستطع.",
          "بين الركن اليماني والحجر الأسود قل: ﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً…﴾، وادعُ واذكر الله واقرأ القرآن في سائر الطواف.",
          "طُف من وراء حِجْر إسماعيل؛ فما كان داخله لا يُحسب من الطواف.",
          "إن شككت في عدد الأشواط فابنِ على الأقل.",
        ],
      },
      { kind: "dua", id: "hisn-234-general", when: "كلما حاذيت الحجر الأسود" },
      { kind: "dua", id: "hisn-235-general", when: "بين الركن اليماني والحجر الأسود" },
      {
        kind: "note",
        tone: "mistake",
        title: "أخطاء شائعة",
        items: [
          "«دعاء الشوط الأول، والثاني…» في الكتيّبات لم يثبت؛ ادعُ بما شئت.",
          "تقبيل الركن اليماني، والتمسّح بجدران الكعبة والمقام.",
          "إيذاء الناس بالزحام عند الحجر الأسود، ورفع الأصوات جماعة بما يشوّش على الطائفين.",
        ],
      },
      {
        kind: "note",
        tone: "women",
        title: "للمرأة",
        items: ["لا رَمَل عليها ولا اضطباع.", "الحائض تُحرم وتلبّي، ولا تطوف حتى تطهر، ثم تُكمل عمرتها."],
      },
      { kind: "evidence", keys: ["black-stone", "two-corners", "ramal"] },
    ],
  },
  {
    id: "maqam",
    place: "خلف مقام إبراهيم",
    title: "ركعتا الطواف وماء زمزم",
    icon: "footprints",
    summary: "صلِّ ركعتين خلف مقام إبراهيم إن تيسّر، وإلا ففي أي مكان من المسجد، ثم اشرب من زمزم.",
    blocks: [
      { kind: "verse", key: "maqam", when: "اقرأها وأنت متجه إلى المقام" },
      {
        kind: "steps",
        items: [
          "غطِّ كتفك الأيمن؛ فالاضطباع في الطواف وحده.",
          "اقرأ في الركعة الأولى بعد الفاتحة ﴿قُلْ يَا أَيُّهَا الْكَافِرُونَ﴾، وفي الثانية ﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾، كما في حديث جابر في صحيح مسلم.",
          "اشرب من ماء زمزم وادعُ بما شئت، ثم ارجع إلى الحجر الأسود فاستلمه إن تيسّر.",
        ],
      },
    ],
  },
  {
    id: "sai",
    place: "في المسعى",
    title: "السعي بين الصفا والمروة",
    icon: "route",
    summary: "سبعة أشواط: الذهاب من الصفا إلى المروة شوط، والرجوع شوط؛ تبدأ بالصفا وتنتهي بالمروة.",
    blocks: [
      { kind: "sai" },
      { kind: "verse", key: "safa-verse", when: "عند أول صعودك الصفا فقط" },
      { kind: "dua", id: "hisn-236-general", when: "على الصفا وعلى المروة" },
      {
        kind: "steps",
        items: [
          "اصعد الصفا واستقبل الكعبة، وكبّر الله ووحّده وادعُ رافعًا يديك، ثلاث مرات.",
          "امشِ إلى المروة، ويُسرع الرجل بين العلامتين الخضراوين.",
          "على المروة افعل كما فعلت على الصفا، دون قراءة الآية.",
          "الوضوء للسعي مستحب وليس شرطًا، ويجوز السعي في الأدوار العليا.",
        ],
      },
      { kind: "evidence", keys: ["safa-marwa"] },
    ],
  },
  {
    id: "halq",
    place: "بعد السعي",
    title: "الحلق أو التقصير",
    icon: "scissors",
    summary: "بالحلق أو التقصير تتمّ عمرتك، ويحلّ لك كل ما مُنعت منه بالإحرام.",
    blocks: [
      {
        kind: "steps",
        items: ["يحلق الرجل رأسه كله، وهو أفضل، أو يقصّر من جميع شعر رأسه.", "تجمع المرأة شعرها وتقصّ من أطرافه قدر أنملة."],
      },
      { kind: "evidence", keys: ["shaving", "women-shorten"] },
    ],
  },
  {
    id: "done",
    place: "تمّت عمرتك",
    title: "تقبّل الله منك",
    icon: "badge-check",
    summary: "أتممت عمرتك بفضل الله. أكثر من الصلاة في المسجد الحرام، وإن زرت المدينة فتجد آداب الزيارة في تبويب «زيارة المدينة».",
    blocks: [
      {
        kind: "steps",
        items: ["ليس للعمرة طواف وداع واجب عند جمهور العلماء، ومن طاف عند خروجه فحسن.", "إذا رجعت إلى بلدك فقل دعاء الرجوع من السفر."],
      },
      { kind: "dua", id: "hisn-217-general", when: "عند الرجوع" },
    ],
  },
];

export interface Miqat {
  id: string;
  /** Where the pilgrim comes from. */
  from: string;
  miqat: string;
  detail: string;
}

/** The miqats by where the pilgrim sets out from (the hadith names four; Dhat 'Irq is in Muslim). */
export const MIQATS: Miqat[] = [
  {
    id: "egypt",
    from: "من مصر بالطائرة",
    miqat: "الجُحفة",
    detail:
      "تمرّ الطائرة بمحاذاة الجحفة قرب رابغ قبل الوصول إلى جدة. اغتسل والبس الإحرام قبل الركوب، وانوِ وابدأ التلبية حين يُعلن الطاقم محاذاة الميقات، ولا تؤخّر الإحرام إلى جدة.",
  },
  {
    id: "medina",
    from: "من المدينة المنورة",
    miqat: "ذو الحُليفة (أبيار علي)",
    detail: "أحرم من مسجد ذي الحليفة على طريق مكة عند خروجك من المدينة.",
  },
  {
    id: "najd",
    from: "من الرياض ونجد",
    miqat: "قَرْن المنازل (السيل الكبير)",
    detail: "أحرم من السيل الكبير، أو مما يحاذيه إن كنت مسافرًا جوًا.",
  },
  {
    id: "yemen",
    from: "من اليمن والجنوب",
    miqat: "يَلَمْلَم (السعدية)",
    detail: "أحرم من يلملم، أو مما يحاذيه إن كنت مسافرًا جوًا.",
  },
  {
    id: "iraq",
    from: "من العراق والشرق",
    miqat: "ذات عِرق",
    detail: "أحرم من ذات عرق، أو مما يحاذيها إن كنت مسافرًا جوًا.",
  },
  {
    id: "inside",
    from: "من جدة أو مكة",
    miqat: "من حيث أنت",
    detail: "من كان دون المواقيت كأهل جدة أحرم من مكانه، ومن كان بمكة خرج إلى الحِلّ، كالتنعيم (مسجد عائشة)، فأحرم منه.",
  },
];

/** Duas for the road, in the order of the journey. */
export const TRAVEL_DUAS: { id: string; when: string }[] = [
  { id: "hisn-211-general", when: "تقوله لمن تودّعهم" },
  { id: "hisn-212-general", when: "يقوله المودِّع للمسافر" },
  { id: "hisn-213-general", when: "ويقوله المودِّع للمسافر أيضًا" },
  { id: "hisn-206-general", when: "إذا ركبت السيارة أو الطائرة" },
  { id: "hisn-207-general", when: "عند بدء السفر" },
  { id: "hisn-214-general", when: "في الطريق" },
  { id: "hisn-215-general", when: "إذا أدركك السَّحَر في السفر" },
  { id: "hisn-216-general", when: "إذا نزلت فندقًا أو منزلًا" },
  { id: "hisn-208-general", when: "إذا دخلت مدينة أو بلدة" },
  { id: "hisn-217-general", when: "عند الرجوع" },
];

/** Visiting Medina: a sunna of its own, not part of the umrah. */
export const MEDINA_SECTIONS: { id: string; title: string; summary: string; blocks: Block[] }[] = [
  {
    id: "mosque",
    title: "المسجد النبوي",
    summary: "زيارة المسجد النبوي والصلاة فيه سنة مستقلة، وليست من أعمال العمرة.",
    blocks: [
      { kind: "dua", id: "hisn-20-general", when: "عند دخول المسجد" },
      {
        kind: "steps",
        items: [
          "صلِّ ركعتين تحية المسجد، وفي الروضة إن تيسّر؛ وتُحجز زيارتها عبر تطبيق «نسك».",
          "أكثر من الصلاة فيه، فالصلاة فيه خير من ألف صلاة فيما سواه إلا المسجد الحرام.",
        ],
      },
      { kind: "evidence", keys: ["prophet-mosque", "rawdah"] },
    ],
  },
  {
    id: "salam",
    title: "السلام على النبي ﷺ وصاحبيه",
    summary: "قف أمام القبر الشريف بأدب وخفض صوت، وسلّم على النبي ﷺ ثم على أبي بكر ثم على عمر رضي الله عنهما.",
    blocks: [
      {
        kind: "steps",
        items: [
          "قل: «السلام عليك يا رسول الله ورحمة الله وبركاته»، ثم: «السلام عليك يا أبا بكر»، ثم: «السلام عليك يا عمر».",
          "إذا أردت الدعاء فاستقبل القبلة، لا القبر.",
          "لا يُتمسَّح بالحجرة ولا بالجدران، ولا يُطاف بالقبر.",
        ],
      },
    ],
  },
  {
    id: "quba",
    title: "مسجد قباء",
    summary: "أول مسجد بُني في الإسلام. من تطهّر في بيته ثم صلّى فيه كان له كأجر عمرة.",
    blocks: [
      { kind: "dua", id: "hisn-20-general", when: "دعاء دخول المسجد، فليس لقباء دعاء خاص" },
      { kind: "evidence", keys: ["quba-reward"] },
    ],
  },
  {
    id: "baqi",
    title: "البقيع",
    summary: "زيارة القبور سنة للرجال، تُذكّر بالآخرة ويُدعى فيها للأموات.",
    blocks: [{ kind: "dua", id: "hisn-165-general", when: "إذا زرت البقيع" }],
  },
];
