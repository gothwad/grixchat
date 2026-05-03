import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Save } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.ts';
import SettingHeader from '../../components/layout/SettingHeader';

export default function EditPostScreen() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      try {
        const postDoc = await getDoc(doc(db, "posts", postId));
        if (postDoc.exists()) {
          const data = postDoc.data();
          setCaption(data.caption || '');
          setLocation(data.location || '');
        } else {
          navigate(-1);
        }
      } catch (err) {
        console.error("Error fetching post for edit:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId, navigate]);

  const handleUpdate = async () => {
    if (!postId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "posts", postId), {
        caption,
        location,
        updatedAt: new Date()
      });
      navigate(-1);
    } catch (err) {
      console.error("Error updating post:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-main)] font-sans">
      <SettingHeader title="Edit Post" onBack={() => navigate(-1)} />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 text-[14px] min-h-[120px] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-[var(--text-secondary)]/50"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">Location</label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 pl-12 text-[14px] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-[var(--text-secondary)]/50"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <ChevronRight size={20} className="rotate-90" />
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full py-4 bg-[var(--text-primary)] text-[var(--bg-main)] rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? 'UPDATING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
}
