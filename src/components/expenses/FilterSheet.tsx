import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, ArrowUp, ArrowDown, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { ExpenseCategory } from "@/lib/definitions";

interface FilterSheetProps {
  onSortFieldChange: (field: 'date' | 'amount') => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onCategoryChange: (categoryId: string) => void;
  currentSortField: 'date' | 'amount';
  currentSortOrder: 'asc' | 'desc';
  currentCategory: string;
}

export function FilterSheet({
  onSortFieldChange,
  onSortOrderChange,
  onCategoryChange,
  currentSortField,
  currentSortOrder,
  currentCategory
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [tempSortField, setTempSortField] = useState(currentSortField);
  const [tempSortOrder, setTempSortOrder] = useState(currentSortOrder);
  const [tempCategory, setTempCategory] = useState(currentCategory);

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
      
      if (data) {
        setCategories(data);
      }
    };

    fetchCategories();
  }, []);

  const handleSortClick = (field: 'date' | 'amount') => {
    if (field === tempSortField) {
      setTempSortOrder(tempSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTempSortField(field);
      setTempSortOrder('desc');
    }
  };

  const getCategoryBadgeStyle = (categoryName: string, isSelected: boolean) => {
    const baseStyle = "px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ";
    const selectedStyle = "ring-2 ring-offset-2 ";
    
    if (categoryName === 'all') {
      return baseStyle + (isSelected 
        ? "bg-gray-200 text-gray-800 ring-gray-400" 
        : "bg-gray-100 text-gray-600 hover:bg-gray-200");
    }

    let color;
    switch (categoryName.toLowerCase()) {
      case 'furnizim':
        color = '#34d399'; // Green
        break;
      case 'mirembajtje':
        color = '#f59e0b'; // Amber
        break;
      case 'pastrim':
        color = '#3b82f6'; // Blue
        break;
      case 'komunalite':
        color = '#8b5cf6'; // Purple
        break;
      case 'taksa':
        color = '#ef4444'; // Red
        break;
      case 'komision':
        color = '#ec4899'; // Pink
        break;
      case 'tjera':
        color = '#6b7280'; // Gray
        break;
      default:
        color = '#6b7280'; // Default gray
    }
    
    return baseStyle + (isSelected 
      ? `bg-[${color}] text-white ring-[${color}]` 
      : `bg-[${color}]/10 text-[${color}] hover:bg-[${color}]/20`);
  };

  const handleApplyFilters = () => {
    onSortFieldChange(tempSortField);
    onSortOrderChange(tempSortOrder);
    onCategoryChange(tempCategory);
    setOpen(false);
  };

  const handleReset = () => {
    setTempSortField('date');
    setTempSortOrder('desc');
    setTempCategory('all');
    onSortFieldChange('date');
    onSortOrderChange('desc');
    onCategoryChange('all');
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[450px] rounded-t-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center">Filter Expenses</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-2 px-4 pb-4">
          {/* Sort Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort by</label>
            <div className="space-y-2">
              {/* Date Sort */}
              <div 
                onClick={() => handleSortClick('date')}
                className={`flex items-center justify-between px-4 py-2 rounded-lg border cursor-pointer
                           transition-all hover:bg-gray-50
                           ${tempSortField === 'date' ? 'border-[#ff5a5f] text-[#ff5a5f]' : 'border-gray-200'}`}
              >
                <span>Date</span>
                {tempSortField === 'date' && (
                  tempSortOrder === 'asc' ? (
                    <ArrowUp className="h-4 w-4 text-[#ff5a5f]" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-[#ff5a5f]" />
                  )
                )}
              </div>
              
              {/* Amount Sort */}
              <div 
                onClick={() => handleSortClick('amount')}
                className={`flex items-center justify-between px-4 py-2 rounded-lg border cursor-pointer
                           transition-all hover:bg-gray-50
                           ${tempSortField === 'amount' ? 'border-[#ff5a5f] text-[#ff5a5f]' : 'border-gray-200'}`}
              >
                <span>Amount</span>
                {tempSortField === 'amount' && (
                  tempSortOrder === 'asc' ? (
                    <ArrowUp className="h-4 w-4 text-[#ff5a5f]" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-[#ff5a5f]" />
                  )
                )}
              </div>
            </div>
          </div>

          {/* Category Filter Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Category</label>
            <div className="flex flex-wrap gap-2">
              <div
                onClick={() => setTempCategory('all')}
                className={getCategoryBadgeStyle('all', tempCategory === 'all')}
              >
                All Categories
              </div>
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => setTempCategory(category.id)}
                  className={getCategoryBadgeStyle(category.name, tempCategory === category.id)}
                >
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {category.name}
                  </div>
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
              Reset
            </Button>
            <Button 
              className="flex-1 bg-[#ff5a5f] hover:bg-[#ff5a5f]/90" 
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


