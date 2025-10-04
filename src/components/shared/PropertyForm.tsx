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

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  property?: {
    id: string;
    name: string;
    address?: string;
    description?: string;
  };
  dictionary?: any;
}

export function PropertyForm({ open, onOpenChange, onSuccess, property, dictionary = {} }: PropertyFormProps) {
  const [name, setName] = useState(property?.name || '');
  const [address, setAddress] = useState(property?.address || '');
  const [description, setDescription] = useState(property?.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const resetForm = () => {
    setName(property?.name || '');
    setAddress(property?.address || '');
    setDescription(property?.description || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert(dictionary.property_name_required || 'Property name is required');
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {property ? (dictionary.edit_property || 'Edit Property') : (dictionary.add_new_property || 'Add New Property')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{dictionary.property_name || 'Property Name'} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={dictionary.property_name_placeholder || 'Enter property name'}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">{dictionary.property_address || 'Property Address'}</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={dictionary.property_address_placeholder || 'Enter property address'}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (dictionary.saving || 'Saving...') : (property ? (dictionary.update || 'Update') : (dictionary.create || 'Create'))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}