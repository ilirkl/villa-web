const dictionaries = {
  en: () => import('../../public/locales/en/common.json').then((module) => module.default),
  sq: () => import('../../public/locales/sq/common.json').then((module) => module.default),
};

export const getDictionary = async (locale: 'en' | 'sq') => {
  return dictionaries[locale]();
};
