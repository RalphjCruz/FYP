import type { SlimeData } from '../types';

export const getGreetingByHour = (hour: number): string => {
  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

export const getSlimeXpPercentage = (slimeData: SlimeData | null): number => {
  if (!slimeData) {
    return 0;
  }

  if (typeof slimeData.levelProgressPercent === 'number') {
    return slimeData.levelProgressPercent;
  }

  const xpForNextLevel =
    typeof slimeData.experienceForNextLevel === 'number' ? slimeData.experienceForNextLevel : slimeData.level * 100;
  return xpForNextLevel > 0 ? (slimeData.experience / xpForNextLevel) * 100 : 0;
};

export const getNextLevelXp = (slimeData: SlimeData | null): number => {
  if (!slimeData) {
    return 100;
  }

  return typeof slimeData.experienceForNextLevel === 'number' ? slimeData.experienceForNextLevel : slimeData.level * 100;
};
