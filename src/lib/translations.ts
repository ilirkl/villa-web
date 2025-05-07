/**
 * Translates an expense category using the dictionary
 * @param categoryName The original category name from the database (in Albanian)
 * @param dictionary The loaded dictionary object
 * @param lang The current language code ('en' or 'sq')
 * @returns The translated category name or the original if translation not found
 */
export function translateExpenseCategory(
  categoryName: string | null | undefined, 
  dictionary: any, 
  lang: string
): string {
  if (!categoryName) return dictionary?.uncategorized || 'Uncategorized';
  
  // If language is Albanian, return the original name
  if (lang === 'sq') return categoryName;
  
  // If language is English, return the translation if available
  return dictionary?.expense_categories?.[categoryName] || categoryName;
}