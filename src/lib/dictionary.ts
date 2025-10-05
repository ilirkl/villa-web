const dictionaries = {
  en: () => import('../../public/locales/en/common.json').then((module) => module.default),
  sq: () => import('../../public/locales/sq/common.json').then((module) => module.default),
};

export const getDictionary = async (locale: string) => {
  if (locale === 'en' || locale === 'sq') {
    return dictionaries[locale]();
  }
  throw new Error(`Unsupported locale: ${locale}`);
};
