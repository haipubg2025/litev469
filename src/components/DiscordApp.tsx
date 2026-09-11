import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  Hash, Users, Search, Settings, Send, 
  Smile, Image as ImageIcon, Mic, 
  Globe, Shield, Swords, ChevronLeft,
  MessageCircle, UserPlus, MessageSquare, X
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { aiService } from '../services/aiService';
import { formatImageUrl } from '../utils/imageUtils';

interface Message {
  id: string;
  sender: string;
  senderId?: string;
  isRealNpc?: boolean;
  avatar: string;
  text: string;
  timestamp: number;
  role: 'user' | 'npc' | 'system' | 'vip';
}

interface FriendData {
  id: string;
  name: string;
  isRealNpc: boolean;
  avatar?: string;
}

const CHANNELS = [
  { id: 'world', name: 'Thế giới', icon: Globe, desc: 'Kênh chat chung toàn cầu' },
  { id: 'trade', name: 'Giao dịch', icon: Users, desc: 'Kênh mua bán, trao đổi' },
  { id: 'help', name: 'Hỏi đáp', icon: Shield, desc: 'Kênh hướng dẫn tân thủ' },
  { id: 'combat', name: 'Chiến sự', icon: Swords, desc: 'Kênh báo thù, PK, Boss' },
  { id: 'dms', name: 'Nhắn tin', icon: MessageCircle, desc: 'Trò chuyện riêng tư' },
];

const RANDOM_NPC_NAMES = [
  'Hắc Ám Quân Vương', 'Tiên Tử Nhỏ', 'Phong Thanh Dương', 'Ma Đế', 
  'Lãng Khách', 'Kiếm Ma', 'Tiểu Ngư Nhi', 'Bạch Tự', 'Cuồng Nhân',
  'Ẩn Danh', 'Sát Thủ Mạng', 'Vô Danh', 'Trưởng Lão'
];

const RANDOM_MESSAGES = [
  'Có ai đi đánh boss kênh 2 không? Đang thiếu tank!',
  'Bán x10 Kim Cương giá rẻ, ib riêng.',
  'Guild [Vô Song] tuyển mem tích cực, online 2h/ngày, không yêu cầu lực chiến.',
  'Lag quá anh em ơi...',
  'Vừa đập tịt vũ khí +10, cay thật sự!',
  'Ai kéo mình phó bản cấp 30 với 😭',
  'Xin chào mọi người!',
  'Game dạo này vắng vẻ nhỉ?',
  'Top 1 server nạp ghê thật...',
  'Đang PK ở map Băng Tuyết, anh em ra cứu viện!',
];

