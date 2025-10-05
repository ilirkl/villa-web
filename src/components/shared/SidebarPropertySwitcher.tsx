'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Building, ChevronUp } from 'lucide-react';
import { PropertyForm } from './PropertyForm';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { generatePropertyIcon } from '@/lib/property-utils';

interface Property {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
}

interface SidebarPropertySwitcherProps {
  onPropertyChange?: (propertyId: string) => void;
  dictionary?: any;
}

export function SidebarPropertySwitcher({ onPropertyChange, dictionary = {} }: SidebarPropertySwitcherProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const supabase = createClient();
  
  const params = useParams();
  const lang = params?.lang as string || 'en';

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    // Set initial selected property from localStorage, cookies, or first property
    if (properties.length > 0 && !selectedProperty) {
      // Try localStorage first
      let savedPropertyId = localStorage.getItem('selectedPropertyId');
      
      // If not in localStorage, try cookies
      if (!savedPropertyId) {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);
        
        savedPropertyId = cookies['selectedPropertyId'] || null;
      }
      
      const defaultProperty = savedPropertyId
        ? properties.find(p => p.id === savedPropertyId)
        : properties.find(p => p.is_active) || properties[0];
      
      if (defaultProperty) {
        setSelectedProperty(defaultProperty.id);
        localStorage.setItem('selectedPropertyId', defaultProperty.id);
        
        // Also set cookie for server-side access
        document.cookie = `selectedPropertyId=${defaultProperty.id}; path=/; max-age=31536000; SameSite=Lax`;
        
        onPropertyChange?.(defaultProperty.id);
      }
    }
  }, [properties, selectedProperty, onPropertyChange]);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    setSelectedProperty(propertyId);
    localStorage.setItem('selectedPropertyId', propertyId);
    
    // Also set a cookie for server-side access
    document.cookie = `selectedPropertyId=${propertyId}; path=/; max-age=31536000; SameSite=Lax`;
    
    onPropertyChange?.(propertyId);
    
    // Refresh the page to show data for the new property
    window.location.reload();
  };

  const handlePropertyCreated = () => {
    setShowPropertyForm(false);
    loadProperties();
  };

  const getPropertyIcon = (propertyName: string) => {
    return generatePropertyIcon(propertyName);
  };

  const currentProperty = properties.find(p => p.id === selectedProperty);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-t-2 border-[#FF5A5F] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPropertyForm(true)}
          className="flex items-center gap-2 rounded-full p-3"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">{dictionary.add_new_property || 'Add Property'}</span>
        </Button>
        <PropertyForm
          open={showPropertyForm}
          onOpenChange={setShowPropertyForm}
          onSuccess={handlePropertyCreated}
          dictionary={dictionary}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Current Property Icon with Dropdown */}
        {currentProperty && (
          <motion.div
            className={cn(
              "relative cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full transition-all",
              "ring-2 ring-[#FF5A5F] ring-offset-2"
            )}
            style={{
              width: 48,
              height: 48,
            }}
            tabIndex={0}
            onMouseEnter={() => setHoveredProperty(currentProperty.id)}
            onMouseLeave={() => setHoveredProperty(null)}
            onFocus={() => setHoveredProperty(currentProperty.id)}
            onBlur={() => setHoveredProperty(null)}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            animate={{
              scale: hoveredProperty === currentProperty.id ? 1.2 : 1,
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Property avatar */}
            <div
              className={cn(
                "w-full h-full rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center text-lg font-bold relative",
                "bg-[#FF5A5F]/10"
              )}
              style={{ backgroundColor: getPropertyIcon(currentProperty.name).color }}
            >
              {getPropertyIcon(currentProperty.name).initial}
              <ChevronUp
                className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 text-[#FF5A5F] bg-white rounded-full p-0.5 shadow-sm transition-transform",
                  isDropdownOpen ? "rotate-180" : ""
                )}
              />
            </div>

            {/* Tooltip removed as requested */}
          </motion.div>
        )}

        {/* Dropup Menu */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 bottom-full mb-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[200px]"
            >
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {properties.map((property) => (
                  <motion.div
                    key={property.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      selectedProperty === property.id && "bg-[#FF5A5F]/10"
                    )}
                    onClick={() => {
                      handlePropertyChange(property.id);
                      setIsDropdownOpen(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: getPropertyIcon(property.name).color }}
                    >
                      {getPropertyIcon(property.name).initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {property.name}
                      </div>
                      {property.address && (
                        <div className="text-xs text-muted-foreground truncate">
                          {property.address}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {/* Add New Property Button */}
                <motion.div
                  className="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
                  onClick={() => {
                    setShowPropertyForm(true);
                    setIsDropdownOpen(false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-8 h-8 rounded-full bg-background border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="font-medium text-sm text-muted-foreground">
                    {dictionary.add_new_property || 'Add New Property'}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <PropertyForm
        open={showPropertyForm}
        onOpenChange={setShowPropertyForm}
        onSuccess={handlePropertyCreated}
        userPropertyCount={properties.length}
        dictionary={dictionary}
      />
    </div>
  );
}