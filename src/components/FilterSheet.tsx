'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ArrowUp, ArrowDown, Tag } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { translateExpenseCategory } from '@/lib/translations';
import DOMPurify from 'dompurify';

interface FilterOption {
  id: string;
  name: string;
  color?: string;
}

interface SortOption {
  field: string;
  label: string;
}

interface FilterSheetProps {
  title: string;
  sortOptions: SortOption[];
  filterOptions: FilterOption[];
  currentSortField?: string;
  currentSortOrder: 'asc' | 'desc';
  currentFilter: string;
  onSortFieldChange: (field: string) => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onFilterChange: (filter: string) => void;
}

// Function to validate and sanitize CSS color values
const isValidColor = (color: string): boolean => {
  // Check if it's a valid hex color (3 or 6 digits with optional #)
  const hexRegex = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

  // Check if it's a valid named color (basic CSS colors)
  const namedColors = [
    'black', 'silver', 'gray', 'white', 'maroon', 'red', 'purple', 'fuchsia',
    'green', 'lime', 'olive', 'yellow', 'navy', 'blue', 'teal', 'aqua',
    'orange', 'aliceblue', 'antiquewhite', 'aquamarine', 'azure', 'beige',
    'bisque', 'blanchedalmond', 'blueviolet', 'brown', 'burlywood', 'cadetblue',
    'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson',
    'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen',
    'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid',
    'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
    'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray',
    'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'gainsboro',
    'ghostwhite', 'gold', 'goldenrod', 'greenyellow', 'honeydew', 'hotpink',
    'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush',
    'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
    'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightpink',
    'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
    'lightsteelblue', 'lightyellow', 'limegreen', 'linen', 'magenta',
    'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
    'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
    'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin',
    'navajowhite', 'oldlace', 'olivedrab', 'orangered', 'orchid',
    'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
    'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue',
    'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown',
    'seagreen', 'seashell', 'sienna', 'skyblue', 'slateblue', 'slategray',
    'snow', 'springgreen', 'steelblue', 'tan', 'thistle', 'tomato',
    'turquoise', 'violet', 'wheat', 'whitesmoke', 'yellowgreen'
  ];

  // Check if it's a valid rgb/rgba color
  const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
  const rgbaRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0|0?\.\d+|1(?:\.0)?)\s*\)$/;

  return (
    hexRegex.test(color) || 
    namedColors.includes(color.toLowerCase()) || 
    rgbRegex.test(color) || 
    rgbaRegex.test(color)
  );
};

// Function to sanitize a color value
const sanitizeColor = (color: string): string => {
  // First sanitize with DOMPurify to remove any potential XSS
  const sanitized = DOMPurify.sanitize(color);

  // Then validate if it's a valid CSS color
  if (isValidColor(sanitized)) {
    return sanitized;
  }

  // Return a safe default color if the input is not valid
  return '#6366f1'; // Default indigo color
};

