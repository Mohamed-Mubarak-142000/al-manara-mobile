// Mirrors supabase/migrations/*.sql. Regenerate with `npx supabase gen types typescript --linked`
// once the Supabase CLI is linked to the project, and keep this file in sync with migrations.

type Timestamp = string;

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type AppRole = "user" | "admin";
export type LearnerKind = "self" | "child";
export type GameKind =
  "letters" | "tajweed" | "arrange" | "quiz" | "listen_pick" | "ayah_order" | "true_false" | "surah_match" | "kids_recite";
export type CompanionAnimal = "bear" | "panda" | "rabbit" | "fox";
export type ExamStatus = "in_progress" | "passed" | "failed" | "expired";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string;
  certificate_name: string;
  role: AppRole;
  disabled: boolean;
  email_updates: boolean;
  remind_friday: boolean;
  remind_fasting: boolean;
  remind_seasons: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};
export type LearnerRow = {
  id: string;
  owner_id: string;
  kind: LearnerKind;
  display_name: string;
  birth_year: number | null;
  created_at: Timestamp;
};
export type MemorizedAyahRow = {
  learner_id: string;
  surah: number;
  ayah: number;
  memorized_at: Timestamp;
};
export type ReviewScheduleRow = {
  learner_id: string;
  surah: number;
  interval_index: number;
  last_reviewed_at: Timestamp;
  due_at: Timestamp;
};
export type ReadingPositionRow = {
  learner_id: string;
  surah: number;
  surah_name: string;
  page: number;
  updated_at: Timestamp;
};
export type ActivityDayRow = {
  learner_id: string;
  day: string;
};
export type GameSessionRow = {
  id: number;
  learner_id: string;
  game: GameKind;
  surah: number | null;
  score: number;
  total: number;
  stars: number | null;
  moves: number | null;
  created_at: Timestamp;
};
export type ListenCompletionRow = {
  learner_id: string;
  surah: number;
  completed_at: Timestamp;
};
export type LearnerBadgeRow = {
  learner_id: string;
  badge_id: string;
  unlocked_at: Timestamp;
};
export type TasmeeSessionRow = {
  id: number;
  learner_id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  correct: number;
  mistakes: number;
  created_at: Timestamp;
};
export type KidsProfileRow = {
  learner_id: string;
  companion: CompanionAnimal | null;
  equipped: string[];
  updated_at: Timestamp;
};
export type KidsDailyTaskRow = {
  learner_id: string;
  day: string;
  task_id: string;
  done_at: Timestamp;
};
export type KidsRewardRow = {
  learner_id: string;
  kind: "item" | "chest";
  ref_id: string;
  reward_id: string | null;
  created_at: Timestamp;
};
export type AppSettingsRow = {
  id: boolean;
  exam_question_count: number;
  exam_pass_percent: number;
  exam_minutes: number;
  retry_cooldown_hours: number;
  facebook_url: string | null;
  reminders_enabled: boolean;
  hijri_offset: number;
  disabled_occasions: string[];
  updated_at: Timestamp;
};
export type AnnouncementRow = {
  id: string;
  subject: string;
  content: unknown;
  sent_by: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: Timestamp;
  finished_at: Timestamp | null;
};
export type ReminderSlot = "morning" | "evening";
export type ReminderRunStatus = "running" | "done" | "quota";
export type ReminderRunRow = {
  id: string;
  occasion_key: string;
  run_date: string;
  slot: ReminderSlot;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: ReminderRunStatus;
  started_at: Timestamp;
  finished_at: Timestamp | null;
};
export type ReminderDeliveryRow = {
  run_id: string;
  user_id: string;
  sent_at: Timestamp;
};
export type SponsorRow = {
  id: string;
  name: string;
  message: string;
  link_url: string | null;
  logo_url: string | null;
  starts_on: string;
  ends_on: string;
  active: boolean;
  created_at: Timestamp;
};
export type SupporterStatus = "pending" | "approved" | "rejected";
export type SupporterRow = {
  id: string;
  user_id: string;
  display_name: string;
  message: string | null;
  show_name: boolean;
  amount: number;
  sender: string;
  receipt_path: string;
  status: SupporterStatus;
  reject_reason: string | null;
  reviewed_at: Timestamp | null;
  thanked_at: Timestamp | null;
  created_at: Timestamp;
};
/** The public_supporters view: approved supporters, name and message only. */
export type PublicSupporterRow = {
  id: string;
  name: string;
  message: string | null;
  approved_at: Timestamp | null;
};
export type PushPlatform = "ios" | "android";
export type PushTokenRow = {
  token: string;
  user_id: string;
  platform: PushPlatform;
  created_at: Timestamp;
  updated_at: Timestamp;
};
export type ExamAttemptRow = {
  id: string;
  learner_id: string;
  juz: number;
  questions: unknown;
  answers: unknown;
  score: number | null;
  total: number;
  status: ExamStatus;
  started_at: Timestamp;
  expires_at: Timestamp;
  submitted_at: Timestamp | null;
};
export type OtpPurpose = "signup" | "recovery" | "email";
export type EmailOtpRow = {
  email: string;
  purpose: OtpPurpose;
  code_hash: string;
  attempts: number;
  created_at: Timestamp;
  expires_at: Timestamp;
};
export type KidsStoryRow = {
  id: string;
  title: string;
  prophet: string | null;
  youtube_id: string;
  summary: string;
  lesson: string;
  sort_order: number;
  published: boolean;
  created_at: Timestamp;
};
export type StoryViewRow = {
  learner_id: string;
  story_id: string;
  watched_at: Timestamp;
};
export type PlanStatus = "active" | "completed" | "archived";
export type PlanKind = "memorize" | "review";
export type MemorizationPlanRow = {
  id: string;
  learner_id: string;
  kind: PlanKind;
  /** Null on review plans, which have no new-memorization range. */
  start_juz: number | null;
  end_juz: number | null;
  start_page: number | null;
  end_page: number | null;
  units_per_day: number;
  far_review_pages: number;
  progress_units: number;
  review_cursor: number;
  status: PlanStatus;
  prior_surahs: number[];
  /** Whole juz the learner already knew (a juz needn't align with surahs). */
  prior_juz: number[];
  prior_pages: number[];
  /** Weekdays, 0 = Sunday … 6 = Saturday. */
  new_days: number[];
  review_days: number[];
  created_at: Timestamp;
  completed_at: Timestamp | null;
};
export type PlanLogKind = "new" | "review";
export type MemorizationPlanLogRow = {
  plan_id: string;
  learner_id: string;
  day: string;
  kind: PlanLogKind;
  from_unit: number;
  to_unit: number;
  done_at: Timestamp;
};
export type KhatmaUnit = "pages" | "hizb" | "juz" | "surah";
export type KhatmaRow = {
  id: string;
  learner_id: string;
  unit: KhatmaUnit;
  per_session: number;
  mode: "amount" | "duration";
  target_day: string | null;
  /** Weekdays, 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** Next ayah to read, 0-based across the mushaf (6236 = finished). */
  position: number;
  status: PlanStatus;
  created_at: Timestamp;
  completed_at: Timestamp | null;
};
export type KhatmaLogRow = {
  khatma_id: string;
  learner_id: string;
  day: string;
  from_ayah: number;
  to_ayah: number;
  done_at: Timestamp;
};
export type ExamAnswerKeyRow = {
  attempt_id: string;
  key: unknown;
};
export type CertificateRow = {
  id: string;
  learner_id: string;
  juz: number;
  holder_name: string;
  score: number;
  total: number;
  exam_attempt_id: string | null;
  verification_code: string;
  issued_at: Timestamp;
  revoked_at: Timestamp | null;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        Optional<
          ProfileRow,
          | "email"
          | "full_name"
          | "certificate_name"
          | "role"
          | "disabled"
          | "email_updates"
          | "remind_friday"
          | "remind_fasting"
          | "remind_seasons"
          | "created_at"
          | "updated_at"
        >
      >;
      learners: TableDef<LearnerRow, Optional<LearnerRow, "id" | "birth_year" | "created_at">>;
      memorized_ayahs: TableDef<MemorizedAyahRow, Optional<MemorizedAyahRow, "memorized_at">>;
      review_schedule: TableDef<ReviewScheduleRow, Optional<ReviewScheduleRow, "interval_index" | "last_reviewed_at">>;
      reading_position: TableDef<ReadingPositionRow, Optional<ReadingPositionRow, "surah_name" | "updated_at">>;
      activity_days: TableDef<ActivityDayRow, ActivityDayRow>;
      game_sessions: TableDef<
        GameSessionRow,
        Optional<GameSessionRow, "id" | "surah" | "score" | "total" | "stars" | "moves" | "created_at">
      >;
      listen_completions: TableDef<ListenCompletionRow, Optional<ListenCompletionRow, "completed_at">>;
      learner_badges: TableDef<LearnerBadgeRow, Optional<LearnerBadgeRow, "unlocked_at">>;
      tasmee_sessions: TableDef<TasmeeSessionRow, Optional<TasmeeSessionRow, "id" | "correct" | "mistakes" | "created_at">>;
      kids_profile: TableDef<KidsProfileRow, Optional<KidsProfileRow, "companion" | "equipped" | "updated_at">>;
      kids_daily_tasks: TableDef<KidsDailyTaskRow, Optional<KidsDailyTaskRow, "done_at">>;
      kids_rewards: TableDef<KidsRewardRow, Optional<KidsRewardRow, "reward_id" | "created_at">>;
      app_settings: TableDef<AppSettingsRow, Partial<AppSettingsRow>>;
      exam_attempts: TableDef<
        ExamAttemptRow,
        Optional<ExamAttemptRow, "id" | "answers" | "score" | "status" | "started_at" | "submitted_at">
      >;
      exam_answer_keys: TableDef<ExamAnswerKeyRow, ExamAnswerKeyRow>;
      kids_stories: TableDef<
        KidsStoryRow,
        Optional<KidsStoryRow, "id" | "prophet" | "summary" | "lesson" | "sort_order" | "published" | "created_at">
      >;
      story_views: TableDef<StoryViewRow, Optional<StoryViewRow, "watched_at">>;
      email_otps: TableDef<EmailOtpRow, Optional<EmailOtpRow, "attempts" | "created_at">>;
      announcements: TableDef<
        AnnouncementRow,
        Optional<AnnouncementRow, "id" | "sent_by" | "recipient_count" | "sent_count" | "failed_count" | "created_at" | "finished_at">
      >;
      reminder_runs: TableDef<
        ReminderRunRow,
        Optional<ReminderRunRow, "id" | "recipient_count" | "sent_count" | "failed_count" | "status" | "started_at" | "finished_at">
      >;
      reminder_deliveries: TableDef<ReminderDeliveryRow, Optional<ReminderDeliveryRow, "sent_at">>;
      push_tokens: TableDef<PushTokenRow, Optional<PushTokenRow, "created_at" | "updated_at">>;
      sponsors: TableDef<SponsorRow, Optional<SponsorRow, "id" | "link_url" | "logo_url" | "active" | "created_at">>;
      supporters: TableDef<
        SupporterRow,
        Optional<
          SupporterRow,
          "id" | "user_id" | "message" | "show_name" | "status" | "reject_reason" | "reviewed_at" | "thanked_at" | "created_at"
        >
      >;
      certificates: TableDef<CertificateRow, Optional<CertificateRow, "id" | "exam_attempt_id" | "issued_at" | "revoked_at">>;
      memorization_plans: TableDef<
        MemorizationPlanRow,
        Optional<
          MemorizationPlanRow,
          | "id"
          | "kind"
          | "start_juz"
          | "end_juz"
          | "start_page"
          | "end_page"
          | "far_review_pages"
          | "progress_units"
          | "review_cursor"
          | "status"
          | "prior_surahs"
          | "prior_juz"
          | "prior_pages"
          | "new_days"
          | "review_days"
          | "created_at"
          | "completed_at"
        >
      >;
      memorization_plan_log: TableDef<MemorizationPlanLogRow, Optional<MemorizationPlanLogRow, "done_at">>;
      khatmas: TableDef<
        KhatmaRow,
        Optional<KhatmaRow, "id" | "mode" | "target_day" | "days" | "position" | "status" | "created_at" | "completed_at">
      >;
      khatma_log: TableDef<KhatmaLogRow, Optional<KhatmaLogRow, "done_at">>;
    };
    Views: {
      public_supporters: { Row: PublicSupporterRow; Relationships: [] };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      owns_learner: { Args: { target: string }; Returns: boolean };
      verify_certificate: {
        Args: { code: string };
        Returns: { holder_name: string; juz: number; score: number; total: number; issued_at: Timestamp; revoked: boolean }[];
      };
    };
    Enums: { app_role: AppRole };
    CompositeTypes: { [_ in never]: never };
  };
};
