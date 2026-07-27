export type LifeEntryKind = "thought" | "dilemma" | "goal" | "reflection";

export type LifeProfile = {
  user_id: string;
  display_name: string;
  city: string;
  life_stage: string;
  about_me: string;
  interests: string[];
  core_values: string[];
  preferred_pace: string;
  energy_budget: number;
  created_at: string;
  updated_at: string;
};

export type LifeEntry = {
  id: string;
  user_id: string;
  kind: LifeEntryKind;
  title: string;
  content: string;
  status: "active" | "completed" | "archived";
  priority: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type EnergyLog = {
  id: string;
  user_id: string;
  activity: string;
  energy: number;
  engagement: number;
  note: string;
  created_at: string;
};

export type DailyRecommendation = {
  id: string;
  user_id: string;
  recommendation_date: string;
  quest_title: string;
  quest_description: string;
  rationale: string;
  coaching_note: string;
  reflection_question: string;
  quest_type: string;
  xp: number;
  minutes: number;
  model: string;
  created_at: string;
};

export type LifeDashboardData = {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string;
  };
  profile: LifeProfile | null;
  entries: LifeEntry[];
  energyLogs: EnergyLog[];
  recommendation: DailyRecommendation | null;
};