export default function DiscordApp({ onClose, theme = 'dark' }: { onClose: () => void, theme?: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  const gameData = useStore((state) => state.gameData);
  const setGameData = useStore((state) => state.setGameData);
  const mcData = gameData?.mcData;
  const mcName = mcData?.name || 'Người chơi ẩn danh';
  
  const defaultMessages: Record<string, Message[]> = {
    world: [
      { id: '1', sender: 'Hệ Thống', avatar: '', text: 'Chào mừng bạn đến với kênh Thế giới. Vui lòng chat lịch sự!', timestamp: Date.now(), role: 'system' }
    ],
    trade: [
      { id: '1', sender: 'Hệ Thống', avatar: '', text: 'Kênh giao dịch. Chú ý phòng ngừa lừa đảo!', timestamp: Date.now(), role: 'system' }
    ],
    help: [
      { id: '1', sender: 'Hệ Thống', avatar: '', text: 'Kênh hỏi đáp. Tân thủ có thể đặt câu hỏi tại đây.', timestamp: Date.now(), role: 'system' }
    ],
    combat: [
      { id: '1', sender: 'Hệ Thống', avatar: '', text: 'Kênh chiến sự cập nhật thông tin PK và Boss server.', timestamp: Date.now(), role: 'system' }
    ],
  };

  const hasMmoChatMessages = gameData?.mmoChatMessages && Object.keys(gameData.mmoChatMessages).length > 0;
  const messages: Record<string, Message[]> = hasMmoChatMessages ? gameData.mmoChatMessages : defaultMessages;
  
  // Backward compatibility: map strings to FriendData
  const friends: FriendData[] = (gameData?.mmoFriends || []).map((f: any) => {
    if (typeof f === 'string') return { id: `virt_${f}`, name: f, isRealNpc: false };
    return f;
  });
  
  const realNpcs = gameData?.npcs || [];
  const allDMCandidates: FriendData[] = [
    ...friends.filter(f => !f.isRealNpc), // Virtual friends
    ...realNpcs.map((npc: any) => {
      const name = npc.name || npc.fullName || 'NPC Ẩn danh';
      return {
        id: `real_${name}`,
        name: name,
        isRealNpc: true,
        avatar: npc.avatar
      };
    })
  ].reduce((acc, current) => {
    // Remove duplicates by ID
    const x = acc.find(item => item.id === current.id);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, [] as FriendData[]);

  const dms: Record<string, Message[]> = gameData?.mmoDMs || {};

  const updateMessages = (updater: (prev: Record<string, Message[]>) => Record<string, Message[]>) => {
    setGameData((prev: any) => {
      if (!prev) return prev;
      const currentMessages = prev.mmoChatMessages && Object.keys(prev.mmoChatMessages).length > 0
        ? prev.mmoChatMessages 
        : defaultMessages;
      return { ...prev, mmoChatMessages: updater(currentMessages) };
    });
  };

  const updateFriends = (updater: (prev: FriendData[]) => FriendData[]) => {
    setGameData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, mmoFriends: updater(friends) };
    });
  };

  const updateDMs = (updater: (prev: Record<string, Message[]>) => Record<string, Message[]>) => {
    setGameData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, mmoDMs: updater(prev.mmoDMs || {}) };
    });
  };
  
  const [activeChannel, setActiveChannel] = useState('world');
  const [dmActiveChat, setDmActiveChat] = useState<FriendData | null>(null);
  const [inputText, setInputText] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [actionMenu, setActionMenu] = useState<{id: string, name: string, isRealNpc: boolean, role: string, avatar: string} | null>(null);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelScrollRef = useRef<HTMLDivElement>(null);
  const dmScrollRef = useRef<HTMLDivElement>(null);
  const activeChannelRef = useRef(activeChannel);
  const dmActiveChatRef = useRef(dmActiveChat);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
    dmActiveChatRef.current = dmActiveChat;
    
    if (activeChannel === 'dms' && dmActiveChat) {
      setUnreadCounts(c => {
        const dmUnread = c[`dm_${dmActiveChat.id}`] || 0;
        return { ...c, [`dm_${dmActiveChat.id}`]: 0, 'dms': Math.max(0, (c['dms'] || 0) - dmUnread) };
      });
    } else if (activeChannel !== 'dms') {
      setUnreadCounts(c => ({ ...c, [activeChannel]: 0 }));
    }
  }, [activeChannel, dmActiveChat]);

  // Các hàm hỗ trợ cuộn thông minh
  const scrollToBottomElement = (element: HTMLDivElement | null, smooth = true) => {
    if (!element) return;
    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  const isElementNearBottom = (element: HTMLDivElement | null) => {
    if (!element) return false;
    const threshold = 150; // px
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  };

  const currentChannelMessages = messages[activeChannel] || [];
  const prevChannelMessagesLength = useRef(currentChannelMessages.length);

  const currentDmMessages = dmActiveChat ? (dms[dmActiveChat.id] || []) : [];
  const prevDmMessagesLength = useRef(currentDmMessages.length);

  // 1. Khi chuyển kênh hoặc người chat DM, cuộn xuống cuối lập tức
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottomElement(channelScrollRef.current, false);
    }, 50);
    prevChannelMessagesLength.current = (messages[activeChannel] || []).length;
    return () => clearTimeout(timer);
  }, [activeChannel]);

  useEffect(() => {
    if (dmActiveChat) {
      const timer = setTimeout(() => {
        scrollToBottomElement(dmScrollRef.current, false);
      }, 50);
      prevDmMessagesLength.current = (dms[dmActiveChat.id] || []).length;
      return () => clearTimeout(timer);
    }
  }, [dmActiveChat]);

  // 2. Khi có tin nhắn mới trong kênh hiện tại (Chỉ cuộn khi người dùng ở sát đáy hoặc tự gửi)
  useEffect(() => {
    if (activeChannel === 'dms') return;
    
    const length = currentChannelMessages.length;
    if (length > prevChannelMessagesLength.current) {
      const container = channelScrollRef.current;
      if (container) {
        const lastMessage = currentChannelMessages[length - 1];
        const isMe = lastMessage?.sender === mcName;
        
        if (isMe || isElementNearBottom(container)) {
          scrollToBottomElement(container, true);
        }
      }
    }
    prevChannelMessagesLength.current = length;
  }, [currentChannelMessages, activeChannel, mcName]);

  // 3. Khi có tin nhắn mới trong DM hiện tại (Chỉ cuộn khi người dùng ở sát đáy hoặc tự gửi)
  useEffect(() => {
    if (activeChannel !== 'dms' || !dmActiveChat) return;

    const length = currentDmMessages.length;
    if (length > prevDmMessagesLength.current) {
      const container = dmScrollRef.current;
      if (container) {
        const lastMessage = currentDmMessages[length - 1];
        const isMe = lastMessage?.sender === mcName;

        if (isMe || isElementNearBottom(container)) {
          scrollToBottomElement(container, true);
        }
      }
    }
    prevDmMessagesLength.current = length;
  }, [currentDmMessages, activeChannel, dmActiveChat, mcName]);

  // 4. Khi AI đang gõ phản hồi
  useEffect(() => {
    if (isAiReplying && activeChannel === 'dms' && dmActiveChat) {
      const container = dmScrollRef.current;
      if (container && isElementNearBottom(container)) {
        scrollToBottomElement(container, true);
      }
    }
  }, [isAiReplying, activeChannel, dmActiveChat]);

  // Fake NPC chat bot
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        const mmoChannels = CHANNELS.filter(c => c.id !== 'dms');
        const randomChannel = mmoChannels[Math.floor(Math.random() * mmoChannels.length)].id;
        
        let senderName = '';
        let senderId = '';
        let isRealNpc = false;
        
        const realNpcs = gameData?.npcs || [];
        // 30% chance to use a real NPC if available
        if (realNpcs.length > 0 && Math.random() < 0.3) {
          const npc = realNpcs[Math.floor(Math.random() * realNpcs.length)];
          senderName = npc.name || npc.fullName || 'NPC Ẩn danh';
          senderId = `real_${senderName}`;
          isRealNpc = true;
        } else {
          senderName = RANDOM_NPC_NAMES[Math.floor(Math.random() * RANDOM_NPC_NAMES.length)];
          senderId = `virt_${senderName}`;
          isRealNpc = false;
        }
        
        const randomText = RANDOM_MESSAGES[Math.floor(Math.random() * RANDOM_MESSAGES.length)];
        const role = isRealNpc ? 'vip' : (Math.random() > 0.8 ? 'vip' : 'npc');
        
        const newMessage: Message = {
          id: Date.now().toString() + Math.random(),
          sender: senderName,
          senderId,
          isRealNpc,
          avatar: '',
          text: randomText,
          timestamp: Date.now(),
          role
        };
        
        updateMessages(prev => ({
          ...prev,
          [randomChannel]: [...(prev[randomChannel] || []), newMessage]
        }));
        
        if (activeChannelRef.current !== randomChannel) {
          setUnreadCounts(c => ({ ...c, [randomChannel]: (c[randomChannel] || 0) + 1 }));
        }
      }
    }, 4500);
    
    return () => clearInterval(interval);
  }, []);

  // Fake NPC DM bot (Real NPCs proactive messaging)
  useEffect(() => {
    const interval = setInterval(() => {
      // 5% chance every 10s to get a DM from a real NPC
      const realNpcs = gameData?.npcs || [];
      if (Math.random() < 0.05 && realNpcs.length > 0) {
        const npc = realNpcs[Math.floor(Math.random() * realNpcs.length)];
        const senderName = npc.name || npc.fullName || 'NPC Ẩn danh';
        const npcId = `real_${senderName}`;
        
        // NPC chủ động kết bạn và MC tự động đồng ý
        setGameData((prev: any) => {
          if (!prev) return prev;
          const currentFriends = (prev.mmoFriends || []).map((f: any) => {
             if (typeof f === 'string') return { id: `virt_${f}`, name: f, isRealNpc: false };
             return f;
          });
          const isFriend = currentFriends.some((f: any) => f.id === npcId);
          if (!isFriend) {
             toast.success(`${senderName} đã chủ động kết bạn với bạn!`);
             return {
                ...prev,
                mmoFriends: [...currentFriends, { id: npcId, name: senderName, isRealNpc: true }]
             };
          }
          return prev;
        });

        const randomText = ['Chào bạn!', 'Rảnh không?', 'Có muốn đi farm quái không?', 'Mình có món đồ này hay lắm', 'Boss chuẩn bị ra kìa!', 'Đang ở đâu thế?'].sort(()=>0.5-Math.random())[0];
        
        const newMessage: Message = {
          id: Date.now().toString() + Math.random(),
          sender: senderName,
          senderId: npcId,
          isRealNpc: true,
          avatar: npc.avatar || '',
          text: randomText,
          timestamp: Date.now(),
          role: 'vip'
        };
        
        updateDMs(prev => ({
           ...prev,
           [npcId]: [...(prev[npcId] || []), newMessage]
        }));
        
        if (activeChannelRef.current !== 'dms' || dmActiveChatRef.current?.id !== npcId) {
           setUnreadCounts(c => ({ 
             ...c, 
             [`dm_${npcId}`]: (c[`dm_${npcId}`] || 0) + 1,
             'dms': (c['dms'] || 0) + 1 
           }));
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerRealNpcReply = async (currentDm: FriendData, userMsg: string) => {
    if (isAiReplying) return;
    setIsAiReplying(true);
    setAiError(null);
    try {
      const npcInfo = gameData?.npcs?.find((n: any) => n.name === currentDm.name);
      const mcRelationship = npcInfo?.relationships?.find((r: any) => r.name === mcName);

      // Get latest DM messages for history
      const latestDms = useStore.getState().gameData?.mmoDMs?.[currentDm.id] || [];
      const historyStr = latestDms
        .slice(-15)
        .map((m: any) => `[${m.sender}]: ${m.text}`)
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
      const allNpcsStr = realNpcs.map((n: any) => `- NPC "${n.name || n.fullName}": Tính cách: "${n.personality || "Chưa rõ"}", Cốt lõi: "${n.personalityCore || "Chưa rõ"}"`).join("\n");

      const systemInstruction = `Bạn là một AI nhập vai xuất sắc của trò chơi nhập vai "Matrix Lite v6".
Nhiệm vụ của bạn là nhập vai thành NPC: "${currentDm.name}" cực kỳ nhất quán 100% với hồ sơ nhân vật, trò chuyện qua kênh Chat Riêng (DM) của Discord.

[HỒ SƠ NHÂN VẬT CỦA BẠN]:
- Tên: ${currentDm.name}
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

[LƯU Ý ĐẶC BIỆT VỀ VAI VẾ]:
AI BẮT BUỘC phải xác định rõ ràng bạn là "${currentDm.name}" đang nhắn tin riêng với MC (${mcName}). Tuyệt đối không được nhầm lẫn vai trò, tự nhận mình là người khác hoặc nhầm người nhận!

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

Quy tắc hội thoại trên Discord DM:
1. Trả lời cực kỳ ngắn gọn, tự nhiên, mang đậm tính chất nhắn tin qua ứng dụng Discord chat của các game thủ / thành viên mạt thế. Có thể sử dụng icon cảm xúc, viết tắt nhẹ hoặc ngôn từ tự nhiên phù hợp với tính cách nhân vật.
2. Tuyệt đối tuân thủ tính cách, giọng điệu, mối quan hệ và cách xưng hô (Đặc biệt lưu ý cách tự xưng và cách gọi MC theo hồ sơ quan hệ trên!) của nhân vật đối với ${mcName} trong bối cảnh mạt thế nguy hiểm.
3. Bạn chỉ trả lời DUY NHẤT nội dung tin nhắn. ĐÂY LÀ TIN NHẮN ĐIỆN THOẠI/CHAT GIỮA NGƯỜI VỚI NGƯỜI, KHÔNG PHẢI TIỂU THUYẾT. TUYỆT ĐỐI CẤM SỬ DỤNG HÌNH THỨC VIẾT VĂN BẢN, LOẠI BỎ HOÀN TOÀN YẾU TỐ VĂN CHƯƠNG, DẪN TRUYỆN, MIÊU TẢ CẢNH VẬT HAY CẢM XÚC (CẤM dùng *cười*, *thở dài*, *nhìn*, *nghĩ*...). Viết theo ĐÚNG LỐI NHẮN TIN CỦA CON NGƯỜI, có thể gõ sai chính tả nhẹ, ngập ngừng, hoặc dùng icon, nhưng THUẦN TÚY LÀ LỜI NÓI/NỘI DUNG CHAT.`;

      const prompt = `[BỐI CẢNH THẾ GIỚI HIỆN TẠI (CODEX)]:
- Cốt truyện/Ý tưởng thế giới: ${gameData.developedIdea || gameData.initialIdea || ""}
${codexStr}

[THÔNG TIN TÍNH CÁCH TẤT CẢ NHÂN VẬT KHÁC TRONG GAME]:
${allNpcsStr}

[DIỄN BIẾN CỐT TRUYỆN CHÍNH VĂN TRONG GAME (2 LƯỢT GẦN NHẤT)]:
${recentGameplayStr || "Chưa có diễn biến nổi bật nào."}

[LỊCH SỬ TIN NHẮN TRONG DISCORD DM ĐẾN NAY]:
${historyStr}
[MC VỪA GỬI TIN NHẮN MỚI]: "${userMsg}"

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
        cleanResponse = "Sóng Discord ở khu vực này đang bị nhiễu do bão từ... Tớ sẽ rep lại cậu sau nhé!";
      }

      const reply: Message = {
         id: Date.now().toString() + Math.random(),
         sender: currentDm.name,
         senderId: currentDm.id,
         isRealNpc: true,
         avatar: currentDm.avatar || '',
         text: cleanResponse,
         timestamp: Date.now(),
         role: 'npc'
      };

      updateDMs(prev => ({
         ...prev,
         [currentDm.id]: [...(prev[currentDm.id] || []), reply]
      }));

      if (activeChannelRef.current !== 'dms' || dmActiveChatRef.current?.id !== currentDm.id) {
         setUnreadCounts(c => ({ 
           ...c, 
           [`dm_${currentDm.id}`]: (c[`dm_${currentDm.id}`] || 0) + 1,
           'dms': (c['dms'] || 0) + 1 
         }));
      }

    } catch (error: any) {
      console.error("Lỗi khi AI trả lời tin nhắn Discord:", error);
      setAiError(error?.message || "Lỗi kết nối sóng Discord với NPC...");
      toast.error("Không thể kết nối sóng Discord với NPC...");
    } finally {
      setIsAiReplying(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: mcName,
      avatar: mcData?.avatar || '',
      text: inputText,
      timestamp: Date.now(),
      role: 'user'
    };
    
    if (activeChannel === 'dms' && dmActiveChat) {
       const chatId = dmActiveChat.id;
       updateDMs(prev => ({
         ...prev,
         [chatId]: [...(prev[chatId] || []), newMessage]
       }));
       
       // Auto reply ONLY for virtual NPCs
       const currentDm = dmActiveChat;
       const userMsg = inputText;
       if (!currentDm.isRealNpc) {
         setTimeout(() => {
          const reply: Message = {
             id: Date.now().toString() + Math.random(),
             sender: currentDm.name,
             senderId: currentDm.id,
             isRealNpc: currentDm.isRealNpc,
             avatar: '',
             text: ['Ok cậu nhé', 'Mình đang bận tí nha', 'Tuyệt vời!', 'Đi săn boss không?', 'Haha', 'Thế à =))', 'Treo máy nãy giờ', 'Rep chậm tí thông cảm nha'].sort(()=>0.5-Math.random())[0],
             timestamp: Date.now(),
             role: 'npc'
          };
          updateDMs(prev => ({
             ...prev,
             [currentDm.id]: [...(prev[currentDm.id] || []), reply]
          }));
          
          if (activeChannelRef.current !== 'dms' || dmActiveChatRef.current?.id !== currentDm.id) {
             setUnreadCounts(c => ({ 
               ...c, 
               [`dm_${currentDm.id}`]: (c[`dm_${currentDm.id}`] || 0) + 1,
               'dms': (c['dms'] || 0) + 1 
             }));
          }
         }, 2000 + Math.random() * 3000);
       } else {
         triggerRealNpcReply(currentDm, userMsg);
       }
    } else {
      updateMessages(prev => ({
        ...prev,
        [activeChannel]: [...(prev[activeChannel] || []), newMessage]
      }));
    }
    
    setInputText('');
    
    // Ép buộc cuộn xuống đáy khi người chơi chủ động gửi tin nhắn
    setTimeout(() => {
      if (activeChannel === 'dms') {
        scrollToBottomElement(dmScrollRef.current, true);
      } else {
        scrollToBottomElement(channelScrollRef.current, true);
      }
    }, 60);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system': return 'text-red-500';
      case 'vip': return 'text-yellow-400 font-bold';
      case 'user': return isDark ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold';
      default: return isDark ? 'text-emerald-400 font-semibold' : 'text-emerald-600 font-semibold';
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${isDark ? 'bg-[#1a1b1e] text-white/90' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Header / Tabs */}
      <div className={`shrink-0 border-b flex flex-col pt-2 ${isDark ? 'border-white/10 bg-[#25262b]' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center px-2 pb-2">
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-800'}`}>
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-center font-bold text-lg mr-10">KÊNH CHAT MMO</div>
        </div>
        
        {/* MMO Tabs Style */}
        <div className="flex overflow-x-auto hide-scrollbar px-2 gap-1">
          {CHANNELS.map(channel => {
            const unread = unreadCounts[channel.id] || 0;
            return (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannel(channel.id);
                  if (channel.id !== 'dms') setDmActiveChat(null);
                }}
                className={`relative flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                  activeChannel === channel.id 
                    ? (isDark ? 'border-amber-400 text-amber-400' : 'border-blue-600 text-blue-600')
                    : (isDark ? 'border-transparent text-white/50 hover:text-white/80' : 'border-transparent text-slate-500 hover:text-slate-700')
                }`}
              >
                <channel.icon size={16} className={activeChannel === channel.id ? 'animate-pulse' : ''} />
                {channel.name.toUpperCase()}
                {unread > 0 && (
                  <span className="absolute top-2 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow border border-[#1a1b1e]"></span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
      {actionMenu && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setActionMenu(null)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`w-64 rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#2B2D31] text-[#DBDEE1]' : 'bg-white text-slate-800'}`} 
            onClick={e => e.stopPropagation()}
          >
             <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                   {actionMenu.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="font-bold truncate flex items-center gap-1">
                      {actionMenu.name}
                      {actionMenu.role === 'vip' && <span className="text-[9px] bg-yellow-500 text-black px-1 py-0.5 rounded uppercase font-bold">VIP</span>}
                   </div>
                   <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Người chơi</div>
                </div>
             </div>
             <div className="p-2 space-y-1">
               {!friends.some(f => f.id === actionMenu.id) && (
                 <button 
                   onClick={() => {
                     updateFriends(f => [...f, { id: actionMenu.id, name: actionMenu.name, isRealNpc: actionMenu.isRealNpc }]);
                     toast.success(`Đã thêm ${actionMenu.name} vào danh sách bạn bè`);
                     setActionMenu(null);
                   }}
                   className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
                 >
                   <UserPlus size={18} className={isDark ? 'text-zinc-400' : 'text-slate-500'} /> 
                   <span className="font-medium">Thêm bạn</span>
                 </button>
               )}
               <button 
                 onClick={() => {
                   setActiveChannel('dms');
                   const friendData = { id: actionMenu.id, name: actionMenu.name, isRealNpc: actionMenu.isRealNpc };
                   setDmActiveChat(friendData);
                   setActionMenu(null);
                   if (!friends.some(f => f.id === actionMenu.id)) {
                      updateFriends(f => [...f, friendData]);
                   }
                 }}
                 className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
               >
                 <MessageSquare size={18} className={isDark ? 'text-zinc-400' : 'text-slate-500'} /> 
                 <span className="font-medium">Nhắn tin riêng</span>
               </button>
             </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Chat Messages / DMs */}
      {activeChannel === 'dms' ? (
        !dmActiveChat ? (
          <div className={`flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin ${isDark ? 'scrollbar-thumb-white/10' : 'scrollbar-thumb-slate-200'}`}>
             {allDMCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-3">
                   <Users size={48} className={isDark ? 'text-white/20' : 'text-slate-300'} />
                   <div className="text-center text-sm px-8">Chưa có ai ở đây.<br/>Những người trong thế giới sẽ xuất hiện ở đây.</div>
                </div>
             ) : (
                allDMCandidates.map(f => {
                   const chat = dms[f.id] || [];
                   const lastMsg = chat[chat.length - 1];
                   const unread = unreadCounts[`dm_${f.id}`] || 0;
                   const isFriend = friends.some(fr => fr.id === f.id);
                   
                   return (
                      <button 
                        key={f.id} 
                        onClick={() => setDmActiveChat(f)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
                      >
                         <div className="relative shrink-0">
                                                      {f.avatar ? (
                             <img src={formatImageUrl(f.avatar)} alt={f.name} className="w-12 h-12 rounded-full object-cover" />
                           ) : (
                             <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                                {f.name.charAt(0)}
                             </div>
                           )}
                           <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1a1b1e] rounded-full"></div>
                         </div>
                         <div className="flex-1 min-w-0 text-left">
                            <div className={`font-bold truncate flex items-center gap-1 ${unread > 0 ? (isDark?'text-white':'text-black') : (isDark?'text-white/80':'text-slate-800')}`}>
                               {f.name}
                               {!isFriend && <span className="text-[9px] bg-slate-500/50 px-1 py-0.5 rounded font-normal text-white">Chưa kết bạn</span>}
                            </div>
                            <div className={`text-sm truncate ${unread > 0 ? (isDark?'text-white font-semibold':'text-black font-semibold') : (isDark?'text-zinc-400':'text-slate-500')}`}>
                               {lastMsg ? (lastMsg.sender === mcName ? `Bạn: ${lastMsg.text}` : lastMsg.text) : (isFriend ? 'Bắt đầu cuộc trò chuyện' : 'Chạm để kết bạn')}
                            </div>
                         </div>
                         {unread > 0 && (
                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm">
                               {unread}
                            </div>
                         )}
                      </button>
                   )
                })
             )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 relative">
             <div className={`p-2 shrink-0 flex items-center gap-3 border-b shadow-sm z-10 ${isDark ? 'bg-[#25262b] border-white/5' : 'bg-white border-slate-100'}`}>
                <button onClick={() => setDmActiveChat(null)} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white/80' : 'hover:bg-slate-100 text-slate-600'}`}>
                   <ChevronLeft size={24} />
                </button>
                                {dmActiveChat.avatar ? (
                  <img src={formatImageUrl(dmActiveChat.avatar)} alt={dmActiveChat.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                     {dmActiveChat.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                   <div className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{dmActiveChat.name}</div>
                   <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Đang hoạt động</div>
                </div>
             </div>
             
             <div ref={dmScrollRef} className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin ${isDark ? 'scrollbar-thumb-white/10 bg-[#1a1b1e]' : 'scrollbar-thumb-slate-200 bg-slate-50'}`}>
                {(dms[dmActiveChat.id] || []).map((msg, idx) => {
                   const isMe = msg.sender === mcName;
                   return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                         <div className={`flex max-w-[80%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isMe && (
                               msg.avatar || allDMCandidates.find(c => c.id === msg.senderId || c.name === msg.sender)?.avatar ? (
                                 <img src={msg.avatar || allDMCandidates.find(c => c.id === msg.senderId || c.name === msg.sender)?.avatar} alt={msg.sender} className="w-7 h-7 rounded-full object-cover mt-auto shrink-0" />
                               ) : (
                                 <div className="w-7 h-7 rounded-full bg-indigo-500 shrink-0 flex items-center justify-center text-[10px] text-white font-bold mt-auto">
                                    {msg.sender.charAt(0)}
                                 </div>
                               )
                            )}
                            <div className={`px-3 py-2 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : (isDark ? 'bg-[#383A40] text-[#DBDEE1] rounded-bl-sm' : 'bg-slate-200 text-slate-800 rounded-bl-sm')}`}>
                               <div className="text-[14px] leading-relaxed break-words">{msg.text}</div>
                            </div>
                         </div>
                      </div>
                   )
                })}
                {isAiReplying && (
                   <div className="flex justify-start">
                      <div className="flex max-w-[80%] gap-2 flex-row">
                         {dmActiveChat.avatar ? (
                           <img src={dmActiveChat.avatar} alt={dmActiveChat.name} className="w-7 h-7 rounded-full object-cover mt-auto shrink-0" />
                         ) : (
                           <div className="w-7 h-7 rounded-full bg-indigo-500 shrink-0 flex items-center justify-center text-[10px] text-white font-bold mt-auto">
                              {dmActiveChat.name.charAt(0)}
                           </div>
                         )}
                         <div className={`px-3 py-2.5 rounded-2xl ${isDark ? 'bg-[#383A40] text-[#DBDEE1]' : 'bg-slate-200 text-slate-800'} rounded-bl-sm flex items-center gap-1.5`}>
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                         </div>
                      </div>
                   </div>
                )}
                <div ref={messagesEndRef} />
             </div>
          </div>
        )
      ) : (
      <div ref={channelScrollRef} className={`flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin ${isDark ? 'scrollbar-thumb-white/10' : 'scrollbar-thumb-slate-200'}`}>
        {messages[activeChannel]?.map((msg) => {
          const isSystem = msg.role === 'system';
          
          if (isSystem) {
            return (
              <div key={msg.id} className="flex gap-2 text-[13px] py-1 bg-red-500/10 rounded-md px-2 border border-red-500/20">
                <span className="text-red-500 font-bold shrink-0">[Hệ Thống]</span>
                <span className={isDark ? 'text-white/80' : 'text-slate-700'}>{msg.text}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex gap-2">
              <div className="flex-1 min-w-0 text-[14px] leading-relaxed">
                {msg.role === 'vip' && (
                  <span className="inline-flex items-center justify-center text-[9px] bg-gradient-to-r from-yellow-600 to-yellow-400 text-white px-1.5 py-0.5 rounded uppercase font-bold mr-1.5 align-middle shadow-sm">
                    VIP
                  </span>
                )}
                
                <span className="text-xs text-zinc-500 mr-1.5 align-middle">
                  {new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <span 
                  onClick={() => {
                    if (msg.sender !== 'Hệ Thống' && msg.sender !== mcName) {
                      setActionMenu({ 
                        id: msg.senderId || msg.sender, 
                        name: msg.sender, 
                        role: msg.role, 
                        avatar: msg.avatar,
                        isRealNpc: !!msg.isRealNpc
                      });
                    }
                  }}
                  className={`cursor-pointer hover:underline align-middle mr-1 ${getRoleColor(msg.role)}`}
                >
                  [{msg.sender}]
                </span>
                
                <span className={`align-middle ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                  : {msg.text}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      )}

      {/* Input Area */}
      {!(activeChannel === 'dms' && !dmActiveChat) && (
      <div className={`p-3 shrink-0 border-t ${isDark ? 'border-white/10 bg-[#25262b]' : 'border-slate-200 bg-white'}`}>
        {activeChannel === 'dms' && dmActiveChat && !friends.some(f => f.id === dmActiveChat.id) ? (
          <button 
            onClick={async () => {
               // NPC friend request logic
               if (!dmActiveChat.isRealNpc) {
                 updateFriends(f => [...f, dmActiveChat]);
                 toast.success(`Đã kết bạn với ${dmActiveChat.name}`);
               } else {
                 toast.info(`Đang gửi lời mời kết bạn đến ${dmActiveChat.name}...`);
                 // Check relationship or let AI decide
                 const npcData = (dmActiveChat as any).npcData;
                 const rel = npcData?.relationship || 0;
                 // If relationship < -20, they hate MC. Otherwise accept.
                 setTimeout(() => {
                   if (rel < -20) {
                     toast.error(`${dmActiveChat.name} đã từ chối lời mời kết bạn.`);
                     // Send a rejection message
                     const reply: Message = {
                        id: Date.now().toString() + Math.random(),
                        sender: dmActiveChat.name,
                        senderId: dmActiveChat.id,
                        isRealNpc: true,
                        avatar: '',
                        text: 'Tôi không muốn nói chuyện với bạn.',
                        timestamp: Date.now(),
                        role: 'npc'
                     };
                     updateDMs(prev => ({
                        ...prev,
                        [dmActiveChat.id]: [...(prev[dmActiveChat.id] || []), reply]
                     }));
                   } else {
                     updateFriends(f => [...f, dmActiveChat]);
                     toast.success(`${dmActiveChat.name} đã đồng ý kết bạn!`);
                     // Send an acceptance message
                     const reply: Message = {
                        id: Date.now().toString() + Math.random(),
                        sender: dmActiveChat.name,
                        senderId: dmActiveChat.id,
                        isRealNpc: true,
                        avatar: '',
                        text: 'Chào bạn, kết bạn thành công!',
                        timestamp: Date.now(),
                        role: 'npc'
                     };
                     updateDMs(prev => ({
                        ...prev,
                        [dmActiveChat.id]: [...(prev[dmActiveChat.id] || []), reply]
                     }));
                   }
                 }, 1500);
               }
            }}
            className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition-colors"
          >
            Kết bạn để nhắn tin
          </button>
        ) : (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isDark ? 'bg-black/40 border-white/10 focus-within:border-amber-400/50' : 'bg-slate-100 border-transparent focus-within:border-blue-400/50'}`}>
          <button className={`shrink-0 p-1.5 rounded-full ${isDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}>
            <Smile size={20} />
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Nhập tin nhắn..."
            className={`flex-1 bg-transparent border-none outline-none text-[15px] py-1 ${isDark ? 'text-white placeholder-white/30' : 'text-slate-800 placeholder-slate-400'}`}
          />
          
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className={`shrink-0 p-2 rounded-full transition-colors ${
              !inputText.trim() 
                ? (isDark ? 'text-white/20' : 'text-slate-300')
                : (isDark ? 'bg-amber-500 text-black shadow-md' : 'bg-blue-500 text-white shadow-md')
            }`}
          >
            <Send size={16} className={inputText.trim() ? "ml-0.5" : ""} />
          </button>
        </div>
        )}
      </div>
      )}
      
    </div>
  );
}

