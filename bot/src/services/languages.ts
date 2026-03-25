import type { SupportedLanguage } from '../i18n/index.js';

const userLanguages = new Map<string, SupportedLanguage>();

export function setLang(telegramId: string, lang: SupportedLanguage) {
  userLanguages.set(telegramId, lang);
}

export function getLang(telegramId: string): SupportedLanguage {
  return userLanguages.get(telegramId) || 'ru';
}
