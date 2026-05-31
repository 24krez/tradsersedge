import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

// Empty language resources to be filled later
const resources = {
  en: {
    common: require('./locales/en/common.json'),
    mission: require('./locales/en/mission.json'),
    debrief: require('./locales/en/debrief.json'),
    progress: require('./locales/en/progress.json'),
    vault: require('./locales/en/vault.json'),
    profile: require('./locales/en/profile.json'),
    notifications: require('./locales/en/notifications.json'),
  },
  es: {
    common: require('./locales/es/common.json'),
    mission: require('./locales/es/mission.json'),
    debrief: require('./locales/es/debrief.json'),
    progress: require('./locales/es/progress.json'),
    vault: require('./locales/es/vault.json'),
    profile: require('./locales/es/profile.json'),
    notifications: require('./locales/es/notifications.json'),
  },
  fr: {
    common: require('./locales/fr/common.json'),
    mission: require('./locales/fr/mission.json'),
    debrief: require('./locales/fr/debrief.json'),
    progress: require('./locales/fr/progress.json'),
    vault: require('./locales/fr/vault.json'),
    profile: require('./locales/fr/profile.json'),
    notifications: require('./locales/fr/notifications.json'),
  },
  de: {
    common: require('./locales/de/common.json'),
    mission: require('./locales/de/mission.json'),
    debrief: require('./locales/de/debrief.json'),
    progress: require('./locales/de/progress.json'),
    vault: require('./locales/de/vault.json'),
    profile: require('./locales/de/profile.json'),
    notifications: require('./locales/de/notifications.json'),
  },
};

const getLocales = () => {
  if (Localization.getLocales) {
    return Localization.getLocales();
  }
  return [{ languageTag: 'en-US', languageCode: 'en', textDirection: 'ltr' as const }];
};

// Fallback to en if no valid locale is found
const locales = getLocales();
const currentLanguage = locales && locales.length > 0 ? locales[0].languageCode : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: currentLanguage || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    compatibilityJSON: 'v4',
  });

// Handle RTL
const isRTL = locales && locales.length > 0 ? locales[0].textDirection === 'rtl' : false;
I18nManager.allowRTL(isRTL);
I18nManager.forceRTL(isRTL);

export default i18n;