export function FilterSheet({
  title,
  sortOptions,
  filterOptions,
  currentSortField,
  currentSortOrder,
  currentFilter,
  onSortFieldChange,
  onSortOrderChange,
  onFilterChange,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [tempSortField, setTempSortField] = useState(currentSortField);
  const [tempSortOrder, setTempSortOrder] = useState(currentSortOrder);
  const [tempFilter, setTempFilter] = useState(currentFilter);
  const { lang } = useParams();

  // Define a more specific type for the dictionary
  interface Dictionary {
    filter_sheet?: {
      sort_by?: string;
      filter_by?: string;
      all?: string;
      reset?: string;
      apply_filters?: string;
    };
    [key: string]: any; // Allow other keys for flexibility
  }

  const [dictionary, setDictionary] = useState<Dictionary>({});

  // Use a ref to track if we've already loaded the dictionary for this language
  const loadedLangRef = React.useRef<string | null>(null);

  useEffect(() => {
    // Only load the dictionary if the language has changed or hasn't been loaded yet
    if (loadedLangRef.current !== lang) {
      async function loadDictionary() {
        try {
          const dict = await getDictionary(lang as 'en' | 'sq');
          setDictionary(dict);
          // Update the ref to track that we've loaded this language
          loadedLangRef.current = lang as string;
        } catch (error) {
          console.error('Failed to load dictionary:', error);
        }
      }
      loadDictionary();
    }
  }, [lang]);

  const handleSortClick = (field: string) => {
    if (field === tempSortField) {
      setTempSortOrder(tempSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTempSortField(field);
      setTempSortOrder('desc');
    }
  };

  const getFilterBadgeStyle = (id: string, isSelected: boolean) => {
    const baseStyle = "px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer flex items-center gap-2 ";
    const selectedStyle = "ring-2 ring-offset-2 ";

    if (id === 'all') {
      return baseStyle + (isSelected 
        ? "bg-gray-200 text-gray-800 ring-gray-400" 
        : "bg-gray-100 text-gray-600 hover:bg-gray-200");
    }

    const option = filterOptions.find(opt => opt.id === id);
    // Sanitize the color value to prevent XSS
    const color = sanitizeColor(option?.color || '#6366f1');

    // Use a safer approach for dynamic classes with sanitized values
    const selectedClass = "bg-[#ff5a5f] text-white ring-[#ff5a5f]";

    // For non-selected state, use a safer approach with sanitized color
    let nonSelectedClass = "";
    if (isValidColor(color)) {
      // Only use the color if it's valid
      nonSelectedClass = `bg-[${color}]/10 text-[${color}] hover:bg-[${color}]/20`;
    } else {
      // Fallback to a safe default
      nonSelectedClass = "bg-indigo-100 text-indigo-800 hover:bg-indigo-200";
    }

    return baseStyle + (isSelected ? selectedClass : nonSelectedClass);
  };

  const handleApplyFilters = () => {
    if (tempSortField) onSortFieldChange(tempSortField);
    onSortOrderChange(tempSortOrder);
    onFilterChange(tempFilter);
    setOpen(false);
  };

  const handleReset = () => {
    setTempSortField(sortOptions[0].field);
    setTempSortOrder('desc');
    setTempFilter('all');
    onSortFieldChange(sortOptions[0].field);
    onSortOrderChange('desc');
    onFilterChange('all');
    setOpen(false);
  };

  // Get translations with fallbacks
  const sortByText = dictionary?.filter_sheet?.sort_by || "Sort by";
  const filterByText = dictionary?.filter_sheet?.filter_by || "Filter by";
  const allText = dictionary?.filter_sheet?.all || "All";
  const resetText = dictionary?.filter_sheet?.reset || "Reset";
  const applyFiltersText = dictionary?.filter_sheet?.apply_filters || "Apply Filters";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[450px] rounded-t-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-2 px-4 pb-4">
          {/* Sort Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{sortByText}</label>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <div 
                  key={option.field}
                  onClick={() => handleSortClick(option.field)}
                  className={`flex items-center justify-between px-4 py-2 rounded-lg border cursor-pointer
                             transition-all hover:bg-gray-50
                             ${tempSortField === option.field ? 'border-[#ff5a5f] text-[#ff5a5f]' : 'border-gray-200'}`}
                >
                  <span>{option.label}</span>
                  {tempSortField === option.field && (
                    tempSortOrder === 'asc' ? (
                      <ArrowUp className="h-4 w-4 text-[#ff5a5f]" />
                    ) : (
                      <ArrowDown className="h-4 w-4 text-[#ff5a5f]" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filter Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{filterByText}</label>
            <div className="flex flex-wrap gap-2">
              <div
                onClick={() => setTempFilter('all')}
                className={getFilterBadgeStyle('all', tempFilter === 'all')}
              >
                <Tag className="h-4 w-4" />
                <span>{allText}</span>
              </div>
              {filterOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => setTempFilter(option.id)}
                  className={getFilterBadgeStyle(option.id, tempFilter === option.id)}
                >
                  <Tag className="h-4 w-4" />
                  <span>{translateExpenseCategory(option.name, dictionary, lang as string)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleReset}
            >
              {resetText}
            </Button>
            <Button 
              className="flex-1 bg-[#ff5a5f] hover:bg-[#ff5a5f]/90" 
              onClick={handleApplyFilters}
            >
              {applyFiltersText}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
