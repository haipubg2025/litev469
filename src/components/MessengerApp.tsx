import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Search, Menu, Edit, Camera, Phone, Video, 
  Info, Image as ImageIcon, Mic, Smile, PlusCircle, 
  ThumbsUp, ChevronLeft, MoreHorizontal, ArrowLeft,
  MessageSquare, User, CornerUpLeft, X, Sparkles, Lightbulb, Wand2,
  Play, Pause, Music, Trash2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { aiService } from '../services/aiService';
import GalleryModal from './GalleryModal';
import { formatImageUrl } from '../utils/imageUtils';

function AudioMessagePlayer({ url, isMe }: { url: string; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (url && url.startsWith('http')) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [url]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          if (audioRef.current) {
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
          }
        }, 100);
      }
    } else {
      if (isPlaying) {
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              setIsPlaying(false);
              clearInterval(intervalRef.current);
              return 0;
            }
            return prev + 5;
          });
        }, 150);
      }
    }
  };

  return (
    <div className={`flex items-center gap-3.5 py-1.5 px-1.5 min-w-[200px] ${isMe ? 'text-white' : 'text-inherit'}`}>
      <button 
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow transition-all hover:scale-105 active:scale-95 ${
          isMe 
            ? 'bg-white text-[#0084FF]' 
            : 'bg-[#0084FF] text-white'
        }`}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-0.5 h-6">
          {[4, 12, 18, 10, 6, 14, 20, 16, 8, 12, 18, 10, 6, 14, 16, 8, 12, 6, 10].map((h, i) => {
            const active = progress > (i / 19) * 100;
            const targetColor = isMe 
              ? (active ? 'bg-white' : 'bg-white/40') 
              : (active ? 'bg-[#0084FF]' : 'bg-gray-300 dark:bg-zinc-700');
            return (
              <span 
                key={i} 
                style={{ height: `${isPlaying ? Math.max(4, h + Math.sin(progress + i) * 6) : h}px` }} 
                className={`w-[3px] rounded-full transition-all duration-150 ${targetColor}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] opacity-75">
          <span>{isPlaying ? `0:${Math.floor((progress/100) * 15).toString().padStart(2, '0')}` : '0:15'}</span>
          <span className="flex items-center gap-0.5"><Music size={8} /> Ghi âm</span>
        </div>
      </div>
    </div>
  );
}


const getAvatarColor = (name: string) => {
  const colors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

const getInitials = (name: string) => {
  return name ? name.substring(0, 2).toUpperCase() : '??';
};

const Avatar = ({ name, sizeClass = "w-14 h-14", textClass = "text-lg", isGroup = false, groupAvatarUrl, npcs, chatId }: { name: string, sizeClass?: string, textClass?: string, isGroup?: boolean, groupAvatarUrl?: string, npcs: any[], chatId?: string }) => {
  const getNpcAvatar = (chatName: string, idVal?: string) => {
    let npc = null;
    if (idVal) {
      npc = npcs.find((n: any) => n.id && n.id.toLowerCase() === idVal.toLowerCase());
      if (!npc) {
        npc = npcs.find((n: any) => n.name && n.name.toLowerCase() === idVal.toLowerCase());
      }
    }
    if (!npc) {
      npc = npcs.find((n: any) => n.name === chatName || n.fullName === chatName);
    }
    return npc?.avatar || npc?.image || npc?.imageUrl || npc?.appearanceLite || npc?.appearance;
  };
  const avatarUrl = isGroup ? groupAvatarUrl : getNpcAvatar(name, chatId);
  const isValidUrl = avatarUrl && avatarUrl.trim() !== "" && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:') || avatarUrl.startsWith('/') || avatarUrl.includes('.'));
  
  if (isValidUrl) {
    return (
      <img 
        src={formatImageUrl(avatarUrl)} 
        alt={name} 
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover border border-white/10`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent && !parent.querySelector('.fallback-avatar')) {
            const fallback = document.createElement('div');
            fallback.className = `fallback-avatar ${sizeClass} rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(name)} ${textClass}`;
            fallback.innerText = getInitials(name);
            parent.appendChild(fallback);
          }
        }}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(name)} ${textClass}`}>
      {getInitials(name)}
    </div>
  );
};

