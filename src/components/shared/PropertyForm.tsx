'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generatePropertyIcon } from '@/lib/property-utils';

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  property?: {
    id: string;
    name: string;
    address?: string;
    description?: string;
    color?: string;
  };
  dictionary?: any;
  userPropertyCount?: number;
}

export function PropertyForm({ open, onOpenChange, onSuccess, property, userPropertyCount = 0, dictionary = {} }: PropertyFormProps) {
  const [name, setName] = useState(property?.name || '');
  const [address, setAddress] = useState(property?.address || '');
  const [description, setDescription] = useState(property?.description || '');
  const [selectedColor, setSelectedColor] = useState(property?.color || '#3b82f6');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Check if user has reached the property limit (5 properties)
  const hasReachedLimit = !property && userPropertyCount >= 5;

  const resetForm = () => {
    setName(property?.name || '');
    setAddress(property?.address || '');
    setDescription(property?.description || '');
    setSelectedColor(property?.color || '#3b82f6');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert(dictionary.property_name_required || 'Property name is required');
      return;
    }

    // Check property limit for new properties
    if (!property && hasReachedLimit) {
      alert(dictionary.property_limit_reached || 'You have reached the maximum limit of 5 properties');
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert(dictionary.must_be_logged_in || 'You must be logged in to create a property');
        return;
      }

      if (property) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update({
            name: name.trim(),
            address: address.trim() || null,
            description: description.trim() || null,
            color: selectedColor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', property.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new property
        const { error } = await supabase
          .from('properties')
          .insert({
            name: name.trim(),
            address: address.trim() || null,
            description: description.trim() || null,
            color: selectedColor,
            user_id: user.id,
          });

        if (error) throw error;
      }

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving property:', error);
      alert(dictionary.failed_to_save_property || 'Failed to save property. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Generate property icon preview
  const propertyIcon = {
    initial: generatePropertyIcon(name || '?').initial,
    color: selectedColor
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {property ? (dictionary.edit_property || 'Edit Property') : (dictionary.add_new_property || 'Add New Property')}
          </DialogTitle>
        </DialogHeader>

        {hasReachedLimit && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-yellow-800 text-sm">
              {dictionary.property_limit_reached_message || 'You have reached the maximum limit of 5 properties. Please delete an existing property before creating a new one.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property Icon Preview */}
          <div className="flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md transition-colors duration-200"
              style={{ backgroundColor: propertyIcon.color }}
            >
              {propertyIcon.initial}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Property Color</Label>
            <div className="flex flex-wrap gap-2">
              {[
                '#3b82f6', // Blue (Default)
                '#ef4444', // Red
                '#10b981', // Emerald
                '#f59e0b', // Amber
                '#8b5cf6', // Violet
                '#ec4899', // Pink
                '#06b6d4', // Cyan
                '#f97316', // Orange
                '#6366f1', // Indigo
                '#84cc16', // Lime
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${(selectedColor || '#3b82f6') === color
                      ? 'border-black scale-110 ring-2 ring-offset-2 ring-black/20'
                      : 'border-transparent hover:scale-105'
                    }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{dictionary.property_name || 'Property Name'} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={dictionary.property_name_placeholder || 'Enter property name'}
              required
              disabled={hasReachedLimit && !property}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{dictionary.property_address || 'Property Address'}</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={dictionary.property_address_placeholder || 'Enter property address'}
              disabled={hasReachedLimit && !property}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{dictionary.property_description || 'Property Description'}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={dictionary.property_description_placeholder || 'Enter property description (optional)'}
              rows={3}
              disabled={hasReachedLimit && !property}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {dictionary.cancel || 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (hasReachedLimit && !property)}
            >
              {isLoading ? (dictionary.saving || 'Saving...') : (property ? (dictionary.update || 'Update') : (dictionary.create || 'Create'))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}