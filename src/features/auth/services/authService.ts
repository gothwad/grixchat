import { supabase } from '../../../lib/supabase';

export const authService = {
  async login(email: string, pass: string) {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });
    if (error) throw error;
    return data.user;
  },

  async signup(email: string, pass: string, fullName: string, username: string) {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          username: username,
          avatar_url: `https://cdn-icons-png.flaticon.com/512/149/149071.png`
        }
      }
    });
    if (error) throw error;
    return data.user;
  },

  async loginWithGoogle() {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
    return data;
  },

  async loginWithGithub() {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
    });
    if (error) throw error;
    return data;
  },

  async loginWithApple() {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
    });
    if (error) throw error;
    return data;
  },

  async loginWithTwitter() {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
    });
    if (error) throw error;
    return data;
  },

  async loginWithFacebook() {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async createUserProfile(uid: string, data: any) {
    if (!supabase) throw new Error("Supabase is not initialized");
    
    // Map camelCase to snake_case
    const updateData: any = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
    if (data.bio !== undefined) updateData.bio = data.bio;
    updateData.last_seen = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .upsert({
        id: uid,
        ...updateData
      });
    
    if (error) throw error;
    return true;
  },

  async resetPassword(email: string) {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  },

  async getUserProfile(uid: string) {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching Supabase profile:', error);
      return null;
    }
    
    if (!data) return null;
    const profile = data as any;

    // Map to camelCase for frontend
    return {
      uid: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      username: profile.username,
      photoURL: profile.photo_url,
      bio: profile.bio,
      isVerified: profile.is_verified,
      profileType: profile.profile_type,
      lastSeen: profile.last_seen,
      status: profile.is_online ? 'online' : 'offline',
      settings: profile.settings
    };
  }
};

