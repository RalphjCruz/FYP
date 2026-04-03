export const getCustomizationErrorMessage = (error: unknown, fallback: string): string => {
  return error instanceof Error ? error.message : fallback;
};

export const mapClaimDailyCoinsErrorStatus = (message: string): number => {
  return message.includes('already claimed') ? 409 : 400;
};

export const mapUnlockCustomizationErrorStatus = (message: string): number => {
  return message.includes('Not enough coins') ? 400 : 404;
};

export const mapEquipCustomizationErrorStatus = (message: string): number => {
  return message.includes('unlock') ? 400 : 404;
};
