import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ImageService } from '../../services/ImageService';
import { useAuth } from '../../providers/AuthProvider.tsx';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const { user: authUser, userData: currentAuthUserData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form States
  const [fullName, setFullName] = useState(currentAuthUserData?.fullName || '');
  const [username, setUsername] = useState(currentAuthUserData?.username || '');
  const [bio, setBio] = useState(currentAuthUserData?.bio || 'Available');
  const [photoURL, setPhotoURL] = useState(currentAuthUserData?.photoURL || '');

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  useEffect(() => {
    if (currentAuthUserData) {
      setFullName(currentAuthUserData.fullName || '');
      setUsername(currentAuthUserData.username || '');
      setBio(currentAuthUserData.bio || 'Available');
      setPhotoURL(currentAuthUserData.photoURL || DEFAULT_LOGO);
    }
  }, [currentAuthUserData]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const url = await ImageService.uploadImage(file, undefined, 'profiles');
      setPhotoURL(url);
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!authUser || !supabase) return;
    setLoading(true);
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();

    try {
      // Username uniqueness check
      if (trimmedUsername !== currentAuthUserData?.username) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', trimmedUsername)
          .maybeSingle();
        
        if (existingUser && existingUser.id !== authUser.id) {
          throw new Error("This username is already taken. Please try another one.");
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          username: trimmedUsername,
          bio: bio.trim() || 'Available',
          photo_url: photoURL
        } as any)
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      await refreshUserData();
      navigate('/profile');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: string, label: string, value: string, setter: (v: string) => void, isTextArea: boolean = false, type: string = 'text') => {
    const isBio = field === 'bio';
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mx-1">
          <label className="text-xs font-bold text-[var(--text-primary)]">{label}</label>
          {isBio && (
            <span className={`text-[10px] font-mono ${value.length >= 50 ? 'text-red-500 font-bold' : 'text-[var(--text-secondary)]'}`}>
              {value.length}/50
            </span>
          )}
        </div>
        {isTextArea ? (
          <textarea
            value={value}
            onChange={(e) => {
              if (isBio && e.target.value.length > 50) return;
              setter(e.target.value);
            }}
            maxLength={isBio ? 50 : undefined}
            rows={2}
            className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-secondary)]/50 resize-none"
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        ) : (
          <input 
            type={type}
            value={value}
            onChange={(e) => setter(e.target.value)}
            className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-secondary)]/50"
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      <SettingHeader 
        title="Edit Profile" 
        rightElement={
          <button 
            onClick={handleSave}
            disabled={loading || uploading}
            className="text-[var(--header-text)] font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Done'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        {/* Profile Picture Section */}
        <div className="py-8 flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-[var(--border-color)] relative bg-[var(--bg-card)]">
              <img 
                src={photoURL || DEFAULT_LOGO} 
                className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-30' : 'opacity-100'}`}
                referrerPolicy="no-referrer"
                alt="Profile"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={24} className="text-[var(--primary)] animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              <Camera size={24} className="text-white" />
            </button>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 text-sm font-bold text-[var(--primary)] active:opacity-70 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Change profile photo'}
          </button>
          {photoURL && photoURL !== DEFAULT_LOGO && (
            <button 
              onClick={() => setPhotoURL(DEFAULT_LOGO)}
              className="mt-2 text-xs font-bold text-red-500 active:opacity-70"
            >
              Remove profile photo
            </button>
          )}
        </div>

        <div className="px-8 pb-12 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-600">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-5">
            {renderField('fullName', 'Name', fullName, setFullName)}
            {renderField('username', 'Username', username, setUsername)}
            {renderField('bio', 'Bio', bio, setBio, true)}
          </div>
        </div>
      </div>
    </div>
  );
}
