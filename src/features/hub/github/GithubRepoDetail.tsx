import React, { useState } from 'react';
import { GithubRepo } from './githubApi.ts';
import { ArrowLeft, Upload, FileArchive, ChevronRight, Globe, Lock, ExternalLink, Github } from 'lucide-react';
import { motion } from 'motion/react';
import GithubZipHandler from './GithubZipHandler.tsx';
import GithubHeader from './GithubHeader.tsx';

interface Props {
  repo: GithubRepo;
  token: string;
  onBack: () => void;
}

export default function GithubRepoDetail({ repo, token, onBack }: Props) {
  const [view, setView] = useState<'options' | 'zip'>('options');

  if (view === 'zip') {
    return (
      <GithubZipHandler 
        repo={repo} 
        token={token} 
        onBack={() => setView('options')} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <GithubHeader 
        title={repo.name} 
        onBack={onBack}
        rightElement={
          <a 
            href={repo.html_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ExternalLink size={20} />
          </a>
        }
      />
      
      {/* Options */}
      <div className="flex-1 p-6 space-y-4">
        <h4 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-2">Upload Methods</h4>
        
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] flex items-center gap-5 group hover:border-[var(--primary)] transition-all text-left shadow-sm"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <Upload size={28} />
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-[var(--text-primary)] text-lg">Upload Files</h5>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Select and upload individual files directly.</p>
          </div>
          <ChevronRight size={20} className="text-[var(--text-secondary)]" />
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setView('zip')}
          className="w-full bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-color)] flex items-center gap-5 group hover:border-[var(--primary)] transition-all text-left shadow-sm"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
            <FileArchive size={28} />
          </div>
          <div className="flex-1">
            <h5 className="font-bold text-[var(--text-primary)] text-lg">Upload via ZIP</h5>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Upload a ZIP file, unzip it, and sync all files.</p>
          </div>
          <ChevronRight size={20} className="text-[var(--text-secondary)]" />
        </motion.button>
      </div>

      {/* Info Card */}
      <div className="p-6">
        <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h5 className="font-bold mb-2">Pro Tip</h5>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Uploading via ZIP is the fastest way to sync large projects. We'll automatically unzip and push each file to your repository.
            </p>
          </div>
          <Github size={80} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
        </div>
      </div>
    </div>
  );
}
