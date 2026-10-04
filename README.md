# المنارة — تطبيق الموبايل

تطبيق iOS وAndroid لمنصة المنارة، مبني بـ Expo (React Native). ريبو منفصل عن الموقع (`eslam-platform`)، لكنه يستخدم **نفس الباك إند**: نفس مشروع Supabase (الحسابات والجداول والـ RLS)، ونفس مصادر المحتوى (mp3quran وalquran.cloud وaladhan وغيرها).

## التشغيل

```bash
npm install
cp .env.example .env          # ضع مفاتيح Supabase العامة (نفس مفاتيح الموقع العامة)
npx expo start                # ثم افتح التطبيق على جهاز أو محاكي
```

بعض المكتبات فيها كود native، فالأفضل التشغيل بـ development build (`npx expo run:android` أو `eas build --profile development`) بدل Expo Go. اتجاه RTL الإجباري كمان مبيشتغلش في Expo Go.

## الأوامر

| الأمر                 | الوظيفة                                     |
| --------------------- | ------------------------------------------- |
| `npm run typecheck`   | فحص TypeScript                              |
| `npm run lint`        | ESLint                                      |
| `npm run format`      | Prettier بنفس إعدادات الموقع                |
| `npm run sync:tokens` | نسخ ألوان الهوية من `globals.css` في الموقع |
| `npm run doctor`      | فحص إعدادات Expo                            |

## البنية

```
src/app/          الشاشات (Expo Router): (tabs) والقارئ quran/[surah]
src/core/         منطق ومصادر بيانات منقولة من الموقع، TypeScript نقي
src/features/     منطق خاص بالموبايل (الموقع الجغرافي، المواقيت، الرئيسية…)
src/components/   مكونات الواجهة بنفس شكل الموقع (Button وPageHeader وCard…)
src/theme/        الخطوط وقراءة ألوان الثيم من JS
src/global.css    الـ design system (Tailwind v4 عن طريق Uniwind)
src/lib/          Supabase client وأنواع قاعدة البيانات
assets/fonts/     خطوط المصحف والروايات (محوّلة من woff2 الموقع إلى ttf)
```

## الـ Design System

- الستايل بـ **Uniwind** (Tailwind v4 لـ React Native)، فأسماء الكلاسات هي نفسها أسماء كلاسات الموقع.
- ألوان الهوية (`emerald` و`gold` و`ivory`…) بتتنسخ من الموقع بـ `npm run sync:tokens`. متعدلهاش في `global.css` يدويًا.
- في الشاشات استخدم الألوان الدلالية (`bg-bg`، `bg-surface`، `text-fg`، `text-fg-muted`، `bg-primary`، `text-accent`…). دي بتتبدل تلقائيًا بين الوضع الفاتح والليلي.
- لما تحتاج لون كقيمة (أيقونة أو SVG أو navigator)، استخدم `useThemeColor("primary")`.
- الخطوط: `font-sans` / `font-sans-bold` (Cairo)، `font-display-bold` (Alexandria)، `font-quran` (KFGQPC Uthmanic Hafs)، `font-kids` (Baloo Bhaijaan 2). كل وزن عائلة لوحده، فاستخدم `font-sans-bold` مش `font-bold`.

## الكود المنقول من الموقع

الملفات اللي في `src/core/` نسخ من ملفات الموقع، وكل ملف أوله سطر بيقول جاي منين. الفرق الوحيد إن `fetch(url, { next: { revalidate } })` اتبدلت بـ `cachedFetch(url, ttl)` (`src/core/http.ts`). دي بتخزن الرد على الجهاز، فأي شاشة اتفتحت مرة تكمل تشتغل من غير إنترنت. لو ملف اتعدل في الموقع، انقل التعديل هنا بإيدك.

## يعتمد على الموقع في

| الخدمة                                          | المسار في ريبو الموقع (`feat/mobile-api-v1`)  |
| ----------------------------------------------- | --------------------------------------------- |
| إنشاء حساب (من غير كود) وتأكيد الحسابات القديمة | `POST /api/v1/auth/register` و`/auth/confirm` |
| استعادة كلمة المرور بالكود                      | `POST /api/v1/auth/code` و`/auth/verify`      |
| حذف الحساب                                      | `POST /api/v1/account/delete`                 |
| بدء الاختبار وتصحيحه وإصدار الشهادة             | `POST /api/v1/exams/start` و`/exams/submit`   |
| مصاحف الروايات السبع                            | `GET /api/v1/riwayat/{key}`                   |
| إشعارات التذكير (الجمعة، الصيام، المواسم)       | جدول `push_tokens` + كرون التذكيرات           |

باقي البيانات (الختمة، الخطة، التسميع، موضع القراءة، الشهادات، رحلتي، القصص، إعدادات الحساب) بتتقري وتتكتب في Supabase مباشرة بالـ RLS.

## إصدار نسخة

المشروع مربوط بـ EAS (`@mhamed_mubarak/almanara`). الإعدادات العامة (رابط Supabase والمفتاح العام ورابط الموقع) موجودة في `eas.json`.

```bash
npx eas-cli build -p android --profile preview      # APK للتجربة والتوزيع المباشر
npx eas-cli build -p android --profile production   # AAB لـ Google Play
npx eas-cli build -p ios --profile production       # محتاج حساب Apple Developer
```

## قبل النشر في المتاجر

**على الموقع وSupabase**

- نشر فرع `feat/mobile-api-v1` على الموقع. من غيره إنشاء الحساب والاختبارات والروايات وحذف الحساب مش هيشتغلوا، ولا الـ App Links.
- تطبيق migrations: `push_tokens` و`sponsors`.
- إضافة `almanara://auth/callback` لـ Redirect URLs في Supabase Auth، عشان الدخول بجوجل.

**المتاجر**

- إنشاء منتجات الشراء بنفس الأسماء في App Store Connect وGoogle Play Console: `almanara.donation.small` و`almanara.donation.medium` و`almanara.donation.large` (consumable)، و`almanara.supporter.lifetime` (non-consumable).
- بعد الرفع على Google Play: إضافة بصمة Play App Signing في `public/.well-known/assetlinks.json` في ريبو الموقع.
- iOS: حط `ios.appleTeamId` في `app.json` (من حساب Apple Developer)، وملف `apple-app-site-association` على الموقع، قبل أي بناء للآيفون.

**اختياري**

- `EXPO_PUBLIC_SENTRY_DSN` و`EXPO_PUBLIC_POSTHOG_KEY` في `eas.json` لتشغيل تتبّع الأعطال والتحليلات.
- صوت أذان داخل الإشعار نفسه: محتاج تسجيل بترخيص واضح، مدته ٣٠ ثانية أو أقل. دلوقتي الأذان الكامل بيشتغل جوه التطبيق.
