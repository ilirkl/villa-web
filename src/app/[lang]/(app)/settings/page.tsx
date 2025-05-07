'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Profile } from '@/lib/definitions';
import { LogOut, Upload, X } from 'lucide-react';
import Image from 'next/image';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getDictionary } from '@/lib/dictionary';
import 'react-image-crop/dist/ReactCrop.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { lang } = useParams();
  const [dictionary, setDictionary] = useState<any>(null);

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

  // --- Fetch Profile Logic (Unchanged) ---
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
  }, [supabase, router]); // Added dependencies

  useEffect(() => {
    fetchProfile();
    return () => { if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview); };
  }, [fetchProfile]); // Added fetchProfile dependency
  // --- End Fetch Profile ---

  // --- Image URL Handling (Unchanged) ---
  const getImageUrl = (url: string | null): string => {
    if (!url) return '/default-avatar.png';
    if (url.startsWith('blob:') || url.startsWith('http')) return url;
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(url);
      return data?.publicUrl || '/default-avatar.png';
    } catch (error) { console.error('Error getting public URL:', error); return '/default-avatar.png'; }
  };
  // --- End Image URL Handling ---

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      let finalAvatarPath: string | null | undefined = profile.avatar_url;
      if (avatarFile) { // If a new file was processed
        const uploadedPath = await uploadAvatar(avatarFile);
        if (uploadedPath) {
          // Optional: Delete old avatar
          if (profile.avatar_url && profile.avatar_url !== uploadedPath) {
            // await supabase.storage.from('avatars').remove([profile.avatar_url]);
          }
          finalAvatarPath = uploadedPath;
        } else {
          throw new Error('Avatar upload failed. Changes not saved.');
        }
      } // If no avatarFile, finalAvatarPath remains as profile.avatar_url (which might be null if removed)

      const updates = { /* profile fields */
          full_name: profile.full_name, company_name: profile.company_name,
          email: profile.email, phone_number: profile.phone_number,
          website: profile.website, vat_number: profile.vat_number,
          address: profile.address, avatar_url: finalAvatarPath,
          updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) throw new Error(`Failed to update profile: ${error.message}`);

      toast.success('Profile updated successfully!');
      setProfile(prev => prev ? { ...prev, ...updates } : null); // Update local state
      setAvatarFile(null); // Clear staged file
      if (avatarPreview?.startsWith('blob:')) { // Clean up blob preview if needed
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(getImageUrl(finalAvatarPath)); // Update preview to saved URL
      }
    } catch (error: any) {
      console.error('Error during handleSubmit:', error);
      toast.error(error.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    setIsSaving(true);
    try {
      toast.loading("Signing out...");
      const { error } = await supabase.auth.signOut();
      toast.dismiss();
      if (error) throw error;
      router.push('/login');
    } catch (error: any) {
      toast.error(`Error signing out: ${error.message}`);
      setIsSaving(false);
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
  }, [imgRef]); // imgRef dependency
  // --- End Event Handlers ---


  // --- Render Logic ---
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading profile...</div>;
  }

  const displayAvatarSrc = avatarPreview || getImageUrl(profile?.avatar_url || null);

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header with title and avatar on same line */}
        <div className="flex justify-between items-center mb-6">
          {/* Title on the left */}
          <h1 className="text-3xl font-bold">{dictionary?.settings || 'Settings'}</h1>
          
          {/* Avatar Display & Upload Trigger on the right */}
          <div className="relative group">
            <Label htmlFor="avatar-upload" className="cursor-pointer" aria-label={dictionary?.change_profile_picture || "Change profile picture"}>
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                <Image
                  src={displayAvatarSrc} 
                  alt={profile?.full_name ? `${profile.full_name}'s avatar` : (dictionary?.avatar || 'Avatar')} 
                  fill 
                  sizes="64px" 
                  className="object-cover" 
                  priority 
                  key={displayAvatarSrc}
                  onError={(e) => { console.error('Image load error:', e); e.currentTarget.src = '/default-avatar.png'; }}
                />
                {(isProcessing || isUploading || isSaving) && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  </div>
                )}
                {!(isProcessing || isUploading || isSaving) && (
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            </Label>
            <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={isProcessing || isUploading || isSaving} />
            {(avatarPreview || profile?.avatar_url) && !(isProcessing || isUploading || isSaving) && (
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
        </div>
        
        {/* Language Switcher */}
        <LanguageSwitcher />
        
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

        {/* Profile Form Card */}
        <Card>
          <CardHeader><CardTitle>{dictionary?.profile_settings || 'Profile Settings'}</CardTitle></CardHeader>
          <CardContent>
            {profile ? (
              <form onSubmit={handleSubmit}>
                {/* Form fields with updated layout */}
                <div className="space-y-4">
                  {/* Full Name and Company Name */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label htmlFor="full_name">{dictionary?.full_name || 'Full Name'}</Label><Input id="full_name" value={profile.full_name || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)} disabled={isSaving} /></div>
                    <div className="space-y-1.5"><Label htmlFor="company_name">{dictionary?.company_name || 'Company Name'}</Label><Input id="company_name" value={profile.company_name || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, company_name: e.target.value } : null)} disabled={isSaving} /></div>
                  </div>
                  {/* Email and Phone Number */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label htmlFor="email">{dictionary?.email || 'Email'}</Label><Input id="email" type="email" value={profile.email || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)} disabled={isSaving} aria-describedby="email-desc"/><p id="email-desc" className="text-xs text-muted-foreground">{dictionary?.email_desc || 'May affect login.'}</p></div>
                    <div className="space-y-1.5"><Label htmlFor="phone_number">{dictionary?.phone_number || 'Phone Number'}</Label><Input id="phone_number" type="tel" value={profile.phone_number || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, phone_number: e.target.value } : null)} disabled={isSaving}/></div>
                  </div>
                  {/* Website and VAT Number */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label htmlFor="website">{dictionary?.website || 'Website'}</Label><Input id="website" type="url" value={profile.website || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, website: e.target.value } : null)} disabled={isSaving} placeholder="https://..."/></div>
                    <div className="space-y-1.5"><Label htmlFor="vat_number">{dictionary?.vat_number || 'VAT Number'}</Label><Input id="vat_number" value={profile.vat_number || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, vat_number: e.target.value } : null)} disabled={isSaving}/></div>
                  </div>
                  {/* Address */}
                  <div className="space-y-1.5"><Label htmlFor="address">{dictionary?.address || 'Address'}</Label><Input id="address" value={profile.address || ''} onChange={(e) => setProfile(prev => prev ? { ...prev, address: e.target.value } : null)} disabled={isSaving}/></div>
                </div>
                
                {/* Remove duplicate language switcher */}

                {/* Action Buttons with updated layout */}
                <div className="flex flex-row justify-between items-center gap-4 mt-6 pt-4 border-t dark:border-gray-700">
                  <Button variant="outline" type="button" onClick={handleSignOut} className="flex items-center justify-center gap-2" disabled={isSaving || isUploading || isProcessing}>
                    <LogOut className="h-4 w-4" /><span>{dictionary?.sign_out || 'Sign Out'}</span>
                  </Button>
                  <Button type="submit" className="flex items-center justify-center" disabled={isSaving || isUploading || isProcessing}>
                    {(isSaving || isUploading) && (<div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>)}
                    {isSaving ? (dictionary?.saving || 'Saving...') : (isUploading ? (dictionary?.uploading || 'Uploading...') : (dictionary?.save_changes || 'Save Changes'))}
                  </Button>
                </div>
              </form>
            ) : ( /* No Profile Message */
              <div className="text-center text-gray-500 py-6">{dictionary?.profile_data_not_loaded || 'Profile data could not be loaded.'}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} // End component




