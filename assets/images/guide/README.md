# صور دليل التطبيق

Screenshots for the in-app guide (`/guide`). Each guide step can name a screenshot with `shot: "<key>"` in `src/features/guide/catalog.ts`.

1. Take the screenshot on a phone, in **light mode**, with the default text size. Use real but neutral content: no personal names or emails, and no debug overlays.
2. Save it here as `<key>.png`, `<key>.jpg` or `<key>.webp`, for example `quran-index-tabs.png`. Keep it under ~250 KB. A 720px-wide JPG or WebP is plenty.
3. Run `npm run build:guide-shots`. This wires the files into `src/features/guide/shots.ts` and lists the shots that are still missing.

Steps without a screenshot show their text only. In development builds, a dashed placeholder names the file to capture.
