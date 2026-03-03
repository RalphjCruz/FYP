export type AnalyticsDailyPoint = {
  date: string;
  value: number;
};

export type AnalyticsSummary = {
  tasks: {
    total: number;
    completed: number;
    completionRatePercent: number;
    completedLast7Days: AnalyticsDailyPoint[];
  };
  xp: {
    totalExperience: number;
    level: number;
    gainedLast7Days: AnalyticsDailyPoint[];
  };
  achievements: {
    unlockedCount: number;
  };
};
