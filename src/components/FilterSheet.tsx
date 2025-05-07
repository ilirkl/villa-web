'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ArrowUp, ArrowDown, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { translateExpenseCategory } from '@/lib/translations';

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
  const [dictionary, setDictionary] = useState<any>({});

  useEffect(() => {
    async function loadDictionary() {
      try {
        const dict = await getDictionary(lang as 'en' | 'sq');
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }
    }
    loadDictionary();
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
    const color = option?.color || '#6366f1';
    
    return baseStyle + (isSelected 
      ? `bg-[${color}] text-white ring-[${color}]` 
      : `bg-[${color}]/10 text-[${color}] hover:bg-[${color}]/20`);
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


