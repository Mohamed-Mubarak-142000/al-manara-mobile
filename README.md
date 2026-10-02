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
