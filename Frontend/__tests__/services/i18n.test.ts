import i18n, { changeLanguage } from '../../lib/i18n';

describe('i18n Localization Engine', () => {
  it('translates common keys into English by default', async () => {
    await changeLanguage('en');
    expect(i18n.t('common.loading')).toBe('Loading...');
    expect(i18n.t('common.retry')).toBe('Try Again');
    expect(i18n.t('tasks.title')).toBe('Quests & Tasks');
    expect(i18n.t('tasks.createTask')).toBe('Create New Quest');
  });

  it('translates common keys into Hindi when language is switched', async () => {
    await changeLanguage('hi');
    expect(i18n.t('common.loading')).toBe('लोड हो रहा है...');
    expect(i18n.t('common.retry')).toBe('पुनः प्रयास करें');
    expect(i18n.t('tasks.title')).toBe('मिशन और कार्य');
    expect(i18n.t('tasks.createTask')).toBe('नया मिशन बनाएं');
    expect(i18n.t('common.offline')).toBe('ऑफ़लाइन मोड');
  });

  it('interpolates counts and parameters correctly in both languages', async () => {
    await changeLanguage('en');
    expect(i18n.t('gamification.level', { level: 5 })).toBe('Level 5');
    expect(i18n.t('rewards.availableXp', { xp: 250 })).toBe('Your Balance: 250 XP');

    await changeLanguage('hi');
    expect(i18n.t('gamification.level', { level: 5 })).toBe('लेवल 5');
    expect(i18n.t('rewards.availableXp', { xp: 250 })).toBe('कुल शेष: 250 XP');
  });
});