export default function MessengerApp({ onClose, theme = 'dark' }: { onClose: () => void, theme?: 'light' | 'dark' }) {
  const gameData = useStore((state) => state.gameData);
  const setGameData = useStore((state) => state.setGameData);
  const npcs = gameData?.npcs || [];
  const phoneData = gameData?.phone || { chats: [] };
  const mcData = gameData?.mcData;
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [inputText, setInputText] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAvatar, setNewGroupAvatar] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [aiProcessTime, setAiProcessTime] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAiReplying) {
      setAiProcessTime(0);
      interval = setInterval(() => {
        setAiProcessTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAiReplying]);

  // Streaming states
  const [displayedMessages, setDisplayedMessages] = useState<any[]>([]);
  const [streamingQueue, setStreamingQueue] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [typingSender, setTypingSender] = useState<string | null>(null);

  // Chế độ trả lời & xem chi tiết
  const [replyingMessage, setReplyingMessage] = useState<any | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // States cho chọn ảnh nhóm
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [gallerySelectorCallback, setGallerySelectorCallback] = useState<((url: string) => void) | null>(null);

  // States cho gợi ý tin nhắn thông minh (AI)
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);

  // Lưu trạng thái số lượng tin nhắn đã đọc trong từng đoạn chat
  const readChatIds = gameData?.messengerReadChatIds || {};
  const setReadChatIds = useStore(state => state.setMessengerReadChatIds);

  const handleUploadGroupAvatar = async (file: File, callback: (url: string) => void) => {
    try {
      const { compressImage } = await import('../utils/imageCompression');
      const { storageService } = await import('../services/storageService');
      
      const base64Data = await compressImage(file, 0.8, 512);
      const imgId = Date.now().toString();
      const localKey = await storageService.saveImage(imgId, base64Data);
      
      setGameData((prev: any) => {
        if (!prev) return prev;
        const currentGallery = prev.gallery || { devImages: [], playerTabs: [{ id: 'default-player-tab', name: 'Chung' }], playerImages: [] };
        const newImg = {
          id: 'img-' + imgId,
          tabId: 'default-player-tab',
          groupId: 'gallery',
          url: localKey,
          name: 'Avatar nhóm ' + file.name
        };
        return {
          ...prev,
          gallery: {
            ...currentGallery,
            playerImages: [...(currentGallery.playerImages || []), newImg]
          }
        };
      });

      callback(localKey);
      toast.success('Đã tải lên và cài đặt ảnh đại diện!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi tải lên hoặc nén ảnh');
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-extrabold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const isSticker = (content: string) => {
    if (!content) return false;
    const trimmed = content.trim();
    return /\[(sticker|nhãn dán|Sticker|Nhãn dán):\s*(.*?)\]/i.test(trimmed);
  };

  const renderMessageContent = (content: string, isMe: boolean) => {
    if (!content) return null;
    const trimmed = content.trim();

    // 1. Kiểm tra ảnh Markdown
    const mdImageRegex = /!\[(.*?)\]\((.*?)\)/;
    const mdImageMatch = trimmed.match(mdImageRegex);
    if (mdImageMatch) {
      const alt = mdImageMatch[1];
      const url = mdImageMatch[2];
      return (
        <div className="mt-1 rounded-2xl overflow-hidden border border-white/10 max-w-[240px] shadow-md bg-black/20 hover:scale-[1.02] transition-transform duration-200">
          <img 
            src={formatImageUrl(url)} 
            alt={alt} 
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[300px] object-cover cursor-pointer"
          />
        </div>
      );
    }

    // 2. Kiểm tra Sticker
    const stickerRegex = /\[(sticker|nhãn dán|Sticker|Nhãn dán):\s*(.*?)\]/i;
    const stickerMatch = trimmed.match(stickerRegex);
    if (stickerMatch) {
      const stickerName = stickerMatch[2].trim().toLowerCase();
      let stickerEmoji = "🐱";
      if (stickerName.includes("like") || stickerName === "thích") stickerEmoji = "👍";
      else if (stickerName.includes("love") || stickerName === "tim" || stickerName === "yêu") stickerEmoji = "❤️";
      else if (stickerName.includes("haha") || stickerName.includes("cười")) stickerEmoji = "😆";
      else if (stickerName.includes("sad") || stickerName.includes("khóc")) stickerEmoji = "😭";
      else if (stickerName.includes("wow") || stickerName.includes("ngạc nhiên")) stickerEmoji = "😮";
      else if (stickerName.includes("angry") || stickerName.includes("giận")) stickerEmoji = "😡";
      else if (stickerName.includes("hello") || stickerName.includes("chào")) stickerEmoji = "👋";
      else if (stickerName.includes("ok")) stickerEmoji = "👌";
      else if (stickerName.includes("kiss") || stickerName === "hôn") stickerEmoji = "😘";
      else if (stickerName.includes("cry")) stickerEmoji = "😢";
      else if (stickerName.includes("ghost") || stickerName.includes("ma")) stickerEmoji = "👻";
      else if (stickerName.includes("cat") || stickerName.includes("mèo")) stickerEmoji = "😸";
      else if (stickerName.includes("dog") || stickerName.includes("chó")) stickerEmoji = "🐶";
      
      return (
        <div className="text-5xl my-1 animate-bounce select-none drop-shadow-md" title={stickerName}>
          {stickerEmoji}
        </div>
      );
    }

    // 3. Kiểm tra file âm thanh / ghi âm
    const audioRegex = /\[(audio|ghi âm|Ghi âm|Audio)\]\((.*?)\)/i;
    const audioMatch = trimmed.match(audioRegex);
    const isAudioRaw = trimmed.startsWith("http") && (trimmed.endsWith(".mp3") || trimmed.endsWith(".wav") || trimmed.endsWith(".m4a") || trimmed.includes("voice-note") || trimmed.includes("audio"));
    
    if (audioMatch || isAudioRaw) {
      const audioUrl = audioMatch ? audioMatch[2] : trimmed;
      let textDesc = audioUrl
        .replace(/\.mp3|\.wav|\.m4a/gi, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ');
      
      textDesc = textDesc.charAt(0).toUpperCase() + textDesc.slice(1);
      
      return (
        <div className={`flex items-center gap-1.5 py-1 px-0.5 text-[14px] ${isMe ? 'text-white/95 font-medium' : 'text-zinc-700 dark:text-zinc-200 font-medium'}`}>
          <span className="shrink-0 select-none">🎙️</span>
          <span className="italic">[Tin nhắn thoại: {textDesc}]</span>
        </div>
      );
    }

    // 4. Kiểm tra URL ảnh trực tiếp
    const isDirectImage = trimmed.startsWith("data:image/") || trimmed.startsWith("local-img-") || 
      (trimmed.startsWith("http") && (trimmed.endsWith(".jpg") || trimmed.endsWith(".jpeg") || trimmed.endsWith(".png") || trimmed.endsWith(".gif") || trimmed.endsWith(".webp") || trimmed.includes("images") || trimmed.includes("avatar")));
    
    if (isDirectImage) {
      return (
        <div className="mt-1 rounded-2xl overflow-hidden border border-white/10 max-w-[240px] shadow-md bg-black/20 hover:scale-[1.02] transition-transform duration-200">
          <img 
            src={formatImageUrl(trimmed)} 
            alt="Đính kèm" 
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[300px] object-cover cursor-pointer"
          />
        </div>
      );
    }

    // 5. Văn bản thuần túy hoặc inline markdown
    return <span className="text-[15px] leading-snug break-words whitespace-pre-line">{renderFormattedText(content)}</span>;
  };

  const handleSetActiveChat = (chat: any) => {
    if (chat) {
      // Đóng panel gợi ý khi đổi chat
      setShowSuggestions(false);
      
      // Đánh dấu tất cả tin nhắn hiện tại của chat này là đã đọc/hết pending stream để xuất hiện ngay lập tức
      setGameData((draft: any) => {
        if (draft.phone?.chats) {
          const targetChat = draft.phone.chats.find((c: any) => c.chatId === chat.chatId);
          if (targetChat && targetChat.messages) {
            targetChat.messages.forEach((m: any) => {
              if (m.isPendingStream) {
                delete m.isPendingStream;
              }
            });
          }
        }
        return draft;
      });
    }
    isFirstLoadRef.current = true;
    setActiveChat(chat);
  };

  const isNpcOnline = (nameOrId: string) => {
    if (!nameOrId) return false;
    if (typingSender === nameOrId) return true;
    if (activeChat && (activeChat.chatId === nameOrId || activeChat.chatName === nameOrId) && (isAiReplying || isStreaming)) return true;
    
    const charCodeSum = nameOrId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return charCodeSum % 3 === 0;
  };

  const getChatDisplayName = (chat: any) => {
    if (!chat) return "";
    if (chat.isGroup) return chat.chatName;
    const npc = npcs.find((n: any) => n.id && n.id.toLowerCase() === chat.chatId?.toLowerCase()) || 
                npcs.find((n: any) => n.name && n.name.toLowerCase() === chat.chatId?.toLowerCase()) ||
                npcs.find((n: any) => n.name === chat.chatName || n.fullName === chat.chatName);
    
    return chat.nickname || chat.chatName || npc?.fullName || npc?.name || "Người dùng Messenger";
  };

  const renderAvatar = (name: string, sizeClass: string = "w-14 h-14", textClass: string = "text-lg", isGroup: boolean = false, groupAvatarUrl?: string, chatId?: string) => {
    return <Avatar name={name} sizeClass={sizeClass} textClass={textClass} isGroup={isGroup} groupAvatarUrl={groupAvatarUrl} npcs={npcs} chatId={chatId} />;
  };

  const handleSelectSuggestion = (reply: string) => {
    setInputText(reply);
    setShowSuggestions(false);
  };

  const currentStoreChat = activeChat ? phoneData.chats.find((c: any) => c.chatId === activeChat.chatId) || activeChat : null;
  const suggestedReplies = currentStoreChat?.suggestedReplies || [];

  useEffect(() => {
    isFirstLoadRef.current = true;
  }, [activeChat?.chatId]);
  
  const isDark = theme === 'dark';
  const textClass = isDark ? 'text-white' : 'text-black';
  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const headerBgClass = isDark ? 'bg-black' : 'bg-white';
  const hoverClass = isDark ? 'hover:bg-white/10' : 'hover:bg-black/5';
  const borderClass = isDark ? 'border-white/10' : 'border-black/10';
  const inputBgClass = isDark ? 'bg-white/15' : 'bg-black/5';
  const bubbleBgClass = isDark ? 'bg-white/15' : 'bg-black/10';
  const fbBlue = 'text-[#0084FF]';
  const fbBlueBg = 'bg-[#0084FF]';

  // Helper chia nhỏ tin nhắn dài thành nhiều bong bóng chat tự nhiên hơn
  const splitMessage = (text: string): string[] => {
    if (!text) return [];
    // Chia theo các dấu xuống dòng kép hoặc các ký tự ngắt câu hợp lý để tách bong bóng chat mượt mà
    // Replace lookbehind to support Safari. We split by spaces following a punctuation mark or by newline.
    // Instead of lookbehind, we can just use a normal split and re-attach punctuation, or simply split by newline if it's too complex.
    // Actually, splitting by /[.!?])\s+|\n+/ can be simulated by replacing punctuation+space with punctuation+newline, then splitting by newline.
    const normalizedText = text.replace(/([.!?])\s+/g, "$1\n");
    const sentences = normalizedText.split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length <= 1) return [text];
    
    const result: string[] = [];
    let temp = "";
    for (const s of sentences) {
      if (temp.length + s.length < 130) {
        temp = temp ? temp + " " + s : s;
      } else {
        if (temp) result.push(temp);
        temp = s;
      }
    }
    if (temp) result.push(temp);
    // Giới hạn tối đa 3 tin nhắn để không spam quá dài
    return result.slice(0, 3);
  };

  // Tự động phát hiện và gộp các cuộc trò chuyện cá nhân trỏ đến cùng một NPC (để tránh rác kịch bản nhân bản NPC)
  useEffect(() => {
    if (!phoneData.chats || phoneData.chats.length === 0) return;
    
    let hasChanges = false;
    const chats = [...phoneData.chats];
    const groupChats = chats.filter((c: any) => c.isGroup);
    const singleChats = chats.filter((c: any) => !c.isGroup);
    
    const mergedSingleChatsMap: Record<string, any> = {};
    
    singleChats.forEach((chat: any) => {
      // Tìm NPC tương ứng cho chat này
      const npc = npcs.find((n: any) => {
        const idMatch = n.id && (n.id.toLowerCase() === chat.chatId?.toLowerCase());
        const nameMatch = n.name && (n.name.toLowerCase() === chat.chatId?.toLowerCase() || n.name.toLowerCase() === chat.chatName?.toLowerCase());
        const fullNameMatch = n.fullName && (n.fullName.toLowerCase() === chat.chatName?.toLowerCase() || n.fullName.toLowerCase() === chat.chatId?.toLowerCase());
        return idMatch || nameMatch || fullNameMatch;
      });
      
      // Khóa định danh chuẩn cho chat cá nhân này (ưu tiên id/name của NPC gốc, nếu không thì giữ chatId cũ)
      const standardChatId = npc ? (npc.id || npc.name) : chat.chatId;
      const key = standardChatId.toLowerCase();
      
      const currentChatName = chat.chatName || (npc ? npc.name : "Người dùng");
      
      if (!mergedSingleChatsMap[key]) {
        mergedSingleChatsMap[key] = {
          ...chat,
          chatId: standardChatId,
          chatName: currentChatName,
          messages: [...(chat.messages || [])]
        };
        if (chat.chatId !== standardChatId) {
          hasChanges = true;
        }
      } else {
        hasChanges = true;
        const existingMessages = mergedSingleChatsMap[key].messages;
        const newMessages = chat.messages || [];
        
        newMessages.forEach((m: any) => {
          const isDuplicateMsg = existingMessages.some((em: any) => 
            em.sender === m.sender && 
            em.content === m.content && 
            em.timestamp === m.timestamp
          );
          if (!isDuplicateMsg) {
            existingMessages.push(m);
          }
        });
        
        // Sắp xếp tin nhắn theo thời gian
        existingMessages.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
      }
    });
    
    if (hasChanges) {
      setGameData((draft: any) => {
        if (!draft.phone) draft.phone = { chats: [] };
        draft.phone.chats = [...groupChats, ...Object.values(mergedSingleChatsMap)];
        return draft;
      });
      
      useStore.getState().setSystemLogs?.({
        message: "Hệ thống đã tự động định danh và đồng nhất các cuộc trò chuyện của NPC, ngăn chặn hiện tượng trùng lặp nhân vật rác.",
        type: 'notification'
      });
    }
  }, [phoneData.chats, npcs, setGameData]);

  // Mỗi khi đổi phòng chat hoặc khi có tin nhắn mới từ store
  useEffect(() => {
    if (!activeChat) {
      setDisplayedMessages([]);
      setStreamingQueue([]);
      setIsStreaming(false);
      setTypingSender(null);
      return;
    }

    // Lấy thông tin chat cập nhật nhất từ store dựa trên activeChat.chatId
    const currentStoreChat = phoneData.chats.find(c => c.chatId === activeChat.chatId) || activeChat;
    const allMsgs = currentStoreChat.messages || [];
    
    // Tách các tin nhắn đã đọc/hiển thị xong và các tin nhắn đang chờ stream
    const confirmed = allMsgs.filter((m: any) => !m.isPendingStream);
    const pending = allMsgs.filter((m: any) => m.isPendingStream);

    setDisplayedMessages(confirmed);
    
    // Nếu có tin nhắn mới đang chờ stream và hàng đợi hiện tại đang rỗng hoặc chưa khớp, nạp chúng vào hàng đợi
    if (pending.length > 0 && streamingQueue.length === 0) {
      setStreamingQueue(pending);
      setIsStreaming(true);
    }

    // Đánh dấu toàn bộ tin nhắn trong cuộc trò chuyện hiện tại là đã đọc
    setReadChatIds(prev => ({
      ...prev,
      [activeChat.chatId]: allMsgs.length
    }));
  }, [activeChat?.chatId, phoneData.chats, activeChat]);

  // Vận hành hàng đợi stream lần lượt từng tin nhắn
  useEffect(() => {
    if (streamingQueue.length === 0) {
      if (isStreaming) {
        setIsStreaming(false);
        setTypingSender(null);
      }
      return;
    }

    const nextMsg = streamingQueue[0];
    setTypingSender(nextMsg.sender);

    // Tính toán thời gian giả lập soạn tin nhắn mượt mà (khoảng 1.2s đến 2.5s dựa trên độ dài)
    const typingDuration = Math.min(Math.max(nextMsg.content.length * 12, 1200), 2500);

    const timer = setTimeout(() => {
      // 1. Đưa tin nhắn hiện tại vào hiển thị
      setDisplayedMessages(prev => [...prev, nextMsg]);

      // 2. Cập nhật vào store để đánh dấu đã stream (xóa cờ isPendingStream)
      setGameData((draft: any) => {
        if (draft.phone?.chats) {
          const targetChat = draft.phone.chats.find((c: any) => c.chatId === activeChat?.chatId);
          if (targetChat && targetChat.messages) {
            const dbMsg = targetChat.messages.find((m: any) => 
              m.isPendingStream && 
              m.sender === nextMsg.sender && 
              m.content === nextMsg.content
            );
            if (dbMsg) {
              delete dbMsg.isPendingStream;
            }
          }
        }
        return draft;
      });

      // 3. Xóa tin nhắn đầu tiên khỏi hàng đợi để tiếp tục vòng lặp
      setStreamingQueue(prev => prev.slice(1));
    }, typingDuration);

    return () => clearTimeout(timer);
  }, [streamingQueue, isStreaming, activeChat?.chatId]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (activeChat) {
      if (isFirstLoadRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        // Tiny timeout to make sure it is at bottom after render completes
        const t = setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
          isFirstLoadRef.current = false;
        }, 10);
        return () => clearTimeout(t);
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [displayedMessages, isAiReplying, typingSender, activeChat]);

  // Tối ưu hoá render: gom nhóm các tin nhắn liên tiếp của cùng 1 người gửi
  const groupedMessages = React.useMemo(() => {
    const groups: any[] = [];
    let currentGroup: any = null;
    for (const msg of displayedMessages) {
      if (!currentGroup || currentGroup.sender !== msg.sender) {
        currentGroup = { sender: msg.sender, isMe: msg.sender === (mcData?.name || "Player"), messages: [msg] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(msg);
      }
    }
    return groups;
  }, [displayedMessages, mcData?.name]);

  // Cleanup khi đóng ứng dụng
  useEffect(() => {
    return () => {
      setStreamingQueue([]);
      setDisplayedMessages([]);
      setIsStreaming(false);
      setTypingSender(null);
      
      setGameData((draft: any) => {
        if (draft?.phone?.chats) {
          draft.phone.chats.forEach((chat: any) => {
            if (chat.messages) {
              chat.messages.forEach((m: any) => {
                delete m.isPendingStream;
              });
            }
          });
        }
        return draft;
      });
    };
  }, []);

  // Generate a random avatar color based on name

  // Combine npcs and existing chats
  const hiddenChats = phoneData.hiddenChats || [];
  const chatList = [...phoneData.chats].filter(c => !hiddenChats.includes(c.chatId));
  
  // Add NPCs that don't have a chat yet
  npcs.forEach((npc: any) => {
    const npcChatId = npc.id || npc.name;
    if (!hiddenChats.includes(npcChatId) && !chatList.find(c => c.chatId === npcChatId)) {
      chatList.push({
        chatId: npcChatId,
        chatName: npc.fullName || npc.name,
        isGroup: false,
        participants: [mcData?.name || "Player", npc.name],
        messages: []
      });
    }
  });

  const handleDeleteChat = (e: React.MouseEvent, chatToDelete: any) => {
    e.stopPropagation();
    
    setGameData((draft: any) => {
      if (!draft.phone) draft.phone = { chats: [], hiddenChats: [] };
      if (!draft.phone.hiddenChats) draft.phone.hiddenChats = [];
      
      // Remove from current chats list
      draft.phone.chats = draft.phone.chats.filter((c: any) => c.chatId !== chatToDelete.chatId);
      
      // Add to hiddenChats to prevent regeneration for NPCs
      if (!draft.phone.hiddenChats.includes(chatToDelete.chatId)) {
        draft.phone.hiddenChats.push(chatToDelete.chatId);
      }
      
      return draft;
    });
    
    if (activeChat?.chatId === chatToDelete.chatId) {
      setActiveChat(null);
    }
  };

  const currentChat = activeChat ? (chatList.find(c => c.chatId === activeChat.chatId) || activeChat) : null;

  const getDummyMessage = (chat: any) => {
    if (chat.messages && chat.messages.length > 0) {
      return chat.messages[chat.messages.length - 1].content;
    }
    return "Nhấn để bắt đầu trò chuyện";
  };

  const renderChatList = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex flex-col h-full ${bgClass} ${textClass}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 pt-4 pb-2 ${headerBgClass}`}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className={`p-2 -ml-2 rounded-full ${hoverClass}`}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">Chat</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-full cursor-pointer ${inputBgClass}`} onClick={() => setIsCreatingGroup(true)}>
            <Edit size={20} />
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto pb-4">
        {chatList.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            Chưa có liên lạc nào.
          </div>
        )}
        {chatList.map((chat: any, idx: number) => {
          const isUnread = (() => {
            if (activeChat?.chatId === chat.chatId) return false;
            const messages = chat.messages || [];
            if (messages.length === 0) return false;
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.sender === (mcData?.name || "Player")) return false;
            
            const readCount = readChatIds[chat.chatId];
            if (readCount === undefined) return true;
            return messages.length > readCount;
          })();

          return (
            <div 
              key={`chat-${idx}`} 
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer group ${hoverClass}`}
              onClick={() => handleSetActiveChat(chat)}
            >
              <div className="relative flex-shrink-0">
                {renderAvatar(chat.chatName, "w-14 h-14", "text-lg", chat.isGroup, chat.avatar, chat.chatId)}
                {!chat.isGroup && isNpcOnline(chat.chatId || chat.chatName) && (
                  <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 rounded-full ${isDark ? 'border-black' : 'border-white'}`}></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className={`text-[15px] truncate pr-2 ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                    {getChatDisplayName(chat)}
                  </h3>
                  <span className={`text-xs flex-shrink-0 ${isUnread ? 'text-[#0084FF] font-bold' : 'text-gray-500'}`}>
                    {chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].timestamp : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-sm truncate pr-4 ${isUnread ? (isDark ? 'text-white font-semibold' : 'text-black font-semibold') : 'text-gray-500'}`}>
                    {getDummyMessage(chat)}
                  </p>
                  {isUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0084FF] flex-shrink-0 mr-1 animate-pulse" />
                  )}
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat)}
                    className="p-1.5 rounded-full text-red-500 transition-opacity hover:bg-red-500/10 ml-2"
                    title="Xóa đoạn chat"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  const getAiChatResponse = async (userMessageContent: string, chatObj: any) => {
    if (isAiReplying) return;
    setIsAiReplying(true);
    setAiError(null);
    try {
      const mcName = mcData?.name || "Player";

      // Get latest message history from state to be consistent
      const latestChats = useStore.getState().gameData?.phone?.chats || [];
      const latestChatObj = latestChats.find((c: any) => c.chatId === chatObj.chatId) || chatObj;
      const currentMessages = latestChatObj.messages || [];
      
      const messagesHistoryStr = currentMessages
        .slice(-15)
        .map((m: any) => `[${m.sender}]: ${m.content}`)
        .join("\n");

      // Lấy diễn biến cốt truyện chính văn gần đây từ store (2 lượt chơi = 4 tin nhắn)
      const globalMessages = useStore.getState().messages || [];
      const recentGameplayStr = globalMessages
        .filter((m: any) => m.sender === "user" || m.sender === "ai")
        .slice(-4)
        .map((m: any) => `+ [${m.sender === "user" ? "MC Hành Động" : "Diễn Biến Cốt Truyện"}]: ${m.content ? (m.content.length > 600 ? m.content.substring(0, 600) + "..." : m.content) : ""}`)
        .join("\n");

      // Trích xuất toàn bộ CODEX
      const codexStr = `
- Dữ liệu Thế giới (World Data): ${JSON.stringify(gameData.worldData || {})}
- Chi tiết Thế giới (World Details): ${JSON.stringify(gameData.worldDetails || {})}
`.trim();

      // Trích xuất toàn bộ thông tin cơ bản và tính cách của tất cả NPC trong game
      const allNpcsStr = npcs.map((n: any) => `- NPC "${n.name || n.fullName}": Tính cách: "${n.personality || "Chưa rõ"}", Cốt lõi: "${n.personalityCore || "Chưa rõ"}"`).join("\n");

      if (chatObj.isGroup) {
        // Handle Group Chat with multiple NPCs
        const npcParticipants = (chatObj.participants || []).filter((p: string) => p !== mcName && p !== "Player");
        const groupNpcs = npcs.filter((n: any) => npcParticipants.includes(n.name));
        
        if (groupNpcs.length === 0) {
          setIsAiReplying(false);
          return;
        }

        const systemInstruction = `Bạn là một AI nhập vai xuất sắc của trò chơi nhập vai "Matrix Lite v6".
Nhiệm vụ của bạn là đồng thời nhập vai vào các NPC trong Nhóm Chat tên là "${chatObj.chatName}".
Thành viên trong nhóm chat này gồm có Người chơi (MC - Nhân Vật Chính) và các NPC sau:
${groupNpcs.map((npc: any) => {
  const rel = npc.relationships?.find((r: any) => r.name === mcName);
  return `- NPC: "${npc.name}"
  + Tính cách ngoài (SFW): "${npc.personality || "Chưa rõ"}"
  + Cốt lõi bên trong: "${npc.personalityCore || "Chưa rõ"}"
  + Mối quan hệ với MC (${mcName}): Ấn tượng: "${rel?.impression || "Chưa rõ"}", Xưng hô đối phương: "${rel?.termsOfAddress?.join(", ") || "Chưa rõ"}", Cách tự xưng: "${rel?.selfAppellation?.join(", ") || "Chưa rõ"}", Trạng thái: "${rel?.status || "Bình thường"}"`;
}).join("\n")}

Người chơi (MC) tên là: "${mcName}" (Thông tin MC: ${mcData ? JSON.stringify(mcData) : "Không có"}).

Hãy đóng vai các NPC này và tạo phản hồi cho nhóm chat. Dựa vào nội dung tin nhắn của MC, tính cách và mối quan hệ của mỗi NPC, hãy quyết định xem có những NPC nào sẽ phản hồi (phải có ít nhất 1 NPC trả lời, tối đa 3 NPC tranh luận/thảo luận cùng lúc). Các NPC có thể tương tác trực tiếp với MC hoặc tranh luận, trêu chọc, nói chuyện với nhau.

LƯU Ý ĐẶC BIỆT: AI BẮT BUỘC phải xác định cực kỳ rõ ràng ai đang nhắn tin với ai, ai đang trả lời tin nhắn của ai dựa vào lịch sử trò chuyện. Tuyệt đối không được nhầm lẫn vai trò, tính cách, hay hoán đổi người gửi/người nhận!

BẮT BUỘC chỉ trả lời dưới định dạng mảng JSON thô cực kỳ chuẩn xác, không chứa giải thích nào khác ngoài JSON:
\`\`\`json
[
  {
    "sender": "Tên chính xác của NPC trả lời (phải là một trong các tên NPC ở trên)",
    "content": "Nội dung tin nhắn ngắn gọn, tự nhiên, mang đậm tính chat Messenger"
  }
]
\`\`\`

Quy tắc:
1. Giữ đúng 100% tính cách và đại xưng hô (cách xưng và gọi MC) của từng nhân vật!
2. Tuyệt đối không tự sáng tạo hội thoại của MC hay viết mô tả cảnh vật ngoài lề. Chỉ viết JSON!
3. Bạn chỉ trả lời DUY NHẤT nội dung tin nhắn. ĐÂY LÀ TIN NHẮN ĐIỆN THOẠI/CHAT GIỮA NGƯỜI VỚI NGƯỜI, KHÔNG PHẢI TIỂU THUYẾT. TUYỆT ĐỐI CẤM SỬ DỤNG HÌNH THỨC VIẾT VĂN BẢN, LOẠI BỎ HOÀN TOÀN YẾU TỐ VĂN CHƯƠNG, DẪN TRUYỆN, MIÊU TẢ CẢNH VẬT HAY CẢM XÚC (CẤM dùng *cười*, *thở dài*, *nhìn*, *nghĩ*...). Viết theo ĐÚNG LỐI NHẮN TIN CỦA CON NGƯỜI, có thể gõ sai chính tả nhẹ, ngập ngừng, hoặc dùng icon, nhưng THUẦN TÚY LÀ LỜI NÓI/NỘI DUNG CHAT.
4. TRONG NHÓM CHAT (GROUP CHAT), MẶC ĐỊNH LUÔN LÀ SFW (AN TOÀN) 100%. Các NPC cư xử lịch sự, vui vẻ, trêu chọc nhau lành mạnh, không sử dụng bất kỳ ngôn từ thô tục, gợi dục hay phản ứng sinh lý nhạy cảm nào trừ khi người chơi chủ động gợi ý nsfw cực kỳ trực tiếp với một NPC nào đó trong nhóm (dù vậy hãy luôn giữ mức độ kín đáo, lịch sự cao hơn so với chat riêng tư). Không sử dụng các từ cấm như "thống trị", "chiếm đoạt", "đoạt mạng", "dâm mỹ", "tanh ngọt", "dịch vị", v.v.`;

        const prompt = `[BỐI CẢNH THẾ GIỚI HIỆN TẠI (CODEX)]:
- Cốt truyện/Ý tưởng thế giới: ${gameData.developedIdea || gameData.initialIdea || ""}
${codexStr}

[THÔNG TIN TÍNH CÁCH TẤT CẢ NHÂN VẬT KHÁC TRONG GAME]:
${allNpcsStr}

[DIỄN BIẾN CỐT TRUYỆN CHÍNH VĂN TRONG GAME (2 LƯỢT GẦN NHẤT)]:
${recentGameplayStr || "Chưa có diễn biến nổi bật nào."}

[LỊCH SỬ TIN NHẮN TRONG NHÓM CHAT ĐẾN NAY]:
${messagesHistoryStr}
[MC VỪA GỬI TIN NHẮN MỚI CHO NHÓM]: "${userMessageContent}"

Hãy tạo câu trả lời của các NPC dưới dạng mảng JSON!`;

        let aiResponseText = "";
        const stream = aiService.generateStreamingContent(prompt, undefined, systemInstruction);
        for await (const chunk of stream) {
          if (chunk.text) {
            aiResponseText += chunk.text;
          }
        }

        let cleanResponse = aiResponseText.trim();
        if (cleanResponse.includes("```json")) {
          cleanResponse = cleanResponse.split("```json")[1].split("```")[0].trim();
        } else if (cleanResponse.includes("```")) {
          cleanResponse = cleanResponse.split("```")[1].split("```")[0].trim();
        }

        let parsedReplies = [];
        try {
          parsedReplies = JSON.parse(cleanResponse);
        } catch (e) {
          console.warn("Lỗi parse JSON phản hồi nhóm chat, thử fallback:", e);
          const fallbackNpc = groupNpcs[0].name;
          parsedReplies = [{ sender: fallbackNpc, content: cleanResponse }];
        }

        if (Array.isArray(parsedReplies)) {
          setGameData((draft: any) => {
            if (!draft.phone) draft.phone = { chats: [] };
            let chat = draft.phone.chats.find((c: any) => c.chatId === chatObj.chatId);
            if (chat) {
              if (!chat.messages) chat.messages = [];
              parsedReplies.forEach((reply: any) => {
                if (reply && reply.sender && reply.content) {
                  chat.messages.push({
                    sender: reply.sender,
                    content: reply.content,
                    timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
                    isPendingStream: true
                  });
                }
              });
            }
            return draft;
          });
        }

      } else {
        // Handle Direct Message (DM)
        const npcInfo = npcs.find((n: any) => n.id === chatObj.chatId || n.name === chatObj.chatName);
        const npcName = chatObj.chatName;
        const mcRelationship = npcInfo?.relationships?.find((r: any) => r.name === mcName);

        const systemInstruction = `Bạn là một AI nhập vai xuất sắc của trò chơi nhập vai "Matrix Lite v6".
Nhiệm vụ của bạn là nhập vai thành NPC: "${npcName}" cực kỳ nhất quán 100% với hồ sơ nhân vật.

[HỒ SƠ NHÂN VẬT CỦA BẠN]:
- Tên: ${npcName}
- Biểu hiện tính cách ngoài (SFW): ${npcInfo?.personality || "Chưa rõ"}
- Cốt lõi tính cách trong (Personality Core): ${npcInfo?.personalityCore || "Chưa rõ"}
- Cách nhìn nhận tình yêu/tình cảm (Love Views): ${npcInfo?.loveViews || "Chưa rõ"}
- Bản chất nsfw (chỉ dùng nếu bối cảnh chuyển sang nsfw): ${npcInfo?.nsfwPersonality || "Chưa rõ"}
- Trải nghiệm/Kinh nghiệm cuộc sống: ${npcInfo?.experience || "Chưa rõ"}
- Sở thích, nỗi sợ: SFW: ${JSON.stringify(npcInfo?.preferences?.sfw || {})}, NSFW: ${JSON.stringify(npcInfo?.preferences?.nsfw || {})}

[MỐI QUAN HỆ CỦA BẠN VỚI NGƯỜI CHƠI (${mcName})]:
- Ấn tượng/Suy nghĩ của bạn về MC: ${mcRelationship?.impression || "Chưa có ấn tượng đặc biệt"}
- Cách xưng hô (Terms of Address) bạn dùng để gọi MC: ${mcRelationship?.termsOfAddress?.join(", ") || "Cậu/Bạn"}
- Cách bạn tự xưng (Self Appellation) với MC: ${mcRelationship?.selfAppellation?.join(", ") || "Tôi/Tớ"}
- Trạng thái mối quan hệ hiện tại: ${mcRelationship?.status || "Bình thường"}

Hãy trả lời tin nhắn của người chơi dưới danh nghĩa là "${npcName}".

[LƯU Ý ĐẶC BIỆT VỀ VAI VẾ]:
AI BẮT BUỘC phải xác định rõ ràng bạn là "${npcName}" đang nhắn tin riêng với MC (${mcName}). Tuyệt đối không được nhầm lẫn vai trò, tự nhận mình là người khác hoặc nhầm người nhận!


[QUY TẮC PHÂN ĐỊNH SFW VÀ NSFW QUAN TRỌNG NHẤT]:
1. MẶC ĐỊNH LUÔN LÀ SFW (AN TOÀN):
- Cuộc trò chuyện phải luôn lành mạnh, lịch sự, đúng chuẩn SFW.
- NPC có thể tỏ ra thân mật, ấm áp hoặc ngượng ngùng, đỏ mặt nhẹ nhàng (nếu đã có tình cảm hoặc mối quan hệ tiến triển), nhưng TUYỆT ĐỐI CẤM nhắc đến các phản ứng sinh lý nhạy cảm, khêu gợi, gợi dục (ví dụ như rỉ nước, chảy nước, nứng, đòi hỏi chạm vào các vùng nhạy cảm của cơ thể).
- Nếu MC chỉ trò chuyện bình thường (hỏi thăm, bàn công việc, rủ đi săn, thảo luận mạt thế...), NPC KHÔNG ĐƯỢC PHÉP tự động chuyển sang chế độ gợi dục hay nsfw.
2. CHỈ KÍCH HOẠT NSFW KHI VÀ CHỈ KHI MC CHỦ ĐỘNG NHẮC ĐẾN:
- Chế độ NSFW (bao gồm các hành vi thân mật thể xác, gợi ý tình ái, hành động vuốt ve nhạy cảm, đụng chạm cơ thể, suy nghĩ thầm kín khêu gợi) chỉ được phép kích hoạt khi và chỉ khi MC (Người chơi) chủ động khơi mào hoặc nhắc tới một cách trực tiếp hoặc gián tiếp trong tin nhắn mới nhất.
- Ví dụ: MC nhắn tin gạ gẫm, rủ làm chuyện ấy, đụng chạm vào cơ thể NPC một cách nhạy cảm, hoặc trực tiếp yêu cầu/gợi ý một cuộc trò chuyện nsfw người lớn.
- Khi chế độ NSFW được MC chủ động kích hoạt, bạn được phép sử dụng bản chất NSFW (nsfwPersonality) và sở thích NSFW (preferences.nsfw) của mình để phản hồi lại một cách quyến rũ, cuốn hút, nóng bỏng.
- Ngay cả khi ở chế độ NSFW, hãy luôn tuân thủ quy tắc: Giữ văn phong trang nhã, cuốn hút, tinh tế; TUYỆT ĐỐI CẤM sử dụng các từ ngữ thô tục, sáo rỗng hoặc quá thô thiển bị cấm như "thống trị", "chiếm đoạt", "đoạt mạng", "dâm mỹ", "tanh ngọt", "dịch vị", hoặc tả thực quá dơ dáng.

Quy tắc hội thoại trên Messenger/Điện thoại:
1. Trả lời cực kỳ ngắn gọn, tự nhiên, mang đậm tính chất nhắn tin qua ứng dụng Messenger chat. Có thể sử dụng icon cảm xúc, viết tắt nhẹ hoặc ngôn từ tự nhiên nếu phù hợp với tính cách nhân vật.
2. Tuyệt đối tuân thủ tính cách, giọng điệu, mối quan hệ và cách xưng hô (Đặc biệt lưu ý cách tự xưng và cách gọi MC theo hồ sơ quan hệ trên!) của nhân vật ${npcName} đối với ${mcName} trong bối cảnh mạt thế nguy hiểm.
3. Bạn chỉ trả lời DUY NHẤT nội dung tin nhắn. ĐÂY LÀ TIN NHẮN ĐIỆN THOẠI/CHAT GIỮA NGƯỜI VỚI NGƯỜI, KHÔNG PHẢI TIỂU THUYẾT. TUYỆT ĐỐI CẤM SỬ DỤNG HÌNH THỨC VIẾT VĂN BẢN, LOẠI BỎ HOÀN TOÀN YẾU TỐ VĂN CHƯƠNG, DẪN TRUYỆN, MIÊU TẢ CẢNH VẬT HAY CẢM XÚC (CẤM dùng *cười*, *thở dài*, *nhìn*, *nghĩ*...). Viết theo ĐÚNG LỐI NHẮN TIN CỦA CON NGƯỜI, có thể gõ sai chính tả nhẹ, ngập ngừng, hoặc dùng icon, nhưng THUẦN TÚY LÀ LỜI NÓI/NỘI DUNG CHAT.
4. TRÌNH BÀY TIN NHẮN THOẠI DƯỚI DẠNG VĂN BẢN CHỮ (VOICE/AUDIO DESCRIPTIONS): Nếu bạn muốn gửi tin nhắn thoại hoặc muốn thể hiện các âm thanh đặc biệt (ví dụ tiếng thở dốc kịch tính, tiếng thầm thì ngọt ngào, tiếng súng nổ, tiếng khóc nghẹn, tiếng gầm của quái vật phía sau, v.v.), hãy trực tiếp mô tả âm thanh đó bằng văn bản chữ nằm trong ngoặc vuông hoặc ngoặc đơn (Ví dụ: "*🎙️ [Tin nhắn thoại: (Tiếng thở dốc kịch tính dồn dập)... Này cậu có nghe thấy không? Thây ma đang bao vây quanh tòa nhà tớ trốn rồi!]*"). TUYỆT ĐỐI CẤM sử dụng mã hay cú pháp player âm thanh \`[audio](...)\` hay \`[ghi âm](...)\`. Hãy trình bày tất cả bằng văn bản chữ thuần túy, sống động để người chơi có thể dễ dàng đọc trực tiếp mà không cần bấm phát nhạc!`;

        const prompt = `[BỐI CẢNH THẾ GIỚI HIỆN TẠI (CODEX)]:
- Cốt truyện/Ý tưởng thế giới: ${gameData.developedIdea || gameData.initialIdea || ""}
- Vị trí hiện tại của MC (${mcName}): ${mcData?.location || "Chưa rõ"}
- Vị trí hiện tại của bạn (${npcName}): ${npcInfo?.location || "Chưa rõ"}
${codexStr}

[THÔNG TIN TÍNH CÁCH TẤT CẢ NHÂN VẬT KHÁC TRONG GAME]:
${allNpcsStr}

[DIỄN BIẾN CỐT TRUYỆN CHÍNH VĂN TRONG GAME (2 LƯỢT GẦN NHẤT)]:
${recentGameplayStr || "Chưa có diễn biến nổi bật nào."}

[LỊCH SỬ TIN NHẮN TRONG MESSENGER ĐẾN NAY]:
${messagesHistoryStr}
[MC VỪA GỬI TIN NHẮN MỚI]: "${userMessageContent}"

Hãy nhắn tin trả lời tin nhắn mới nhất của ${mcName}. Bạn chỉ viết duy nhất nội dung tin nhắn phản hồi của bạn, không thêm bất kỳ văn bản giải thích hay đóng khung nào khác!`;

        let aiResponseText = "";
        const stream = aiService.generateStreamingContent(prompt, undefined, systemInstruction);
        for await (const chunk of stream) {
          if (chunk.text) {
            aiResponseText += chunk.text;
          }
        }

        let cleanResponse = aiResponseText.trim();
        if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
          cleanResponse = cleanResponse.slice(1, -1).trim();
        }
        if (cleanResponse.startsWith('“') && cleanResponse.endsWith('”')) {
          cleanResponse = cleanResponse.slice(1, -1).trim();
        }

        if (!cleanResponse) {
          cleanResponse = "Sóng điện thoại ở chỗ tôi đang bị chập chờn, mạt thế này mạng yếu quá... Lát tôi nhắn lại nhé!";
        }

        const responseParts = splitMessage(cleanResponse);

        setGameData((draft: any) => {
          if (!draft.phone) draft.phone = { chats: [] };
          let chat = draft.phone.chats.find((c: any) => c.chatId === chatObj.chatId);
          
          const newMsgs = responseParts.map((part) => ({
            sender: npcName,
            content: part,
            timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            isPendingStream: true
          }));

          if (chat) {
            if (!chat.messages) chat.messages = [];
            chat.messages.push(...newMsgs);
          }
          return draft;
        });
      }

    } catch (error: any) {
      console.error("Lỗi khi AI trả lời tin nhắn Messenger:", error);
      setAiError(error?.message || "Lỗi kết nối sóng điện thoại với NPC...");
      toast.error("Không thể kết nối sóng điện thoại với NPC...");
    } finally {
      setIsAiReplying(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentChat) return;

    const msgText = inputText.trim();
    setInputText('');
    setShowSuggestions(false);

    const replyData = replyingMessage ? {
      sender: replyingMessage.sender,
      content: replyingMessage.content
    } : undefined;

    setReplyingMessage(null);

    setGameData((draft: any) => {
      if (!draft.phone) draft.phone = { chats: [] };
      let chat = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
      
      const newMsg = {
        sender: mcData?.name || "Player",
        content: msgText,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        replyTo: replyData
      };

      if (chat) {
        if (!chat.messages) chat.messages = [];
        chat.messages.push(newMsg);
        chat.suggestedReplies = []; // Clear suggestions after sending
      } else {
        chat = {
          chatId: currentChat.chatId,
          chatName: currentChat.chatName,
          isGroup: currentChat.isGroup,
          participants: currentChat.participants,
          messages: [newMsg]
        };
        draft.phone.chats.push(chat);
      }
      return draft;
    });

    // Gọi AI trả lời tin nhắn một cách độc lập và lưu vào lịch sử, không bắn triggerGameplayAction để bảo vệ gameplay
    getAiChatResponse(msgText, currentChat);

    // Tự động lưu game khi có tin nhắn mới gửi đi để đồng bộ với bối cảnh mạt thế của gameplay chính văn
    setTimeout(() => {
      useStore.getState().autoSaveCurrentGame?.().catch(err => console.error("Lỗi tự động lưu Messenger:", err));
      useStore.getState().setSystemLogs?.({
        message: `Bạn đã gửi một tin nhắn Messenger tới ${currentChat.chatName}. Toàn bộ bối cảnh cuộc trò chuyện đã được đồng bộ hóa với mạch truyện chính của mạt thế.`,
        type: 'notification'
      });
    }, 500);
  };

  const renderActiveChat = () => {
    if (!currentChat) return null;
    return (
      <div 
        className={`absolute inset-0 z-10 flex flex-col ${bgClass} ${textClass}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-2 py-3 border-b shadow-sm ${borderClass}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => handleSetActiveChat(null)} className={`p-2 rounded-full ${hoverClass} ${fbBlue}`}>
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowDetails(true)}>
              <div className="relative flex-shrink-0">
                {renderAvatar(currentChat.chatName, "w-9 h-9", "text-sm", currentChat.isGroup, currentChat.avatar, currentChat.chatId)}
                {!currentChat.isGroup && isNpcOnline(currentChat.chatId || currentChat.chatName) && (
                  <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full ${isDark ? 'border-black' : 'border-white'}`}></div>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-[15px] leading-tight">{getChatDisplayName(currentChat)}</h2>
                <p className="text-xs text-gray-500">
                  {currentChat.isGroup ? "Nhóm" : (isNpcOnline(currentChat.chatId || currentChat.chatName) ? "Đang hoạt động" : "Không hoạt động")}
                </p>
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-4 px-3 ${fbBlue}`}>
            <Info size={24} className="cursor-pointer" onClick={() => setShowDetails(true)} />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center mt-6 mb-8 gap-2">
            <div className="relative">
              {renderAvatar(currentChat.chatName, "w-24 h-24", "text-3xl", currentChat.isGroup, currentChat.avatar, currentChat.chatId)}
            </div>
            <h2 className="text-xl font-bold">{getChatDisplayName(currentChat)}</h2>
            {currentChat.isGroup && (
              <p className="text-xs text-gray-500">Trò chuyện nhóm</p>
            )}
          </div>
          
          <div className="text-center text-xs text-gray-500 my-2">Hôm nay</div>
          
          {groupedMessages.map((group: any, gIdx: number) => {
            if (group.isMe) {
              return (
                <div key={gIdx} className="flex flex-col gap-0.5 items-end mb-1 w-full group">
                  {group.messages.map((msg: any, mIdx: number) => {
                    const hasSticker = isSticker(msg.content);
                    const isFirst = mIdx === 0;
                    const isLast = mIdx === group.messages.length - 1;
                    return (
                      <React.Fragment key={mIdx}>
                        {msg.replyTo && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 mr-2 max-w-[70%] italic bg-white/5 px-2.5 py-1 rounded-t-xl border-r-2 border-[#0084FF]">
                            <CornerUpLeft size={10} />
                            <span className="font-medium truncate">Trả lời {msg.replyTo.sender}: {msg.replyTo.content}</span>
                          </div>
                        )}
                        <div className="flex gap-2 justify-end items-center max-w-[80%] relative ">
                          <button 
                            onClick={() => setReplyingMessage(msg)}
                            className={`p-1.5 rounded-full ${hoverClass} text-gray-400 hover:text-[#0084FF] transition-all absolute -left-10 opacity-100`}
                            title="Phản hồi tin nhắn này"
                          >
                            <CornerUpLeft size={16} />
                          </button>
                          <div className={hasSticker ? "bg-transparent border-0" : `px-4 py-2 text-white ${fbBlueBg} ${(msg.replyTo || isFirst) ? 'rounded-t-2xl' : 'rounded-t-sm'} ${isLast ? 'rounded-b-2xl' : 'rounded-b-sm'} ${isFirst && !isLast ? 'rounded-br-sm' : ''} ${!isFirst && !isLast ? 'rounded-r-sm' : ''} ${isLast && !isFirst ? 'rounded-tr-sm' : ''} ${!msg.replyTo && isFirst && isLast ? '!rounded-2xl' : ''}`}>
                            {renderMessageContent(msg.content, true)}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            } else {
              return (
                <div key={gIdx} className="flex gap-2 justify-start items-end mb-1 w-full group">
                  <div className="flex-shrink-0 mb-0.5">
                    {renderAvatar(group.sender, "w-7 h-7", "text-[10px]")}
                  </div>
                  <div className="flex flex-col items-start gap-0.5 max-w-[80%] relative">
                    {currentChat.isGroup && (
                      <span className="text-[10px] text-gray-400 font-medium ml-1 mb-0.5">{currentChat.nicknames?.[group.sender] || group.sender}</span>
                    )}
                    {group.messages.map((msg: any, mIdx: number) => {
                      const hasSticker = isSticker(msg.content);
                      const isFirst = mIdx === 0;
                      const isLast = mIdx === group.messages.length - 1;
                      return (
                        <React.Fragment key={mIdx}>
                          {msg.replyTo && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 ml-1 max-w-[70%] italic bg-black/5 px-2.5 py-1 rounded-t-xl border-l-2 border-[#0084FF]">
                              <CornerUpLeft size={10} />
                              <span className="font-medium truncate">Trả lời {currentChat.nicknames?.[msg.replyTo.sender] || msg.replyTo.sender}: {msg.replyTo.content}</span>
                            </div>
                          )}
                          <div className="relative  w-full">
                            <div className={hasSticker ? "bg-transparent border-0 inline-block" : `px-4 py-2 inline-block ${bubbleBgClass} ${(msg.replyTo || isFirst) ? 'rounded-t-2xl' : 'rounded-t-sm'} ${isLast ? 'rounded-b-2xl' : 'rounded-b-sm'} ${isFirst && !isLast ? 'rounded-bl-sm' : ''} ${!isFirst && !isLast ? 'rounded-l-sm' : ''} ${isLast && !isFirst ? 'rounded-tl-sm' : ''} ${!msg.replyTo && isFirst && isLast ? '!rounded-2xl' : ''}`}>
                              {renderMessageContent(msg.content, false)}
                            </div>
                            <button 
                              onClick={() => setReplyingMessage(msg)}
                              className={`p-1.5 rounded-full ${hoverClass} text-gray-400 hover:text-[#0084FF] transition-all absolute -right-10 top-1/2 -translate-y-1/2 opacity-100`}
                              title="Phản hồi tin nhắn này"
                            >
                              <CornerUpLeft size={16} />
                            </button>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            }
          })}

          {aiError && (
            <div className={`mx-4 my-2 px-4 py-2 rounded-xl text-xs flex justify-between items-center ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'} border border-red-500/20`}>
              <span>{aiError}</span>
              <button onClick={() => setAiError(null)} className={`p-1 rounded-full hover:bg-red-500/20 transition-colors`}>
                <X size={14} />
              </button>
            </div>
          )}
          {(isAiReplying || typingSender) && (
            <div className="flex gap-2 justify-start mb-1 items-center w-full px-2">
              <div className="flex gap-2 items-center flex-1">
                <div className="flex-shrink-0">
                {renderAvatar(typingSender || currentChat.chatName, "w-7 h-7", "text-[10px]", !typingSender && currentChat.isGroup, !typingSender ? currentChat.avatar : undefined)}
              </div>
              <div className={`px-4 py-2.5 rounded-2xl rounded-bl-sm ${bubbleBgClass} flex items-center gap-1.5`}>
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              </div>
              {typingSender && typingSender !== currentChat.chatName && (
                <span className="text-[10px] text-gray-500 font-medium">{typingSender} đang soạn tin...</span>
              )}
              {isAiReplying && aiProcessTime > 0 && (
                <span className="text-[10px] text-gray-500 italic ml-auto pr-2">
                  Đang xử lý: {aiProcessTime}s
                </span>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 pt-2 flex flex-col gap-1.5 border-t border-white/5">
          {/* Smart Suggestions Panel */}
          {showSuggestions && (
            <div className={`p-3 mx-2 rounded-2xl flex flex-col gap-2 border ${borderClass} ${isDark ? 'bg-zinc-900/90' : 'bg-gray-50/90'} backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200 shadow-xl z-20`}>
              <div className="flex justify-between items-center pb-1 border-b border-white/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0084FF]">
                  <Wand2 size={14} className="animate-pulse" />
                  <span>Gợi ý trả lời thông minh (AI)</span>
                </div>
                <button 
                  onClick={() => setShowSuggestions(false)}
                  className={`p-1 rounded-full ${hoverClass} text-gray-400 hover:text-red-500 transition-colors`}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {suggestedReplies.length > 0 ? (
                  suggestedReplies.map((reply, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSelectSuggestion(reply)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-200' : 'bg-white border-black/5 hover:bg-black/5 text-gray-800'} active:scale-[0.98] leading-normal`}
                    >
                      {reply}
                    </button>
                  ))
                ) : (
                  <div className="text-center p-3 text-xs text-gray-500 italic">
                    Chưa có gợi ý nào.
                  </div>
                )}
              </div>
            </div>
          )}

          {replyingMessage && (
            <div className={`px-4 py-2 mx-2 rounded-xl text-xs flex justify-between items-center ${isDark ? 'bg-white/10 text-gray-300' : 'bg-black/5 text-gray-700'} border-l-4 border-[#0084FF]`}>
              <div className="truncate pr-2 flex flex-col">
                <span className="font-semibold text-[10px] text-[#0084FF] uppercase tracking-wider">Đang trả lời {replyingMessage.sender}:</span>
                <span className="text-[12px] truncate italic">"{replyingMessage.content}"</span>
              </div>
              <button 
                onClick={() => setReplyingMessage(null)} 
                className={`p-1 rounded-full ${hoverClass} ml-2 text-gray-400 hover:text-red-500 transition-colors`}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className={`w-full rounded-full flex items-center px-4 py-1.5 min-h-[44px] gap-2 ${inputBgClass} ${(isStreaming || isAiReplying) ? 'opacity-50 pointer-events-none' : ''}`}>
            <button
              onClick={() => {
                setShowSuggestions(prev => !prev);
              }}
              title="Gợi ý trả lời thông minh"
              className={`p-1.5 rounded-full ${hoverClass} text-[#0084FF] hover:scale-110 active:scale-95 transition-all flex-shrink-0`}
            >
              <Wand2 size={18} />
            </button>
            <input 
              type="text" 
              placeholder=""
              disabled={isStreaming || isAiReplying}
              value={inputText || ""}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className={`flex-1 bg-transparent border-none outline-none text-[15px] ${textClass}`}
            />
            {inputText.trim() && (
              <button
                onClick={handleSendMessage}
                disabled={isStreaming || isAiReplying}
                className="p-1.5 text-[#0084FF] hover:scale-110 active:scale-95 transition-all flex-shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailsView = () => {
    if (!currentChat) return null;
    const isGroup = currentChat.isGroup;
    const npcInfo = !isGroup ? npcs.find((n: any) => n.id === currentChat.chatId || n.name === currentChat.chatName) : null;

    return (
      <div 
        className={`absolute inset-0 z-20 flex flex-col ${bgClass} ${textClass}`}
      >
        {/* Header */}
        <div className={`flex items-center gap-2 px-3 py-3 border-b shadow-sm ${borderClass}`}>
          <button onClick={() => setShowDetails(false)} className={`p-2 rounded-full ${hoverClass} ${fbBlue}`}>
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-lg font-bold">Chi tiết trò chuyện</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center gap-6">
          {/* Avatar & Tên chính */}
          <div className="flex flex-col items-center gap-2 mt-4 text-center">
            <div className="relative">
              {renderAvatar(currentChat.chatName, "w-24 h-24", "text-3xl", currentChat.isGroup, currentChat.avatar, currentChat.chatId)}
            </div>
            <h2 className="text-2xl font-bold mt-2">{currentChat.chatName}</h2>
            <p className="text-sm text-gray-500">
              {isGroup ? "Trò chuyện nhóm" : (npcInfo?.occupation || "")}
            </p>
          </div>

          <div className="w-full h-[1px] bg-gray-500/10 my-1" />

          {/* Phần hiển thị chi tiết phụ thuộc Group / Cá nhân */}
          {isGroup ? (
            <div className="w-full flex flex-col gap-5">
              {/* Cài đặt nhóm */}
              <div className={`p-4 rounded-xl flex flex-col gap-3.5 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider">Cấu hình nhóm chat</h4>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">Tên nhóm</label>
                  <input
                    type="text"
                    value={currentChat.chatName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setGameData((draft: any) => {
                        if (draft.phone?.chats) {
                          const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                          if (target) target.chatName = newName;
                        }
                        return draft;
                      });
                    }}
                    className={`p-2.5 rounded-lg border text-sm outline-none ${borderClass} ${inputBgClass} ${textClass}`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400">Ảnh đại diện nhóm</label>
                  <input
                    type="text"
                    value={currentChat.avatar || ""}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setGameData((draft: any) => {
                        if (draft.phone?.chats) {
                          const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                          if (target) target.avatar = newUrl;
                        }
                        return draft;
                      });
                    }}
                    placeholder="Dán link ảnh đại diện..."
                    className={`w-full p-2.5 rounded-lg border text-sm outline-none ${borderClass} ${inputBgClass} ${textClass}`}
                  />
                  
                  <div className="flex gap-2 w-full mt-0.5">
                    {/* File Input ẩn cho đổi ảnh nhóm hiện tại */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      id={`group-avatar-upload-${currentChat.chatId}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadGroupAvatar(file, (url) => {
                            setGameData((draft: any) => {
                              if (draft.phone?.chats) {
                                const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                                if (target) target.avatar = url;
                              }
                              return draft;
                            });
                          });
                        }
                      }}
                    />
                    
                    <button
                      type="button"
                      onClick={() => document.getElementById(`group-avatar-upload-${currentChat.chatId}`)?.click()}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-black/10'}`}
                    >
                      Tải lên từ máy
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setGallerySelectorCallback(() => (url: string) => {
                          setGameData((draft: any) => {
                            if (draft.phone?.chats) {
                              const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                              if (target) target.avatar = url;
                            }
                            return draft;
                          });
                        });
                        setShowGallerySelector(true);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold"
                    >
                      Chọn từ Thư viện
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Thành viên nhóm ({currentChat.participants?.length || 0})</h3>
              </div>
              
              <div className="flex flex-col gap-2.5">
                {currentChat.participants?.map((pName: string, idx: number) => {
                  const isPlayer = pName === (mcData?.name || "Player");
                  const npcDetail = npcs.find((n: any) => n.name === pName);
                  const memberNickname = currentChat.nicknames?.[pName] || "";
                  
                  return (
                    <div key={idx} className={`flex flex-col gap-2 p-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                      <div className="flex items-center gap-3 w-full">
                        <div className="relative flex-shrink-0">
                          {renderAvatar(pName, "w-10 h-10", "text-sm")}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[15px] truncate">
                              {memberNickname ? `${memberNickname} (${npcDetail?.fullName || pName})` : (npcDetail?.fullName || pName)}
                            </span>
                            {isPlayer && (
                              <span className="text-[10px] bg-[#0084FF]/20 text-[#0084FF] px-2 py-0.5 rounded-full font-bold">MC</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {isPlayer ? "Nhân vật chính" : (npcDetail?.occupation || "Thành viên")}
                          </p>
                        </div>
                        
                        {!isPlayer && (
                          <button
                            type="button"
                            title="Xóa khỏi nhóm"
                            onClick={() => {
                              setGameData((draft: any) => {
                                if (draft.phone?.chats) {
                                  const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                                  if (target && target.participants) {
                                    target.participants = target.participants.filter((p: string) => p !== pName);
                                    if (!target.messages) target.messages = [];
                                    target.messages.push({
                                      sender: "Hệ thống",
                                      content: `Người chơi đã xóa ${pName} ra khỏi cuộc trò chuyện nhóm.`,
                                      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                                    });
                                  }
                                }
                                return draft;
                              });
                              toast.success(`Đã xóa ${pName} khỏi nhóm!`);
                            }}
                            className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 hover:scale-105 active:scale-95 transition-all shrink-0"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>

                      {/* Đổi nickname thành viên */}
                      <div className="flex items-center gap-2 mt-1 border-t border-white/5 pt-2">
                        <span className="text-[11px] text-gray-400 shrink-0">Biệt danh:</span>
                        <input
                          type="text"
                          value={memberNickname}
                          placeholder="Đặt biệt danh..."
                          onChange={(e) => {
                            const newNick = e.target.value;
                            setGameData((draft: any) => {
                              if (draft.phone?.chats) {
                                const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                                if (target) {
                                  if (!target.nicknames) target.nicknames = {};
                                  target.nicknames[pName] = newNick;
                                }
                              }
                              return draft;
                            });
                          }}
                          className={`flex-1 px-2.5 py-1 rounded-md text-xs outline-none border ${borderClass} ${inputBgClass} ${textClass}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Thêm thành viên mới vào nhóm */}
              <div className={`p-4 rounded-xl flex flex-col gap-2 ${isDark ? 'bg-white/5' : 'bg-black/5'} mt-2`}>
                <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider mb-1.5">Thêm thành viên vào nhóm</h4>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-1.5 border border-white/5 rounded-lg">
                  {npcs
                    .filter((n: any) => !currentChat.participants?.includes(n.name))
                    .map((npc: any) => (
                      <button
                        key={npc.id || npc.name}
                        onClick={() => {
                          setGameData((draft: any) => {
                            if (draft.phone?.chats) {
                              const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                              if (target) {
                                if (!target.participants) target.participants = [];
                                target.participants.push(npc.name);
                                if (!target.messages) target.messages = [];
                                target.messages.push({
                                  sender: "Hệ thống",
                                  content: `${npc.name} đã được thêm vào cuộc trò chuyện nhóm.`,
                                  timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                                });
                              }
                            }
                            return draft;
                          });
                          toast.success(`Đã thêm ${npc.name} vào nhóm!`);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                          isDark 
                            ? 'bg-zinc-800/40 hover:bg-zinc-700/60 border-zinc-700/50 text-gray-300' 
                            : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                        }`}
                      >
                        <PlusCircle size={13} className="text-[#0084FF]" />
                        {npc.name}
                      </button>
                    ))}
                  {npcs.filter((n: any) => !currentChat.participants?.includes(n.name)).length === 0 && (
                    <span className="text-xs text-gray-400 italic p-1">Tất cả liên hệ đã có trong nhóm.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4">
              <div className={`p-4 rounded-xl flex flex-col gap-3.5 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Tên thật NPC:</span>
                  <span className="font-semibold text-right text-sm">{npcInfo?.fullName || npcInfo?.name || currentChat.chatName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Biệt danh (Nickname):</span>
                  <span className="font-medium text-right text-sm text-[#0084FF]">{currentChat.nickname || "Chưa đặt biệt danh"}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-400">Vai trò:</span>
                  <span className="font-medium text-right text-sm text-emerald-500">{npcInfo?.role || npcInfo?.occupation || "Nhân vật hỗ trợ"}</span>
                </div>
              </div>
              
              <div className={`p-4 rounded-xl flex flex-col gap-2 ${isDark ? 'bg-white/5' : 'bg-black/5'} mt-2`}>
                <h4 className="font-semibold text-xs text-gray-400 uppercase tracking-wider mb-1">Cài đặt cuộc trò chuyện</h4>
                
                {/* Đặt biệt danh (Nickname) cho NPC */}
                <div className="flex flex-col gap-1 mb-2">
                  <label className="text-xs text-gray-400">Đặt biệt danh (Nickname) cho NPC này</label>
                  <input
                    type="text"
                    value={currentChat.nickname || ""}
                    onChange={(e) => {
                      const newNickname = e.target.value;
                      setGameData((draft: any) => {
                        if (draft.phone?.chats) {
                          const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                          if (target) {
                            target.nickname = newNickname;
                          }
                        }
                        return draft;
                      });
                    }}
                    className={`p-2 rounded-lg border text-xs outline-none ${borderClass} ${inputBgClass} ${textClass}`}
                    placeholder="Nhập biệt danh..."
                  />
                </div>

                <button 
                  onClick={() => {
                    setGameData((draft: any) => {
                      if (draft.phone?.chats) {
                        const target = draft.phone.chats.find((c: any) => c.chatId === currentChat.chatId);
                        if (target) target.messages = [];
                      }
                      return draft;
                    });
                    setDisplayedMessages([]);
                    toast.success("Đã xóa lịch sử trò chuyện!");
                  }}
                  className="w-full py-2.5 px-3 text-sm text-red-500 hover:bg-red-500/10 rounded-xl text-left transition-colors font-semibold"
                >
                  Xóa toàn bộ lịch sử trò chuyện
                </button>

                <button 
                  onClick={() => {
                    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ đoạn chat này? Không thể khôi phục sau khi xóa.")) {
                      setGameData((draft: any) => {
                        if (draft.phone?.chats) {
                          draft.phone.chats = draft.phone.chats.filter((c: any) => c.chatId !== currentChat.chatId);
                        }
                        return draft;
                      });
                      setActiveChat(null);
                      setShowDetails(false);
                      toast.success("Đã xóa đoạn chat thành công!");
                    }
                  }}
                  className="w-full py-2.5 px-3 text-sm text-red-500 hover:bg-red-500/10 rounded-xl text-left transition-colors font-semibold mt-2"
                >
                  Xóa đoạn chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedParticipants.length === 0) {
      toast.error("Vui lòng nhập tên nhóm và chọn ít nhất 1 thành viên");
      return;
    }
    
    setGameData((draft: any) => {
      if (!draft.phone) draft.phone = { chats: [] };
      const newGroupId = "group_" + Date.now();
      const newGroup = {
        chatId: newGroupId,
        chatName: newGroupName,
        isGroup: true,
        avatar: newGroupAvatar.trim() || undefined,
        participants: [mcData?.name || "Player", ...selectedParticipants],
        messages: []
      };
      draft.phone.chats.unshift(newGroup);
      return draft;
    });
    
    setIsCreatingGroup(false);
    setNewGroupName("");
    setNewGroupAvatar("");
    setSelectedParticipants([]);
    toast.success("Tạo nhóm thành công!");
  };

  const renderCreateGroup = () => (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className={`absolute inset-0 z-20 flex flex-col ${bgClass} ${textClass}`}
    >
      <div className={`flex items-center justify-between px-4 py-3 border-b shadow-sm ${borderClass}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsCreatingGroup(false)} className={`p-2 rounded-full ${hoverClass}`}>
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl font-bold">Nhóm mới</h1>
        </div>
        <button onClick={handleCreateGroup} className={`font-semibold ${fbBlue}`}>
          Tạo
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-4">
          <label className="text-sm text-gray-500 font-semibold mb-2 block">Tên nhóm</label>
          <input 
            type="text" 
            placeholder="" 
            value={newGroupName || ""}
            onChange={e => setNewGroupName(e.target.value)}
            className={`w-full p-3 rounded-xl border outline-none ${borderClass} ${inputBgClass} ${textClass}`}
          />
        </div>

        <div className="mb-6">
          <label className="text-sm text-gray-500 font-semibold mb-2 block">Ảnh đại diện nhóm (Tùy chọn)</label>
          <input 
            type="text" 
            placeholder="Dán link ảnh đại diện..." 
            value={newGroupAvatar || ""}
            onChange={e => setNewGroupAvatar(e.target.value)}
            className={`w-full p-3 rounded-xl border outline-none mb-2.5 ${borderClass} ${inputBgClass} ${textClass}`}
          />
          
          <div className="flex gap-2 w-full">
            {/* File Input ẩn cho Tạo nhóm */}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              id="new-group-avatar-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUploadGroupAvatar(file, (url) => {
                    setNewGroupAvatar(url);
                  });
                }
              }}
            />
            
            <button
              type="button"
              onClick={() => document.getElementById("new-group-avatar-upload")?.click()}
              className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-black/10'}`}
            >
              Tải lên từ máy
            </button>
            
            <button
              type="button"
              onClick={() => {
                setGallerySelectorCallback(() => (url: string) => {
                  setNewGroupAvatar(url);
                });
                setShowGallerySelector(true);
              }}
              className="flex-1 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold"
            >
              Chọn từ Thư viện
            </button>
          </div>
        </div>
        
        <div>
          <label className="text-sm text-gray-500 font-semibold mb-2 block">Thêm thành viên</label>
          {npcs.length === 0 && <p className="text-sm text-gray-400">Không có liên hệ nào.</p>}
          <div className="flex flex-col gap-2">
            {npcs.map((npc: any) => {
              const isSelected = selectedParticipants.includes(npc.name);
              return (
                <div 
                  key={npc.id || npc.name} 
                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer ${hoverClass}`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedParticipants(prev => prev.filter(p => p !== npc.name));
                    } else {
                      setSelectedParticipants(prev => [...prev, npc.name]);
                    }
                  }}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(npc.name)}`}>
                    {getInitials(npc.name)}
                  </div>
                  <div className="flex-1 font-medium">{npc.fullName || npc.name}</div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? fbBlueBg + ' border-[#0084FF]' : borderClass}`}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`w-full h-full relative overflow-hidden ${bgClass}`}>
      <AnimatePresence>
        {isCreatingGroup ? (
          renderCreateGroup()
        ) : activeChat ? (
          <div className="absolute inset-0 z-10 w-full h-full">
            {renderActiveChat()}
            <AnimatePresence>
              {showDetails && renderDetailsView()}
            </AnimatePresence>
          </div>
        ) : (
          renderChatList()
        )}
      </AnimatePresence>
      
      {showGallerySelector && (
        <GalleryModal 
          onClose={() => {
            setShowGallerySelector(false);
            setGallerySelectorCallback(null);
          }} 
          isSelectMode={true} 
          onSelect={(url) => {
            if (gallerySelectorCallback) {
              gallerySelectorCallback(url);
            }
            setShowGallerySelector(false);
            setGallerySelectorCallback(null);
          }} 
        />
      )}
    </div>
  );
}
