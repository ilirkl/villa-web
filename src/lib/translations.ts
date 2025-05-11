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
  if (!categoryName) return 'Uncategorized';
  
  // If language is Albanian, return the original name
  if (lang === 'sq') return categoryName;
  
  // Debug the dictionary structure
  console.log('Dictionary keys:', Object.keys(dictionary));
  
  // Try to find translations in different possible locations in the dictionary
  let translation = null;
  
  // Option 1: Direct access to expense_categories
  if (dictionary.expense_categories && dictionary.expense_categories[categoryName]) {
    translation = dictionary.expense_categories[categoryName];
  } 
  // Option 2: Nested under common
  else if (dictionary.common && dictionary.common.expense_categories && 
           dictionary.common.expense_categories[categoryName]) {
    translation = dictionary.common.expense_categories[categoryName];
  }
  // Option 3: Flattened structure with dot notation
  else {
    const flatKey = `expense_categories.${categoryName}`;
    if (dictionary[flatKey]) {
      translation = dictionary[flatKey];
    }
  }
  
  console.log(`Translation for "${categoryName}": ${translation || 'not found'}`);
  
  return translation || categoryName;
}

