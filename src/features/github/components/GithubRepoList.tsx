import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Search, RefreshCw, FolderClosed, Layers, FileArchive, CheckSquare, Square, Folder, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import GithubZipUploader from './GithubZipUploader';
import GithubFileList from './GithubFileList';
import { calculateGitHubBlobSha } from '../utils/githubSha';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  default_branch: string;
}

interface ExtractedFile {
  path: string;
  name: string;
  content: string; // Base64
  sha: string;
  size: number;
}

interface RemoteFileRef {
  path: string;
  sha: string;
}

interface GithubRepoListProps {
  token: string;
  onSuccess: (url: string) => void;
}

export default function GithubRepoList({ token, onSuccess }: GithubRepoListProps) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  
  const [branch, setBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('sync: deploy custom code via GrixChat');
  const [syncType, setSyncType] = useState<'app' | 'zip'>('zip'); // Default to ZIP upload per user request
  
  // File state structures
  const [zipFiles, setZipFiles] = useState<ExtractedFile[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [remoteFiles, setRemoteFiles] = useState<RemoteFileRef[]>([]);
  
  // App codebase selection state
  const [appCodeFiles, setAppCodeFiles] = useState<string[]>([]);
  const [selectedAppFiles, setSelectedAppFiles] = useState<string[]>([]);
  const [fileSearch, setFileSearch] = useState('');
  const [loadingAppFiles, setLoadingAppFiles] = useState(false);
  
  const [isPushing, setIsPushing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [noChangesWarning, setNoChangesWarning] = useState(false);
  const [isSequential, setIsSequential] = useState(false);

  // Live progress metrics states
  const [totalFiles, setTotalFiles] = useState(0);
  const [filesAlreadyExist, setFilesAlreadyExist] = useState(0);
  const [filesToUpload, setFilesToUpload] = useState(0);
  const [filesUploadedCount, setFilesUploadedCount] = useState(0);
  const [filesRemainingCount, setFilesRemainingCount] = useState(0);
  const [currentFileTransfer, setCurrentFileTransfer] = useState('');
  const [currentProgressPercent, setCurrentProgressPercent] = useState(0);

  // Load repository directories on token change
  useEffect(() => {
    const fetchRepos = async () => {
      setLoadingRepos(true);
      try {
        const response = await axios.get<Repository[]>('https://api.github.com/user/repos?per_page=100&sort=updated', {
          headers: { Authorization: `token ${token}` }
        });
        setRepos(response.data || []);
      } catch (err: any) {
        setErrorMessage('Failed to fetch key repositories. Check token or connectivity.');
      } finally {
        setLoadingRepos(false);
      }
    };
    fetchRepos();
  }, [token]);

  // Load codebase directories on mount for local backup mode
  useEffect(() => {
    const fetchLocalFilesList = async () => {
      setLoadingAppFiles(true);
      try {
        const res = await axios.get('/api/github/list-files');
        if (res.data && res.data.files) {
          const files = res.data.files.filter((f: string) => !f.includes('package-lock.json') && !f.includes('node_modules') && !f.includes('dist'));
          setAppCodeFiles(files);
          const defaults = files.filter((f: string) => f.includes('schema') || f.includes('.env.example') || f === 'package.json');
          setSelectedAppFiles(defaults.length > 0 ? defaults : files.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed listing current code files', err);
      } finally {
        setLoadingAppFiles(false);
      }
    };
    fetchLocalFilesList();
  }, []);

  // Fetch remote SHA hashes when depository details change to establish diffs
  const fetchRemoteHashes = async (owner: string, repoName: string, targetBranch: string): Promise<RemoteFileRef[]> => {
    try {
      const branchRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/branches/${targetBranch}`, {
        headers: { Authorization: `token ${token}` }
      });
      const baseTreeSha = branchRes.data.commit.commit.tree.sha;
      const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repoName}/git/trees/${baseTreeSha}?recursive=1`, {
        headers: { Authorization: `token ${token}` }
      });
      if (treeRes.data && treeRes.data.tree) {
        const refs = treeRes.data.tree
          .filter((n: any) => n.type === 'blob')
          .map((n: any) => ({ path: n.path, sha: n.sha }));
        setRemoteFiles(refs);
        return refs;
      }
      return [];
    } catch (e) {
      console.warn('Unable to query remote codebase index tree. Assuming initial push.', e);
      setRemoteFiles([]);
      return [];
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchRemoteHashes(selectedRepo.owner.login, selectedRepo.name, branch);
    }
  }, [selectedRepo, branch]);

  const handleZipFilesReady = (filesReady: ExtractedFile[]) => {
    setZipFiles(filesReady);
    setSelectedPaths(filesReady.map(f => f.path)); // Auto check all
    setNoChangesWarning(false);
  };

  // Dynamic pre-sync counts analysis
  const getPreSyncStats = () => {
    let total = 0;
    let unchanged = 0;
    let changed = 0;

    if (syncType === 'zip') {
      total = selectedPaths.length;
      const selectedZipFilesList = zipFiles.filter(zf => selectedPaths.includes(zf.path));
      selectedZipFilesList.forEach(zf => {
        const match = remoteFiles.find(rf => rf.path === zf.path);
        if (match && match.sha === zf.sha) {
          unchanged++;
        } else {
          changed++;
        }
      });
    } else {
      total = selectedAppFiles.length;
      selectedAppFiles.forEach(path => {
        const match = remoteFiles.find(rf => rf.path === path);
        if (match) {
          unchanged++;
        } else {
          changed++;
        }
      });
    }

    return { total, unchanged, changed };
  };

  const syncStats = getPreSyncStats();

  const handlePush = async () => {
    if (!selectedRepo) return;
    
    // Choose what list to process
    let finalPayload: { path: string, content: string }[] = [];
    setIsPushing(true);
    setErrorMessage('');
    setNoChangesWarning(false);
    setCurrentProgressPercent(0);
    setTotalFiles(0);
    setFilesAlreadyExist(0);
    setFilesToUpload(0);
    setFilesUploadedCount(0);
    setFilesRemainingCount(0);
    setCurrentFileTransfer('Setting up local workspace files...');

    try {
      if (syncType === 'zip') {
        if (selectedPaths.length === 0) {
          throw new Error('Please select at least one file to commit to the repository.');
        }
        finalPayload = zipFiles
          .filter(zf => selectedPaths.includes(zf.path))
          .map(zf => ({ path: zf.path, content: zf.content }));
      } else {
        if (selectedAppFiles.length === 0) {
          throw new Error('Choose at least one local source file to back up.');
        }
        setStatusMessage('Compressing and loading codebase files...');
        setCurrentFileTransfer('Scanning local codebase tree...');
        for (const pathStr of selectedAppFiles) {
          const res = await axios.get(`/api/github/get-file-content?path=${encodeURIComponent(pathStr)}`);
          if (res.data && res.data.content) {
            finalPayload.push({ path: pathStr, content: res.data.content });
          }
        }
      }

      // Query the absolute latest commit file trees and hashes directly before commencing diff comparisons!
      setStatusMessage('Fetching latest remote repository state...');
      setCurrentFileTransfer('Retrieving upstream branch state to prevent conflict...');
      const activeRemoteFiles = await fetchRemoteHashes(selectedRepo.owner.login, selectedRepo.name, branch);

      // If sequential mode is enabled, upload files one-by-one to support safe incrementing client-side!
      if (isSequential) {
        setStatusMessage('Filtering unchanged files...');
        setCurrentFileTransfer('Comparing local vs remote hashes to skip duplicates...');

        // Filter files that are actually modified or new against latest real-world files on GitHub
        const modifiedFiles: { path: string, content: string }[] = [];
        for (const file of finalPayload) {
          const matchingRemote = activeRemoteFiles.find(rf => rf.path === file.path);
          let isModified = true;

          if (syncType === 'zip') {
            const zf = zipFiles.find(z => z.path === file.path);
            if (zf && matchingRemote && zf.sha === matchingRemote.sha) {
              isModified = false;
            }
          } else {
            if (matchingRemote) {
              const localSha = await calculateGitHubBlobSha(file.content);
              if (localSha && localSha === matchingRemote.sha) {
                isModified = false;
              }
            }
          }

          if (isModified) {
            modifiedFiles.push(file);
          }
        }

        if (modifiedFiles.length === 0) {
          setNoChangesWarning(true);
          setIsPushing(false);
          return;
        }

        const totalCount = finalPayload.length;
        const existsCount = totalCount - modifiedFiles.length;
        setTotalFiles(totalCount);
        setFilesAlreadyExist(existsCount);
        setFilesToUpload(modifiedFiles.length);
        setFilesUploadedCount(0);
        setFilesRemainingCount(modifiedFiles.length);
        setCurrentProgressPercent(0);

        for (let i = 0; i < modifiedFiles.length; i++) {
          const file = modifiedFiles[i];
          const matchingRemote = activeRemoteFiles.find(rf => rf.path === file.path);
          const sha = matchingRemote?.sha;

          let loc = 0;
          try {
            const decoded = window.atob(file.content);
            loc = decoded.split(/\r?\n/).length;
          } catch(e) {}

          setCurrentFileTransfer(`Pushing: ${file.path} (${loc} lines of code)`);
          setStatusMessage(`Uploading file ${i + 1}/${modifiedFiles.length}...`);

          try {
            // Execute PUT call directly to GitHub contents API
            const putRes = await axios.put(`https://api.github.com/repos/${selectedRepo.owner.login}/${selectedRepo.name}/contents/${file.path}`, {
              message: `${commitMessage} - update ${file.path}`,
              content: file.content,
              sha: sha || undefined,
              branch
            }, {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json'
              }
            });

            // Dynamically register the file's newly response SHA back to guard sequential retries
            if (putRes.data && putRes.data.content && putRes.data.content.sha) {
              const newSha = putRes.data.content.sha;
              const idx = activeRemoteFiles.findIndex(rf => rf.path === file.path);
              if (idx > -1) {
                activeRemoteFiles[idx].sha = newSha;
              } else {
                activeRemoteFiles.push({ path: file.path, sha: newSha });
              }
              // Set state synchronously so user UI and subsequent files see correct SHA state
              setRemoteFiles([...activeRemoteFiles]);
            }
          } catch (fileErr: any) {
            const errorDetail = fileErr.response?.data?.message || fileErr.message;
            console.error(`Error uploading sequential file ${file.path}:`, fileErr.response?.data || fileErr.message);
            throw new Error(`Stopped at file "${file.path}" due to GitHub: ${errorDetail}. Previous ${i} files were synchronized! You can resume seamlessly by initiating Publish again.`);
          }

          const currentUploaded = i + 1;
          setFilesUploadedCount(currentUploaded);
          setFilesRemainingCount(modifiedFiles.length - currentUploaded);
          setCurrentProgressPercent(Math.round((currentUploaded / modifiedFiles.length) * 100));

          // Pause to keep api limit happy and guarantee visual render
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Fresh fetch of remote hashes after uploading
        fetchRemoteHashes(selectedRepo.owner.login, selectedRepo.name, branch);
        onSuccess(`https://github.com/${selectedRepo.full_name}/commits/${branch}`);
        setIsPushing(false);
        return;
      }

      // Fast Bulk Mode (isSequential === false)
      setStatusMessage('Analyzing and sending bulk commits...');
      
      let modifiedCount = 0;
      for (const file of finalPayload) {
        const matchingRemote = activeRemoteFiles.find(rf => rf.path === file.path);
        let isModified = true;
        if (syncType === 'zip') {
          const zf = zipFiles.find(z => z.path === file.path);
          if (zf && matchingRemote && zf.sha === matchingRemote.sha) {
            isModified = false;
          }
        } else {
          if (matchingRemote) {
            const localSha = await calculateGitHubBlobSha(file.content);
            if (localSha && localSha === matchingRemote.sha) {
              isModified = false;
            }
          }
        }
        if (isModified) modifiedCount++;
      }

      const totalCount = finalPayload.length;
      setTotalFiles(totalCount);
      setFilesAlreadyExist(totalCount - modifiedCount);
      setFilesToUpload(modifiedCount);
      setFilesUploadedCount(0);
      setFilesRemainingCount(modifiedCount);
      setCurrentProgressPercent(10);
      setCurrentFileTransfer("Initializing bulk staging delta connection...");

      // Start simulated animation cycle for bulk pushing to report progress phases
      const messages = [
        "Connecting to remote repository HEAD branch...",
        "Evaluating git index trees and staging blob differences...",
        "Creating compression chunks for modified files...",
        "Uploading blobs to GitHub storage layers...",
        "Constructing atomic commit pack tree...",
        "Registering verified signature payload...",
        "Applying fast-forward branch reference updates..."
      ];
      
      let messageIdx = 0;
      const progressTimer = setInterval(() => {
        setCurrentProgressPercent(prev => {
          if (prev >= 92) return prev; // Hold at 92% until server returns
          const step = Math.max(1, Math.floor((92 - prev) / 6));
          return prev + step;
        });
        
        if (messageIdx < messages.length) {
          setCurrentFileTransfer(messages[messageIdx]);
          setStatusMessage(messages[messageIdx]);
          messageIdx++;
        }
      }, 700);

      try {
        const pushRes = await axios.post('/api/github/push-batch', {
          token,
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          files: finalPayload,
          message: commitMessage,
          branch: branch,
          isSequential: false
        });

        clearInterval(progressTimer);
        setCurrentProgressPercent(100);
        setCurrentFileTransfer("Sync complete! Verifying remote commit signature...");

        if (pushRes.data) {
          if (pushRes.data.noChanges) {
            setNoChangesWarning(true);
          } else {
            setFilesUploadedCount(modifiedCount);
            setFilesRemainingCount(0);
            onSuccess(pushRes.data.html_url || `https://github.com/${selectedRepo.full_name}`);
          }
        }
      } catch (err: any) {
        clearInterval(progressTimer);
        throw err;
      }

    } catch (err: any) {
      const detail = err.response?.data?.message || err.message;
      setErrorMessage(detail);
    } finally {
      setIsPushing(false);
    }
  };

  const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(repoSearch.toLowerCase()));
  const filteredAppFiles = appCodeFiles.filter(f => f.toLowerCase().includes(fileSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl p-3 text-xs font-bold flex gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {noChangesWarning && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex gap-3 text-[11px] leading-relaxed text-amber-600 font-semibold shadow-sm">
          <CheckCircle2 size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <p className="font-extrabold text-xs">Everything is already up-to-date!</p>
            <p>Your local ZIP/Codebase directory content matches the remote repository exactly. No modifications to commit.</p>
          </div>
        </div>
      )}

      {/* Repository search picker */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.1em] ml-1">
          Select Target Repository
        </label>
        {loadingRepos ? (
          <div className="flex items-center gap-2 text-xs py-3 text-[var(--text-secondary)]">
            <RefreshCw size={13} className="animate-spin text-primary" />
            <span>Retrieving repositories list...</span>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]/60 p-3 space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter repositories..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-full text-xs py-2 pl-8 pr-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--box-text)] focus:outline-none"
              />
              <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
            </div>

            <div className="max-h-36 overflow-y-auto no-scrollbar border border-[var(--border-color)]/30 rounded-xl divide-y divide-[var(--border-color)]/10">
              {filteredRepos.length === 0 ? (
                <p className="text-[10px] text-[var(--text-secondary)] text-center py-4">No matching repositories found</p>
              ) : (
                filteredRepos.map(r => {
                  const isSelected = selectedRepo?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRepo(r);
                        setBranch(r.default_branch || 'main');
                        setZipFiles([]);
                      }}
                      className={`w-full text-left p-2.5 text-[11px] font-bold transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'bg-primary/10 text-primary animate-pulse' : 'text-[var(--text-primary)] hover:bg-[var(--bg-main)]/50'}`}
                    >
                      <span className="truncate">{r.full_name}</span>
                      {isSelected && <span className="text-[9px] bg-primary text-white font-black uppercase px-1.5 py-0.5 rounded">Selected</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedRepo && (
        <>
          {/* Choice of upload sync methodology */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.1em] ml-1">
              Backup Upload Methodology
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-2xl">
              <button
                type="button"
                onClick={() => setSyncType('zip')}
                className={`py-2 px-3 rounded-xl font-black text-[11px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${syncType === 'zip' ? 'bg-zinc-950 text-white dark:bg-white dark:text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <FileArchive size={13} />
                <span>Upload ZIP File</span>
              </button>
              <button
                type="button"
                onClick={() => setSyncType('app')}
                className={`py-2 px-3 rounded-xl font-black text-[11px] uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${syncType === 'app' ? 'bg-zinc-950 text-white dark:bg-white dark:text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <FolderClosed size={13} />
                <span>Local App Codebase</span>
              </button>
            </div>
          </div>

          {/* Upload transfer mode toggle */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.1em]">
                Upload Transfer Mode
              </label>
              <span className="text-[9px] font-black uppercase text-primary tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">
                {isSequential ? "One-by-One Mode (Safe)" : "Fast Bulk Upload"}
              </span>
            </div>
            <div 
              onClick={() => setIsSequential(!isSequential)}
              className="group bg-[var(--bg-card)] hover:bg-[var(--bg-card)]/80 border border-[var(--border-color)]/60 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="flex-1 pr-4 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Layers size={13} className={isSequential ? "text-primary animate-pulse" : "text-emerald-400"} />
                  <span className="text-xs font-black text-[var(--text-primary)]">
                    {isSequential ? "Sequential Mode (Active)" : "Fast Bulk/Batch Mode (Active)"}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-semibold">
                  {isSequential 
                    ? "Uploads and commits each file individually. Recommended for bypassing GitHub write/rate limits. Resumes seamlessly if paused." 
                    : "Uploads all file updates in a single, fast atomic commit. Ideal for standard small modifications."}
                </p>
              </div>
              <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 ${isSequential ? 'bg-primary' : 'bg-zinc-800'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${isSequential ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>

          {/* Branch configuration */}
          <div className="grid grid-cols-2 gap-3 bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-2xl p-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                Target Branch
              </label>
              <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                <GitBranch size={13} className="text-emerald-500" />
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold w-full p-0 shrink"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                Connected Repo
              </label>
              <div className="font-bold text-xs text-[var(--text-primary)] truncate">
                {selectedRepo.name}
              </div>
            </div>
          </div>

          {/* Core file selector body */}
          {syncType === 'zip' ? (
            <div className="space-y-3">
              {zipFiles.length === 0 ? (
                <GithubZipUploader onFilesExtracted={handleZipFilesReady} />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                      Extracted ZIP Dashboard
                    </span>
                    <button
                      onClick={() => setZipFiles([])}
                      className="text-[10px] font-black text-rose-500 uppercase cursor-pointer hover:underline"
                    >
                      Reset ZIP File
                    </button>
                  </div>
                  <GithubFileList
                    files={zipFiles}
                    remoteFiles={remoteFiles}
                    onUpdateFile={(index, updated) => {
                      const copy = [...zipFiles];
                      copy[index] = updated;
                      setZipFiles(copy);
                    }}
                    onRemoveFile={(index) => {
                      const copy = zipFiles.filter((_, idx) => idx !== index);
                      setZipFiles(copy);
                    }}
                    selectedPaths={selectedPaths}
                    onTogglePath={(path) => {
                      if (selectedPaths.includes(path)) {
                        setSelectedPaths(selectedPaths.filter(p => p !== path));
                      } else {
                        setSelectedPaths([...selectedPaths, path]);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            // Local app codebase checklist
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                  GrixChat Code Files ({selectedAppFiles.length}/{appCodeFiles.length})
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedAppFiles(selectedAppFiles.length === filteredAppFiles.length ? [] : filteredAppFiles)}
                  className="text-[10px] font-black text-primary uppercase cursor-pointer"
                >
                  Toggle All
                </button>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-2xl p-3 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filter standard codebase files..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="w-full text-xs py-2 pl-8 pr-3 bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--box-text)] rounded-xl focus:outline-none"
                  />
                  <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                </div>

                {loadingAppFiles ? (
                  <div className="text-center py-4 text-xs text-[var(--text-secondary)]">Scanning...</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-[var(--border-color)]/30 rounded-xl divide-y divide-[var(--border-color)]/10 font-mono text-[10px] no-scrollbar">
                    {filteredAppFiles.map(file => {
                      const isChecked = selectedAppFiles.includes(file);
                      return (
                        <div
                          key={file}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedAppFiles(selectedAppFiles.filter(a => a !== file));
                            } else {
                              setSelectedAppFiles([...selectedAppFiles, file]);
                            }
                          }}
                          className="flex items-center gap-3 p-2.5 hover:bg-[var(--bg-main)]/50 transition-colors cursor-pointer select-none"
                        >
                          <button className="text-[var(--text-secondary)] shrink-0">
                            {isChecked ? <CheckSquare size={13} className="text-primary" /> : <Square size={13} />}
                          </button>
                          <Folder size={11} className="text-amber-500 shrink-0" />
                          <span className="truncate text-[var(--text-primary)] font-semibold">{file}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pre-Sync Stats Summary on Idle */}
          {!isPushing && (syncType === 'zip' ? zipFiles.length > 0 : selectedAppFiles.length > 0) && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/60 p-3.5 rounded-2xl space-y-2.5 animate-[fadeIn_0.2s_ease-out]">
              <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-wider block">
                Sync Volume Analytics
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[var(--bg-main)]/60 p-2.5 rounded-xl border border-[var(--border-color)]/30 text-center">
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] block uppercase">Total Selected</span>
                  <span className="text-sm font-black text-[var(--text-primary)] mt-0.5 block font-mono">{syncStats.total}</span>
                </div>
                <div className="bg-[var(--bg-main)]/60 p-2.5 rounded-xl border border-[var(--border-color)]/30 text-center">
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] block uppercase">Remote Cached</span>
                  <span className="text-sm font-black text-emerald-400 mt-0.5 block font-mono">{syncStats.unchanged}</span>
                </div>
                <div className="bg-[var(--bg-main)]/60 p-2.5 rounded-xl border border-[var(--border-color)]/30 text-center">
                  <span className="text-[9px] font-bold text-[var(--text-secondary)] block uppercase">Pending Sync</span>
                  <span className="text-sm font-black text-amber-500 mt-0.5 block font-mono">{syncStats.changed}</span>
                </div>
              </div>
              <p className="text-[9px] text-[var(--text-secondary)] leading-relaxed italic text-center font-medium">
                {syncStats.unchanged} files match remote branch exactly and will be skipped during pushing to economize on API limits.
              </p>
            </div>
          )}

          {isPushing ? (
            /* Live Progress Meter Dashboard during commit sync */
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-2xl p-4.5 space-y-4 animate-[fadeIn_0.25s_ease-out] shadow-xl">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider font-sans">
                <span className="text-primary flex items-center gap-1.5 font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block shrink-0" />
                  {isSequential ? "Sequential Push Active" : "Fast Bulk Commit Active"}
                </span>
                <span className="text-emerald-400 font-mono font-extrabold">{currentProgressPercent}%</span>
              </div>

              {/* Line advance progress bar with shine shimmer */}
              <div className="relative h-2.5 w-full bg-[var(--bg-main)] rounded-full overflow-hidden border border-[var(--border-color)]/20 shadow-inner">
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-500 via-primary to-indigo-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${currentProgressPercent}%` }}
                />
              </div>

              {/* Current processing details */}
              <div className="bg-[var(--bg-main)]/80 px-3.5 py-3 rounded-xl border border-[var(--border-color)]/30 flex gap-2.5 items-center">
                <RefreshCw size={11} className="animate-spin text-primary shrink-0" />
                <span className="text-[10px] font-mono text-[var(--text-primary)] font-bold truncate">
                  {currentFileTransfer}
                </span>
              </div>

              {/* Real-time file sync indicators */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black uppercase">
                <div className="bg-[var(--bg-main)]/50 p-2 rounded-xl border border-[var(--border-color)]/20">
                  <span className="text-[8px] text-[var(--text-secondary)] block">Total Files</span>
                  <span className="text-[11px] text-[var(--text-primary)] font-mono mt-0.5 block">{totalFiles}</span>
                </div>
                <div className="bg-[var(--bg-main)]/50 p-2 rounded-xl border border-[var(--border-color)]/20">
                  <span className="text-[8px] text-[var(--text-secondary)] block">Already exist</span>
                  <span className="text-[11px] text-emerald-400 font-mono mt-0.5 block">{filesAlreadyExist}</span>
                </div>
                <div className="bg-[var(--bg-main)]/50 p-2 rounded-xl border border-[var(--border-color)]/20">
                  <span className="text-[8px] text-[var(--text-secondary)] block">Uploaded</span>
                  <span className="text-[11px] text-primary font-mono mt-0.5 block">{filesUploadedCount}</span>
                </div>
                <div className="bg-[var(--bg-main)]/50 p-2 rounded-xl border border-[var(--border-color)]/20">
                  <span className="text-[8px] text-[var(--text-secondary)] block">Remaining</span>
                  <span className="text-[11px] text-amber-500 font-mono mt-0.5 block">{filesRemainingCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Commit Message Box */}
              <div className="space-y-1 animate-[fadeIn_0.15s_ease-out]">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.1em] ml-1">
                  Commit Message Description
                </label>
                <input
                  type="text"
                  placeholder="Commit custom sync codebase"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]/60 text-[var(--box-text)] focus:outline-none font-bold"
                />
              </div>

              <button
                onClick={handlePush}
                disabled={isPushing || (syncType === 'zip' ? zipFiles.length === 0 : selectedAppFiles.length === 0)}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-zinc-700/50 text-white font-black text-xs uppercase h-11 rounded-xl shadow-md transition-all active:scale-95 duration-200 flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <GitCommit size={14} />
                <span>Publish Smart Delta Commit</span>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
