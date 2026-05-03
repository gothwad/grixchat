import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Save, Type, FileText, LayoutGrid } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.ts';
import SettingHeader from '../../components/layout/SettingHeader';

const CATEGORIES = ['All', 'Music', 'Gaming', 'Vlogs', 'Technology', 'Education', 'Movies'];

export default function EditTubeScreen() {
  const { id: videoId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'All'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) return;
      try {
        const videoDoc = await getDoc(doc(db, "tube_videos", videoId));
        if (videoDoc.exists()) {
          const data = videoDoc.data();
          setFormData({
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'All'
          });
        } else {
          navigate(-1);
        }
      } catch (err) {
        console.error("Error fetching video for edit:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId, navigate]);

  const handleUpdate = async () => {
    if (!videoId) return;
    if (!formData.title.trim()) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, "tube_videos", videoId), {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        updatedAt: new Date()
      });
      navigate(-1);
    } catch (err) {
      console.error("Error updating video:", err);
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
      <SettingHeader title="Edit Video" onBack={() => navigate(-1)} />
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">Title</label>
            <div className="relative">
              <Type size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Video Title"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 pl-12 text-[14px] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">Description</label>
            <div className="relative">
              <FileText size={18} className="absolute left-4 top-4 text-[var(--text-secondary)]" />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Video Description"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 pl-12 text-[14px] min-h-[150px] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] ml-1">Category</label>
            <div className="relative">
              <LayoutGrid size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 pl-12 text-[14px] appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
                <ChevronRight size={18} className="rotate-90" />
              </div>
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
