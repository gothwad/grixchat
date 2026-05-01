import React, { useState, useEffect } from 'react';
import { githubApi, GithubRepo } from './githubApi.ts';
import { Github, LogOut, Search, ExternalLink, ChevronRight, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GithubRepoDetail from './GithubRepoDetail.tsx';
import { storage } from '../../../services/StorageService.ts';
import GithubHeader from './GithubHeader.tsx';

export default function GithubScreen() {
  const [token, setToken] = useState<string | null>(storage.getItem('github_token'));
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchData();
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        const newToken = event.data.token;
        setToken(newToken);
        storage.setItem('github_token', newToken);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [reposData, userData] = await Promise.all([
        githubApi.getRepos(token),
        githubApi.getUser(token)
      ]);
      setRepos(reposData);
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch GitHub data:", error);
      if ((error as any).response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const url = await githubApi.getAuthUrl();
      window.open(url, 'github_oauth', 'width=600,height=700');
    } catch (error) {
      console.error("Failed to get auth URL:", error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRepos([]);
    setUser(null);
    storage.removeItem('github_token');
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedRepo) {
    return (
      <GithubRepoDetail 
        repo={selectedRepo} 
        token={token!} 
        onBack={() => setSelectedRepo(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <GithubHeader title="GitHub" />
      {!token ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
            <Github size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Connect GitHub</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-8 max-w-xs">
            Sync your projects, upload files, and manage your repositories directly from GrixChat.
          </p>
          <button 
            onClick={handleConnect}
            className="w-full max-w-xs bg-zinc-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            <Github size={20} />
            Connect with GitHub
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={user?.avatar_url} className="w-10 h-10 rounded-full border-2 border-[var(--primary)]" />
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] leading-none">{user?.name || user?.login}</h3>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">@{user?.login}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
              <input 
                type="text" 
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>

          {/* Repo List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Fetching Repositories...</p>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="text-center py-20">
                <Folder size={48} className="mx-auto text-[var(--text-secondary)] opacity-20 mb-4" />
                <p className="text-[var(--text-secondary)] font-bold">No repositories found</p>
              </div>
            ) : (
              filteredRepos.map(repo => (
                <motion.div 
                  key={repo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedRepo(repo)}
                  className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] hover:border-[var(--primary)] transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-[var(--text-primary)] truncate">{repo.name}</h4>
                        {repo.private && (
                          <span className="text-[8px] font-black uppercase bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">Private</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mb-2">
                        {repo.description || "No description provided"}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                          Updated {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
