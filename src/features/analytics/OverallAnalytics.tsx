import React, { useEffect, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Eye, 
  ThumbsUp, 
  MessageCircle, 
  Share2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { auth, db } from '../../services/firebase.ts';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const sampleData = [
  { name: 'Mon', value: 400 },
  { name: 'Tue', value: 300 },
  { name: 'Wed', value: 600 },
  { name: 'Thu', value: 800 },
  { name: 'Fri', value: 500 },
  { name: 'Sat', value: 900 },
  { name: 'Sun', value: 700 },
];

export default function OverallAnalytics() {
  const [stats, setStats] = useState({
    totalLikes: 0,
    totalComments: 0,
    totalViews: 0,
    totalPosts: 0,
    followers: 0,
    following: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!auth.currentUser) return;
      
      try {
        const uid = auth.currentUser.uid;
        
        // Fetch Posts Stats
        const postsQuery = query(collection(db, "posts"), where("userId", "==", uid));
        const postsSnap = await getDocs(postsQuery);
        let postsLikes = 0;
        let postsComments = 0;
        postsSnap.forEach(doc => {
          const data = doc.data();
          postsLikes += (data.likes || 0);
          postsComments += (data.comments || 0);
        });

        // Fetch Reels Stats
        const reelsQuery = query(collection(db, "reels"), where("userUid", "==", uid));
        const reelsSnap = await getDocs(reelsQuery);
        let reelsLikes = 0;
        let reelsComments = 0;
        reelsSnap.forEach(doc => {
          const data = doc.data();
          reelsLikes += (data.likes || 0);
          reelsComments += (data.comments || 0);
        });

        // Fetch Tube Stats
        const tubeQuery = query(collection(db, "tube_videos"), where("userId", "==", uid));
        const tubeSnap = await getDocs(tubeQuery);
        let tubeViews = 0;
        let tubeLikes = 0;
        tubeSnap.forEach(doc => {
          const data = doc.data();
          tubeViews += (data.views || 0);
          tubeLikes += (data.likes || 0);
        });

        // Fetch User Stats
        const userSnap = await getDocs(query(collection(db, "users"), where("__name__", "==", uid), limit(1)));
        let followers = 0;
        let following = 0;
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
          followers = userData.followers?.length || 0;
          following = userData.following?.length || 0;
        }

        setStats({
          totalLikes: postsLikes + reelsLikes + tubeLikes,
          totalComments: postsComments + reelsComments,
          totalViews: tubeViews,
          totalPosts: postsSnap.size + reelsSnap.size + tubeSnap.size,
          followers,
          following
        });
      } catch (err) {
        console.error("Error fetching overall analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const statCards = [
    { label: 'Followers', value: stats.followers, icon: Users, color: 'text-emerald-500', trend: '+12%', up: true },
    { label: 'Total Likes', value: stats.totalLikes, icon: ThumbsUp, color: 'text-pink-500', trend: '+5%', up: true },
    { label: 'Impressions', value: stats.totalViews + stats.totalLikes * 2, icon: TrendingUp, color: 'text-blue-500', trend: '+8%', up: true },
    { label: 'Engagement', value: stats.totalComments, icon: MessageCircle, color: 'text-amber-500', trend: '-2%', up: false },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-[var(--bg-card)] rounded-3xl animate-pulse border border-[var(--border-color)]" />
          ))}
        </div>
        <div className="h-64 bg-[var(--bg-card)] rounded-3xl animate-pulse border border-[var(--border-color)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] shadow-sm group hover:border-blue-500/30 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-xl bg-white/5 border border-white/5 ${card.color}`}>
                <card.icon size={18} />
              </div>
              <div className={`flex items-center text-[10px] font-bold ${card.up ? 'text-emerald-500' : 'text-rose-500'}`}>
                {card.trend}
                {card.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              </div>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60">
                {card.label}
              </h3>
              <p className="text-xl font-black text-[var(--text-primary)]">
                {card.value.toLocaleString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Growth Trend</h3>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium">Activity over the last 7 days</p>
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-main)] px-3 py-1.5 rounded-full border border-[var(--border-color)]">
            <Calendar size={12} className="text-blue-500" />
            <span className="text-[10px] font-bold">This Week</span>
          </div>
        </div>
        
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sampleData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 'bold' }}
                dy={10}
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderColor: 'var(--border-color)',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight mb-4">Content Breakdown</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-[var(--text-secondary)]">Tube Videos</span>
              </div>
              <span className="text-xs font-black">42%</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '42%' }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-[var(--text-secondary)]">Reels</span>
              </div>
              <span className="text-xs font-black">35%</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '35%' }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-[var(--text-secondary)]">Posts</span>
              </div>
              <span className="text-xs font-black">23%</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '23%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
