export interface SlimeAchievement {
  key: 'first_task' | 'task_10' | 'task_25' | 'level_3' | 'level_5' | 'xp_500' | 'xp_1000' | 'first_unlock';
  name: string;
  description: string;
  badgeIcon: string;
  unlockedAt: string;
}

export interface SlimeAchievementProgress {
  key: SlimeAchievement['key'];
  name: string;
  description: string;
  badgeIcon: string;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

export interface SlimeData {
  id: number;
  name: string;
  level: number;
  experience: number;
  totalExperience?: number;
  experienceForNextLevel?: number;
  experienceToNextLevel?: number;
  levelProgressPercent?: number;
  color: string;
  evolutionStage: number;
  user: {
    id: number;
    username: string;
    email: string;
  };
  achievements?: SlimeAchievement[];
  achievementProgress?: SlimeAchievementProgress[];
}
