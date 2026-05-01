import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Mic, MicOff, StopCircle, Trash2, Camera as CameraIcon, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChatMessageMenu, 
  ChatEditPreview, 
  ChatReplyPreview, 
  EmojiPickerMenu 
} from '../../components/ChatUIComponents.tsx';

interface ChatBottomProps {
  activeMessageMenu: any;
  setActiveMessageMenu: (msg: any) => void;
  setReplyingTo: (msg: any) => void;
  startEdit: (msg: any) => void;
  deleteMessage: (id: string) => void;
  currentUserUid: string | undefined;
  setShowReactionPicker: (msg: any) => void;
  editingMessage: any;
  setEditingMessage: (msg: any) => void;
  newMessage: string;
  setNewMessage: (text: string | ((prev: string) => string)) => void;
  replyingTo: any;
  receiver: any;
  handleSendMessage: (e: React.FormEvent | { preventDefault: () => void }) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPlusMenu: boolean;
  setShowPlusMenu: (show: boolean) => void;
  plusMenuRef: React.RefObject<HTMLDivElement | null>;
  chatId: string | undefined;
  filePreviewUrl: string | null;
  isUploading: boolean;
  uploadProgress: number;
  setSelectedFile: (file: File | Blob | null) => void;
  setFilePreviewUrl: (url: string | null) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleTyping: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  isSending: boolean;
  selectedFile: File | Blob | null;
}

export default function ChatBottom({
  activeMessageMenu,
  setActiveMessageMenu,
  setReplyingTo,
  startEdit,
  deleteMessage,
  currentUserUid,
  setShowReactionPicker,
  editingMessage,
  setEditingMessage,
  newMessage,
  setNewMessage,
  replyingTo,
  receiver,
  handleSendMessage,
  fileInputRef,
  imageInputRef,
  handleFileChange,
  showPlusMenu,
  setShowPlusMenu,
  plusMenuRef,
  chatId,
  filePreviewUrl,
  isUploading,
  uploadProgress,
  setSelectedFile,
  setFilePreviewUrl,
  textareaRef,
  handleTyping,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  isSending,
  selectedFile
}: ChatBottomProps) {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ].find(type => MediaRecorder.isTypeSupported(type));

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mimeType || 'audio/webm';
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type });
          setSelectedFile(audioBlob);
          setFilePreviewUrl(URL.createObjectURL(audioBlob));
        }
        stream.getTracks().forEach(track => track.stop());
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
      };

      mediaRecorder.start(200); // 200ms timeslice for better reliability
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear the onstop handler first so we don't save the cancelled message
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Stop tracks manually
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach(track => track.stop());
      
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
    }
  };

  const formatRecTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isMicMode = !newMessage.trim() && !selectedFile && !isRecording;

  return (
    <div className="shrink-0 bg-transparent px-2 pb-safe z-50 relative w-full max-w-full">
      <ChatMessageMenu 
        activeMessageMenu={activeMessageMenu}
        setActiveMessageMenu={setActiveMessageMenu}
        setReplyingTo={setReplyingTo}
        startEdit={startEdit}
        deleteMessage={deleteMessage}
        currentUserUid={currentUserUid}
        setShowReactionPicker={setShowReactionPicker}
      />

      <ChatEditPreview 
        editingMessage={editingMessage}
        setEditingMessage={setEditingMessage}
        setNewMessage={(text) => setNewMessage(text)}
      />

      <ChatReplyPreview 
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        receiver={receiver}
        currentUserUid={currentUserUid}
      />

      <div className="flex items-end gap-2 w-full max-w-full relative pb-2 pt-1">
        <div className={`flex-1 min-w-0 bg-[#2b3943] rounded-[24px] px-1 sm:px-2 flex flex-col transition-all shadow-sm ${isRecording ? 'animate-pulse' : ''}`}>
          {selectedFile && !isRecording && (
            <div className="mt-2 mb-1 px-2 relative w-fit group">
              <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-md max-w-[120px] sm:max-w-[150px] bg-black/20 p-1.5">
                {filePreviewUrl ? (
                  selectedFile?.type.startsWith('video/') ? (
                    <video src={filePreviewUrl} className="w-full h-auto rounded-lg" muted />
                  ) : selectedFile?.type.startsWith('audio/') ? (
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Mic size={14} className="text-[#00a884]" />
                      <span className="text-[10px] font-black text-white/90">Voice message</span>
                    </div>
                  ) : (
                    <img src={filePreviewUrl} alt="Preview" className="w-full h-auto rounded-lg" />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-1 py-1 px-1">
                    <Paperclip className="text-white/60" size={18} />
                    <p className="text-[9px] text-white/60 font-bold truncate w-[60px] sm:w-[80px] text-center">{(selectedFile as File).name}</p>
                  </div>
                )}
                {!isUploading && !isSending && (
                  <button 
                    type="button"
                    onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); }}
                    className="absolute top-0.5 right-0.5 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-all shadow-sm"
                  >
                    <X size={10} />
                  </button>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black">{uploadProgress}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-end w-full min-h-[48px] pb-0.5">
            {isRecording ? (
              <div className="flex-1 min-w-0 flex items-center justify-between py-2.5 px-3 self-center">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  <span className="text-[15px] font-medium text-white/90">{formatRecTime(recordingTime)}</span>
                </div>
                <button 
                  onClick={cancelRecording}
                  className="px-3 py-1 text-white/60 text-[12px] active:scale-95 transition-all"
                >
                  Swipe to cancel
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center shrink-0 mb-1">
                  <EmojiPickerMenu 
                    showEmojiPicker={showEmojiPicker}
                    setShowEmojiPicker={setShowEmojiPicker}
                    emojiPickerRef={emojiPickerRef}
                    onEmojiSelect={(emoji) => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                  />
                </div>

                <textarea 
                  ref={textareaRef}
                  placeholder="Message"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  rows={1}
                  className="flex-1 bg-transparent text-[17px] focus:outline-none text-white placeholder:text-white/40 py-2.5 px-2 resize-none max-h-[120px] leading-tight"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isMicMode) {
                      e.preventDefault();
                      handleSendMessage(e as any);
                    }
                  }}
                />

                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pr-1 mb-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    title="Attach"
                  >
                    <Paperclip size={22} className="-rotate-45" />
                  </button>
                  
                  {!newMessage.trim() && !selectedFile && (
                    <>
                      <button 
                        onClick={() => navigate(`/camera?chatId=${chatId}`)}
                        className="p-2 text-white/60 hover:text-white transition-colors"
                        title="Camera"
                      >
                        <CameraIcon size={22} />
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <button 
          type="button" 
          onClick={(e) => {
            if (isRecording) {
              stopRecording();
            } else if (isMicMode) {
              startRecording();
            } else {
              handleSendMessage(e as any);
            }
          }}
          disabled={((!newMessage.trim() && !selectedFile) && !isMicMode && !isRecording) || isSending || isUploading}
          className={`shrink-0 w-[48px] h-[48px] flex items-center justify-center rounded-full text-white transition-all shadow-md active:scale-95 ${
            isRecording ? 'bg-red-500' : 'bg-sky-500'
          }`}
        >
          {isSending ? (
            <Loader2 size={24} className="animate-spin" />
          ) : isRecording ? (
            <StopCircle size={24} />
          ) : isMicMode ? (
            <Mic size={24} />
          ) : (
            <Send size={24} className="ml-1" />
          )}
        </button>
      </div>
    </div>
  );
}

