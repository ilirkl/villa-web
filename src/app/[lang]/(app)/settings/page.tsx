'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Profile as BaseProfile } from '@/lib/definitions';

// Extend the Profile type to include airbnb_ical_url and booking_com_ical_url
type Profile = BaseProfile & {
  airbnb_ical_url?: string | null;
  booking_com_ical_url?: string | null;
};

import { LogOut, Upload, X } from 'lucide-react';
import Image from 'next/image';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getDictionary } from '@/lib/dictionary';
import { resetCsrfToken } from '@/lib/csrf-client';
import { updateProfileClient } from '@/lib/actions/profile-client';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DownloadBackupButton } from '@/components/settings/DownloadBackupButton';
import { IcalSettings } from '@/components/settings/IcalSettings';
import { PropertyForm } from '@/components/shared/PropertyForm';

// Helper function (Unchanged)
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth, mediaHeight,
  );
}


export default function SettingsPage() {
  const params = useParams();
  const lang = params.lang as string;
  const router = useRouter();
  const supabase = createClient();
  
  interface Dictionary {
    expense_categories?: Record<string, string>;
    signing_out?: string;
    
    // Password related
    password_fields_required?: string;
    passwords_do_not_match?: string;
    password_too_short?: string;
    password_update_failed?: string;
    new_password?: string;
    enter_new_password?: string;
    confirm_new_password?: string;
    confirm_new_password_placeholder?: string;
    
    // Save/Loading states
    saving_changes?: string;
    save_changes?: string;
    all_changes_saved_successfully?: string;
    some_changes_failed?: string;
    
    // Profile related
    change_profile_picture?: string;
    avatar?: string;
    remove_avatar?: string;
    profile_information?: string;
    profile_data_not_loaded?: string;
    
    // Form fields
    full_name?: string;
    company_name?: string;
    email?: string;
    email_desc?: string;
    phone_number?: string;
    website?: string;
    vat_number?: string;
    address?: string;
    
    // Image cropping
    crop_image?: string;
    image_to_crop?: string;
    loading_image?: string;
    cancel?: string;
    processing?: string;
    apply_crop?: string;
    
    // Actions
    sign_out?: string;
    are_you_sure?: string;
    delete?: string;
    
    // Property management
    property?: string;
    properties?: string;
    property_management?: string;
    your_properties?: string;
    add_new_property?: string;
    edit_property?: string;
    delete_property?: string;
    property_name?: string;
    property_address?: string;
    property_description?: string;
    property_name_placeholder?: string;
    property_address_placeholder?: string;
    property_description_placeholder?: string;
    property_created?: string;
    property_updated?: string;
    property_deleted?: string;
    cannot_delete_last_property?: string;
    cannot_delete_property_with_data?: string;
    no_property_selected?: string;
    please_select_property_first?: string;
    switch_property?: string;
    loading_properties?: string;
    no_properties_found?: string;
    select_property?: string;
    property_name_required?: string;
    must_be_logged_in?: string;
    failed_to_save_property?: string;
    delete_property_confirmation?: string;
  }
  
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false); // Renamed for clarity
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For image processing
  const [crop, setCrop] = useState<Crop>();
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);

  // Add these state variables to track iCal URLs
  const [airbnbIcalUrl, setAirbnbIcalUrl] = useState<string>('');
  const [bookingComIcalUrl, setBookingComIcalUrl] = useState<string>('');

  // State for password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isPasswordChanging, setIsPasswordChanging] = useState(false); // For password updates

  // Combined loading state for the main save button
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Refs for the forms
  const profileFormRef = useRef<HTMLFormElement>(null);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  // Property management state
  const [properties, setProperties] = useState<Array<{ id: string; name: string; address?: string; description?: string }>>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<{ id: string; name: string; address?: string; description?: string } | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; name: string } | null>(null);


  // --- Image URL Handling (Unchanged) ---
  const getImageUrl = (url: string | null): string => {
    if (!url) return '/default-avatar.png';
    if (url.startsWith('blob:') || url.startsWith('http')) return url;
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(url);
      return data?.publicUrl || '/default-avatar.png';
    } catch (error) { 
      console.error('Error getting public URL:', error); 
      return '/default-avatar.png'; 
    }
  };
  // --- End Image URL Handling ---

  // Handle iCal URL changes from the IcalSettings component
  const handleIcalUrlChange = useCallback((airbnbUrl: string, bookingComUrl: string) => {
    setAirbnbIcalUrl(airbnbUrl);
    setBookingComIcalUrl(bookingComUrl);
  }, []);

  // Load dictionary
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

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication error. Please log in again.');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();

      if (profileError && profileError.code !== 'PGRST116') { // row not found is ok
        throw new Error(`Error loading profile: ${profileError.message}`);
      }

      if (!profileData) {
        console.log("No profile found for user, creating one...");
        const { data: newProfile, error: createError } = await supabase
          .from('profiles').insert([{ id: user.id, email: user.email, updated_at: new Date().toISOString() }]).select().single();
        if (createError) throw new Error(`Error creating profile: ${createError.message}`);
        setProfile(newProfile);
      } else {
        setProfile(profileData);
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred loading profile.');
      console.error('Error in fetchProfile:', error);
      if (error.message.includes('Authentication error')) router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  // Load profile and properties on component mount
  useEffect(() => {
    fetchProfile();
    loadProperties();
  }, [fetchProfile]);

  // Function to load properties
  const loadProperties = useCallback(async () => {
    try {
      setIsLoadingProperties(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setIsLoadingProperties(false);
    }
  }, [supabase]);

  // Function to handle property deletion
  const handleDeleteProperty = async (propertyId: string) => {
    try {
      // Check if this is the last property
      if (properties.length <= 1) {
        toast.error(dictionary?.cannot_delete_last_property || 'Cannot delete the last property');
        return;
      }

      // Check if there are any bookings or expenses associated with this property
      const [bookingsRes, expensesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id')
          .eq('property_id', propertyId)
          .limit(1),
        supabase
          .from('expenses')
          .select('id')
          .eq('property_id', propertyId)
          .limit(1)
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      if (bookingsRes.data.length > 0 || expensesRes.data.length > 0) {
        toast.error(dictionary?.cannot_delete_property_with_data || 'Cannot delete property with existing bookings or expenses');
        return;
      }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      toast.success(dictionary?.property_deleted || 'Property deleted successfully');
      loadProperties(); // Refresh the properties list
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast.error(error.message || 'Failed to delete property');
    } finally {
      setPropertyToDelete(null);
    }
  };

  // Function to handle property edit
  const handleEditProperty = (property: { id: string; name: string }) => {
    setEditingProperty(property);
    setIsPropertyModalOpen(true);
  };

  // Function to handle property form success
  const handlePropertyFormSuccess = () => {
    setIsPropertyModalOpen(false);
    setEditingProperty(null);
    loadProperties(); // Refresh the properties list
  };

  // Set initial iCal URLs when profile loads
  useEffect(() => {
    if (profile) {
      setAirbnbIcalUrl(profile.airbnb_ical_url || '');
      setBookingComIcalUrl(profile.booking_com_ical_url || '');
    }
  }, [profile]);

  // --- Image Cropping Utility (RESTORED FULL IMPLEMENTATION) ---
  const getCroppedImg = useCallback(async (
    imageElement: HTMLImageElement,
    cropData: Crop,
    fileName: string = 'avatar.jpg'
  ): Promise<File | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error("Failed to get canvas 2D context for cropping.");
      toast.error('Failed to prepare image for cropping.');
      return null;
    }

    const scaleX = imageElement.naturalWidth / imageElement.width;
    const scaleY = imageElement.naturalHeight / imageElement.height;
    const pixelRatio = window.devicePixelRatio || 1;

    // Calculate crop dimensions in terms of the *natural* image size
    let naturalCropX = 0, naturalCropY = 0, naturalCropWidth = 0, naturalCropHeight = 0;
    if (cropData.unit === '%') {
      naturalCropX = (cropData.x / 100) * imageElement.naturalWidth;
      naturalCropY = (cropData.y / 100) * imageElement.naturalHeight;
      naturalCropWidth = (cropData.width / 100) * imageElement.naturalWidth;
      naturalCropHeight = (cropData.height / 100) * imageElement.naturalHeight;
    } else { // Assuming 'px' relative to displayed size
      naturalCropX = cropData.x * scaleX;
      naturalCropY = cropData.y * scaleY;
      naturalCropWidth = cropData.width * scaleX;
      naturalCropHeight = cropData.height * scaleY;
    }

    // --- Validation ---
    if (!naturalCropWidth || !naturalCropHeight || naturalCropWidth <= 0 || naturalCropHeight <= 0) {
      console.error("Invalid natural crop dimensions:", { naturalCropWidth, naturalCropHeight, cropData });
      toast.error("Invalid crop selection resulting in zero dimensions.");
      return null;
    }
    // Optional: Check bounds and clamp/warn (ReactCrop usually handles this)
    if (naturalCropX < 0 || naturalCropY < 0 ||
       naturalCropX + naturalCropWidth > imageElement.naturalWidth ||
       naturalCropY + naturalCropHeight > imageElement.naturalHeight) {
      console.warn("Crop area might be slightly outside image bounds.", { /* ... */ });
      // Clamping might be needed depending on ReactCrop behavior
      // naturalCropX = Math.max(0, naturalCropX); ... etc.
    }

    // --- Set Canvas Dimensions ---
    canvas.width = Math.floor(naturalCropWidth * pixelRatio);
    canvas.height = Math.floor(naturalCropHeight * pixelRatio);

    // --- Prepare Context ---
    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    // --- Diagnostic: Fill Background ---
    ctx.fillStyle = 'white'; // Fill with white for diagnosis
    ctx.fillRect(0, 0, naturalCropWidth, naturalCropHeight);

    console.log('Drawing cropped image:', { /* ... source/dest info ... */ });

    try {
      // --- Draw the Cropped Area ---
      ctx.drawImage(
        imageElement,
        naturalCropX, naturalCropY, naturalCropWidth, naturalCropHeight, // Source rect
        0, 0, naturalCropWidth, naturalCropHeight // Destination rect
      );
    } catch (e) {
      console.error("Error during ctx.drawImage in getCroppedImg:", e);
      toast.error("Error occurred drawing the cropped image.");
      return null;
    }

    // --- Convert to Blob ---
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Canvas toBlob failed in getCroppedImg');
            reject(new Error('Failed to create image blob from cropped canvas.'));
            return;
          }
          console.log("Cropped blob created, size:", blob.size);
          resolve(new File([blob], fileName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.9
      );
    });
  }, []); // Dependency array for useCallback - add dependencies if needed
  // --- End Image Cropping Utility ---

  // --- Image Resizing Utility (RESTORED FULL IMPLEMENTATION) ---
  const resizeImage = useCallback(async (file: File, targetSize: number = 200): Promise<File> => {
    console.log("Resizing image:", file.name, "Target size:", targetSize);
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error("Failed to get canvas context for resizing.");
        return reject(new Error('Failed to get canvas context for resizing'));
      }

      img.onload = () => {
        console.log("Image loaded for resizing:", img.width, "x", img.height);
        try {
          canvas.width = targetSize;
          canvas.height = targetSize;

          // --- Diagnostic: Fill Background ---
          ctx.fillStyle = 'white'; // Fill with white for diagnosis
          ctx.fillRect(0, 0, targetSize, targetSize);

          // --- Draw Resized Image ---
          console.log("Drawing resized image...");
          ctx.drawImage(
            img, 0, 0, img.width, img.height, // Source (full loaded image)
            0, 0, targetSize, targetSize // Destination (scaled to canvas)
          );

          // --- Convert to Blob ---
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                console.error("Canvas toBlob failed after resize.");
                return reject(new Error('Failed to create blob after resize'));
              }
              console.log("Resized blob created, size:", blob.size);
              const resizedFile = new File([blob], `resized_${file.name}`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            }, 'image/jpeg', 0.9
          );
        } catch (error) {
          console.error("Error during resize draw/blob:", error);
          reject(error);
        } finally {
          URL.revokeObjectURL(img.src); // Cleanup object URL
        }
      };

      img.onerror = (error) => {
        URL.revokeObjectURL(img.src);
        console.error("!!! Error loading image for resizing:", error);
        reject(new Error('Failed to load intermediate cropped image for resizing.'));
      };

      // --- Load the Input File (Cropped Image) ---
      const objectURL = URL.createObjectURL(file);
      console.log("Created object URL for resizing:", objectURL);
      img.src = objectURL;
    });
  }, []); // Dependency array for useCallback - add dependencies if needed
  // --- End Image Resizing Utility ---


  // --- Event Handlers ---
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Add file type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }
    
    // Add file size validation (existing code is good)
    if (file.size > 5 * 1024 * 1024) { 
      toast.error('Image size must be less than 5MB.'); 
      return; 
    }
    setCrop(undefined);
    if (avatarPreview?.startsWith('blob:')) { URL.revokeObjectURL(avatarPreview); }
    setAvatarPreview(null);
    setAvatarFile(null);
    setImageToCrop(null);

    if (file.size > 5 * 1024 * 1024) { toast.error('Image size < 5MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setIsCropDialogOpen(true);
    };
    reader.onerror = () => { console.error("FileReader error"); toast.error("Failed to read file."); };
    reader.readAsDataURL(file);
    e.target.value = ''; // Allow re-selecting same file
  };

  const handleCropComplete = async () => {
    if (!crop || !imgRef.current) {
      toast.error('Crop data or image ref missing.'); return;
    }
    // Basic dimension check (more robust checks in getCroppedImg)
    if(!crop.width || !crop.height){
        toast.error('Invalid crop selection.'); return;
    }

    setIsProcessing(true);
    console.log("Processing cropped image...");

    try {
      // *** Step 1: Crop ***
      const croppedFile = await getCroppedImg(imgRef.current, crop, 'cropped_avatar.jpg');
      if (!croppedFile) {
        throw new Error('Failed to generate cropped image file.');
      }

      // *** Step 2: Resize (Optional - uncomment to enable) ***
      const finalFile = await resizeImage(croppedFile, 200);
      // const finalFile = croppedFile; // Use this line to SKIP resize

      // *** Step 3: Update State ***
      const previewUrl = URL.createObjectURL(finalFile);
      if (avatarPreview?.startsWith('blob:')) { URL.revokeObjectURL(avatarPreview); }
      setAvatarFile(finalFile);
      setAvatarPreview(previewUrl);

      // Adjust message based on whether resize happened
      toast.success('Avatar processed successfully.'); // General message

    } catch (error: any) {
      console.error('Error during handleCropComplete:', error);
      toast.error(`Failed to process image: ${error.message || 'Unknown error'}`);
    } finally {
      setImageToCrop(null);
      setIsProcessing(false);
      setIsCropDialogOpen(false);
      setCrop(undefined);
    }
  };

  const removeAvatar = () => {
    if (avatarPreview?.startsWith('blob:')) { URL.revokeObjectURL(avatarPreview); }
    setAvatarFile(null);
    setAvatarPreview(null);
    if (profile) { setProfile({ ...profile, avatar_url: null }); }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!profile?.id) { toast.error("User profile not loaded."); return null; }
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${profile.id}/avatar-${Date.now()}.${fileExt}`;
    setIsUploading(true);
    try {
      const { data, error: uploadError } = await supabase.storage
        .from('avatars').upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      return fileName; // Return path
    } catch (error: any) {
      console.error('Error in uploadAvatar:', error);
      toast.error(error.message || 'Error uploading avatar.');
      return null;
    } finally { setIsUploading(false); }
  };

  // Profile update handler (now internal, called by handleSaveAllChanges)
  const saveProfileChanges = useCallback(async () => {
    if (!profile) {
      toast.error('Profile data is not loaded.');
      return false;
    }
    setIsSavingProfile(true);
    try {
      let finalAvatarPath: string | null | undefined = profile.avatar_url;
      if (avatarFile) {
        const uploadedPath = await uploadAvatar(avatarFile);
        if (uploadedPath) {
          finalAvatarPath = uploadedPath;
        } else {
          throw new Error('Avatar upload failed. Profile changes not saved.');
        }
      }

      const updates = {
          full_name: profile.full_name,
          company_name: profile.company_name,
          email: profile.email,
          phone_number: profile.phone_number,
          website: profile.website,
          vat_number: profile.vat_number,
          address: profile.address,
          avatar_url: finalAvatarPath,
          // Add iCal URLs to the updates
          airbnb_ical_url: airbnbIcalUrl,
          booking_com_ical_url: bookingComIcalUrl,
          updated_at: new Date().toISOString(),
      };

      const { success, error } = await updateProfileClient(updates);
      
      if (!success) {
        throw new Error(error?.message || 'Failed to update profile');
      }

      setProfile((prev: Profile | null) => prev ? { ...prev, ...updates } : null);
      setAvatarFile(null);
      if (avatarPreview?.startsWith('blob:')) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(getImageUrl(finalAvatarPath || null));
      }
      return true; // Success
    } catch (error: any) {
      console.error('Error during profile save:', error);
      toast.error(error.message || 'Error updating profile');
      return false; // Failure
    } finally {
      setIsSavingProfile(false);
    }
  }, [profile, avatarFile, airbnbIcalUrl, bookingComIcalUrl, uploadAvatar, updateProfileClient, avatarPreview, getImageUrl]);

  // Password change handler (now internal, called by handleSaveAllChanges)
  const savePasswordChanges = useCallback(async () => {
    if (!newPassword && !confirmNewPassword) {
      // No password entered, skip password update
      return true; // Consider it successful as nothing was changed
    }

    setIsPasswordChanging(true);
    try {
      if (!newPassword || !confirmNewPassword) {
        toast.error(dictionary?.password_fields_required || 'Please fill in both password fields.');
        return false;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error(dictionary?.passwords_do_not_match || 'New passwords do not match.');
        return false;
      }
      if (newPassword.length < 6) { 
        toast.error(dictionary?.password_too_short || 'Password must be at least 6 characters.');
        return false;
      }

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setNewPassword('');
      setConfirmNewPassword('');
      return true; // Success
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || dictionary?.password_update_failed || 'Failed to update password.');
      return false; // Failure
    } finally {
      setIsPasswordChanging(false);
    }
  }, [supabase, newPassword, confirmNewPassword, dictionary]);

  // NEW: Combined save handler
  const handleSaveAllChanges = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default button form submission
    setIsSavingAll(true);
    let profileSuccess = true;
    let passwordSuccess = true;

    // Trigger profile form submission first
    // Note: Calling requestSubmit() will trigger the onSubmit of the form itself.
    // If you have `onSubmit` handlers on the forms, they will fire.
    // In this refactor, `saveProfileChanges` and `savePasswordChanges` are now direct functions
    // that we call, which is simpler than relying on `requestSubmit` triggering form handlers.
    // So we directly call the logic functions.

    toast.loading(dictionary?.saving_changes || 'Saving changes...');

    // Save profile changes
    profileSuccess = await saveProfileChanges();

    // Only attempt password change if new password fields are filled
    if (newPassword || confirmNewPassword) {
      passwordSuccess = await savePasswordChanges();
    }

    toast.dismiss(); // Dismiss the loading toast

    if (profileSuccess && passwordSuccess) {
      toast.success(dictionary?.all_changes_saved_successfully || 'All changes saved successfully!');
    } else {
      // More specific error handling could be implemented here
      // For now, if either failed, a general error is shown by the individual functions
      // and we show a final, less specific failure.
      toast.error(dictionary?.some_changes_failed || 'Some changes could not be saved. Please check details.');
    }

    setIsSavingAll(false);
  }, [saveProfileChanges, savePasswordChanges, newPassword, confirmNewPassword, dictionary]);


  const handleSignOut = async () => {
    setIsSavingAll(true); // Use the general saving state
    try {
      toast.loading(dictionary?.signing_out || "Signing out...");
      
      // Reset CSRF token before signing out
      resetCsrfToken();
      
      const { error } = await supabase.auth.signOut();
      toast.dismiss();
      if (error) throw error;
      router.push('/login');
    } catch (error: any) {
      toast.error(`Error signing out: ${error.message}`);
      setIsSavingAll(false);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      const initialCrop = centerAspectCrop(naturalWidth, naturalHeight, 1);
      if (initialCrop.width > 0 && initialCrop.height > 0) {
        setCrop(initialCrop);
      } else {
        toast.error("Failed to initialize crop area.");
        setCrop({ unit: '%', width: 50, height: 50, x: 25, y: 25 }); // Fallback
      }
    } else {
      toast.error("Could not read image dimensions.");
      setIsCropDialogOpen(false); // Close dialog if image invalid
    }
  }, [imgRef]);
  // --- End Event Handlers ---


  // --- Render Logic ---
  const isAnyOperationInProgress = isSavingProfile || isPasswordChanging || isUploading || isProcessing || isSavingAll;

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading profile...</div>;
  }

  // Calculate avatar source URL
  const displayAvatarSrc = avatarPreview || getImageUrl(profile?.avatar_url || null);
  console.log('Avatar URL:', displayAvatarSrc); // Add this line for debugging

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Language Switcher and Download Backup Button - positioned inline on all screens */}
        <div className="flex flex-row justify-between items-center gap-2 mb-4">
          <div className="flex items-center">
            <LanguageSwitcher />
          </div>
          <div>
            <DownloadBackupButton dictionary={dictionary} />
          </div>
        </div>
        
        {/* Profile section with avatar and forms */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar section - takes full width on mobile, 1/3 on desktop */}
          <div className="lg:col-span-1 flex flex-col items-center">
            {/* Avatar Display & Upload Trigger */}
            <div className="relative group mb-4">
              <Label htmlFor="avatar-upload" className="cursor-pointer" aria-label={dictionary?.change_profile_picture || "Change profile picture"}>
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                  <Image
                    src={displayAvatarSrc} 
                    alt={profile?.full_name ? `${profile.full_name}'s avatar` : (dictionary?.avatar || 'Avatar')} 
                    fill 
                    sizes="96px" 
                    className="object-cover" 
                    priority 
                    key={displayAvatarSrc}
                    onError={(e) => { console.error('Image load error:', e); e.currentTarget.src = '/default-avatar.png'; }}
                  />
                  {isAnyOperationInProgress && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
                      <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                    </div>
                  )}
                  {!isAnyOperationInProgress && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
              </Label>
              <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={isAnyOperationInProgress} />
              {(avatarPreview || profile?.avatar_url) && !isAnyOperationInProgress && (
                <button 
                  type="button" 
                  onClick={removeAvatar} 
                  className="absolute -top-1 -right-1 z-20 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200" 
                  aria-label={dictionary?.remove_avatar || "Remove avatar"}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            
            {/* User name display */}
            {profile?.full_name && (
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold">{profile.full_name}</h2>
                {profile.company_name && (
                  <p className="text-muted-foreground">{profile.company_name}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Form section - takes full width on mobile, 2/3 on desktop */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{dictionary?.profile_information || 'Profile Information'}</CardTitle>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <>
                    {/* Profile Information Form */}
                    <form ref={profileFormRef} onSubmit={(e) => e.preventDefault()}> {/* Prevent default submission here, handle it manually */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="full_name">{dictionary?.full_name || 'Full Name'}</Label>
                            <Input 
                              id="full_name" 
                              value={profile?.full_name || ''} 
                              onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)} 
                              disabled={isAnyOperationInProgress} 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="company_name">{dictionary?.company_name || 'Company Name'}</Label>
                            <Input 
                              id="company_name" 
                              value={profile?.company_name || ''} 
                              onChange={(e) => setProfile(prev => prev ? { ...prev, company_name: e.target.value } : null)} 
                              disabled={isAnyOperationInProgress} 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="email">{dictionary?.email || 'Email'}</Label>
                            <Input 
                              id="email" 
                              type="email" 
                              value={profile?.email || ''} 
                              onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)} 
                              disabled={isAnyOperationInProgress} 
                              aria-describedby="email-desc"
                            />
                            <p id="email-desc" className="text-xs text-muted-foreground">{dictionary?.email_desc || 'May affect login.'}</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="phone_number">{dictionary?.phone_number || 'Phone Number'}</Label>
                            <Input 
                              id="phone_number" 
                              type="tel" 
                              value={profile?.phone_number || ''} 
                              onChange={(e) => setProfile(prev => prev ? { ...prev, phone_number: e.target.value } : null)} 
                              disabled={isAnyOperationInProgress}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="website">{dictionary?.website || 'Website'}</Label>
                            <Input 
                              id="website" 
                              type="url" 
                              value={profile?.website || ''} 
                              onChange={(e) => setProfile(prev => prev ? { ...prev, website: e.target.value } : null)} 
                              disabled={isAnyOperationInProgress} 
                              placeholder="https://..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="vat_number">{dictionary?.vat_number || 'VAT Number'}</Label>
                            <Input 
                              id="vat_number" 
                              value={profile?.vat_number || ''} 
                              onChange={(e) => setProfile(prev => prev ? { ...prev, vat_number: e.target.value } : null)} 
                              disabled={isAnyOperationInProgress}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="address">{dictionary?.address || 'Address'}</Label>
                          <Input 
                            id="address" 
                            value={profile?.address || ''} 
                            onChange={(e) => setProfile(prev => prev ? { ...prev, address: e.target.value } : null)} 
                            disabled={isAnyOperationInProgress}
                          />
                        </div>
                      </div>
                    </form>
                    <form ref={passwordFormRef} onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-4"> 
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="new_password">{dictionary?.new_password || 'New Password'}</Label>
                          <Input 
                            id="new_password" 
                            type="password" 
                            value={newPassword} 
                            onChange={(e) => setNewPassword(e.target.value)} 
                            disabled={isAnyOperationInProgress}
                            placeholder={dictionary?.enter_new_password || "Enter new password"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="confirm_new_password">{dictionary?.confirm_new_password || 'Confirm New Password'}</Label>
                          <Input 
                            id="confirm_new_password" 
                            type="password" 
                            value={confirmNewPassword} 
                            onChange={(e) => setConfirmNewPassword(e.target.value)} 
                            disabled={isAnyOperationInProgress}
                            placeholder={dictionary?.confirm_new_password_placeholder || "Confirm new password"}
                          />
                          </div>
                        </div>
                        {/* Removed individual Update Password button */}
                      </form>

                    {/* Password Change Section (within the same CardContent) */}
                    

                    {/* Unified Action Buttons (Sign Out and Save All Changes) */}
                    <div className="flex flex-row justify-between items-center gap-4 mt-6 pt-4 border-t dark:border-gray-700">
                      <div>
                        <Button 
                          variant="outline" 
                          type="button" 
                          onClick={handleSignOut} 
                          className="flex items-center justify-center gap-2" 
                          disabled={isAnyOperationInProgress}
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{dictionary?.sign_out || 'Sign Out'}</span>
                        </Button>
                      </div>
                      <div>
                        <Button 
                          type="button" // Change to type="button" since it's outside the form
                          onClick={handleSaveAllChanges} 
                          className="flex items-center justify-center" 
                          style={{ backgroundColor: '#FF5A5F', color: 'white' }}
                          disabled={isAnyOperationInProgress}
                        >
                          {isAnyOperationInProgress && (<div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>)}
                          {isSavingAll ? (dictionary?.saving_changes || 'Saving Changes...') : (dictionary?.save_changes || 'Save Changes')}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-500 py-6">{dictionary?.profile_data_not_loaded || 'Profile data could not be loaded.'}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Property Management Card - full width */}
        <Card>
          <CardHeader>
            <CardTitle>{dictionary?.property_management || 'Property Management'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Properties List */}
              <div className="space-y-2">
                <Label>{dictionary?.your_properties || 'Your Properties'}</Label>
                {isLoadingProperties ? (
                  <div className="text-center py-4">
                    <div className="w-4 h-4 border-t-2 border-[#FF5A5F] rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : properties.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {dictionary?.no_properties_found || 'No properties found'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {properties.map((property) => (
                      <div
                        key={property.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <span className="font-medium">{property.name}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProperty(property)}
                            disabled={isAnyOperationInProgress}
                          >
                            {dictionary?.edit_property || 'Edit Property'}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isAnyOperationInProgress || properties.length <= 1}
                              >
                                {dictionary?.delete_property || 'Delete Property'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{dictionary?.are_you_sure || 'Are you sure?'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {(dictionary?.delete_property_confirmation || 'This action cannot be undone. This will permanently delete the property "{propertyName}".')
                                    .replace('{propertyName}', property.name)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{dictionary?.cancel || 'Cancel'}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteProperty(property.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {dictionary?.delete || 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Property Button */}
              <Button
                type="button"
                onClick={() => {
                  setEditingProperty(null);
                  setIsPropertyModalOpen(true);
                }}
                style={{ backgroundColor: '#FF5A5F', color: 'white' }}
                className="hover:bg-[#FF5A5F]/90"
                disabled={isAnyOperationInProgress}
              >
                {dictionary?.add_new_property || 'Add New Property'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* iCal Settings Card - full width */}
        <IcalSettings
          initialAirbnbUrl={profile?.airbnb_ical_url || ''}
          initialBookingComUrl={profile?.booking_com_ical_url || ''}
          dictionary={dictionary}
          onUrlChange={handleIcalUrlChange}
        />
        
        {/* Crop Dialog */}
        <Dialog open={isCropDialogOpen} onOpenChange={(open) => { if (!open) { setImageToCrop(null); setCrop(undefined); } setIsCropDialogOpen(open); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{dictionary?.crop_image || 'Crop Image'}</DialogTitle>
            </DialogHeader>
            <div className="py-4 flex justify-center items-center min-h-[300px]">
              {imageToCrop ? (
                <ReactCrop crop={crop} onChange={(_, percentCrop) => { setCrop(percentCrop); }} aspect={1} circularCrop minWidth={100} minHeight={100} ruleOfThirds>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={imgRef} src={imageToCrop} alt={dictionary?.image_to_crop || "Image to crop"} style={{ display: 'block', maxHeight: '70vh', objectFit: 'contain' }} onLoad={onImageLoad} crossOrigin="anonymous" />
                </ReactCrop>
              ) : ( <div className="text-center text-gray-500">{dictionary?.loading_image || 'Loading image...'}</div> )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsCropDialogOpen(false); setImageToCrop(null); setCrop(undefined); }} disabled={isProcessing}>
                {dictionary?.cancel || 'Cancel'}
              </Button>
              <Button type="button" onClick={handleCropComplete} disabled={!crop?.width || !crop?.height || isProcessing || !imgRef.current}>
                {isProcessing ? (dictionary?.processing || 'Processing...') : (dictionary?.apply_crop || 'Apply Crop')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Property Form Dialog */}
        <PropertyForm
          open={isPropertyModalOpen}
          onOpenChange={setIsPropertyModalOpen}
          onSuccess={handlePropertyFormSuccess}
          property={editingProperty || undefined}
          dictionary={dictionary}
        />
      </div>
    </div>
  );
} // End component
