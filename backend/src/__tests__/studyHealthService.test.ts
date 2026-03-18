import {
  applyDailyHpSettlement,
  calculateDailyHpDelta,
  getMaxHpByLevel,
} from '../services/studyHealthService.js';

describe('studyHealthService HP formulas', () => {
  it('calculates zero-study daily loss', () => {
    expect(calculateDailyHpDelta(1, 0, 180)).toBe(-8);
    expect(calculateDailyHpDelta(5, 0, 180)).toBe(-16);
  });

  it('calculates recovery when daily goal is reached', () => {
    expect(calculateDailyHpDelta(1, 180, 180)).toBe(5);
    expect(calculateDailyHpDelta(4, 180, 180)).toBe(6);
  });

  it('allows above-goal study to increase hp recovery beyond the base daily recovery', () => {
    expect(calculateDailyHpDelta(1, 360, 180)).toBe(10);
    expect(calculateDailyHpDelta(4, 540, 180)).toBe(18);
  });

  it('calculates partial-study delta relative to goal progress', () => {
    expect(calculateDailyHpDelta(1, 90, 180)).toBe(-4);
  });

  it('applies shortfall-proportional deduction below goal', () => {
    expect(calculateDailyHpDelta(1, 45, 180)).toBe(-6);
    expect(calculateDailyHpDelta(1, 135, 180)).toBe(-2);
  });

  it('scales max hp by level', () => {
    expect(getMaxHpByLevel(1)).toBe(100);
    expect(getMaxHpByLevel(5)).toBe(148);
  });

  it('applies hp-zero level penalty once per settled day', () => {
    const firstPenalty = applyDailyHpSettlement({
      level: 3,
      currentHp: 2,
      focusedMinutes: 0,
      goalMinutes: 180,
      hpDeltaCarry: 0,
      penaltyAlreadyAppliedForDay: false,
    });

    expect(firstPenalty.levelReduced).toBe(true);
    expect(firstPenalty.nextLevel).toBe(2);
    expect(firstPenalty.nextHp).toBe(1);

    const noSecondPenalty = applyDailyHpSettlement({
      level: 3,
      currentHp: 2,
      focusedMinutes: 0,
      goalMinutes: 180,
      hpDeltaCarry: 0,
      penaltyAlreadyAppliedForDay: true,
    });

    expect(noSecondPenalty.levelReduced).toBe(false);
    expect(noSecondPenalty.nextLevel).toBe(3);
    expect(noSecondPenalty.nextHp).toBe(0);
  });

  it('never reduces below level one', () => {
    const settled = applyDailyHpSettlement({
      level: 1,
      currentHp: 2,
      focusedMinutes: 0,
      goalMinutes: 180,
      hpDeltaCarry: 0,
      penaltyAlreadyAppliedForDay: false,
    });

    expect(settled.levelReduced).toBe(false);
    expect(settled.nextLevel).toBe(1);
    expect(settled.nextHp).toBe(0);
  });

  it('accumulates fractional delta in carry so small progress still counts over time', () => {
    const dayOne = applyDailyHpSettlement({
      level: 1,
      currentHp: 100,
      focusedMinutes: 4,
      goalMinutes: 180,
      hpDeltaCarry: 0,
      penaltyAlreadyAppliedForDay: false,
    });

    expect(dayOne.appliedDelta).toBe(-7);
    expect(dayOne.nextCarry).toBeCloseTo(-0.8222, 3);

    const dayTwo = applyDailyHpSettlement({
      level: 1,
      currentHp: 93,
      focusedMinutes: 4,
      goalMinutes: 180,
      hpDeltaCarry: dayOne.nextCarry,
      penaltyAlreadyAppliedForDay: false,
    });

    expect(dayTwo.appliedDelta).toBe(-8);
  });

  it('does not lose hp when goal is met', () => {
    const settled = applyDailyHpSettlement({
      level: 1,
      currentHp: 40,
      focusedMinutes: 180,
      goalMinutes: 180,
      hpDeltaCarry: -0.95,
      penaltyAlreadyAppliedForDay: false,
    });

    expect(settled.appliedDelta).toBeGreaterThanOrEqual(0);
    expect(settled.nextHp).toBeGreaterThanOrEqual(40);
  });
});
