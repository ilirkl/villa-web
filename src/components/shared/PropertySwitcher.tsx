'use client'; // Property switcher component

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Building } from 'lucide-react';
import { PropertyForm } from './PropertyForm';

interface Property {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
}

interface PropertySwitcherProps {
  onPropertyChange?: (propertyId: string) => void;
  dictionary?: any;
}

export function PropertySwitcher({ onPropertyChange, dictionary = {} }: PropertySwitcherProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
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
  };

  const handlePropertyCreated = () => {
    setShowPropertyForm(false);
    loadProperties();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building className="h-4 w-4" />
        <span>{dictionary.loading_properties || 'Loading properties...'}</span>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPropertyForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {dictionary.add_new_property || 'Add New Property'}
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

  // If user has only one property, show it as selected without dropdown
  if (properties.length === 1) {
    const singleProperty = properties[0];
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{singleProperty.name}</span>
          {singleProperty.address && (
            <span className="text-xs text-muted-foreground">
              ({singleProperty.address})
            </span>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPropertyForm(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Building className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedProperty} onValueChange={handlePropertyChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={dictionary.select_property || 'Select a property'} />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{property.name}</span>
                  {property.address && (
                    <span className="text-xs text-muted-foreground">
                      {property.address}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPropertyForm(true)}
        className="flex items-center gap-1"
      >
        <Plus className="h-3 w-3" />
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