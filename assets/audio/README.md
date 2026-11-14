# Short notification adhan

`adhan_short.wav` is the first 28 seconds of **Beautiful adhan**, recorded by Adam-synagda,
with a one-second fade at the end. Mono PCM, 22,050 Hz, 16-bit.

Source: https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg

License: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/

Regenerate with `node scripts/prepare-adhan-sound.mjs`, with ffmpeg on PATH or `FFMPEG_BIN`
pointing to its executable. This is the shared iOS notification excerpt, not the user's
downloaded full Android recording.

# Voiced outside-adhkar notifications

Each `dhikr_<id>.wav` is the voice of one hourly "ذكّر قلبك" notification, matched to
`TOAST_ADHKAR` in `src/core/adhkar/toastAdhkar.ts` by `src/features/adhkar/dhikrVoices.ts`.
They are Hisn al-Muslim's own human recordings (`https://www.hisnmuslim.com/audio/ar/<entry>.mp3`),
cut at the pause before the spoken repetition count ("مائة مرة"…) and stripped of edge silence,
with a 0.15 s fade out. Mono PCM, 22,050 Hz, 16-bit; all under iOS's 30 s notification-sound limit.

| File                      | Entry | Cut (s)     |
| ------------------------- | ----- | ----------- |
| dhikr_istighfar.wav       | 96    | 0 – 4.30    |
| dhikr_salat_nabi.wav      | 98    | 0.65 – 4.75 |
| dhikr_subhan_bihamdih.wav | 91    | 0 – 3.30    |
| dhikr_tahlil.wav          | 92    | 0 – 11.05   |
| dhikr_hasbuna.wav         | 128   | 0 – 3.70    |
| dhikr_radeetu.wav         | 87    | 0 – 10.55   |
| dhikr_yunus.wav           | 124   | 0.35 – 6.65 |
| dhikr_subhanaka.wav       | 15    | 0 – 11.20   |
| dhikr_aeni.wav            | 59    | 1.10 – 5.85 |
| dhikr_jannah.wav          | 61    | 0.75 – 5.44 |

`ffmpeg -i <entry>.mp3 -ss <from> -to <to> -af "afade=t=in:d=0.03,afade=t=out:st=<len-0.15>:d=0.15" -ac 1 -ar 22050 -c:a pcm_s16le dhikr_<id>.wav`

They ship inside the app (they are native resources), so a new one needs a new build, not an OTA update.
