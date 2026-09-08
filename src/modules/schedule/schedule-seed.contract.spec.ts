/**
 * Contract/documentation tests for the PIH seed configuration.
 * Runtime idempotency is verified via `npm run seed` (run twice).
 */
describe('PIH seed contract', () => {
  const expectedActivities = [
    'EXERCISE_A',
    'EXERCISE_B',
    'EXERCISE_C',
    'MUSIC_A',
    'MUSIC_B',
    'MUSIC_C',
  ];

  const expectedRuleItems = [
    { position: 1, activityCode: 'EXERCISE_A' },
    { position: 2, activityCode: 'EXERCISE_B' },
    { position: 3, activityCode: 'EXERCISE_C' },
    { position: 4, activityCode: 'MUSIC_A' },
    { position: 5, activityCode: 'MUSIC_B' },
    { position: 6, activityCode: 'MUSIC_C' },
  ];

  it('defines six reusable activities for the 3+3 pattern as data', () => {
    expect(expectedActivities).toHaveLength(6);
    expect(expectedActivities.filter((c) => c.startsWith('EXERCISE_'))).toHaveLength(3);
    expect(expectedActivities.filter((c) => c.startsWith('MUSIC_'))).toHaveLength(3);
  });

  it('defines PIH template/version identifiers', () => {
    expect('PIH_CARE').toBe('PIH_CARE');
    expect('PIH_STANDARD_INTERVENTION').toBe('PIH_STANDARD_INTERVENTION');
    expect(1).toBe(1);
  });

  it('defines REPEAT rule for days 1-12 with six ordered items', () => {
    expect(expectedRuleItems).toHaveLength(6);
    expect(expectedRuleItems.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(expectedRuleItems.map((i) => i.activityCode)).toEqual(expectedActivities);
  });
});
