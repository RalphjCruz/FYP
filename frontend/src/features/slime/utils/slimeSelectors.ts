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

  const xpForNextLevel = slimeData.level * 100;
  return (slimeData.experience / xpForNextLevel) * 100;
};

export const getNextLevelXp = (slimeData: SlimeData | null): number => {
  if (!slimeData) {
    return 100;
  }

  return slimeData.level * 100;
};
