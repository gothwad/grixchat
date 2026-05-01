import React, { useState, useRef } from 'react';
import { GithubRepo, githubApi } from './githubApi.ts';
import { ArrowLeft, FileArchive, Upload, CheckCircle2, AlertCircle, File, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import GithubHeader from './GithubHeader.tsx';

interface Props {
  repo: GithubRepo;
  token: string;
  onBack: () => void;
}

interface FileToUpload {
  path: string;
  content: string; // Base64
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function GithubZipHandler({ repo, token, onBack }: Props) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isUnzipping, setIsUnzipping] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushProgress, setPushProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUnzipping(true);
    setFiles([]);

    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      const extractedFiles: FileToUpload[] = [];

      const promises: Promise<void>[] = [];

      content.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const promise = zipEntry.async('base64').then(base64 => {
            extractedFiles.push({
              path: relativePath,
              content: base64,
              status: 'pending'
            });
          });
          promises.push(promise);
        }
      });

      await Promise.all(promises);
      setFiles(extractedFiles);
    } catch (error) {
      console.error("Unzip error:", error);
      alert("Failed to unzip file. Please make sure it's a valid ZIP.");
    } finally {
      setIsUnzipping(false);
    }
  };

  const handlePush = async () => {
    if (files.length === 0) return;
    setIsPushing(true);
    setPushProgress(0);

    const updatedFiles = [...files];
    
    try {
      // Mark all as uploading
      updatedFiles.forEach(f => f.status = 'uploading');
      setFiles([...updatedFiles]);

      // Prepare files for batch push
      const filesToPush = files.map(f => ({
        path: f.path,
        content: f.content
      }));

      const result = await githubApi.pushFilesBatch(
        token,
        repo.owner.login,
        repo.name,
        filesToPush,
        `Sync ${files.length} files via GrixChat`
      );

      // Mark all as success
      updatedFiles.forEach(f => {
        f.status = 'success';
        f.error = undefined;
      });
      setPushProgress(100);
      setSyncResult({ success: true, message: `Successfully synced ${files.length} files!` });
    } catch (error: any) {
      console.error(`Batch push failed:`, error);
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      // Mark all as error
      updatedFiles.forEach(f => {
        f.status = 'error';
        f.error = errorMessage;
      });
      setSyncResult({ success: false, message: `Failed: ${errorMessage}` });
    } finally {
      setFiles([...updatedFiles]);
      setIsPushing(false);
    }
  };

  const [syncResult, setSyncResult] = useState<{ success: boolean, message: string } | null>(null);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      <GithubHeader 
        title="Upload via ZIP" 
        onBack={onBack}
      />

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 mb-6">
              {isUnzipping ? <Loader2 size={48} className="animate-spin" /> : <FileArchive size={48} />}
            </div>
            <h4 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {isUnzipping ? 'Unzipping...' : 'Select ZIP File'}
            </h4>
            <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-xs">
              {isUnzipping ? 'Reading your files and preparing for sync.' : 'Choose a ZIP file from your device to start syncing with GitHub.'}
            </p>
            
            {!isUnzipping && (
              <>
                <input 
                  type="file" 
                  accept=".zip" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[var(--primary)] text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3"
                >
                  <Upload size={20} />
                  Choose ZIP
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 px-2">
              <div>
                <h4 className="font-bold text-[var(--text-primary)]">{files.length} Files Ready</h4>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">Extracted from ZIP</p>
              </div>
              {!isPushing && (
                <button 
                  onClick={() => setFiles([])}
                  className="text-xs font-bold text-rose-500 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar mb-4">
              {files.map((file, idx) => (
                <div key={idx} className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] flex items-center gap-3">
                  <File size={16} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1">{file.path}</span>
                  {file.status === 'uploading' && <Loader2 size={14} className="animate-spin text-[var(--primary)]" />}
                  {file.status === 'success' && <CheckCircle2 size={14} className="text-emerald-500" />}
                  {file.status === 'error' && <AlertCircle size={14} className="text-rose-500" />}
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] shadow-lg">
              {isPushing ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-[var(--text-primary)]">Syncing to GitHub...</span>
                    <span className="text-[var(--primary)]">{pushProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[var(--primary)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pushProgress}%` }}
                    />
                  </div>
                </div>
              ) : syncResult ? (
                <div className="flex flex-col gap-3">
                  <div className={`p-3 rounded-xl flex items-center gap-2 border ${syncResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
                    {syncResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="text-xs font-bold">{syncResult.message}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setFiles([]);
                      setSyncResult(null);
                    }}
                    className="w-full bg-[var(--bg-main)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-color)]"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handlePush}
                  className="w-full bg-zinc-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl"
                >
                  <Send size={18} />
                  Push to Repository
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
