import { Directory, Paths } from "expo-file-system";
import Storage from "expo-sqlite/kv-store";

/**
 * A clean start on demand. Updates normally keep the app's data, as on every Android app. When a build
 * must start from scratch (old test builds left bad state behind), bump DATA_VERSION: the first launch
 * of that build clears everything this app keeps on the phone before any other module reads it
 * (settings, the guest khatma, the sign-in session, downloaded recitations, hadith and riwayat), so it
 * opens on onboarding like a fresh install. What is on the account comes back after signing in.
 *
 * index.ts imports this before expo-router, so nothing has read storage yet. Synchronous on purpose.
 */
export const DATA_VERSION = 1;

const VERSION_KEY = "al-manara:data-version";

/**
 * expo-sqlite keeps its databases in <documents>/SQLite, and the kv-store database is open by now.
 * Deleting it under the open connection made every later write fail with "attempt to write a readonly
 * database" (the version mark too, so the wipe repeated on every launch and no sign-in could be saved).
 * Storage.clearSync() above already emptied it.
 */
const SQLITE_DIRECTORY = "SQLite";

function wipeDocuments() {
  for (const entry of new Directory(Paths.document).list()) {
    if (entry.name === SQLITE_DIRECTORY) continue;
    try {
      entry.delete();
    } catch {
      // A file in use is left; the app overwrites it when needed.
    }
  }
}

function resetIfNeeded() {
  let stored = 0;
  try {
    stored = Number(Storage.getItemSync(VERSION_KEY) ?? 0) || 0;
  } catch {
    return;
  }
  if (stored >= DATA_VERSION) return;
  try {
    // One database holds the kv-store and the localStorage the Supabase session lives in.
    Storage.clearSync();
  } catch {
    // Keep going: the files and the version mark still matter.
  }
  try {
    wipeDocuments();
  } catch {
    // Nothing downloaded yet, or the folder isn't readable.
  }
  try {
    Storage.setItemSync(VERSION_KEY, String(DATA_VERSION));
  } catch {
    // Tried again next launch.
  }
}

resetIfNeeded();
