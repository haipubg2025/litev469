import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Hexagon, Briefcase,  Dices, ChevronLeft, ArrowRight, RotateCcw, AlertCircle, HelpCircle, Trophy, BarChart3, TrendingUp, TrendingDown, Target, Skull, Crown, CreditCard, Banknote, Flame, Trash2, Rocket, Zap, Circle, Gem, Activity, Pickaxe, LineChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import confetti from 'canvas-confetti';

interface CasinoAppProps {
  onBack: () => void;
  isDark: boolean;
}

const generateJadeMarket = (tier: number = 0) => {
   const colors = ['text-slate-400', 'text-stone-500', 'text-zinc-500', 'text-neutral-600', 'text-amber-800', 'text-orange-900', 'text-emerald-900', 'text-cyan-900', 'text-rose-900'];
   const stones = [];
   
   // Tier configs
   const configs = [
     { name: 'Chợ Cóc', minPrice: 500000, maxPrice: 5000000, baseWinRate: 5, maxWinRate: 15 },
     { name: 'Chợ Ngọc', minPrice: 10000000, maxPrice: 100000000, baseWinRate: 10, maxWinRate: 30 },
     { name: 'Sàn Đấu Giá', minPrice: 500000000, maxPrice: 5000000000, baseWinRate: 20, maxWinRate: 50 },
     { name: 'Chợ Đen', minPrice: 10000000000, maxPrice: 50000000000, baseWinRate: 40, maxWinRate: 80 }
   ];
   
   const cfg = configs[tier];

   // Jade Types (Extensive)
   const jadeTypes = [
     { type: 'Mã Não', minVal: 1000000, maxVal: 5000000, color: 'text-orange-400', icon: '🔶', weight: 100 },
     { type: 'Ngọc Trai Đen', minVal: 5000000, maxVal: 20000000, color: 'text-slate-800', icon: '🎱', weight: 60 },
     { type: 'Ngọc Bích', minVal: 20000000, maxVal: 80000000, color: 'text-green-500', icon: '❇️', weight: 40 },
     { type: 'Ngọc Hồng Lựu', minVal: 50000000, maxVal: 200000000, color: 'text-rose-500', icon: '🌺', weight: 25 },
     { type: 'Phỉ Thúy', minVal: 200000000, maxVal: 800000000, color: 'text-emerald-300', icon: '✨', weight: 15 },
     { type: 'Bạch Ngọc Mỡ Cừu', minVal: 1000000000, maxVal: 5000000000, color: 'text-gray-100', icon: '☁️', weight: 8 },
     { type: 'Huyết Dụ', minVal: 5000000000, maxVal: 20000000000, color: 'text-red-600', icon: '🩸', weight: 3 },
     { type: 'Đế Vương Xanh', minVal: 30000000000, maxVal: 150000000000, color: 'text-emerald-500', icon: '👑', weight: 1 }
   ];
   const totalWeight = jadeTypes.reduce((sum, j) => sum + j.weight, 0);

   for (let i = 0; i < 20; i++) {
      const basePrice = Math.floor(Math.random() * (cfg.maxPrice - cfg.minPrice)) + cfg.minPrice;
      // Round price
      let priceRounding = 100000;
      if (tier >= 1) priceRounding = 1000000;
      if (tier >= 2) priceRounding = 10000000;
      if (tier === 3) priceRounding = 100000000;
      const price = Math.floor(basePrice / priceRounding) * priceRounding;

      // Win rate correlates with price + some randomness
      const priceRatio = (price - cfg.minPrice) / (cfg.maxPrice - cfg.minPrice);
      const calculatedRate = cfg.baseWinRate + priceRatio * (cfg.maxWinRate - cfg.baseWinRate);
      
      // Add slight variance +/- 2%
      let finalRate = calculatedRate + (Math.random() * 4 - 2);
      if (finalRate < 1) finalRate = 1;
      if (finalRate > 99) finalRate = 99;

      // Did we hit jade?
      const isHit = Math.random() * 100 < finalRate;

      let result;
      if (!isHit) {
         result = { type: 'Đá cuội', mult: 0, value: 0, color: 'text-slate-500', icon: '🪨' };
      } else {
         // Random jade based on weights
         let randW = Math.random() * totalWeight;
         let chosenJade = jadeTypes[0];
         for (let j of jadeTypes) {
           if (randW < j.weight) {
             chosenJade = j;
             break;
           }
           randW -= j.weight;
         }
         
         const valRounding = chosenJade.minVal >= 1000000000 ? 100000000 : 100000;
         const actualValue = Math.floor((Math.random() * (chosenJade.maxVal - chosenJade.minVal) + chosenJade.minVal) / valRounding) * valRounding;
         result = { type: chosenJade.type, mult: 0, value: actualValue, color: chosenJade.color, icon: chosenJade.icon };
      }

      stones.push({ 
         id: i, 
         name: 'Mã Lô ĐT-' + Math.floor(Math.random()*9000 + 1000), 
         price, 
         winRate: finalRate.toFixed(1),
         result, 
         isOpen: false, 
         rockColor: colors[Math.floor(Math.random() * colors.length)] 
      });
   }
   return stones;
};

const generateStockMarket = (tier: number = 1) => {
   let tickers: string[] = [];
   let minPrice = 1000;
   let maxPrice = 10000;
   let vol = 0.15;

   if (tier === 0) {
      tickers = ['FLC', 'ROS', 'HQC', 'ITA', 'HAG', 'TTF', 'QCG', 'AMD', 'HAI', 'TCH', 'DXG', 'DIG', 'CEO', 'L14', 'NKG'];
      minPrice = 1000;
      maxPrice = 15000;
      vol = 0.35; // Penny: very high volatility
   } else if (tier === 1) {
      tickers = ['VIC', 'VHM', 'FPT', 'HPG', 'VCB', 'BID', 'CTG', 'TCB', 'VPB', 'MBB', 'MSN', 'VNM', 'SAB', 'GAS', 'MWG', 'SSI', 'VND', 'PNJ', 'STB'];
      minPrice = 20000;
      maxPrice = 150000;
      vol = 0.15; // Normal: moderate volatility
   } else {
      tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'NFLX', 'AMD', 'INTC', 'COIN', 'MSTR', 'V'];
      minPrice = 500000;
      maxPrice = 5000000;
      vol = 0.25; // Bluechip tech: high volatility
   }

   const shuffled = tickers.sort(() => 0.5 - Math.random()).slice(0, 15);
   const colors = ['text-blue-500', 'text-orange-500', 'text-green-500', 'text-red-600', 'text-emerald-600', 'text-indigo-500', 'text-purple-500', 'text-pink-500'];
   
   return shuffled.map(t => {
      const currentPrice = Math.floor((Math.random() * (maxPrice - minPrice) + minPrice) / 100) * 100;
      
      // Extreme events (10% chance for a massive spike or crash)
      let isExtreme = Math.random() < 0.1;
      let actualVol = isExtreme ? vol * 2.5 : vol;

      const pastChangePercent = (Math.random() - 0.5) * actualVol; 
      
      isExtreme = Math.random() < 0.1;
      actualVol = isExtreme ? vol * 3 : vol;
      const futureChangePercent = (Math.random() - 0.5) * actualVol; 
      
      let endPrice = Math.floor(currentPrice * (1 + futureChangePercent));
      if (endPrice < 100) endPrice = 100; // Floor price

      return { 
         ticker: t, 
         startPrice: currentPrice,
         pastChangePercent,
         futureChangePercent,
         endPrice,
         isBought: false, 
         brandColor: colors[Math.floor(Math.random() * colors.length)] 
      };
   });
};

const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
const BAU_CUA_SYMBOLS = [
  { id: 'nai', emoji: '🦌', name: 'Nai' },
  { id: 'bau', emoji: '🥒', name: 'Bầu' },
  { id: 'ga', emoji: '🐓', name: 'Gà' },
  { id: 'ca', emoji: '🐟', name: 'Cá' },
  { id: 'cua', emoji: '🦀', name: 'Cua' },
  { id: 'tom', emoji: '🦐', name: 'Tôm' }
];

type Card = { suit: string, rank: string, val: number, color: string };
const buildDeck = (): Card[] => {
  const suits = [{ s: '♠', c: 'black'}, { s: '♥', c: 'red'}, { s: '♦', c: 'red'}, { s: '♣', c: 'black'}];
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  let deck: Card[] = [];
  for (let s of suits) {
    for (let r of ranks) {
      let val = (r === 'J' || r === 'Q' || r === 'K') ? 10 : (r === 'A' ? 11 : parseInt(r));
      deck.push({ suit: s.s, rank: r, val, color: s.c });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

const calcHand = (hand: Card[]) => {
  let sum = 0; let aces = 0;
  for (let c of hand) { sum += c.val; if (c.rank === 'A') aces++; }
  while (sum > 21 && aces > 0) { sum -= 10; aces--; }
  return sum;
};




const ROOSTER_POOL = [
  { name: 'Thần Kê', title: 'Bất Bại', atk: 85, def: 85 },
  { name: 'Linh Kê', title: 'Né Tránh', atk: 75, def: 95 },
  { name: 'Xám Thần', title: 'Cuồng Nộ', atk: 95, def: 70 },
  { name: 'Tía Chớp', title: 'Tốc Độ', atk: 90, def: 75 },
  { name: 'Ô Ma', title: 'Lỳ Đòn', atk: 80, def: 90 },
  { name: 'Bạch Nhạn', title: 'Độc Cô', atk: 88, def: 82 },
  { name: 'Gà Chọi', title: 'Thiện Chiến', atk: 82, def: 88 },
  { name: 'Gà Tre', title: 'Hiếu Chiến', atk: 92, def: 68 }
];

function getRandomRoosters() {
  const shuffled = [...ROOSTER_POOL].sort(() => 0.5 - Math.random()).slice(0, 2);
  return shuffled.map(r => ({ ...r, form: Math.floor(Math.random() * 41) - 20 })); // Form: -20 to +20
}

const HORSE_POOL = [
  { name: 'Xích Thố', title: 'Huyền Thoại', speed: 85, endurance: 90 },
  { name: 'Hắc Phong', title: 'Dũng Mãnh', speed: 80, endurance: 85 },
  { name: 'Bạch Long', title: 'Thần Tốc', speed: 95, endurance: 70 },
  { name: 'Đích Lô', title: 'Xui Xẻo', speed: 70, endurance: 95 },
  { name: 'Tuyệt Ảnh', title: 'Vô Ảnh', speed: 90, endurance: 80 },
  { name: 'Dạ Minh', title: 'Bí Ẩn', speed: 82, endurance: 82 },
  { name: 'Cuồng Phong', title: 'Điên Rồ', speed: 88, endurance: 75 },
  { name: 'Bão Táp', title: 'Mạnh Mẽ', speed: 85, endurance: 88 },
  { name: 'Tia Chớp', title: 'Nhanh Nhẹn', speed: 92, endurance: 72 },
  { name: 'Xuyên Vân', title: 'Vượt Mây', speed: 84, endurance: 86 },
  { name: 'Hỏa Tiễn', title: 'Bốc Lửa', speed: 98, endurance: 65 },
  { name: 'Băng Giá', title: 'Lạnh Lùng', speed: 78, endurance: 92 },
];

function getRandomHorses() {
  const shuffled = [...HORSE_POOL].sort(() => 0.5 - Math.random()).slice(0, 5);
  return shuffled.map(h => ({ ...h, form: Math.floor(Math.random() * 41) - 20 })); // Form: -20 to +20
}

const CAR_STATS = [
  { model: 'F1 Ferrari', topSpeed: 95, acceleration: 90 },
  { model: 'F1 Mercedes', topSpeed: 92, acceleration: 95 },
  { model: 'F1 Red Bull', topSpeed: 98, acceleration: 85 },
  { model: 'F1 McLaren', topSpeed: 90, acceleration: 92 },
];

const DRIVER_POOL = [
  { name: 'L. Hamilton', rep: '7x Champ' },
  { name: 'M. Verstappen', rep: 'Aggressive' },
  { name: 'C. Leclerc', rep: 'Wonderkid' },
  { name: 'F. Alonso', rep: 'Veteran' },
  { name: 'L. Norris', rep: 'Rising Star' },
  { name: 'G. Russell', rep: 'Mr. Saturday' },
  { name: 'S. Perez', rep: 'Tire Whisperer' },
  { name: 'C. Sainz', rep: 'Smooth Operator' }
];

function getRandomDrivers() {
  const shuffled = [...DRIVER_POOL].sort(() => 0.5 - Math.random()).slice(0, 4);
  return shuffled.map((d, i) => ({
    ...d,
    car: CAR_STATS[i],
    form: Math.floor(Math.random() * 41) - 20 // Form: -20 to +20
  }));
}
const allTiers = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000];

// Inject keyframes for slideLeft
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes slideLeft {
      from { background-position: 0 center; }
      to { background-position: -40px center; }
    }
  `;
  document.head.appendChild(style);
}

export default function CasinoApp(
{ onBack, isDark }: CasinoAppProps) {
  const gameData = useStore(state => state.gameData);
  const setGameData = useStore(state => state.setGameData);
  const mcData = gameData?.mcData || {};
  const inventory = mcData && Array.isArray(mcData.inventory) ? mcData.inventory : [];
  const currencyItem = inventory[0] || { name: 'Tiền', quantity: 0, description: 'Tiền tệ' };
  const money = currencyItem.quantity || 0;
  const currency = currencyItem.name || 'Tiền';
  
  // Stats & VIP & Debt
  const casinoStats = mcData.casinoStats || { totalBet: 0, totalWon: 0, debt: 0 };
  const netProfit = casinoStats.totalWon - casinoStats.totalBet;
  const debt = casinoStats.debt || 0;
  const isVIP = money >= 10000000 || casinoStats.totalBet >= 50000000;
  const nanoTiers = isVIP
    ? [1000, 5000, 10000, 50000, 100000, 500000]
    : [1, 5, 10, 50, 100, 500];
  const betTiers = isVIP
    ? [10000, 50000, 100000, 500000, 1000000, 5000000]
    : [10, 50, 100, 500, 1000, 5000];
  const highTiers = betTiers.map(t => t * 10);
  const megaTiers = betTiers.map(t => t * 100);
  const gigaTiers = betTiers.map(t => t * 1000);

  const [activeGame, setActiveGame] = useState<'menu' | 'sicbo' | 'slots' | 'baucua' | 'roulette' | 'blackjack' | 'bank' | 'xocdia' | 'crash' | 'baccarat' | 'horseracing' | 'dragontiger' | 'daga' | 'football' | 'baicao' | 'dothach' | 'carracing' | 'scratch' | 'stockmarket'>('menu');
  const [isShaking, setIsShaking] = useState(false);

  // Sicbo State
  const [sicboBet, setSicboBet] = useState(nanoTiers[0]);
  const [sicboChoice, setSicboChoice] = useState<'tai' | 'xiu' | 'bao' | 'sum4' | 'sum17' | null>(null);
  const [sicboRolling, setSicboRolling] = useState(false);
  const [sicboResult, setSicboResult] = useState<number[] | null>(null);

  // Slots State (3x3)
  const [slotsBet, setSlotsBet] = useState(betTiers[0]);
  const [slotsRolling, setSlotsRolling] = useState(false);
  const [slotsResult, setSlotsResult] = useState<string[][] | null>(null);

  // Bau Cua State
  const [baucuaBets, setBaucuaBets] = useState<Record<string, number>>({});
  const [baucuaRolling, setBaucuaRolling] = useState(false);
  const [baucuaResult, setBaucuaResult] = useState<string[] | null>(null);
  const [matchHistory, setMatchHistory] = useState<{ time: string, game: string, message: string, profit: number }[]>([]);
  const addHistory = (game: string, message: string, profit: number) => {
    setMatchHistory(prev => [{ time: new Date().toLocaleTimeString('vi-VN'), game, message, profit }, ...prev].slice(0, 50));
  };
  const [baucuaSelectedBetAmount, setBaucuaSelectedBetAmount] = useState(nanoTiers[0]);

  // Roulette State
  const [rouletteBet, setRouletteBet] = useState(highTiers[0]);
  const [rouletteChoice, setRouletteChoice] = useState<string | null>(null);
  const [rouletteExactNum, setRouletteExactNum] = useState<string>('');
  const [rouletteRolling, setRouletteRolling] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<number | null>(null);

  // Blackjack State
  const [bjBet, setBjBet] = useState(highTiers[0]);
  const [bjState, setBjState] = useState<'bet' | 'playerTurn' | 'dealerTurn' | 'gameOver'>('bet');
  const [bjDeck, setBjDeck] = useState<Card[]>([]);
  const [bjPlayerHand, setBjPlayerHand] = useState<Card[]>([]);
  const [bjDealerHand, setBjDealerHand] = useState<Card[]>([]);
  const [bjResultMsg, setBjResultMsg] = useState('');

  // Xoc Dia State
  const [xocdiaBet, setXocdiaBet] = useState(nanoTiers[0]);
  const [xocdiaChoice, setXocdiaChoice] = useState<string | null>(null);
  const [xocdiaRolling, setXocdiaRolling] = useState(false);
  const [xocdiaResult, setXocdiaResult] = useState<boolean[] | null>(null); // true=red, false=white

  // Crash State
  const [crashBet, setCrashBet] = useState(betTiers[0]);
  const [crashMultiplier, setCrashMultiplier] = useState(1.00);
  const [crashActive, setCrashActive] = useState(false);
  const [crashCrashed, setCrashCrashed] = useState(false);
  const [crashCashout, setCrashCashout] = useState<number | null>(null);
  const crashRef = useRef<{ multiplier: number, target: number, req: number | null, startTs: number }>({ multiplier: 1, target: 1, req: null, startTs: 0 });

  
  
  const bgClass = isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900';
  const headerClass = isDark ? 'bg-slate-900/80 backdrop-blur border-white/10' : 'bg-white/80 backdrop-blur border-slate-200';

  const triggerJackpotEffect = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    const duration = 3000; const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#fbbf24', '#f59e0b', '#d97706', '#8b5cf6', '#ef4444'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#fbbf24', '#f59e0b', '#d97706', '#8b5cf6', '#ef4444'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };
  
  const triggerWinEffect = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#fbbf24', '#f59e0b', '#10b981'] });
  };

  const formatMoney = (val: number) => {
    if (val === undefined || val === null) return '0';
    return val.toLocaleString('en-US');
  };

  const updateMoney = (amountDelta: number, betAmount: number, winAmount: number, newDebt?: number) => {
    const currentState = useStore.getState();
    const currentGameData = currentState.gameData;
    if (!currentGameData) return;

    const currentMcData = currentGameData.mcData || {};
    const currentInventory = currentMcData.inventory && Array.isArray(currentMcData.inventory) ? currentMcData.inventory : [];
    const currentCasinoStats = currentMcData.casinoStats || { totalBet: 0, totalWon: 0, debt: 0 };

    const tempInventory = [...currentInventory];
    const currentMoney = tempInventory[0]?.quantity || 0;
    const currentCurrency = tempInventory[0]?.name || 'Tiền';

    if (tempInventory.length === 0) {
      tempInventory.push({ name: currentCurrency, quantity: currentMoney + amountDelta, description: 'Tiền tệ' });
    } else {
      tempInventory[0] = { ...tempInventory[0], quantity: currentMoney + amountDelta };
    }

    const statsAfter = {
      totalBet: (currentCasinoStats.totalBet || 0) + betAmount,
      totalWon: (currentCasinoStats.totalWon || 0) + winAmount,
      debt: newDebt !== undefined ? newDebt : (currentCasinoStats.debt || 0)
    };

    currentState.setGameData({
      ...currentGameData,
      mcData: { ...currentMcData, inventory: tempInventory, casinoStats: statsAfter }
    });
  };

  // ----------------------------------------------------
  // SICBO (Tài Xỉu Pro)
  // ----------------------------------------------------
  // Dragon Tiger State
  const [dtBet, setDtBet] = useState(highTiers[0]);
  const [dtChoice, setDtChoice] = useState<'dragon'|'tiger'|'tie'|null>(null);
  const [dtState, setDtState] = useState<'bet'|'dealing'|'result'>('bet');
  const [dtDragonCard, setDtDragonCard] = useState<Card | null>(null);
  const [dtTigerCard, setDtTigerCard] = useState<Card | null>(null);
  const [dtMsg, setDtMsg] = useState('');



const TEAM_POOL = [
  { name: 'Real Madrid', short: 'RMA', atk: 90, def: 85 },
  { name: 'Barcelona', short: 'BAR', atk: 88, def: 80 },
  { name: 'Man Utd', short: 'MUN', atk: 82, def: 78 },
  { name: 'Liverpool', short: 'LIV', atk: 89, def: 84 },
  { name: 'Arsenal', short: 'ARS', atk: 86, def: 86 },
  { name: 'Man City', short: 'MCI', atk: 92, def: 88 },
  { name: 'Bayern Munich', short: 'BAY', atk: 91, def: 84 },
  { name: 'Dortmund', short: 'BVB', atk: 84, def: 80 },
  { name: 'Chelsea', short: 'CHE', atk: 83, def: 82 },
  { name: 'Tottenham', short: 'TOT', atk: 85, def: 79 },
  { name: 'Juventus', short: 'JUV', atk: 82, def: 86 },
  { name: 'AC Milan', short: 'ACM', atk: 83, def: 81 },
  { name: 'Inter Milan', short: 'INT', atk: 87, def: 88 },
  { name: 'PSG', short: 'PSG', atk: 88, def: 82 }
];

function generateMatches() {
  const shuffled = [...TEAM_POOL].sort(() => 0.5 - Math.random());
  const matches = [];
  for(let i=0; i<3; i++) {
    const home = shuffled[i*2];
    const away = shuffled[i*2+1];
    
    const hForm = Math.floor(Math.random() * 21) - 10;
    const aForm = Math.floor(Math.random() * 21) - 10;
    
    // Calculate probabilities based on stats and form
    const hTotal = home.atk + hForm - away.def/2;
    const aTotal = away.atk + aForm - home.def/2;
    
    const hProb = Math.max(0.005, hTotal * 0.0003);
    const aProb = Math.max(0.005, aTotal * 0.0003);
    
    // Very simplified odds based on prob
    const probDiff = hProb - aProb;
    let ah = 0;
    if (probDiff > 0.003) ah = -0.5;
    else if (probDiff < -0.003) ah = 0.5;
    
    matches.push({
      id: 'm' + Date.now() + i,
      h: home.name, a: away.name,
      hs: home.short, as: away.short,
      hForm, aForm,
      hAtk: home.atk, hDef: home.def,
      aAtk: away.atk, aDef: away.def,
      hWin: parseFloat((1 / (hProb/(hProb+aProb+0.01))).toFixed(2)),
      draw: 3.2,
      aWin: parseFloat((1 / (aProb/(hProb+aProb+0.01))).toFixed(2)),
      ah: ah, ahH: 1.95, ahA: 1.95,
      ou: 2.5, ouO: 1.9, ouU: 1.9,
      hProb, aProb
    });
  }
  return matches;
}

type FootballMatch = { hForm?: number; aForm?: number; hAtk?: number; hDef?: number; aAtk?: number; aDef?: number;  id: string; h: string; a: string; hs: string; as: string; hWin: number; draw: number; aWin: number; ah: number; ahH: number; ahA: number; ou: number; ouO: number; ouU: number; hProb: number; aProb: number; };


  // Bóng Đá State
  const [fbMatches, setFbMatches] = useState<FootballMatch[]>(generateMatches());
  const [fbMatchId, setFbMatchId] = useState<string | null>(null);
  const [fbBet, setFbBet] = useState(megaTiers[0]);
  const [fbChoice, setFbChoice] = useState<string | null>(null);
  const [fbState, setFbState] = useState<'bet'|'playing'|'result'>('bet');
  const [fbScore, setFbScore] = useState<number[]>([0, 0]);
  const [fbTime, setFbTime] = useState<number>(0);
  const [fbMsg, setFbMsg] = useState('');
  const fbRef = useRef<{ req: number | null, score: number[], time: number }>({ req: null, score: [0,0], time: 0 });

  // Đổ Thạch State
  const [jadeTier, setJadeTier] = useState(0);
  const [jadeMarket, setJadeMarket] = useState(generateJadeMarket(0));
  const [jadeSelected, setJadeSelected] = useState<number[]>([]);
  const [jadeResult, setJadeResult] = useState<any>(null);
  const [jadeMsg, setJadeMsg] = useState('');

  // Đua Xe State
  const [carBet, setCarBet] = useState(gigaTiers[0]);
  const [carChoice, setCarChoice] = useState<number|null>(null);
  const [carState, setCarState] = useState<'bet'|'racing'|'result'>('bet');
  const [carProgress, setCarProgress] = useState<number[]>([0,0,0,0]);
  const [carWinner, setCarWinner] = useState<number|null>(null);
  const [carList, setCarList] = useState(getRandomDrivers());
  const carRef = useRef<{ req: number | null, progresses: number[] }>({ req: null, progresses: [0,0,0,0] });

  // Vé Số Cào State
  const [scratchBet, setScratchBet] = useState(betTiers[0]);
  const [scratchState, setScratchState] = useState<'buy'|'scratching'|'result'>('buy');
  const [scratchGrid, setScratchGrid] = useState<string[]>(Array(9).fill('?'));
  const [scratchMsg, setScratchMsg] = useState('');

  // Chứng Khoán State
    const [stockTier, setStockTier] = useState(1);
  const [stockMarket, setStockMarket] = useState(generateStockMarket(1));
  const [stockPortfolio, setStockPortfolio] = useState<Record<string, number>>({});
  const [stockMsg, setStockMsg] = useState('');

  useEffect(() => {
    if (activeGame === 'dothach') {
      setJadeMarket(generateJadeMarket(jadeTier));
      setJadeSelected([]);
      setJadeResult(null);
      setJadeMsg('');
    }
    if (activeGame === 'stockmarket') {
      setStockMarket(generateStockMarket(stockTier));
      setStockPortfolio({});
      setStockMsg('');
    }
  }, [activeGame]);

  // Bài Cào State
  const [bcBet, setBcBet] = useState(highTiers[0]);
  const [bcState, setBcState] = useState<'bet'|'dealing'|'result'>('bet');
  const [bcPlayerHand, setBcPlayerHand] = useState<Card[]>([]);
  const [bcBotHand, setBcBotHand] = useState<Card[]>([]);
  const [bcMsg, setBcMsg] = useState('');

  // Da Ga State
  const [dagaBet, setDagaBet] = useState(highTiers[0]);
  const [dagaChoice, setDagaChoice] = useState<'meron'|'wala'|'tie'|null>(null);
  const [dagaState, setDagaState] = useState<'bet'|'fighting'|'result'>('bet');
  const [dagaHp, setDagaHp] = useState<number[]>([100, 100]);
  const [dagaMsg, setDagaMsg] = useState('');
  const [dagaRoosters, setDagaRoosters] = useState(getRandomRoosters());
  const dagaRef = useRef<{ req: number | null, hp: number[] }>({ req: null, hp: [100, 100] });

  // Baccarat State
  const [bacBet, setBacBet] = useState(highTiers[0]);
  const [bacChoice, setBacChoice] = useState<'player'|'banker'|'tie'|null>(null);
  const [bacState, setBacState] = useState<'bet'|'dealing'|'result'>('bet');
  const [bacPlayerHand, setBacPlayerHand] = useState<Card[]>([]);
  const [bacBankerHand, setBacBankerHand] = useState<Card[]>([]);
  const [bacMsg, setBacMsg] = useState('');

  // Horse Racing State
  const [horseBet, setHorseBet] = useState(allTiers[0]);
  const [horseChoice, setHorseChoice] = useState<number|null>(null);
  const [horseState, setHorseState] = useState<'bet'|'racing'|'result'>('bet');
  const [horseProgress, setHorseProgress] = useState<number[]>([0,0,0,0,0]);
  const [horseWinner, setHorseWinner] = useState<number|null>(null);
  const [horseList, setHorseList] = useState(getRandomHorses());
  const horseRef = useRef<{ req: number | null, progresses: number[] }>({ req: null, progresses: [0,0,0,0] });

  const playSicbo = () => {
    if (!sicboChoice) return addHistory('sicbo', 'Vui lòng chọn cửa!', 0);
    if (money < sicboBet) return addHistory(activeGame, 'Số dư không đủ!', 0);
    
    updateMoney(-sicboBet, sicboBet, 0);
    setSicboRolling(true); setSicboResult(null);

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const result = [d1, d2, d3];
      const total = d1 + d2 + d3;
      setSicboResult(result); setSicboRolling(false);

      const isBao = d1 === d2 && d2 === d3;
      const isTai = total >= 11 && total <= 17 && !isBao;
      const isXiu = total >= 4 && total <= 10 && !isBao;

      let won = false; let multiplier = 0;

      if (sicboChoice === 'bao' && isBao) { won = true; multiplier = 30; }
      else if (sicboChoice === 'tai' && isTai) { won = true; multiplier = 2; }
      else if (sicboChoice === 'xiu' && isXiu) { won = true; multiplier = 2; }
      else if (sicboChoice === 'sum4' && total === 4) { won = true; multiplier = 50; }
      else if (sicboChoice === 'sum17' && total === 17) { won = true; multiplier = 50; }

      if (won) {
        const prize = sicboBet * multiplier;
        updateMoney(prize, 0, prize);
        if (multiplier >= 30) { triggerJackpotEffect(); addHistory('sicbo', `NỔ HŨ! Thắng ${prize.toLocaleString()}`, prize - sicboBet); }
        else { triggerWinEffect(); addHistory('sicbo', `Thắng lớn! +${prize.toLocaleString()}`, prize - sicboBet); }
      } else {
        addHistory('sicbo', `Bạn đã thua ${sicboBet.toLocaleString()}`, -sicboBet);
      }
    }, 2000);
  };

  // ----------------------------------------------------
  // SLOTS 3x3
  // ----------------------------------------------------
  const playSlots = () => {
    if (money < slotsBet) return addHistory(activeGame, 'Số dư không đủ!', 0);
    
    updateMoney(-slotsBet, slotsBet, 0);
    setSlotsRolling(true); setSlotsResult(null);

    setTimeout(() => {
      // Generate 3x3 grid
      const grid = Array(3).fill(0).map(() => 
        Array(3).fill(0).map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)])
      );
      setSlotsResult(grid);
      setSlotsRolling(false);

      // Check 5 lines: 3 rows, 2 diagonals
      const lines = [
        [grid[0][0], grid[0][1], grid[0][2]], // R1
        [grid[1][0], grid[1][1], grid[1][2]], // R2
        [grid[2][0], grid[2][1], grid[2][2]], // R3
        [grid[0][0], grid[1][1], grid[2][2]], // D1
        [grid[0][2], grid[1][1], grid[2][0]]  // D2
      ];

      let totalPrize = 0;
      let isJackpot = false;

      lines.forEach(line => {
        if (line[0] === line[1] && line[1] === line[2]) {
          let multiplier = 5;
          if (line[0] === '7️⃣') multiplier = 20;
          if (line[0] === '💎') { multiplier = 50; isJackpot = true; }
          totalPrize += slotsBet * multiplier;
        }
      });

      if (totalPrize > 0) {
        updateMoney(totalPrize, 0, totalPrize);
        if (isJackpot) { triggerJackpotEffect(); addHistory('slots', `SIÊU JACKPOT! Thắng ${totalPrize.toLocaleString()}`, totalPrize - slotsBet); }
        else { triggerWinEffect(); addHistory('slots', `Trúng đường! +${totalPrize.toLocaleString()}`, totalPrize - slotsBet); }
      } else {
        addHistory('slots', `Trượt rồi, may mắn lần sau!`, -slotsBet);
      }
    }, 2500);
  };

  // ----------------------------------------------------
  // BAU CUA
  // ----------------------------------------------------
  const playBaucua = () => {
    const totalBet = Object.values(baucuaBets).reduce((a, b) => a + b, 0);
    if (totalBet <= 0) return addHistory('baucua', 'Vui lòng đặt cược ít nhất 1 cửa!', 0);
    if (money < totalBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-totalBet, totalBet, 0);
    setBaucuaRolling(true); setBaucuaResult(null);

    setTimeout(() => {
      const r1 = BAU_CUA_SYMBOLS[Math.floor(Math.random() * BAU_CUA_SYMBOLS.length)].id;
      const r2 = BAU_CUA_SYMBOLS[Math.floor(Math.random() * BAU_CUA_SYMBOLS.length)].id;
      const r3 = BAU_CUA_SYMBOLS[Math.floor(Math.random() * BAU_CUA_SYMBOLS.length)].id;
      const resultIds = [r1, r2, r3];
      
      setBaucuaResult(resultIds); setBaucuaRolling(false);

      let totalPrize = 0;
      Object.entries(baucuaBets).forEach(([betId, betAmount]) => {
        if (betAmount > 0) {
          const matchCount = resultIds.filter(id => id === betId).length;
          if (matchCount > 0) {
            totalPrize += betAmount + (betAmount * matchCount);
          }
        }
      });

      if (totalPrize > 0) {
        updateMoney(totalPrize, 0, totalPrize);
        triggerWinEffect(); addHistory('baucua', `Thắng lớn! +${totalPrize.toLocaleString()}`, totalPrize - totalBet);
      } else {
        addHistory('baucua', `Thua sạch mâm cược!`, -totalBet);
      }
      setBaucuaBets({});
    }, 2500);
  };

  // ----------------------------------------------------
  // ROULETTE
  // ----------------------------------------------------
  const playRoulette = () => {
    if (!rouletteChoice && !rouletteExactNum) return addHistory('roulette', 'Vui lòng chọn cửa cược!', 0);
    if (money < rouletteBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    let isExact = false;
    let exactVal = -1;
    if (rouletteChoice === 'exact') {
      exactVal = parseInt(rouletteExactNum);
      if (isNaN(exactVal) || exactVal < 0 || exactVal > 36) return addHistory('roulette', 'Số cược phải từ 0 đến 36!', 0);
      isExact = true;
    }

    updateMoney(-rouletteBet, rouletteBet, 0);
    setRouletteRolling(true); setRouletteResult(null);

    setTimeout(() => {
      const res = Math.floor(Math.random() * 37);
      setRouletteResult(res); setRouletteRolling(false);

      const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      const isRed = RED_NUMS.includes(res);
      const isBlack = res !== 0 && !isRed;
      const isEven = res !== 0 && res % 2 === 0;
      const isOdd = res !== 0 && res % 2 !== 0;

      let won = false; let multiplier = 0;

      if (isExact && res === exactVal) { won = true; multiplier = 36; }
      else if (rouletteChoice === 'red' && isRed) { won = true; multiplier = 2; }
      else if (rouletteChoice === 'black' && isBlack) { won = true; multiplier = 2; }
      else if (rouletteChoice === 'even' && isEven) { won = true; multiplier = 2; }
      else if (rouletteChoice === 'odd' && isOdd) { won = true; multiplier = 2; }

      if (won) {
        const prize = rouletteBet * multiplier;
        updateMoney(prize, 0, prize);
        if (multiplier > 2) { triggerJackpotEffect(); addHistory('roulette', `Số ${res}! TRÚNG ĐỘC ĐẮC ${prize.toLocaleString()}`, prize - rouletteBet); }
        else { triggerWinEffect(); addHistory('roulette', `Số ${res}! Thắng ${prize.toLocaleString()}`, prize - rouletteBet); }
      } else {
        addHistory('roulette', `Số ${res}. Bạn đã thua!`, -rouletteBet);
      }
    }, 3000);
  };

  // ----------------------------------------------------
  // BLACKJACK
  // ----------------------------------------------------
  const playBlackjack = () => {
    if (money < bjBet) return addHistory(activeGame, 'Số dư không đủ!', 0);
    
    updateMoney(-bjBet, bjBet, 0);
    const d = buildDeck();
    const ph = [d.pop()!, d.pop()!];
    const dh = [d.pop()!, d.pop()!];
    
    setBjDeck(d); setBjPlayerHand(ph); setBjDealerHand(dh);
    setBjState('playerTurn'); setBjResultMsg('');
    
    if (calcHand(ph) === 21) {
      handleBjEnd(ph, dh, true); // BlackJack auto win
    }
  };

  const bjHit = () => {
    const d = [...bjDeck]; const ph = [...bjPlayerHand];
    ph.push(d.pop()!);
    setBjDeck(d); setBjPlayerHand(ph);
    if (calcHand(ph) > 21) {
      handleBjEnd(ph, bjDealerHand, false, true); // Bust
    }
  };

  const bjStand = () => {
    setBjState('dealerTurn');
    let d = [...bjDeck]; let dh = [...bjDealerHand];
    let dealerScore = calcHand(dh);
    
    // Dealer logic: hit until >= 17
    const dealerDraws = () => {
      if (dealerScore < 17) {
        setTimeout(() => {
          dh.push(d.pop()!);
          dealerScore = calcHand(dh);
          setBjDeck([...d]); setBjDealerHand([...dh]);
          dealerDraws();
        }, 800);
      } else {
        handleBjEnd(bjPlayerHand, dh, false);
      }
    };
    dealerDraws();
  };

  const handleBjEnd = (ph: Card[], dh: Card[], isBlackjackInit = false, isBust = false) => {
    setBjState('gameOver');
    const pScore = calcHand(ph);
    const dScore = calcHand(dh);
    
    let won = false; let push = false; let multiplier = 2;

    if (isBlackjackInit) { won = true; multiplier = 2.5; setBjResultMsg('🃏 BLACKJACK! THẮNG LỚN!'); }
    else if (isBust) { won = false; setBjResultMsg('💥 QUẮC (>21)! BẠN THUA!'); }
    else if (dScore > 21) { won = true; setBjResultMsg('🎊 NHÀ CÁI QUẮC! BẠN THẮNG!'); }
    else if (pScore > dScore) { won = true; setBjResultMsg(`🏆 THẮNG! (${pScore} > ${dScore})`); }
    else if (pScore === dScore) { push = true; setBjResultMsg(`🤝 HÒA (${pScore} điểm)`); }
    else { won = false; setBjResultMsg(`😢 THUA (${pScore} < ${dScore})`); }

    if (won) {
      const prize = Math.floor(bjBet * multiplier);
      updateMoney(prize, 0, prize);
      triggerWinEffect();
      addHistory('blackjack', `Thắng: ${prize.toLocaleString()}`, prize - bjBet);
    } else if (push) {
      updateMoney(bjBet, 0, 0); // refund
      addHistory('blackjack', 'Hòa (Hoàn tiền)', 0);
    } else {
      addHistory('blackjack', `Thua: ${bjBet.toLocaleString()}`, -bjBet);
    }
  };

  // ----------------------------------------------------
  // XÓC ĐĨA
  // ----------------------------------------------------
  const playXocdia = () => {
    if (!xocdiaChoice) return addHistory('xocdia', 'Vui lòng chọn cửa!', 0);
    if (money < xocdiaBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-xocdiaBet, xocdiaBet, 0);
    setXocdiaRolling(true); setXocdiaResult(null);

    setTimeout(() => {
      // 4 coins: true = red, false = white
      const r = [Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5, Math.random() > 0.5];
      setXocdiaResult(r); setXocdiaRolling(false);

      const redCount = r.filter(x => x).length;
      let won = false; let multiplier = 0;

      if (xocdiaChoice === 'chan' && (redCount === 0 || redCount === 2 || redCount === 4)) { won = true; multiplier = 2; }
      else if (xocdiaChoice === 'le' && (redCount === 1 || redCount === 3)) { won = true; multiplier = 2; }
      else if (xocdiaChoice === '4red' && redCount === 4) { won = true; multiplier = 16; } // 1 ăn 15
      else if (xocdiaChoice === '4white' && redCount === 0) { won = true; multiplier = 16; }
      else if (xocdiaChoice === '3red' && redCount === 3) { won = true; multiplier = 4.5; } // 1 ăn 3.5
      else if (xocdiaChoice === '3white' && redCount === 1) { won = true; multiplier = 4.5; }

      if (won) {
        const prize = xocdiaBet * multiplier;
        updateMoney(prize, 0, prize);
        if (multiplier > 2) { triggerJackpotEffect(); addHistory('xocdia', `NỔ HŨ! Thắng ${prize.toLocaleString()}`, prize - xocdiaBet); }
        else { triggerWinEffect(); addHistory('xocdia', `Thắng! +${prize.toLocaleString()}`, prize - xocdiaBet); }
      } else {
        addHistory('xocdia', `Bạn đã thua ${xocdiaBet.toLocaleString()}`, -xocdiaBet);
      }
    }, 2000);
  };

  // ----------------------------------------------------
  // CRASH (TÊN LỬA)
  // ----------------------------------------------------
  const playCrash = () => {
    if (money < crashBet) return addHistory(activeGame, 'Số dư không đủ!', 0);
    
    updateMoney(-crashBet, crashBet, 0);
    setCrashActive(true); setCrashCrashed(false); setCrashCashout(null);
    setCrashMultiplier(1.00);

    // generate target using exponential distribution (house edge roughly 5%)
    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    let target = Math.floor(100 * e / (h + 1)) / 100;
    if (target < 1.01) target = 1.01;
    
    crashRef.current.target = target;
    crashRef.current.multiplier = 1.00;
    crashRef.current.startTs = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - crashRef.current.startTs) / 1000;
      // Formula: multiplier grows exponentially. e.g. e^(0.06 * elapsed)
      // At elapsed=10s, it's 1.8x. At 30s, it's 6x. At 60s, it's 36x.
      const currentMult = Math.pow(1.06, elapsed * 10);
      
      if (currentMult >= crashRef.current.target) {
        setCrashMultiplier(crashRef.current.target);
        setCrashCrashed(true);
        setCrashActive(false);
        addHistory('crash', `Tên lửa nổ ở ${crashRef.current.target}x`, -crashBet);
        return;
      }
      
      setCrashMultiplier(currentMult);
      crashRef.current.req = requestAnimationFrame(tick);
    };
    crashRef.current.req = requestAnimationFrame(tick);
  };

  const cashoutCrash = () => {
    if (!crashActive || crashCrashed) return;
    
    if (crashRef.current.req) cancelAnimationFrame(crashRef.current.req);
    crashRef.current.req = null;
    
    setCrashActive(false);
    const currMult = Math.floor(crashMultiplier * 100) / 100;
    setCrashCashout(currMult);
    
    const prize = Math.floor(crashBet * currMult);
    updateMoney(prize, 0, prize);
    triggerWinEffect();
    addHistory('crash', `Chốt lời ở ${currMult}x (+${prize.toLocaleString()})`, prize - crashBet);

    // continue animation just to show when it actually crashes
    const finishAnim = (now: number) => {
       const elapsed = (now - crashRef.current.startTs) / 1000;
       const currentMult = Math.pow(1.06, elapsed * 10);
       if (currentMult >= crashRef.current.target) {
         setCrashMultiplier(crashRef.current.target);
         setCrashCrashed(true);
         return;
       }
       setCrashMultiplier(currentMult);
       crashRef.current.req = requestAnimationFrame(finishAnim);
    };
    crashRef.current.req = requestAnimationFrame(finishAnim);
  };

  // ----------------------------------------------------
  // TÍN DỤNG ĐEN (LOAN SHARK)
  // ----------------------------------------------------
  // ----------------------------------------------------
  // DRAGON TIGER
  // ----------------------------------------------------
  const playDragonTiger = () => {
    if (!dtChoice) return addHistory('dragontiger', 'Vui lòng chọn cửa!', 0);
    if (money < dtBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-dtBet, dtBet, 0);
    setDtState('dealing'); setDtMsg('');
    const d = buildDeck();
    
    setTimeout(() => {
      const dCard = d.pop()!;
      const tCard = d.pop()!;
      setDtDragonCard(dCard);
      setDtTigerCard(tCard);
      
      const getVal = (c: Card) => {
        if (c.rank === 'A') return 1;
        if (c.rank === 'J') return 11;
        if (c.rank === 'Q') return 12;
        if (c.rank === 'K') return 13;
        return parseInt(c.rank);
      };

      const dVal = getVal(dCard);
      const tVal = getVal(tCard);

      setTimeout(() => {
        setDtState('result');
        let won = false; let multiplier = 0; let resultText = '';
        
        const isTie = dVal === tVal;
        const isDragon = dVal > tVal;
        const isTiger = tVal > dVal;
        
        if (isTie) {
           resultText = 'HÒA';
           if (dtChoice === 'tie') { won = true; multiplier = 9; }
           else { won = false; multiplier = 1; }
        } else if (isDragon) {
           resultText = 'RỒNG THẮNG';
           if (dtChoice === 'dragon') { won = true; multiplier = 2; }
        } else {
           resultText = 'HỔ THẮNG';
           if (dtChoice === 'tiger') { won = true; multiplier = 2; }
        }
        
        if (won) {
          const prize = Math.floor(dtBet * multiplier);
          updateMoney(prize, 0, prize);
          triggerWinEffect();
          setDtMsg(`Thắng: ${prize.toLocaleString()}`);
          addHistory('dragontiger', `${resultText}. Thắng ${prize.toLocaleString()}`, prize - dtBet);
        } else if (isTie && dtChoice !== 'tie') {
          const refund = Math.floor(dtBet / 2);
          updateMoney(refund, 0, 0);
          setDtMsg('Hòa (Hoàn 50%)');
          addHistory('dragontiger', `${resultText}. Hoàn 50%`, refund - dtBet);
        } else {
          setDtMsg('Bạn đã thua');
          addHistory('dragontiger', `${resultText}. Thua ${dtBet.toLocaleString()}`, -dtBet);
        }
      }, 1000);
    }, 500);
  };

  // ----------------------------------------------------
  // BÓNG ĐÁ ẢO (VIRTUAL FOOTBALL)
  // ----------------------------------------------------
  const playFootball = () => {
    if (!fbMatchId) return;
    const match = fbMatches.find(m => m.id === fbMatchId);
    if (!match) return;
    if (!fbChoice) return addHistory('football', 'Vui lòng chọn cửa!', 0);
    if (money < fbBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-fbBet, fbBet, 0);
    setFbState('playing'); setFbMsg('');
    setFbScore([0, 0]); setFbTime(0);
    fbRef.current.score = [0, 0];
    fbRef.current.time = 0;

    const tick = () => {
      let t = fbRef.current.time;
      let [h, a] = fbRef.current.score;
      t += 1;
      
      if (Math.random() < match.hProb) h += 1;
      if (Math.random() < match.aProb) a += 1;
      
      fbRef.current.time = t;
      fbRef.current.score = [h, a];
      setFbTime(t);
      setFbScore([...fbRef.current.score]);

      if (t >= 90) {
        setFbState('result');
        let won = false; 
        let multiplier = 0;
        let tie = false;

        const isDraw = h === a;
        const isHome = h > a;
        const sum = h + a;
        const ahDiff = h - a + match.ah; // Adjusted difference

        if (fbChoice === '1x2_home' && isHome) { won = true; multiplier = match.hWin; }
        else if (fbChoice === '1x2_draw' && isDraw) { won = true; multiplier = match.draw; }
        else if (fbChoice === '1x2_away' && (!isHome && !isDraw)) { won = true; multiplier = match.aWin; }
        
        else if (fbChoice === 'ah_home') {
          if (ahDiff > 0) { won = true; multiplier = match.ahH; }
          else if (ahDiff === 0) { tie = true; }
        }
        else if (fbChoice === 'ah_away') {
          if (ahDiff < 0) { won = true; multiplier = match.ahA; }
          else if (ahDiff === 0) { tie = true; }
        }

        else if (fbChoice === 'ou_over') {
          if (sum > match.ou) { won = true; multiplier = match.ouO; }
          else if (sum === match.ou) { tie = true; }
        }
        else if (fbChoice === 'ou_under') {
          if (sum < match.ou) { won = true; multiplier = match.ouU; }
          else if (sum === match.ou) { tie = true; }
        }

        const resultText = `${match.h} ${h}-${a} ${match.a}`;

        if (won) {
          const prize = Math.floor(fbBet * multiplier);
          updateMoney(prize, 0, prize);
          triggerWinEffect();
          setFbMsg(`Thắng: ${prize.toLocaleString()}`);
          addHistory('football', `${resultText}. ${fbChoice}. Thắng ${prize.toLocaleString()}`, prize - fbBet);
        } else if (tie) {
          updateMoney(fbBet, 0, fbBet);
          setFbMsg('Hòa tiền');
          addHistory('football', `${resultText}. ${fbChoice}. Hòa tiền`, 0);
        } else {
          setFbMsg('Bạn đã thua');
          addHistory('football', `${resultText}. ${fbChoice}. Thua ${fbBet.toLocaleString()}`, -fbBet);
        }
        return;
      }
      
      setTimeout(() => {
        fbRef.current.req = requestAnimationFrame(tick);
      }, 30);
    };
    fbRef.current.req = requestAnimationFrame(tick);
  };

  // ----------------------------------------------------
  // CHỨNG KHOÁN (STOCK MARKET)
  // ----------------------------------------------------
  const playStockMarket = () => {
    const tickers = Object.keys(stockPortfolio);
    if (tickers.length === 0) return addHistory('stockmarket', 'Vui lòng chọn mua ít nhất 1 mã cổ phiếu!', 0);

    const totalCost = tickers.reduce((sum, ticker) => {
       const qty = stockPortfolio[ticker];
       const stock = stockMarket.find(s => s.ticker === ticker);
       return sum + (stock ? stock.startPrice * qty : 0);
    }, 0);
    
    if (money < totalCost) return addHistory('stockmarket', 'Số dư không đủ để thực hiện giao dịch!', 0);

    let totalRevenue = 0;
    let historyDetails = [];

    tickers.forEach(ticker => {
       const qty = stockPortfolio[ticker];
       const stock = stockMarket.find(s => s.ticker === ticker);
       if (stock) {
          const endPrice = stock.endPrice;
          const revenue = endPrice * qty;
          totalRevenue += revenue;
          const profitPercent = (stock.futureChangePercent * 100).toFixed(1);
          historyDetails.push(`${ticker} x${qty} (${parseFloat(profitPercent) > 0 ? '+' : ''}${profitPercent}%)`);
       }
    });

    const netProfit = totalRevenue - totalCost;
    
    // Deduct cost and add to metrics
    updateMoney(-totalCost, totalCost, 0);
    
    // Add revenue back
    if (totalRevenue > 0) {
       updateMoney(totalRevenue, 0, totalRevenue > totalCost ? totalRevenue - totalCost : 0);
    }
    
    if (netProfit > 0) {
       triggerWinEffect();
    }

    const sign = netProfit >= 0 ? '+' : '';
    addHistory('stockmarket', `Chốt ${tickers.length} mã: ${historyDetails.join(', ')}. ${sign}${netProfit.toLocaleString()}`, netProfit);
    
    // Refresh market immediately
    setStockMarket(generateStockMarket(stockTier));
    setStockPortfolio({});
  };

  // ----------------------------------------------------
  // ĐỔ THẠCH (JADE CUTTING)
  // ----------------------------------------------------
  const playDothach = () => {
    if (jadeSelected === null) return addHistory('dothach', 'Vui lòng chọn 1 viên đá!', 0);
    const stone = jadeMarket.find(s => s.id === jadeSelected);
    if (!stone) return;
    if (stone.isOpen) return addHistory('dothach', 'Đá này đã bị cắt!', 0);
    
    const actualPrice = stone.price;

    if (money < actualPrice) return addHistory('dothach', 'Số dư không đủ!', 0);

    updateMoney(-actualPrice, actualPrice, 0);
    
    const newMarket = jadeMarket.map(s => s.id === jadeSelected ? { ...s, isOpen: true } : s);
    setJadeMarket(newMarket);
    setJadeResult(stone.result);

    if (stone.result.mult > 0) {
      const prize = Math.floor(actualPrice * stone.result.mult);
      updateMoney(prize, 0, prize);
      if (stone.result.mult >= 1) triggerWinEffect();
      setJadeMsg(`Cắt ra ${stone.result.type}! +${prize.toLocaleString()}`);
      addHistory('dothach', `Cắt lô ${stone.id+1} trúng ${stone.result.type} (x${stone.result.mult}). +${prize.toLocaleString()}`, prize - actualPrice);
    } else {
      setJadeMsg('Đá cuội không có giá trị!');
      addHistory('dothach', `Lô ${stone.id+1} chỉ là đá cuội (x0). -${actualPrice.toLocaleString()}`, -actualPrice);
    }
  };

  // ----------------------------------------------------
  // ĐUA XE (CAR RACING)
  // ----------------------------------------------------
  const playCarRacing = () => {
    if (carChoice === null) return addHistory('carracing', 'Vui lòng chọn xe!', 0);
    if (money < carBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-carBet, carBet, 0);
    setCarState('racing'); setCarWinner(null);
    setCarProgress([0,0,0,0]);
    carRef.current.progresses = [0,0,0,0];

    const tick = () => {
      let isDone = false;
      const newProgs = carRef.current.progresses.map(p => {
         // Cars move faster than horses, more variance
         let move = Math.random() * 1.5; if (Math.random() > 0.94) move += 2.5; // Nitro Boost!
         const np = p + move;
         if (np >= 100) isDone = true;
         return np >= 100 ? 100 : np;
      });
      carRef.current.progresses = newProgs;
      setCarProgress(newProgs);

      if (isDone) {
        const winnerIndex = newProgs.findIndex(p => p >= 100);
        setCarState('result');
        setCarWinner(winnerIndex);
        
        if (winnerIndex === carChoice) {
           const prize = Math.floor(carBet * 3.5);
           updateMoney(prize, 0, prize);
           triggerWinEffect();
           addHistory('carracing', `Xe số ${winnerIndex + 1} về nhất! Thắng ${prize.toLocaleString()}`, prize - carBet);
        } else {
           addHistory('carracing', `Xe số ${winnerIndex + 1} về nhất. Bạn thua!`, -carBet);
        }
        return;
      }
      
      carRef.current.req = requestAnimationFrame(tick);
    };
    carRef.current.req = requestAnimationFrame(tick);
  };

  // ----------------------------------------------------
  // VÉ SỐ CÀO (SCRATCH CARD)
  // ----------------------------------------------------
  const playScratch = () => {
    if (money < scratchBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-scratchBet, scratchBet, 0);
    setScratchState('scratching'); setScratchMsg('');
    setScratchGrid(Array(9).fill('?'));
    
    setTimeout(() => {
       const symbols = ['💰', '💎', '🍒', '🔔', '🍀', '💩'];
       const grid = Array(9).fill('').map(() => symbols[Math.floor(Math.random() * symbols.length)]);
       
       // Force a win sometimes based on RNG to keep it exciting (or fully random)
       // Standard 9 symbols. If 3 match anywhere, win. Wait, scratch cards usually need 3 of the SAME symbol.
       const counts: Record<string, number> = {};
       for (const s of grid) {
          counts[s] = (counts[s] || 0) + 1;
       }
       
       let winningSymbol = null;
       for (const s in counts) {
          if (counts[s] >= 3 && s !== '💩') {
             winningSymbol = s;
             break;
          }
       }
       
       setScratchGrid(grid);
       setScratchState('result');
       
       if (winningSymbol) {
         let mult = 2;
         if (winningSymbol === '💰') mult = 5;
         if (winningSymbol === '💎') mult = 20;
         if (winningSymbol === '🍀') mult = 10;
         
         const prize = scratchBet * mult;
         updateMoney(prize, 0, prize);
         triggerWinEffect();
         setScratchMsg(`Trúng 3 ${winningSymbol}! (x${mult}) +${prize.toLocaleString()}`);
         addHistory('scratch', `Cào trúng 3 ${winningSymbol} (x${mult}). +${prize.toLocaleString()}`, prize - scratchBet);
       } else {
         setScratchMsg('Chúc bạn may mắn lần sau!');
         addHistory('scratch', `Vé trượt. -${scratchBet.toLocaleString()}`, -scratchBet);
       }
    }, 1500);
  };

  // ----------------------------------------------------
  // BÀI CÀO 3 LÁ
  // ----------------------------------------------------
  const playBaicao = () => {
    if (money < bcBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-bcBet, bcBet, 0);
    setBcState('dealing'); setBcMsg('');
    const d = buildDeck();
    
    setTimeout(() => {
      const ph = [d.pop()!, d.pop()!, d.pop()!];
      const bh = [d.pop()!, d.pop()!, d.pop()!];
      setBcPlayerHand(ph);
      setBcBotHand(bh);
      
      const getScore = (hand: Card[]) => {
        let faceCount = 0;
        let sum = 0;
        for (let c of hand) {
          if (['J','Q','K'].includes(c.rank)) {
            faceCount++;
            sum += 10;
          } else if (c.rank === 'A') {
            sum += 1;
          } else {
            sum += parseInt(c.rank);
          }
        }
        if (faceCount === 3) return { type: 'ba tiên', pts: 99 };
        return { type: `${sum % 10} điểm`, pts: sum % 10 };
      };

      setTimeout(() => {
        setBcState('result');
        const pScore = getScore(ph);
        const bScore = getScore(bh);
        
        let won = false; let isTie = false;
        
        if (pScore.pts > bScore.pts) {
           won = true;
        } else if (pScore.pts === bScore.pts) {
           isTie = true;
        }
        
        if (won) {
          const prize = bcBet * 2;
          updateMoney(prize, 0, prize);
          triggerWinEffect();
          setBcMsg(`Thắng! (${pScore.type})`);
          addHistory('baicao', `${pScore.type} thắng ${bScore.type}. +${prize.toLocaleString()}`, prize - bcBet);
        } else if (isTie) {
          updateMoney(bcBet, 0, 0);
          setBcMsg(`Hòa (${pScore.type})`);
          addHistory('baicao', `Hòa (${pScore.type})`, 0);
        } else {
          setBcMsg(`Thua! Bot có ${bScore.type}`);
          addHistory('baicao', `${pScore.type} thua ${bScore.type}. -${bcBet.toLocaleString()}`, -bcBet);
        }
      }, 1500);
    }, 500);
  };

  // ----------------------------------------------------
  // ĐÁ GÀ
  // ----------------------------------------------------
  const playDaga = () => {
    if (!dagaChoice) return addHistory('daga', 'Vui lòng chọn cửa!', 0);
    if (money < dagaBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-dagaBet, dagaBet, 0);
    setDagaState('fighting'); setDagaMsg('');
    setDagaHp([100, 100]);
    dagaRef.current.hp = [100, 100];

    const tick = () => {
      let [meronHp, walaHp] = dagaRef.current.hp;
      
      const [meron, wala] = dagaRoosters;
      const meronAtk = meron.atk + meron.form;
      const walaAtk = wala.atk + wala.form;
      const meronDef = meron.def + meron.form;
      const walaDef = wala.def + wala.form;
      
      // Wala hits Meron
      if (Math.random() > (meronDef/200)) meronHp -= Math.random() * (walaAtk/5);
      // Meron hits Wala
      if (Math.random() > (walaDef/200)) walaHp -= Math.random() * (meronAtk/5);
      
      if (meronHp < 0) meronHp = 0;
      if (walaHp < 0) walaHp = 0;

      dagaRef.current.hp = [meronHp, walaHp];
      setDagaHp([...dagaRef.current.hp]);

      if (meronHp === 0 || walaHp === 0) {
        setDagaState('result');
        let won = false; let multiplier = 0; let resultText = '';
        
        if (meronHp === 0 && walaHp === 0) {
          resultText = 'HÒA (BDD)';
          if (dagaChoice === 'tie') { won = true; multiplier = 9; }
        } else if (walaHp === 0) {
          resultText = 'MERON (ĐỎ) THẮNG';
          if (dagaChoice === 'meron') { won = true; multiplier = 1.95; }
        } else {
          resultText = 'WALA (XANH) THẮNG';
          if (dagaChoice === 'wala') { won = true; multiplier = 2; }
        }

        if (won) {
          const prize = Math.floor(dagaBet * multiplier);
          updateMoney(prize, 0, prize);
          triggerWinEffect();
          setDagaMsg(`Thắng: ${prize.toLocaleString()}`);
          addHistory('daga', `${resultText}. Thắng ${prize.toLocaleString()}`, prize - dagaBet);
        } else if (meronHp === 0 && walaHp === 0 && dagaChoice !== 'tie') {
           updateMoney(dagaBet, 0, 0);
           setDagaMsg('Hòa (Hoàn tiền)');
           addHistory('daga', 'Hòa (Hoàn tiền)', 0);
        } else {
          setDagaMsg('Bạn đã thua');
          addHistory('daga', `${resultText}. Thua ${dagaBet.toLocaleString()}`, -dagaBet);
        }
        return;
      }
      
      setTimeout(() => {
        dagaRef.current.req = requestAnimationFrame(tick);
      }, 150);
    };
    dagaRef.current.req = requestAnimationFrame(tick);
  };

  // ----------------------------------------------------
  // BACCARAT
  // ----------------------------------------------------
  const playBaccarat = () => {
    if (!bacChoice) return addHistory('baccarat', 'Vui lòng chọn cửa!', 0);
    if (money < bacBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-bacBet, bacBet, 0);
    setBacState('dealing'); setBacMsg('');
    const d = buildDeck();
    
    const ph = [d.pop()!, d.pop()!];
    const bh = [d.pop()!, d.pop()!];
    
    setBacPlayerHand(ph); setBacBankerHand(bh);

    const calcB = (hand: Card[]) => {
      let sum = 0;
      for (let c of hand) {
        if (['10','J','Q','K'].includes(c.rank)) sum += 0;
        else if (c.rank === 'A') sum += 1;
        else sum += parseInt(c.rank);
      }
      return sum % 10;
    };

    setTimeout(() => {
      let pScore = calcB(ph);
      let bScore = calcB(bh);
      
      if (pScore < 8 && bScore < 8) {
        if (pScore <= 5) ph.push(d.pop()!);
        if (bScore <= 5) bh.push(d.pop()!);
      }
      
      setBacPlayerHand([...ph]);
      setBacBankerHand([...bh]);
      
      pScore = calcB(ph);
      bScore = calcB(bh);
      
      setTimeout(() => {
        setBacState('result');
        let won = false; let multiplier = 0; let resultText = '';
        
        const isTie = pScore === bScore;
        const isPlayer = pScore > bScore;
        const isBanker = bScore > pScore;
        
        if (isTie) {
           resultText = 'HÒA';
           if (bacChoice === 'tie') { won = true; multiplier = 9; }
           else { won = false; multiplier = 1; }
        } else if (isPlayer) {
           resultText = 'PLAYER THẮNG';
           if (bacChoice === 'player') { won = true; multiplier = 2; }
        } else {
           resultText = 'BANKER THẮNG';
           if (bacChoice === 'banker') { won = true; multiplier = 1.95; }
        }
        
        if (won) {
          const prize = Math.floor(bacBet * multiplier);
          updateMoney(prize, 0, prize);
          triggerWinEffect();
          setBacMsg(`Thắng: ${prize.toLocaleString()}`);
          addHistory('baccarat', `Kết quả: ${resultText}. Thắng ${prize.toLocaleString()}`, prize - bacBet);
        } else if (isTie && bacChoice !== 'tie') {
          updateMoney(bacBet, 0, 0);
          setBacMsg('Hòa (Hoàn tiền)');
          addHistory('baccarat', 'Hòa (Hoàn tiền)', 0);
        } else {
          setBacMsg('Bạn đã thua');
          addHistory('baccarat', `Kết quả: ${resultText}. Thua ${bacBet.toLocaleString()}`, -bacBet);
        }
      }, 1000);
    }, 1000);
  };
  
  // ----------------------------------------------------
  // HORSE RACING
  // ----------------------------------------------------
  const playHorseRacing = () => {
    if (horseChoice === null) return addHistory('horseracing', 'Vui lòng chọn ngựa!', 0);
    if (money < horseBet) return addHistory(activeGame, 'Số dư không đủ!', 0);

    updateMoney(-horseBet, horseBet, 0);
    setHorseState('racing'); setHorseWinner(null);
    setHorseProgress([0,0,0,0,0]);
    horseRef.current.progresses = [0,0,0,0,0];

    const tick = () => {
      let isDone = false;
      const newProgs = horseRef.current.progresses.map((p, i) => {
         const horse = horseList[i];
         const totalStat = horse.speed + horse.endurance + horse.form;
         let move = (totalStat / 200) * 0.5 + Math.random() * 0.4; 
         if (Math.random() > (0.98 - horse.speed/1000)) move += 0.5; // Stride boost
         if (p > 70 && Math.random() < horse.endurance/200) move += 0.3; // Endurance sprint
         const np = p + move;
         if (np >= 100) isDone = true;
         return np >= 100 ? 100 : np;
      });
      horseRef.current.progresses = newProgs;
      setHorseProgress(newProgs);

      if (isDone) {
        const winnerIndex = newProgs.findIndex(p => p >= 100);
        setHorseState('result');
        setHorseWinner(winnerIndex);
        
        if (winnerIndex === horseChoice) {
           const prize = Math.floor(horseBet * 4.5);
           updateMoney(prize, 0, prize);
           triggerWinEffect();
           addHistory('horseracing', `Ngựa số ${winnerIndex + 1} về nhất! Thắng ${prize.toLocaleString()}`, prize - horseBet);
        } else {
           addHistory('horseracing', `Ngựa số ${winnerIndex + 1} về nhất. Bạn thua!`, -horseBet);
        }
        return;
      }
      
      horseRef.current.req = requestAnimationFrame(tick);
    };
    horseRef.current.req = requestAnimationFrame(tick);
  };

  const handleLoan = (amount: number) => {
    const debtIncrease = amount * 1.2;
    updateMoney(amount, 0, 0, debt + debtIncrease);
    addHistory('bank', `Vay ${amount.toLocaleString()} thành công`, amount);
    triggerJackpotEffect();
  };

  const handleRepay = () => {
    if (debt <= 0) return addHistory('bank', 'Bạn không có nợ!', 0);
    if (money <= 0) return addHistory('bank', 'Không có tiền để trả!', 0);
    
    const payAmount = Math.min(money, debt);
    updateMoney(-payAmount, 0, 0, debt - payAmount);
    addHistory('bank', `Đã trả ${payAmount.toLocaleString()} nợ`, -payAmount);
  };

  // ----------------------------------------------------
  // RENDERERS
  // ----------------------------------------------------

  const renderGameLayout = (content: React.ReactNode, bottomBar: React.ReactNode, gameId: string) => (
    <div className="flex flex-col h-full">
      <div className={`h-10 shrink-0 flex items-center justify-between px-4 text-xs font-bold border-b shadow-sm ${isDark ? 'bg-slate-900/50 text-slate-300 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        <div></div>
        <div className="text-green-600 dark:text-green-400 font-black text-sm tracking-wide break-all flex items-center justify-end gap-1.5 truncate">
          <Banknote size={16} className="text-green-500 drop-shadow-sm" /> {formatMoney(money)}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2 pb-2">
        <div className="shrink-0 flex flex-col gap-2 w-full">
          {content}
        </div>
        {/* Match History */}
        
          <div className="mt-auto pt-2 shrink-0 w-full">
            <div className="text-xs font-bold opacity-50 uppercase tracking-widest mb-3 flex items-center gap-2">
              LỊCH SỬ ĐẤU
              <div className="h-px bg-current flex-1 opacity-20"></div>
            </div>
            {matchHistory.filter(h => h.game === gameId).length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {matchHistory.filter(h => h.game === gameId).slice(-15).reverse().map((h, i) => (
                  <div key={i} className={`text-xs p-2 rounded-lg flex justify-between items-center gap-2 ${isDark ? 'bg-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="opacity-60">{h.time}</div>
                    <div className="font-bold flex-1">{h.message}</div>
                    <div className={`font-black flex items-center gap-1 ${h.profit > 0 ? 'text-green-500' : h.profit < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                      {h.profit > 0 ? '+' : ''}{h.profit !== 0 ? h.profit.toLocaleString() : ''}
                      {h.profit !== 0 && <Banknote size={12} className="text-green-500" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs opacity-50 italic py-4">Chưa có lịch sử đấu.</div>
            )}
          </div>
        
      </div>
      <div className={`shrink-0 p-4 border-t ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
        {bottomBar}
      </div>
    </div>
  );

  
  const renderPrizeStructure = (prizes: { label: string, mult: string, color?: string }[], type: 'fixed' | 'random' | 'dynamic' = 'fixed') => (
    <div className={`mt-1 p-2 rounded-lg border text-[10px] ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={14} className="text-amber-500" />
        <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
          {type === 'fixed' ? 'Tỉ lệ trả thưởng' : type === 'dynamic' ? 'Lợi nhuận biến động' : 'Cơ cấu giải thưởng ngẫu nhiên'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {prizes.map((p, i) => (
          <div key={i} className={`flex justify-between items-center p-2 rounded-lg text-xs font-bold ${isDark ? 'bg-black/20' : 'bg-white shadow-sm'} ${p.color || ''}`}>
            <span className="opacity-80 truncate pr-2">{p.label}</span>
            <span className="text-green-500 shrink-0">{p.mult}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBetTiers = (current: number, setter: (v: number) => void, disabled: boolean, customTiers: number[] = betTiers) => (
    <div className="space-y-2 mb-4">
      <div className="text-xs font-bold opacity-70 flex items-center gap-1">MỨC CƯỢC: <Banknote size={14} className="text-green-500 drop-shadow-sm" /> {formatMoney(current)}</div>
      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 scroll-smooth">
        {customTiers.map(t => (
          <button
            key={t}
            onClick={() => setter(t)}
            disabled={disabled}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${current === t ? 'bg-indigo-600 text-white shadow-md' : (isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200')}`}
          >
            {formatMoney(t)}
          </button>
        ))}
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-4 gap-4 pb-20">
      
      {/* Header Balance & VIP */}
      <div className={`shrink-0 py-3 px-4 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden ${isVIP ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white border border-yellow-300' : (isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white')}`}>
        <div className="flex items-center gap-2 relative z-10">
          <Banknote size={20} className={isVIP ? "text-yellow-100 drop-shadow-sm" : "text-green-300 drop-shadow-sm"} />
          <span className="text-lg font-black tracking-tight drop-shadow-sm">{formatMoney(money)}</span>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {debt > 0 && (
            <div className="text-xs font-bold bg-red-500/80 text-white px-2 py-0.5 rounded-md border border-red-500/30 flex items-center gap-1">
              NỢ: {formatMoney(debt)}
            </div>
          )}
          {isVIP && (
             <span className="bg-yellow-800/80 text-yellow-100 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-yellow-400/30">VIP</span>
          )}
        </div>
        {isVIP && <Crown className="absolute top-1/2 -translate-y-1/2 right-4 text-yellow-100 opacity-20 w-12 h-12 pointer-events-none" />}
      </div>
      
      

      <div className="space-y-3">
        <div className="text-sm font-bold opacity-50 uppercase tracking-widest pl-2 mt-2">SẢNH TRÒ CHƠI</div>
        
        <button onClick={() => setActiveGame('sicbo')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-inner"><Dices size={20} /></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Tài Xỉu Pro</div><div className="text-xs opacity-60 mt-0.5">Cược Bão, Cược Tổng x50!</div></div>
        </button>

        <button onClick={() => setActiveGame('slots')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-inner"><RotateCcw size={28} /></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Slot 3x3</div><div className="text-xs opacity-60 mt-0.5">5 đường trúng thưởng. Jackpot x50!</div></div>
        </button>

        <button onClick={() => setActiveGame('blackjack')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-slate-700 to-black flex items-center justify-center text-white shadow-inner font-black text-2xl">21</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Xì Dách (Blackjack)</div><div className="text-xs opacity-60 mt-0.5">Đấu trí với Nhà Cái.</div></div>
        </button>

        <button onClick={() => setActiveGame('roulette')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-inner"><Target size={20} /></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Roulette</div><div className="text-xs opacity-60 mt-0.5">Vòng quay tài lộc. Đoán trúng số x36!</div></div>
        </button>

        <button onClick={() => setActiveGame('baucua')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-inner text-xl">🦀</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Bầu Cua</div><div className="text-xs opacity-60 mt-0.5">Cược nhiều cửa, giải trí nhẹ nhàng.</div></div>
        </button>

        <button onClick={() => setActiveGame('xocdia')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-inner"><Circle size={20} className="fill-white/20" /></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Xóc Đĩa</div><div className="text-xs opacity-60 mt-0.5">Tứ tử trình làng. Cược vị x15!</div></div>
        </button>

        <button onClick={() => setActiveGame('crash')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-inner"><Rocket size={20} /></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Crash (Tên Lửa)</div><div className="text-xs opacity-60 mt-0.5">Chốt lời trước khi tên lửa nổ!</div></div>
        </button>

<button onClick={() => setActiveGame('baccarat')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-white shadow-inner font-black text-2xl"><Gem size={20} /></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Baccarat</div><div className="text-xs opacity-60 mt-0.5">Sòng bài quý tộc. Hòa 1 ăn 8!</div></div>
        </button>

        <button onClick={() => setActiveGame('horseracing')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white shadow-inner font-black text-xl">🐎</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Đua Ngựa Ảo</div><div className="text-xs opacity-60 mt-0.5">Cược ngựa đua. 1 ăn 3.5!</div></div>
        </button>

                <button onClick={() => setActiveGame('dragontiger')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center text-white shadow-inner font-black text-xl">DT</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Rồng Hổ</div><div className="text-xs opacity-60 mt-0.5">Sát phạt cực mạnh. Đấu 1 lá bài!</div></div>
        </button>

        <button onClick={() => setActiveGame('daga')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-inner font-black text-xl">🐓</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Đá Gà Ảo</div><div className="text-xs opacity-60 mt-0.5">Sới gà quốc tế. Cáp kèo Meron/Wala!</div></div>
        </button>

                <button onClick={() => setActiveGame('football')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center text-white shadow-inner font-black text-2xl"><Trophy size={20} /></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Bóng Đá Ảo</div><div className="text-xs opacity-60 mt-0.5">Bet banh 90 phút ảo. Thắng bại tại kỹ năng!</div></div>
        </button>

        <button onClick={() => setActiveGame('baicao')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-white shadow-inner font-black text-xl">🎴</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Bài Cào 3 Lá</div><div className="text-xs opacity-60 mt-0.5">Truyền thống ngày Tết. Solo với máy!</div></div>
        </button>

                <button onClick={() => setActiveGame('dothach')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-slate-600 to-slate-900 flex items-center justify-center text-white shadow-inner font-black text-xl">🪨</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Đổ Thạch</div><div className="text-xs opacity-60 mt-0.5">Mua đá cắt ngọc. Giàu sau một đêm!</div></div>
        </button>

        <button onClick={() => setActiveGame('carracing')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-white shadow-inner font-black text-xl">🏎️</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Đua Xe F1</div><div className="text-xs opacity-60 mt-0.5">Tốc độ cao. Cược siêu xe vô địch!</div></div>
        </button>

        <button onClick={() => setActiveGame('scratch')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-inner font-black text-xl">🎟️</div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Vé Số Cào</div><div className="text-xs opacity-60 mt-0.5">Cào 9 ô, trúng 3 ô nhận thưởng lớn!</div></div>
        </button>

                <button onClick={() => setActiveGame('stockmarket')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-slate-200 hover:shadow-md'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-900 flex items-center justify-center text-white shadow-inner font-black text-2xl"><TrendingUp size={28}/></div>
          <div className="flex-1 text-left"><div className="font-bold text-base">Chứng Khoán (BO)</div><div className="text-xs opacity-60 mt-0.5">Dự đoán nến lên xuống. Tiền vào như nước!</div></div>
        </button>

        <div className="text-sm font-bold opacity-50 uppercase tracking-widest pl-2 mt-6">DỊCH VỤ TÀI CHÍNH (ROLEPLAY)</div>
        <button onClick={() => setActiveGame('bank')} className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02] shadow-sm border border-red-500/30 ${isDark ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-red-50 hover:bg-red-100'}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center text-white shadow-inner"><Skull size={28} /></div>
          <div className="flex-1 text-left text-red-600 dark:text-red-400"><div className="font-bold text-base">Tín Dụng Đen</div><div className="text-sm opacity-80">Vay nóng chủ sòng. Lãi 20%. Cẩn thận!</div></div>
        </button>
      </div>

      {/* Thống kê (Stats) */}
      <div className={`shrink-0 p-5 rounded-3xl shadow-sm border mt-4 ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-indigo-500" />
          <h3 className="font-black text-lg">THỐNG KÊ</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="text-xs font-bold opacity-60 uppercase mb-1">Tổng Cược</div>
            <div className="font-bold text-lg">{formatMoney(casinoStats.totalBet)}</div>
          </div>
          <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="text-xs font-bold opacity-60 uppercase mb-1">Lãi / Lỗ</div>
            <div className={`font-bold text-lg flex items-center gap-1 ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {formatMoney(Math.abs(netProfit))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSicbo = () =>
    renderGameLayout(
        <>
          <div className={`h-28 w-full max-w-sm mx-auto rounded-2xl flex flex-col items-center justify-center relative shadow-inner ${isDark ? 'bg-black/50 border border-white/10' : 'bg-slate-200 border-4 border-slate-300'}`}>
            {sicboRolling ? (
              <motion.div animate={{ rotate: [0, 10, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 0.3 }}><Dices size={64} className="text-red-500 animate-bounce" /></motion.div>
            ) : sicboResult ? (
              <div className="flex gap-2">
                {sicboResult.map((dice, i) => (
                  <motion.div key={i} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="w-16 h-16 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center text-3xl font-black text-black">{dice}</motion.div>
                ))}
              </div>
            ) : (<div className="opacity-50"><Dices size={48} className="mx-auto mb-2" /><p className="font-bold text-sm">CHỜ ĐẶT CƯỢC</p></div>)}
          </div>
          
          {sicboResult && !sicboRolling && (
            <div className="text-center font-black text-3xl drop-shadow-md text-amber-500">
              {sicboResult.reduce((a, b) => a + b, 0)} ĐIỂM
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => setSicboChoice('tai')} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${sicboChoice === 'tai' ? 'border-red-500 bg-red-500 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
              <span className="text-lg">TÀI (11-17)</span> <span className="text-xs font-normal opacity-80">1 ăn 2</span>
            </button>
            <button onClick={() => setSicboChoice('xiu')} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${sicboChoice === 'xiu' ? 'border-blue-500 bg-blue-500 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
              <span className="text-lg">XỈU (4-10)</span> <span className="text-xs font-normal opacity-80">1 ăn 2</span>
            </button>
            <button onClick={() => setSicboChoice('bao')} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center col-span-2 ${sicboChoice === 'bao' ? 'border-amber-500 bg-amber-500 text-white' : isDark ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-amber-200 bg-amber-50 text-amber-600'}`}>
              <span className="text-lg">BÃO (3 mặt giống nhau)</span> <span className="text-xs font-normal opacity-80">1 ăn 30</span>
            </button>
            <button onClick={() => setSicboChoice('sum4')} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${sicboChoice === 'sum4' ? 'border-purple-500 bg-purple-500 text-white' : isDark ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-purple-200 bg-purple-50 text-purple-600'}`}>
              <span className="text-lg">TỔNG 4</span> <span className="text-xs font-normal opacity-80">1 ăn 50</span>
            </button>
            <button onClick={() => setSicboChoice('sum17')} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${sicboChoice === 'sum17' ? 'border-purple-500 bg-purple-500 text-white' : isDark ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-purple-200 bg-purple-50 text-purple-600'}`}>
              <span className="text-base">TỔNG 17</span> <span className="text-xs font-normal opacity-80">1 ăn 50</span>
            </button>
          </div>
        {renderPrizeStructure([{label: 'Tài / Xỉu / Chẵn / Lẻ', mult: 'x1.98'}, {label: 'Bão (3 viên giống nhau)', mult: 'x30'}], 'fixed')}
      </>
      , 
        <>
          {renderBetTiers(sicboBet, setSicboBet, sicboRolling)}
          <button onClick={playSicbo} disabled={sicboRolling || !sicboChoice} className="w-full p-3 bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">LẮC XÚC XẮC</button>
        </>,
        'sicbo'
  );

  const renderSlots = () =>
    renderGameLayout(
        <>
          <div className={`p-4 md:p-6 rounded-3xl shadow-2xl mx-auto max-w-sm w-full relative border-8 ${isDark ? 'bg-slate-900 border-slate-950' : 'bg-slate-700 border-slate-800'}`}>
            {/* Slot Display */}
            <div className="bg-slate-950 p-1 rounded-xl grid grid-rows-3 gap-1">
              {(slotsResult || Array(3).fill(Array(3).fill('❓'))).map((row, rI) => (
                <div key={rI} className="grid grid-cols-3 gap-2">
                  {row.map((sym: string, cI: number) => (
                    <div key={cI} className={`aspect-square bg-slate-50 rounded-lg flex items-center justify-center text-4xl md:text-5xl shadow-inner shadow-slate-400 ${slotsRolling ? 'animate-pulse blur-[1px]' : ''}`}>
                      <span className="drop-shadow-md">{sym}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* Machine Decorative Lights */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-3">
               {[1,2,3,4,5].map(i => <div key={i} className={`w-2 h-2 rounded-full ${slotsRolling ? 'bg-red-500 animate-ping' : 'bg-red-900'}`} />)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-center text-sm font-bold max-w-sm mx-auto w-full">
            <div className={`p-3 rounded-xl flex flex-col justify-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm border border-slate-100'}`}>Trúng 1 hàng <span className="text-green-500 text-lg">x5</span></div>
            <div className={`p-3 rounded-xl flex flex-col justify-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm border border-slate-100'}`}>Hàng số 7️⃣ <span className="text-amber-500 text-lg">x20</span></div>
            <div className={`p-3 rounded-xl col-span-2 flex flex-col justify-center ${isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
              <span className="text-xs opacity-70 uppercase tracking-widest mb-1">Siêu Jackpot</span>
              <span className="text-lg">Hàng Kim Cương 💎 <span className="font-black text-2xl ml-1">x50</span></span>
            </div>
          </div>
        {renderPrizeStructure([{label: 'Trái cây', mult: 'x5'}, {label: 'Đá quý', mult: 'x20'}, {label: 'Jackpot 777', mult: 'x50 + Hũ', color: 'text-yellow-500'}], 'fixed')}
      </>
      , 
        <>
          {renderBetTiers(slotsBet, setSlotsBet, slotsRolling)}
          <button onClick={playSlots} disabled={slotsRolling} className="w-full p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">QUAY MÁY XÈNG</button>
        </>,
        'slots'
  );

  const renderBlackjack = () =>
    renderGameLayout(
        <>
          <div className={`flex-1 rounded-3xl p-6 flex flex-col justify-between relative shadow-inner min-h-[350px] ${isDark ? 'bg-emerald-950 border border-white/10' : 'bg-emerald-800 border-4 border-emerald-900'}`}>
            
            {/* Dealer Area */}
            <div>
              <div className="text-emerald-300/80 text-xs font-bold tracking-widest text-center mb-4">NHÀ CÁI {bjState === 'gameOver' && `(${calcHand(bjDealerHand)})`}</div>
              <div className="flex justify-center gap-2">
                {bjDealerHand.map((c, i) => {
                  if (i === 1 && bjState === 'playerTurn') return (
                    <div key={i} className="w-16 h-24 rounded-lg bg-white p-1 shadow-xl border-2 border-emerald-300">
                      <div className="w-full h-full bg-blue-900 rounded bg-[url('https://www.transparenttextures.com/patterns/argyle.png')] opacity-70"></div>
                    </div>
                  );
                  return (
                    <div key={i} className={`w-16 h-24 rounded-lg bg-white p-1 shadow-xl border border-slate-200 flex flex-col justify-between ${c.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                      <div className="text-base font-bold leading-none">{c.rank}</div>
                      <div className="text-3xl text-center leading-none">{c.suit}</div>
                      <div className="text-base font-bold leading-none text-right rotate-180">{c.rank}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {bjResultMsg && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-amber-400 font-black text-xl px-6 py-3 rounded-2xl whitespace-nowrap border-2 border-amber-500 shadow-2xl z-10 text-center">
                {bjResultMsg}
              </motion.div>
            )}

            {/* Player Area */}
            <div className="mt-8">
              <div className="text-emerald-300/80 text-xs font-bold tracking-widest text-center mb-4">BẠN {bjPlayerHand.length > 0 && `(${calcHand(bjPlayerHand)})`}</div>
              <div className="flex justify-center gap-2 flex-wrap">
                {bjPlayerHand.map((c, i) => (
                  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={i} className={`w-16 h-24 rounded-lg bg-white p-1 shadow-xl border border-slate-200 flex flex-col justify-between ${c.color === 'red' ? 'text-red-600' : 'text-black'}`}>
                    <div className="text-base font-bold leading-none">{c.rank}</div>
                    <div className="text-3xl text-center leading-none">{c.suit}</div>
                    <div className="text-base font-bold leading-none text-right rotate-180">{c.rank}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        {renderPrizeStructure([{label: 'Thắng cược', mult: 'x2'}, {label: 'Hòa cược', mult: 'Hoàn 100%'}, {label: 'Blackjack (Xì Dách)', mult: 'x2.5', color: 'text-yellow-500'}], 'fixed')}
      </>
      , 
        <>
          {bjState === 'bet' || bjState === 'gameOver' ? (
            <>
              {renderBetTiers(bjBet, setBjBet, false, highTiers)}
              <button onClick={playBlackjack} className="w-full p-3 bg-slate-900 dark:bg-slate-700 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">CHIA BÀI MỚI</button>
            </>
          ) : (
            <div className="flex gap-2">
              <button onClick={bjHit} disabled={bjState !== 'playerTurn'} className="flex-1 p-3 bg-blue-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">RÚT (HIT)</button>
              <button onClick={bjStand} disabled={bjState !== 'playerTurn'} className="flex-1 p-4 bg-amber-600 text-white font-black text-xl rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">DỪNG (STAND)</button>
            </div>
          )}
        </>,
        'blackjack'
  );

  const renderRoulette = () =>
    renderGameLayout(
        <>
          <div className={`w-40 h-40 max-w-[160px] mx-auto rounded-full flex items-center justify-center relative shadow-inner ${isDark ? 'bg-slate-900 border-[12px] border-slate-800' : 'bg-slate-800 border-[12px] border-slate-900'}`}>
            {rouletteRolling ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                <Target size={80} className="text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              </motion.div>
            ) : rouletteResult !== null ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white border-8 border-white/20 shadow-2xl ${rouletteResult === 0 ? 'bg-green-600' : ([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(rouletteResult) ? 'bg-red-600' : 'bg-slate-900')}`}>
                {rouletteResult}
              </motion.div>
            ) : (
              <div className="text-white/40 font-bold text-center">
                <Target size={64} className="mx-auto mb-2 opacity-30" />
                <div className="text-sm tracking-widest">CHỜ QUAY</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => {setRouletteChoice('red'); setRouletteExactNum('');}} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${rouletteChoice === 'red' ? 'border-red-500 bg-red-600 text-white shadow-lg' : isDark ? 'border-red-900/50 bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600 border-red-200'}`}>
              <span className="text-sm">MÀU ĐỎ</span> <span className="text-xs font-normal opacity-80">1 ăn 2</span>
            </button>
            <button onClick={() => {setRouletteChoice('black'); setRouletteExactNum('');}} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${rouletteChoice === 'black' ? 'border-slate-500 bg-slate-800 text-white shadow-lg' : isDark ? 'border-slate-700 bg-slate-800/50 text-slate-300' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
              <span className="text-lg">MÀU ĐEN</span> <span className="text-xs font-normal opacity-80">1 ăn 2</span>
            </button>
            <button onClick={() => {setRouletteChoice('even'); setRouletteExactNum('');}} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${rouletteChoice === 'even' ? 'border-blue-500 bg-blue-600 text-white shadow-lg' : isDark ? 'border-blue-900/50 bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
              <span className="text-sm">SỐ CHẴN</span> <span className="text-xs font-normal opacity-80">1 ăn 2</span>
            </button>
            <button onClick={() => {setRouletteChoice('odd'); setRouletteExactNum('');}} className={`p-2 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${rouletteChoice === 'odd' ? 'border-blue-500 bg-blue-600 text-white shadow-lg' : isDark ? 'border-blue-900/50 bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
              <span className="text-lg">SỐ LẺ</span> <span className="text-xs font-normal opacity-80">1 ăn 2</span>
            </button>
          </div>
          
          <div className={`p-2 rounded-xl border-2 flex items-center gap-2 mt-2 transition-all ${rouletteChoice === 'exact' ? 'border-amber-500 bg-amber-500/10 shadow-lg' : (isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50')}`}>
            <div className="font-bold flex-1">
              <div className="text-sm">CƯỢC ĐÚNG SỐ</div>
              <div className="text-xs font-normal opacity-70">Tỷ lệ trả thưởng siêu cao: 1 ăn 36</div>
            </div>
            <input 
              type="number" min="0" max="36" 
              placeholder="0-36"
              value={rouletteExactNum}
              onChange={(e) => { setRouletteExactNum(e.target.value); setRouletteChoice('exact'); }}
              className={`w-20 p-2 rounded-xl font-black text-lg text-center outline-none border-2 focus:border-amber-500 transition-colors ${isDark ? 'bg-black/50 text-amber-400 border-white/10' : 'bg-white text-slate-900 border-slate-300'}`} />
          </div>
        {renderPrizeStructure([{label: 'Đỏ/Đen/Chẵn/Lẻ/1-18/19-36', mult: 'x2'}, {label: 'Cược chuẩn 1 số', mult: 'x35'}], 'fixed')}
      </>
      , 
        <>
          {renderBetTiers(rouletteBet, setRouletteBet, rouletteRolling, highTiers)}
          <button onClick={playRoulette} disabled={rouletteRolling || !rouletteChoice} className="w-full p-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">QUAY VÒNG QUAY</button>
        </>,
        'roulette'
  );

  const renderBaucua = () =>
    renderGameLayout(
        <>
          <div className={`h-20 rounded-2xl flex items-center justify-center gap-4 relative shadow-inner ${isDark ? 'bg-slate-800 border border-white/10' : 'bg-slate-200 border-4 border-slate-300'}`}>
            {baucuaRolling ? (
               <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }} className="text-center text-4xl">🎲</motion.div>
            ) : baucuaResult ? (
              baucuaResult.map((resId, i) => {
                const sym = BAU_CUA_SYMBOLS.find(s => s.id === resId);
                return (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-xl border-2 border-slate-200">
                    <span className="drop-shadow-sm">{sym?.emoji}</span>
                  </motion.div>
                )
              })
            ) : (
              <div className="opacity-50 text-center font-bold">
                <Dices size={48} className="mx-auto mb-2 opacity-50" />
                <div>LẮC ĐỂ XEM KẾT QUẢ</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-2">
            {BAU_CUA_SYMBOLS.map((sym) => {
              const betAmount = baucuaBets[sym.id] || 0;
              return (
                <button
                  key={sym.id}
                  onClick={() => {
                     if (baucuaRolling) return;
                     const totalCurrentBets = Object.values(baucuaBets).reduce((a, b) => a + b, 0);
                     if (money - totalCurrentBets < baucuaSelectedBetAmount) return addHistory(activeGame, 'Số dư không đủ!', 0);
                     setBaucuaBets({ ...baucuaBets, [sym.id]: betAmount + baucuaSelectedBetAmount });
                  }}
                  className={`relative p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center min-h-[70px] ${betAmount > 0 ? 'border-green-500 bg-green-500/10 shadow-md' : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="text-3xl mb-1 drop-shadow-md">{sym.emoji}</div>
                  <div className="text-xs font-bold uppercase">{sym.name}</div>
                  <AnimatePresence>
                    {betAmount > 0 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] md:text-xs font-black px-2 md:px-3 py-1 rounded-full shadow-lg border-2 border-white dark:border-slate-900 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                        {formatMoney(betAmount)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </div>
        {renderPrizeStructure([{label: '1 linh vật', mult: 'x2'}, {label: '2 linh vật', mult: 'x3'}, {label: '3 linh vật', mult: 'x4'}], 'fixed')}
        </>
      , 
        <>
          <div className="flex justify-between items-center mb-2">
             <div className="text-xs font-bold opacity-70">CHỌN PHỈNH CƯỢC:</div>
             <button onClick={() => setBaucuaBets({})} disabled={baucuaRolling} className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"><Trash2 size={14} /> Xóa Cược</button>
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3 scroll-smooth">
            {betTiers.map(t => (
              <button
                key={t}
                onClick={() => setBaucuaSelectedBetAmount(t)}
                disabled={baucuaRolling}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${baucuaSelectedBetAmount === t ? 'bg-green-600 text-white shadow-md' : isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}
              >
                {formatMoney(t)}
              </button>
            ))}
          </div>
          <button
            onClick={playBaucua}
            disabled={baucuaRolling || Object.values(baucuaBets).reduce((a, b) => a + b, 0) <= 0}
            className="w-full p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg"
          >
            MỞ BÁT
          </button>
        </>,
        'baucua'
  );

  // ----------------------------------------------------
  // RENDER XÓC ĐĨA
  // ----------------------------------------------------
  const renderXocdia = () =>
    renderGameLayout(
      <>
        <div className={`h-24 w-full max-w-sm mx-auto rounded-[2rem] flex flex-col items-center justify-center relative shadow-inner ${isDark ? 'bg-red-950 border-8 border-red-900' : 'bg-red-800 border-8 border-red-900'}`}>
          {xocdiaRolling ? (
            <motion.div animate={{ x: [-10, 10, -10, 10, 0], y: [-10, 10, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 0.2 }} className="w-32 h-32 rounded-full bg-slate-200 border-4 border-slate-300 shadow-2xl flex items-center justify-center">
              <span className="text-sm font-bold opacity-50">ĐANG XÓC...</span>
            </motion.div>
          ) : xocdiaResult ? (
            <div className="grid grid-cols-2 gap-2 p-6 bg-yellow-900/40 rounded-full w-32 h-32 relative">
              {xocdiaResult.map((isRed, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center border-2 ${isRed ? 'bg-red-600 border-red-700' : 'bg-white border-slate-200'}`}>
                  <div className={`w-6 h-6 rounded-full border ${isRed ? 'border-red-500' : 'border-slate-100'}`}></div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-slate-200 border-4 border-slate-300 shadow-xl flex items-center justify-center flex-col opacity-80">
              <Dices size={32} className="opacity-50 text-slate-500" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => setXocdiaChoice('chan')} className={`p-3 rounded-2xl font-black text-xl border-4 transition-all ${xocdiaChoice === 'chan' ? 'border-amber-500 bg-amber-500 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
            CHẴN <span className="block text-xs font-normal opacity-70">1 ăn 1 (4 Đỏ, 4 Trắng, 2 Đỏ 2 Trắng)</span>
          </button>
          <button onClick={() => setXocdiaChoice('le')} className={`p-3 rounded-2xl font-black text-xl border-4 transition-all ${xocdiaChoice === 'le' ? 'border-blue-500 bg-blue-500 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
            LẺ <span className="block text-xs font-normal opacity-70">1 ăn 1 (3 Đỏ 1 Trắng, 3 Trắng 1 Đỏ)</span>
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mt-2">
          <button onClick={() => setXocdiaChoice('4red')} className={`p-2 rounded-xl text-center border-2 ${xocdiaChoice === '4red' ? 'border-red-500 bg-red-500 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-center gap-0.5 mb-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="text-[10px] font-bold">1 ăn 15</div>
          </button>
          <button onClick={() => setXocdiaChoice('4white')} className={`p-2 rounded-xl text-center border-2 ${xocdiaChoice === '4white' ? 'border-slate-500 bg-slate-500 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
             <div className="flex justify-center gap-0.5 mb-1">
              <div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div><div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div><div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div><div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div>
            </div>
            <div className="text-[10px] font-bold">1 ăn 15</div>
          </button>
          <button onClick={() => setXocdiaChoice('3red')} className={`p-2 rounded-xl text-center border-2 ${xocdiaChoice === '3red' ? 'border-red-400 bg-red-400 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
             <div className="flex justify-center gap-0.5 mb-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-red-500 rounded-full"></div><div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div>
            </div>
            <div className="text-[10px] font-bold">1 ăn 3.5</div>
          </button>
          <button onClick={() => setXocdiaChoice('3white')} className={`p-2 rounded-xl text-center border-2 ${xocdiaChoice === '3white' ? 'border-slate-400 bg-slate-400 text-white' : isDark ? 'border-white/10 bg-white/5' : 'bg-white border-slate-200'}`}>
             <div className="flex justify-center gap-0.5 mb-1">
              <div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div><div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div><div className="w-3 h-3 bg-white border border-slate-300 rounded-full"></div><div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="text-[10px] font-bold">1 ăn 3.5</div>
          </button>
        </div>
        {renderPrizeStructure([{label: 'Chẵn / Lẻ', mult: 'x1.98'}, {label: '4 Đỏ / 4 Trắng', mult: 'x15', color: 'text-red-500'}], 'fixed')}
      </>,
      <>
        {renderBetTiers(xocdiaBet, setXocdiaBet, xocdiaRolling)}
        <button onClick={playXocdia} disabled={xocdiaRolling || !xocdiaChoice} className="w-full p-3 bg-gradient-to-r from-red-700 to-rose-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">XÓC ĐĨA</button>
      </>,
      'xocdia'
    );

  // ----------------------------------------------------
  // RENDER CRASH
  // ----------------------------------------------------
  const renderCrash = () =>
    renderGameLayout(
      <>
        <div className={`h-64 w-full max-w-sm mx-auto rounded-3xl flex flex-col items-center justify-center relative shadow-inner overflow-hidden ${isDark ? 'bg-slate-950 border border-white/10' : 'bg-slate-900 border-4 border-slate-800'}`}>
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
           
           {crashCrashed ? (
             <div className="z-10 text-center animate-shake">
               <div className="text-red-500 font-black text-3xl drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">{crashMultiplier.toFixed(2)}x</div>
               <div className="text-red-500 font-bold tracking-widest mt-2 uppercase">Crashed!</div>
             </div>
           ) : (
             <div className="z-10 text-center">
               <div className={`font-black text-3xl drop-shadow-[0_0_20px_rgba(52,211,153,0.8)] ${crashMultiplier > 2 ? 'text-emerald-400' : 'text-white'}`}>
                 {crashMultiplier.toFixed(2)}x
               </div>
               {crashActive && (
                 <motion.div animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 1 }} className="mt-4">
                   <Rocket size={48} className={`mx-auto ${crashMultiplier > 2 ? 'text-emerald-400' : 'text-slate-300'}`} />
                 </motion.div>
               )}
             </div>
           )}

           {crashCashout && !crashCrashed && (
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-6 bg-green-500 text-white font-black px-6 py-2 rounded-full shadow-lg border-2 border-green-300">
               Chốt lời thành công: {crashCashout.toFixed(2)}x
             </motion.div>
           )}
        </div>
      {renderPrizeStructure([{label: 'Chốt lời sớm', mult: 'Tùy thời điểm'}, {label: 'Tên lửa nổ', mult: 'Mất vốn', color: 'text-red-500'}], 'dynamic')}
      </>,
      <>
        {!crashActive && renderBetTiers(crashBet, setCrashBet, crashActive)}
        {!crashActive ? (
          <button onClick={playCrash} disabled={crashActive} className="w-full p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">KHỞI HÀNH</button>
        ) : (
          <button onClick={cashoutCrash} disabled={crashCrashed} className="w-full p-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2">
            CHỐT LỜI <span className="bg-white/20 px-2 py-0.5 rounded-md text-sm">{(crashBet * crashMultiplier).toLocaleString()}</span>
          </button>
        )}
      </>,
      'crash'
    );

  // ----------------------------------------------------
  // RENDER DRAGON TIGER
  // ----------------------------------------------------
  const renderDragonTiger = () => {
    return renderGameLayout(
      <>
        <div className={`flex-1 rounded-3xl p-4 flex flex-col justify-between relative shadow-inner min-h-[350px] ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-slate-800 border-4 border-slate-900'}`}>
          <div className="flex justify-between w-full h-1/2 gap-4 pb-2">
             {/* Dragon */}
             <div className={`flex-1 rounded-xl p-2 relative flex flex-col items-center justify-center ${isDark ? 'bg-red-900/30 border border-red-500/20' : 'bg-red-600/20 border-2 border-red-400/30'}`}>
               <div className="text-red-400 font-black uppercase text-xl mb-4 drop-shadow-sm flex items-center gap-2"><Flame size={24}/> RỒNG</div>
               {dtDragonCard ? (
                 <motion.div initial={{ scale: 0, rotateY: 180 }} animate={{ scale: 1, rotateY: 0 }} className="w-20 h-28 bg-white rounded-xl shadow-lg border-2 border-slate-200 flex flex-col items-center justify-center relative">
                    <div className={`text-xl font-bold ${dtDragonCard.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{dtDragonCard.rank}</div>
                    <div className={`text-3xl ${dtDragonCard.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{dtDragonCard.suit}</div>
                 </motion.div>
               ) : (
                 <div className="w-20 h-28 border-2 border-dashed border-red-500/30 rounded-xl flex items-center justify-center">
                    <div className="text-red-500/20 font-black text-2xl">?</div>
                 </div>
               )}
             </div>
             
             {/* Tiger */}
             <div className={`flex-1 rounded-xl p-2 relative flex flex-col items-center justify-center ${isDark ? 'bg-blue-900/30 border border-blue-500/20' : 'bg-blue-600/20 border-2 border-blue-400/30'}`}>
               <div className="text-blue-400 font-black uppercase text-xl mb-4 drop-shadow-sm flex items-center gap-2"><Zap size={24}/> HỔ</div>
               {dtTigerCard ? (
                 <motion.div initial={{ scale: 0, rotateY: 180 }} animate={{ scale: 1, rotateY: 0 }} className="w-20 h-28 bg-white rounded-xl shadow-lg border-2 border-slate-200 flex flex-col items-center justify-center relative">
                    <div className={`text-xl font-bold ${dtTigerCard.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{dtTigerCard.rank}</div>
                    <div className={`text-3xl ${dtTigerCard.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{dtTigerCard.suit}</div>
                 </motion.div>
               ) : (
                 <div className="w-20 h-28 border-2 border-dashed border-blue-500/30 rounded-xl flex items-center justify-center">
                    <div className="text-blue-500/20 font-black text-2xl">?</div>
                 </div>
               )}
             </div>
          </div>

          {dtState === 'result' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-amber-400 font-black text-xl px-6 py-3 rounded-2xl whitespace-nowrap border-2 border-amber-500 shadow-2xl z-10 text-center">
              {dtMsg}
            </motion.div>
          )}

          <div className="mt-4">
             <div className="grid grid-cols-3 gap-2">
               <button onClick={() => setDtChoice('dragon')} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${dtChoice === 'dragon' ? 'bg-red-600 border-red-400 text-white' : 'bg-red-900/50 border-red-800 text-red-300'}`}>
                 RỒNG
                 <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 1</span>
               </button>
               <button onClick={() => setDtChoice('tie')} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${dtChoice === 'tie' ? 'bg-green-600 border-green-400 text-white' : 'bg-green-900/50 border-green-800 text-green-300'}`}>
                 HÒA
                 <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 8</span>
               </button>
               <button onClick={() => setDtChoice('tiger')} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${dtChoice === 'tiger' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-blue-900/50 border-blue-800 text-blue-300'}`}>
                 HỔ
                 <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 1</span>
               </button>
             </div>
          </div>
        </div>
      {renderPrizeStructure([{label: 'Dragon / Tiger', mult: 'x2'}, {label: 'Tie (Hòa)', mult: 'x8 (Hoàn 50%)', color: 'text-yellow-500'}], 'fixed')}
      </>,
      <>
        {dtState === 'bet' ? (
          <>
            {renderBetTiers(dtBet, setDtBet, false, highTiers)}
            <button onClick={playDragonTiger} disabled={!dtChoice} className="w-full p-3 bg-gradient-to-r from-red-600 to-blue-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">LẬT BÀI</button>
          </>
        ) : (
          <div className="flex gap-2">
            {dtState === 'result' && <button onClick={() => { setDtState('bet'); setDtDragonCard(null); setDtTigerCard(null); setDtChoice(null); }} className="flex-1 p-3 bg-green-500 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">VÁN MỚI</button>}
          </div>
        )}
      </>,
      'dragontiger'
    );
  };

  // ----------------------------------------------------
  // RENDER BÓNG ĐÁ
  // ----------------------------------------------------
  const renderFootball = () => {
    if (!fbMatchId) {
      return (
        <div className="flex flex-col gap-4">
          <div className="bg-black/40 rounded-3xl p-4 border border-white/10 shadow-lg text-center">
            <h2 className="text-xl font-black text-amber-400">CHỌN TRẬN ĐẤU</h2>
          </div>
          {fbMatches.map(m => (
            <div key={m.id} onClick={() => setFbMatchId(m.id)} className={`w-full p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] border-2 shadow-md flex items-center justify-between ${isDark ? 'bg-slate-800/80 border-slate-700 hover:border-amber-400' : 'bg-white border-slate-200 hover:border-blue-500'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-white/20 flex items-center justify-center font-black text-white text-xs">{m.hs}</div>
                <div className="font-bold flex flex-col">
                  <span>{m.h}</span>
                  <span className="text-xs opacity-60">vs</span>
                  <span>{m.a}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white/20 flex items-center justify-center font-black text-white text-xs">{m.as}</div>
            </div>
          ))}
        </div>
      );
    }

    const match = fbMatches.find(m => m.id === fbMatchId)!;

    return renderGameLayout(
      <>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => { if (fbState === 'bet') { setFbMatchId(null); setFbChoice(null); } }} className="px-4 py-2 bg-slate-500/20 rounded-lg font-bold text-sm hover:bg-slate-500/40 transition-colors">QUAY LẠI</button>
          <div className="font-bold text-amber-400">{match.h} vs {match.a}</div>
          <div className="w-20"></div>
        </div>

        <div className={`w-full max-w-sm mx-auto rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner overflow-hidden ${isDark ? 'bg-green-950 border border-white/10' : 'bg-green-800 border-4 border-green-900'}`}>
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.5) 50%)', backgroundSize: '40px 100%' }}></div>
           
           <div className="z-10 flex flex-col items-center w-full">
              <div className="bg-black/60 px-4 py-1 rounded-full text-white font-black text-sm mb-4 border border-white/20">
                {fbTime}' PHÚT
              </div>

              <div className="flex justify-between items-center w-full px-4">
                 <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center font-black text-white mb-2 text-xs">{match.hs}</div>
                    <span className="font-black text-white drop-shadow-md text-xs">{match.h.toUpperCase()}</span>
                 </div>
                 
                 <div className="flex flex-col items-center px-4">
                    <div className="text-2xl font-black text-white drop-shadow-lg tracking-widest bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                       {fbScore[0]} - {fbScore[1]}
                    </div>
                 </div>

                 <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center font-black text-white mb-2 text-xs">{match.as}</div>
                    <span className="font-black text-white drop-shadow-md text-xs">{match.a.toUpperCase()}</span>
                 </div>
              </div>
           </div>

           {fbState === 'result' && (
             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute bottom-4 bg-black/90 text-amber-400 font-black text-xl px-6 py-2 rounded-2xl whitespace-nowrap border-2 border-amber-500 shadow-2xl z-20 text-center">
               {fbMsg}
             </motion.div>
           )}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <div className="text-center font-bold mb-2 opacity-80 text-sm">CHÂU ÂU (1X2)</div>
            <div className="grid grid-cols-3 gap-2">
               <button onClick={() => setFbChoice('1x2_home')} disabled={fbState === 'playing'} className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center ${fbChoice === '1x2_home' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400/50'}`}>
                 1
                 <span className="text-[10px] font-normal opacity-80">{match.hWin}</span>
               </button>
               <button onClick={() => setFbChoice('1x2_draw')} disabled={fbState === 'playing'} className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center ${fbChoice === '1x2_draw' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400/50'}`}>
                 X
                 <span className="text-[10px] font-normal opacity-80">{match.draw}</span>
               </button>
               <button onClick={() => setFbChoice('1x2_away')} disabled={fbState === 'playing'} className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center ${fbChoice === '1x2_away' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400/50'}`}>
                 2
                 <span className="text-[10px] font-normal opacity-80">{match.aWin}</span>
               </button>
            </div>
          </div>
          
          <div>
            <div className="text-center font-bold mb-2 opacity-80 text-sm">CHÂU Á (HDC: {match.ah > 0 ? `+${match.ah}` : match.ah})</div>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => setFbChoice('ah_home')} disabled={fbState === 'playing'} className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center ${fbChoice === 'ah_home' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400/50'}`}>
                 CHỦ NHÀ
                 <span className="text-[10px] font-normal opacity-80">{match.ahH}</span>
               </button>
               <button onClick={() => setFbChoice('ah_away')} disabled={fbState === 'playing'} className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center ${fbChoice === 'ah_away' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400/50'}`}>
                 KHÁCH
                 <span className="text-[10px] font-normal opacity-80">{match.ahA}</span>
               </button>
            </div>
          </div>
          
          <div>
            <div className="text-center font-bold mb-2 opacity-80 text-sm">TÀI XỈU (O/U: {match.ou})</div>
            <div className="grid grid-cols-2 gap-2">
               <button onClick={() => setFbChoice('ou_over')} disabled={fbState === 'playing'} className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center ${fbChoice === 'ou_over' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400/50'}`}>
                 TÀI (OVER)
                 <span className="text-[10px] font-normal opacity-80">{match.ouO}</span>
               </button>
               <button onClick={() => setFbChoice('ou_under')} disabled={fbState === 'playing'} className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center ${fbChoice === 'ou_under' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400/50'}`}>
                 XỈU (UNDER)
                 <span className="text-[10px] font-normal opacity-80">{match.ouU}</span>
               </button>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
        {fbState === 'bet' ? (
          <div className="flex flex-col gap-3">
            {renderBetTiers(fbBet, setFbBet, false, megaTiers)}
            <button onClick={playFootball} disabled={!fbChoice} className="w-full p-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">BẮT ĐẦU TRẬN MẠC</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fbState === 'result' ? (
              <button onClick={() => { setFbState('bet'); setFbChoice(null); setFbMatchId(null); setFbScore([0,0]); setFbTime(0); setFbMsg(''); setFbMatches(generateMatches()); }} className="w-full p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">TIẾP TỤC (TẠO LỊCH ĐẤU MỚI)</button>
            ) : (
              <div className="w-full p-3 bg-slate-800 text-slate-400 font-black text-lg rounded-xl text-center border-2 border-slate-700 flex items-center justify-center gap-2">
                 <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
                 ĐANG ĐÁ...
              </div>
            )}
          </div>
        )}
        </div>
      </>,
      <></>,
      'football'
    );
  };


  // RENDER ĐỔ THẠCH
  // ----------------------------------------------------
  const renderDothach = () =>
    renderGameLayout(
      <>
         <div className={`w-full grid grid-cols-2 gap-3 min-h-[300px]`}>
           {jadeMarket.map((stone) => {
             const adjustedPrice = Math.floor(stone.price * (betTiers[0] / 10));
             return (
             <div 
               key={stone.id} 
               onClick={() => !stone.isOpen && setJadeSelected(stone.id)}
               className={`relative rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all border-2 shadow-sm ${stone.isOpen ? (isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300') : (jadeSelected === stone.id ? (isDark ? 'bg-emerald-900 border-emerald-500' : 'bg-emerald-100 border-emerald-500') : (isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200 hover:shadow-md'))}`}
             >
               {stone.isOpen ? (
                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                   <div className="text-5xl drop-shadow-lg mb-2">{stone.result.mult > 0 ? '💎' : '🪨'}</div>
                   <div className={`text-sm font-black uppercase ${stone.result.color} text-center`}>{stone.result.type}</div>
                   <div className="text-[10px] opacity-70 mt-1">x{stone.result.mult}</div>
                 </motion.div>
               ) : (
                 <>
                   <div className="text-5xl drop-shadow-md mb-2">🪨</div>
                   <div className="font-bold text-sm">{stone.name}</div>
                   <div className="text-xs opacity-70 mt-1">{formatMoney(adjustedPrice)}</div>
                 </>
               )}
             </div>
             )
           })}
         </div>
      </>,
      <>
        <div className="flex gap-2">
           <button onClick={playDothach} disabled={jadeSelected === null || jadeMarket.find(s => s.id === jadeSelected)?.isOpen} className="flex-1 p-3 bg-gradient-to-r from-slate-600 to-slate-800 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"><Pickaxe size={24}/> CHỐT MUA LÔ NÀY</button>
           <button onClick={() => { setJadeMarket(generateJadeMarket()); setJadeSelected(null); }} className="p-3 bg-slate-700 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg"><RotateCcw size={24}/></button>
        </div>
      </>,
      'dothach'
    );

const renderCarRacing = () =>
    renderGameLayout(
      <>
        <div className={`w-full max-w-sm mx-auto rounded-3xl p-4 flex flex-col justify-center relative shadow-2xl min-h-[300px] ${isDark ? 'bg-slate-950 border-2 border-cyan-500/30 shadow-cyan-500/10' : 'bg-slate-800 border-4 border-slate-900'}`}>
           {/* Cyberpunk grid background */}
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.2) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
           
           <div className="space-y-6 relative py-2 z-10">
             {/* Neon Finish line */}
             <div className="absolute right-4 top-0 bottom-0 w-3 bg-cyan-950 border-x-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] flex flex-col justify-around z-0">
               {[...Array(8)].map((_, i) => <div key={i} className="w-full h-3 bg-cyan-400/80"></div>)}
             </div>
             
             {[0, 1, 2, 3].map((carIdx) => (
                <div key={carIdx} className="w-full h-12 bg-black/80 rounded-lg relative overflow-hidden flex items-center border border-slate-700 shadow-inner">
                   {/* Moving road lines */}
                   <div className={`absolute inset-0 opacity-30 ${carState === 'racing' ? 'animate-[slideLeft_0.5s_linear_infinite]' : ''}`} style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.8) 50%)', backgroundSize: '40px 2px', backgroundRepeat: 'repeat-x', backgroundPosition: 'center' }}></div>
                   
                   <div className="absolute left-3 text-cyan-500/30 font-black text-lg italic z-0 select-none flex flex-col leading-none">
                     <span>{carIdx + 1}</span>
                     <span className="text-[10px] font-normal opacity-60 mt-1">{carList[carIdx].name.split(' ')[1] || carList[carIdx].name}</span>
                   </div>
                   
                   <motion.div 
                     className="absolute left-0 text-4xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] z-10 -ml-1"
                     style={{ left: `${carProgress[carIdx]}%`, transform: 'translateX(-100%)' }}
                     animate={{ left: `${carProgress[carIdx]}%` }}
                     transition={{ duration: 0.1, ease: "linear" }}
                   >
                     <span style={{ filter: ['hue-rotate(0deg)', 'hue-rotate(220deg) brightness(1.2)', 'hue-rotate(120deg)', 'hue-rotate(280deg)'][carIdx], display: 'inline-block' }}>🏎️</span>
                     {/* Nitro exhaust effect randomly (simplified with constant small exhaust) */}
                     {carState === 'racing' && <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-4 h-2 bg-blue-400 rounded-full blur-[2px] opacity-70 animate-pulse"></div>}
                   </motion.div>
                </div>
             ))}
           </div>
           
           {carState === 'result' && carWinner !== null && (
             <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 backdrop-blur-sm rounded-3xl">
                <div className="bg-slate-900 text-cyan-400 font-black px-8 py-3 rounded-2xl border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.8)] text-xl animate-pulse">
                  XE SỐ {carWinner + 1} VÔ ĐỊCH!
                </div>
             </div>
           )}
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
           {[0, 1, 2, 3].map((carIdx) => (
             <button 
               key={carIdx}
               onClick={() => setCarChoice(carIdx)}
               disabled={carState === 'racing'}
               className={`p-2 rounded-xl border-2 font-black transition-all flex flex-col items-center justify-center ${carChoice === carIdx ? 'bg-cyan-600 border-cyan-300 text-white shadow-[0_0_15px_rgba(34,211,238,0.5)] scale-105 z-10' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
             >
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-1 text-[10px]">
                    <span style={{ filter: ['hue-rotate(0deg)', 'hue-rotate(220deg) brightness(1.2)', 'hue-rotate(120deg)', 'hue-rotate(280deg)'][carIdx], fontSize: '14px' }}>🏎️</span> #{carIdx + 1}
                  </span>
                  <span className={`text-[9px] px-1 py-0.5 rounded ${carList[carIdx].form > 0 ? 'bg-green-500/20 text-green-400' : carList[carIdx].form < 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {carList[carIdx].form > 0 ? '↑' : carList[carIdx].form < 0 ? '↓' : '-'}{Math.abs(carList[carIdx].form)}
                  </span>
                </div>
                <span className="text-[11px] font-bold mt-1.5 whitespace-nowrap text-cyan-300">{carList[carIdx].name}</span>
                <span className="text-[8px] font-normal opacity-70 whitespace-nowrap">{carList[carIdx].rep}</span>
                <div className="w-full text-[9px] opacity-80 mt-1.5 border-t border-slate-700 pt-1">
                   <div className="text-center text-cyan-100 font-normal">{carList[carIdx].car.model}</div>
                   <div className="flex justify-between mt-0.5 text-[8px] opacity-70">
                     <span>T.Độ: {carList[carIdx].car.topSpeed}</span>
                     <span>G.Tốc: {carList[carIdx].car.acceleration}</span>
                   </div>
                </div>
             </button>
           ))}
        </div>
      </>,
      <>
        {carState === 'bet' ? (
          <>
            {renderBetTiers(carBet, setCarBet, false, gigaTiers)}
            <button onClick={playCarRacing} disabled={carChoice === null} className="w-full p-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-all hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.4)]">ĐẠP GA NITRO</button>
          </>
        ) : carState === 'result' ? (
           <button onClick={() => { setCarState('bet'); setCarChoice(null); setCarList(getRandomDrivers()); }} className="w-full p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-lg rounded-xl transition-all hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.4)]">ĐUA VÁN TIẾP THEO</button>
        ) : (
           <button disabled className="w-full p-3 bg-slate-600 text-cyan-500/50 font-black text-lg rounded-xl opacity-80 border border-slate-500">ĐANG ĐUA...</button>
        )}
      </>,
      'carracing'
    );

  // ----------------------------------------------------
  // RENDER VÉ SỐ CÀO
  // ----------------------------------------------------
  

const renderScratch = () =>
    renderGameLayout(
      <>
         <div className={`w-full max-w-sm mx-auto rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-inner min-h-[350px] ${isDark ? 'bg-amber-950 border border-white/10' : 'bg-amber-100 border-4 border-amber-300'}`}>
           <div className="text-center mb-6">
              <div className="text-2xl font-black text-amber-600 drop-shadow-sm uppercase">VÉ SỐ TỶ PHÚ</div>
              <div className="text-xs font-bold text-amber-700/60 uppercase">Cào trúng 3 hình giống nhau để nhận thưởng</div>
           </div>

           <div className="grid grid-cols-3 gap-3 w-full bg-amber-900/10 p-4 rounded-2xl border-2 border-amber-900/20 shadow-inner">
             {scratchGrid.map((sym, i) => (
                <div key={i} className="aspect-square bg-slate-300 rounded-xl shadow-inner overflow-hidden relative flex items-center justify-center">
                   {scratchState === 'buy' || scratchState === 'scratching' ? (
                      <div className="absolute inset-0 bg-slate-400 flex items-center justify-center border-2 border-slate-300 shadow-sm" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '10px 10px' }}>
                        {scratchState === 'scratching' && (
                          <motion.div animate={{ opacity: [1, 0] }} transition={{ duration: 1.5, delay: i * 0.1 }} className="absolute inset-0 bg-slate-400"></motion.div>
                        )}
                      </div>
                   ) : null}
                   <div className="text-4xl drop-shadow-md z-0">{sym !== '?' ? sym : ''}</div>
                </div>
             ))}
           </div>

           {scratchState === 'result' && (
             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute bottom-4 bg-black/90 text-amber-400 font-black text-xl px-6 py-2 rounded-2xl whitespace-nowrap border-2 border-amber-500 shadow-2xl z-20 text-center">
               {scratchMsg}
             </motion.div>
           )}
         </div>
      </>,
      <>
        {scratchState === 'buy' ? (
          <>
            {renderBetTiers(scratchBet, setScratchBet, false)}
            <button onClick={playScratch} className="w-full p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">MUA VÀ CÀO</button>
          </>
        ) : (
          <div className="flex gap-2">
            {scratchState === 'result' ? (
              <button onClick={() => { setScratchState('buy'); setScratchGrid(Array(9).fill('?')); }} className="flex-1 p-3 bg-amber-600 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">MUA VÉ KHÁC</button>
            ) : (
              <button disabled className="w-full p-3 bg-slate-500 text-white font-black text-lg rounded-xl opacity-50">ĐANG CÀO...</button>
            )}
          </div>
        )}
      </>,
      'scratch'
    );

  // ----------------------------------------------------
  // RENDER BÀI CÀOconsole.log('Script completed');


const renderStockMarket = () => {
    const totalCost = Object.entries(stockPortfolio).reduce((sum, [ticker, qty]) => {
       const stock = stockMarket.find(s => s.ticker === ticker);
       return sum + (stock ? stock.startPrice * qty : 0);
    }, 0);

    const totalShares = Object.values(stockPortfolio).reduce((a, b) => a + b, 0);

    return renderGameLayout(
      <>
         <div className="w-full flex flex-col min-h-[300px] gap-2">
           <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
             {['Trà Đá (Penny)', 'Tầm Trung (Midcap)', 'Quốc Tế (Bluechip)'].map((t, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setStockTier(idx); setStockMarket(generateStockMarket(idx)); setStockPortfolio({}); }}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all ${stockTier === idx ? 'bg-indigo-600 text-white shadow-md' : isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}
                >
                  {t}
                </button>
             ))}
           </div>

           <div className={`p-3 rounded-xl flex items-center justify-between ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
             <div className="text-sm font-bold opacity-70">BẢNG GIÁ ĐIỆN TỬ</div>
             <div className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded font-bold">Thị trường mở</div>
           </div>
           
           <div className="flex flex-col overflow-y-auto max-h-[50vh] custom-scrollbar border rounded-xl divide-y">
             <div className={`flex justify-between items-center p-2 text-[10px] font-bold opacity-60 uppercase ${isDark ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
               <div className="w-20">MÃ CK</div>
               <div className="flex-1 text-right">GIÁ / BIẾN ĐỘNG</div>
               <div className="w-24 text-right">SỐ LƯỢNG</div>
             </div>
             {stockMarket.map((stock) => {
               const qty = stockPortfolio[stock.ticker] || '';
               const changeToUse = stock.pastChangePercent;
               const isUp = changeToUse > 0;
               const colorClass = isUp ? 'text-green-500' : 'text-red-500';

               return (
               <div 
                 key={stock.ticker} 
                 className={`p-2 flex items-center justify-between transition-all ${qty ? (isDark ? 'bg-indigo-900/40' : 'bg-indigo-50') : ''}`}
               >
                 <div className="w-20 flex flex-col">
                    <span className={`font-black text-sm ${stock.brandColor}`}>{stock.ticker}</span>
                 </div>
                 <div className="flex-1 flex flex-col items-end pr-2">
                    <span className="font-black text-sm tabular-nums">{stock.startPrice.toLocaleString()}đ</span>
                    <span className={`text-[10px] font-bold tabular-nums ${colorClass}`}>
                       {isUp ? '+' : ''}{(changeToUse * 100).toFixed(1)}%
                    </span>
                 </div>
                 <div className="w-24">
                    <input 
                      type="number"
                      min="0"
                      placeholder="0"
                      value={qty}
                      onChange={(e) => {
                         const val = parseInt(e.target.value) || 0;
                         setStockPortfolio(prev => {
                            const newPort = { ...prev };
                            if (val <= 0) {
                               delete newPort[stock.ticker];
                            } else {
                               newPort[stock.ticker] = val;
                            }
                            return newPort;
                         });
                      }}
                      className={`w-full px-2 py-1.5 text-right font-bold text-sm rounded-lg outline-none transition-all ${isDark ? 'bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:bg-slate-800' : 'bg-white border border-slate-300 focus:border-indigo-500 focus:bg-indigo-50'}`}
                    />
                 </div>
               </div>
               )
             })}
           </div>
         </div>
      </>,
      <>
        <div className="flex gap-2 w-full mt-2">
           <button 
             onClick={() => setStockPortfolio({})}
             disabled={totalShares === 0}
             className="px-4 py-3 bg-slate-700 text-white font-black text-sm rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg"
           >
             HỦY GIỎ
           </button>
           <button onClick={playStockMarket} disabled={totalShares === 0} className="flex-1 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg flex flex-col items-center justify-center gap-1">
             <div className="flex items-center gap-2"><TrendingUp size={24}/> ĐẦU TƯ</div>
             {totalShares > 0 && <div className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{totalShares.toLocaleString()} Cổ - Tổng {totalCost >= 1000000000 ? (totalCost/1000000000).toFixed(1) + 'T' : totalCost >= 1000000 ? (totalCost/1000000).toFixed(1) + 'Tr' : totalCost.toLocaleString() + 'đ'}</div>}
           </button>
           <button onClick={() => { setStockMarket(generateStockMarket(stockTier)); setStockPortfolio({}); }} className="p-3 bg-slate-700 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg"><RotateCcw size={24}/></button>
        </div>
      </>,
      'stockmarket'
    );
  };


  const renderBaicao = () => {
    return renderGameLayout(
      <>
        <div className={`flex-1 rounded-3xl p-4 flex flex-col justify-between relative shadow-inner min-h-[380px] ${isDark ? 'bg-emerald-950 border border-white/10' : 'bg-emerald-800 border-4 border-emerald-900'}`}>
          
          <div className="flex flex-col h-full gap-4 pb-2">
             {/* Bot Area */}
             <div className={`flex-1 rounded-xl p-2 relative flex flex-col items-center ${isDark ? 'bg-black/30 border border-black/50' : 'bg-black/10 border border-black/20'}`}>
               <div className="text-white/50 font-black uppercase text-sm mb-2 drop-shadow-sm flex items-center gap-2"><Crown size={16}/> NHÀ CÁI (BOT)</div>
               <div className="flex justify-center gap-2">
                  {bcBotHand.map((c, i) => (
                    <motion.div key={i} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="w-12 h-16 rounded-lg shadow-md border border-slate-200 flex flex-col items-center justify-center relative bg-white">
                      {bcState === 'dealing' ? (
                         <div className="w-full h-full bg-blue-800 rounded-lg border-2 border-white flex items-center justify-center overflow-hidden">
                           <div className="w-full h-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.5) 5px, rgba(255,255,255,0.5) 10px)' }}></div>
                         </div>
                      ) : (
                         <>
                           <div className={`text-xs font-bold ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.rank}</div>
                           <div className={`text-xl ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.suit}</div>
                         </>
                      )}
                    </motion.div>
                  ))}
               </div>
             </div>
             
             {/* Player Area */}
             <div className={`flex-1 rounded-xl p-2 relative flex flex-col items-center ${isDark ? 'bg-white/10 border border-white/20' : 'bg-white/30 border-2 border-white/40'}`}>
               <div className="text-emerald-100 font-black uppercase text-sm mb-2 drop-shadow-sm flex items-center gap-2">NGƯỜI CHƠI (BẠN)</div>
               <div className="flex justify-center gap-2">
                  {bcPlayerHand.map((c, i) => (
                    <motion.div key={i} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="w-12 h-16 bg-white rounded-lg shadow-md border border-slate-200 flex flex-col items-center justify-center relative">
                      <div className={`text-xs font-bold ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.rank}</div>
                      <div className={`text-xl ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.suit}</div>
                    </motion.div>
                  ))}
               </div>
             </div>
          </div>

          {bcState === 'result' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-amber-400 font-black text-lg px-6 py-3 rounded-2xl whitespace-nowrap border-2 border-amber-500 shadow-2xl z-10 text-center">
              {bcMsg}
            </motion.div>
          )}

        </div>
      {renderPrizeStructure([{label: 'Thắng điểm', mult: 'x2'}, {label: '3 Tiên', mult: 'x5', color: 'text-yellow-500'}], 'fixed')}
      </>,
      <>
        {bcState === 'bet' ? (
          <>
            {renderBetTiers(bcBet, setBcBet, false, highTiers)}
            <button onClick={playBaicao} className="w-full p-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">CHIA BÀI XUỐNG XÁC</button>
          </>
        ) : (
          <div className="flex gap-2">
            {bcState === 'result' && <button onClick={() => { setBcState('bet'); setBcPlayerHand([]); setBcBotHand([]); }} className="flex-1 p-3 bg-green-500 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">VÁN MỚI</button>}
          </div>
        )}
      </>,
      'baicao'
    );
  };

  // ----------------------------------------------------
  // RENDER ĐÁ GÀ
  // ----------------------------------------------------
  const renderDaga = () =>
    renderGameLayout(
      <>
        <div className={`w-full max-w-sm mx-auto rounded-3xl p-4 flex flex-col justify-center relative shadow-inner overflow-hidden ${isDark ? 'bg-amber-950 border border-white/10' : 'bg-amber-800 border-4 border-amber-900'}`}>
           <div className="flex justify-between items-end h-44 relative z-10 px-2">
             <div className="absolute inset-0 flex justify-between px-2 pt-2 z-20 pointer-events-none">
                <div className="text-left">
                  <div className="text-xs font-bold text-red-300 drop-shadow">{dagaRoosters[0].name}</div>
                  <div className="text-[10px] text-white/70">Công: {dagaRoosters[0].atk} | Thủ: {dagaRoosters[0].def}</div>
                  <div className={`text-[10px] ${dagaRoosters[0].form > 0 ? 'text-green-400' : 'text-red-400'}`}>Phong độ: {dagaRoosters[0].form > 0 ? '↑' : '↓'}{Math.abs(dagaRoosters[0].form)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-blue-300 drop-shadow">{dagaRoosters[1].name}</div>
                  <div className="text-[10px] text-white/70">Công: {dagaRoosters[1].atk} | Thủ: {dagaRoosters[1].def}</div>
                  <div className={`text-[10px] ${dagaRoosters[1].form > 0 ? 'text-green-400' : 'text-red-400'}`}>Phong độ: {dagaRoosters[1].form > 0 ? '↑' : '↓'}{Math.abs(dagaRoosters[1].form)}</div>
                </div>
             </div>
             {/* Meron (Red) */}
             <div className="flex flex-col items-center w-1/3">
               <div className="w-full h-3 bg-slate-800 rounded-full mb-2 overflow-hidden border border-white/20">
                 <div className="h-full bg-red-500 transition-all duration-150" style={{ width: `${Math.max(0, dagaHp[0])}%` }}></div>
               </div>
               <motion.div animate={dagaState === 'fighting' ? { x: [0, 20, 0, 10, -5, 0], y: [0, -20, 0, -10, 0] } : {}} transition={{ repeat: Infinity, duration: 0.3 }} className={`text-2xl drop-shadow-xl ${dagaHp[0] <= 0 ? 'opacity-20 rotate-90 grayscale' : ''}`}>
                 🐓
               </motion.div>
               <div className="mt-2 font-black text-red-500 bg-black/50 px-3 py-1 rounded-full text-xs">MERON</div>
             </div>

             <div className="mb-4">
                <span className="font-black text-3xl text-amber-500 italic drop-shadow-md">VS</span>
             </div>

             {/* Wala (Blue) */}
             <div className="flex flex-col items-center w-1/3">
               <div className="w-full h-3 bg-slate-800 rounded-full mb-2 overflow-hidden border border-white/20">
                 <div className="h-full bg-blue-500 transition-all duration-150" style={{ width: `${Math.max(0, dagaHp[1])}%` }}></div>
               </div>
               <motion.div animate={dagaState === 'fighting' ? { x: [0, -20, 0, -10, 5, 0], y: [0, -20, 0, -10, 0] } : {}} transition={{ repeat: Infinity, duration: 0.3 }} className={`text-2xl drop-shadow-xl transform -scale-x-100 ${dagaHp[1] <= 0 ? 'opacity-20 -rotate-90 grayscale' : ''}`}>
                 🐓
               </motion.div>
               <div className="mt-2 font-black text-blue-400 bg-black/50 px-3 py-1 rounded-full text-xs">WALA</div>
             </div>
           </div>

           {dagaState === 'result' && (
             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-amber-400 font-black text-xl px-6 py-3 rounded-2xl whitespace-nowrap border-2 border-amber-500 shadow-2xl z-20 text-center">
               {dagaMsg}
             </motion.div>
           )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
           <button onClick={() => setDagaChoice('meron')} disabled={dagaState === 'fighting'} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${dagaChoice === 'meron' ? 'bg-red-600 border-red-400 text-white' : 'bg-red-950 border-red-900 text-red-400/50'}`}>
             MERON
             <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 0.95</span>
           </button>
           <button onClick={() => setDagaChoice('tie')} disabled={dagaState === 'fighting'} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${dagaChoice === 'tie' ? 'bg-green-600 border-green-400 text-white' : 'bg-green-950 border-green-900 text-green-400/50'}`}>
             HÒA (BDD)
             <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 8</span>
           </button>
           <button onClick={() => setDagaChoice('wala')} disabled={dagaState === 'fighting'} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${dagaChoice === 'wala' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-blue-950 border-blue-900 text-blue-400/50'}`}>
             WALA
             <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 1</span>
           </button>
        </div>
      {renderPrizeStructure([{label: 'Meron / Wala', mult: 'x1.9'}, {label: 'BDD (Hòa)', mult: 'x8', color: 'text-yellow-500'}], 'fixed')}
      </>,
      <>
        {dagaState === 'bet' ? (
          <>
            {renderBetTiers(dagaBet, setDagaBet, false, highTiers)}
            <button onClick={playDaga} disabled={!dagaChoice} className="w-full p-3 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">CÁP KÈO</button>
          </>
        ) : (
          <div className="flex gap-2">
            {dagaState === 'result' ? (
              <button onClick={() => { setDagaState('bet'); setDagaChoice(null); setDagaHp([100,100]); setDagaMsg(''); setDagaRoosters(getRandomRoosters()); }} className="flex-1 p-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-yellow-950 font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg shadow-amber-500/30">TIẾP TỤC ĐÁ (TÌM GÀ MỚI)</button>
            ) : (
              <button disabled className="w-full p-3 bg-slate-500 text-white font-black text-lg rounded-xl opacity-50">ĐANG ĐÁ...</button>
            )}
          </div>
        )}
      </>,
      'daga'
    );

  // ----------------------------------------------------
  // RENDER BACCARAT
  // ----------------------------------------------------
  const renderBaccarat = () => {
    const calcB = (hand: Card[]) => {
      let sum = 0;
      for (let c of hand) {
        if (['10','J','Q','K'].includes(c.rank)) sum += 0;
        else if (c.rank === 'A') sum += 1;
        else sum += parseInt(c.rank);
      }
      return sum % 10;
    };
    return renderGameLayout(
      <>
        <div className={`flex-1 rounded-3xl p-4 flex flex-col justify-between relative shadow-inner min-h-[400px] ${isDark ? 'bg-red-950 border border-white/10' : 'bg-red-800 border-4 border-red-900'}`}>
          
          <div className="flex justify-between w-full h-1/2 gap-4 pb-2">
             {/* Player Area */}
             <div className={`flex-1 rounded-xl p-2 relative flex flex-col items-center ${isDark ? 'bg-blue-900/30 border border-blue-500/20' : 'bg-blue-600/20 border-2 border-blue-400/30'}`}>
               <div className="text-blue-300 font-black uppercase text-sm mb-2 drop-shadow-sm">PLAYER</div>
               <div className="flex justify-center gap-[-20px] flex-wrap">
                  {bacPlayerHand.map((c, i) => (
                    <motion.div key={i} initial={{ x: 50, y: -50, opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} transition={{ delay: i * 0.2 }} className="w-12 h-16 bg-white rounded-lg shadow-md border border-slate-200 flex flex-col items-center justify-center -ml-3 first:ml-0 relative">
                      <div className={`text-xs font-bold ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.rank}</div>
                      <div className={`text-xl ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.suit}</div>
                    </motion.div>
                  ))}
               </div>
               {bacPlayerHand.length > 0 && <div className="absolute bottom-2 bg-blue-600 text-white font-black px-3 py-1 rounded-full border border-white/20 text-sm">{calcB(bacPlayerHand)} ĐIỂM</div>}
             </div>
             
             {/* Banker Area */}
             <div className={`flex-1 rounded-xl p-2 relative flex flex-col items-center ${isDark ? 'bg-red-900/30 border border-red-500/20' : 'bg-red-600/20 border-2 border-red-400/30'}`}>
               <div className="text-red-300 font-black uppercase text-sm mb-2 drop-shadow-sm">BANKER</div>
               <div className="flex justify-center gap-[-20px] flex-wrap">
                  {bacBankerHand.map((c, i) => (
                    <motion.div key={i} initial={{ x: -50, y: -50, opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} transition={{ delay: i * 0.2 }} className="w-12 h-16 bg-white rounded-lg shadow-md border border-slate-200 flex flex-col items-center justify-center -ml-3 first:ml-0 relative">
                      <div className={`text-xs font-bold ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.rank}</div>
                      <div className={`text-xl ${c.color === 'red' ? 'text-red-500' : 'text-slate-800'}`}>{c.suit}</div>
                    </motion.div>
                  ))}
               </div>
               {bacBankerHand.length > 0 && <div className="absolute bottom-2 bg-red-600 text-white font-black px-3 py-1 rounded-full border border-white/20 text-sm">{calcB(bacBankerHand)} ĐIỂM</div>}
             </div>
          </div>

          {bacState === 'result' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-amber-400 font-black text-xl px-6 py-3 rounded-2xl whitespace-nowrap border-2 border-amber-500 shadow-2xl z-10 text-center">
              {bacMsg}
            </motion.div>
          )}

          <div className="mt-4">
             <div className="grid grid-cols-3 gap-2">
               <button onClick={() => setBacChoice('player')} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${bacChoice === 'player' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-blue-900/50 border-blue-800 text-blue-300'}`}>
                 PLAYER
                 <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 1</span>
               </button>
               <button onClick={() => setBacChoice('tie')} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${bacChoice === 'tie' ? 'bg-green-600 border-green-400 text-white' : 'bg-green-900/50 border-green-800 text-green-300'}`}>
                 HÒA
                 <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 8</span>
               </button>
               <button onClick={() => setBacChoice('banker')} className={`p-3 rounded-xl border-2 font-black transition-all flex flex-col items-center ${bacChoice === 'banker' ? 'bg-red-600 border-red-400 text-white' : 'bg-red-900/50 border-red-800 text-red-300'}`}>
                 BANKER
                 <span className="text-[10px] font-normal opacity-80 mt-1">1 ăn 0.95</span>
               </button>
             </div>
          </div>

        </div>
      {renderPrizeStructure([{label: 'Player', mult: 'x2'}, {label: 'Banker', mult: 'x1.95'}, {label: 'Tie (Hòa)', mult: 'x9', color: 'text-yellow-500'}], 'fixed')}
      </>,
      <>
        {bacState === 'bet' ? (
          <>
            {renderBetTiers(bacBet, setBacBet, false, highTiers)}
            <button onClick={playBaccarat} disabled={!bacChoice} className="w-full p-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-transform active:scale-95 shadow-lg">CHIA BÀI</button>
          </>
        ) : (
          <div className="flex gap-2">
            {bacState === 'result' && <button onClick={() => { setBacState('bet'); setBacPlayerHand([]); setBacBankerHand([]); setBacChoice(null); }} className="flex-1 p-3 bg-green-500 text-white font-black text-lg rounded-xl transition-transform active:scale-95 shadow-lg">VÁN MỚI</button>}
          </div>
        )}
      </>,
      'baccarat'
    );
  };

  // ----------------------------------------------------
  // RENDER HORSE RACING
  // ----------------------------------------------------
  const renderHorseRacing = () =>
    renderGameLayout(
      <>
        <div className={`w-full max-w-sm mx-auto rounded-3xl p-4 flex flex-col justify-center relative shadow-inner overflow-hidden ${isDark ? 'bg-emerald-950/80 border border-emerald-500/30' : 'bg-emerald-800 border-4 border-emerald-950'}`}>
           {/* Grass texture overlay */}
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 0, #000 100%), url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%2310b981\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>
           
           <div className="space-y-3 relative py-2 z-10">
             {/* Finish line */}
             <div className="absolute right-4 top-0 bottom-0 w-3 bg-white/90 border-x border-red-500/50 z-0 flex flex-col justify-between">
                {[...Array(10)].map((_, i) => <div key={i} className="w-full h-2 bg-red-600/80"></div>)}
             </div>
             
             {[0, 1, 2, 3, 4].map((horseIdx) => (
                <div key={horseIdx} className="w-full h-10 bg-black/30 rounded-full relative overflow-hidden flex items-center border border-white/10 shadow-inner">
                   <div className="absolute left-2 text-white/50 font-black text-lg italic z-0 select-none flex items-center gap-2"><span>{horseIdx + 1}</span><span className="text-xs font-normal opacity-80">{horseList[horseIdx].name}</span></div>
                   <motion.div 
                     className="absolute left-0 text-3xl drop-shadow-lg z-10 -ml-1"
                     style={{ left: `${horseProgress[horseIdx]}%`, transform: 'translateX(-100%)' }}
                     animate={{ left: `${horseProgress[horseIdx]}%` }}
                     transition={{ duration: 0.1, ease: "linear" }}
                   >
                     🐎
                   </motion.div>
                </div>
             ))}
           </div>
           
           {horseState === 'result' && horseWinner !== null && (
             <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-sm rounded-3xl">
                <div className="bg-gradient-to-b from-yellow-400 to-amber-600 text-yellow-950 font-black px-8 py-3 rounded-2xl border-4 border-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.6)] text-xl animate-bounce">
                  NGỰA {horseWinner + 1} VÔ ĐỊCH!
                </div>
             </div>
           )}
        </div>

        <div className="grid grid-cols-5 gap-1.5 mt-3">
           {[0, 1, 2, 3, 4].map((horseIdx) => (
             <button 
               key={horseIdx}
               onClick={() => setHorseChoice(horseIdx)}
               disabled={horseState === 'racing'}
               className={`p-1.5 rounded-xl border-2 font-black transition-all flex flex-col items-center justify-center ${horseChoice === horseIdx ? 'bg-amber-500 border-amber-300 text-white shadow-lg shadow-amber-500/30 scale-105' : 'bg-black/20 border-white/10 text-white/70 hover:bg-black/30'}`}
             >
                <div className="flex items-center justify-between w-full px-1">
                  <span className="text-[10px]">#{horseIdx + 1}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded ${horseList[horseIdx].form > 0 ? 'bg-green-500/20 text-green-400' : horseList[horseIdx].form < 0 ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {horseList[horseIdx].form > 0 ? '↑' : horseList[horseIdx].form < 0 ? '↓' : '-'}{Math.abs(horseList[horseIdx].form)}
                  </span>
                </div>
                <span className="text-[10px] font-bold mt-1 whitespace-nowrap text-amber-300">{horseList[horseIdx].name}</span>
                <span className="text-[8px] font-normal opacity-70 whitespace-nowrap">{horseList[horseIdx].title}</span>
                <div className="w-full flex justify-between px-1 text-[8px] opacity-80 mt-1">
                   <span>Tốc: {horseList[horseIdx].speed}</span>
                   <span>Bền: {horseList[horseIdx].endurance}</span>
                </div>
             </button>
           ))}
        </div>
      </>,
      <>
        {horseState === 'bet' ? (
          <>
            {renderBetTiers(horseBet, setHorseBet, false, allTiers)}
            <button onClick={playHorseRacing} disabled={horseChoice === null} className="w-full p-3 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-black text-lg rounded-xl disabled:opacity-50 transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-600/30">BẮT ĐẦU ĐUA</button>
          </>
        ) : horseState === 'result' ? (
           <button onClick={() => { setHorseState('bet'); setHorseChoice(null); setHorseList(getRandomHorses()); }} className="w-full p-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-yellow-950 font-black text-lg rounded-xl transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/30">TIẾP TỤC ĐUA (TÌM NGỰA MỚI)</button>
        ) : (
           <button disabled className="w-full p-3 bg-slate-500 text-white font-black text-lg rounded-xl opacity-50">ĐANG ĐUA...</button>
        )}
      </>,
      'horseracing'
    );

  const renderBank = () => (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-6 gap-6 pb-20">
      <div className="text-center mt-4">
        <Skull size={80} className="mx-auto text-red-600 mb-4 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
        <h2 className="text-3xl font-black text-red-600 dark:text-red-500">TÍN DỤNG ĐEN</h2>
        <p className="opacity-70 text-sm mt-3 px-4 leading-relaxed">Đường cùng rồi sao? Chúng tôi có thể cho bạn vay nóng. Nhưng nhớ, lãi suất cắt cổ (20%) sẽ cộng thẳng vào nợ gốc ngay khi vay!</p>
      </div>
      
      <div className={`p-8 rounded-3xl text-center border-4 ${debt > 0 ? 'bg-red-500/10 border-red-500/50' : (isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200')}`}>
        <div className="text-sm font-bold opacity-60 uppercase mb-2 tracking-widest">TỔNG DƯ NỢ HIỆN TẠI</div>
        <div className="text-xl md:text-2xl font-black text-red-500 tracking-tight break-all flex items-center justify-center gap-1.5"><Banknote size={24} className="text-green-500 drop-shadow-sm" /> {formatMoney(debt)}</div>
      </div>

      <div className="space-y-4 mt-6">
        <div className="font-bold text-sm text-center tracking-widest opacity-80">CHỌN MỨC VAY NÓNG:</div>
        <div className="grid grid-cols-2 gap-3">
          {[50000, 100000, 500000, 1000000].map(amt => (
            <button key={amt} onClick={() => handleLoan(amt)} className="p-4 bg-red-600 text-white font-black text-lg rounded-2xl hover:bg-red-700 active:scale-95 transition-all shadow-lg border-b-4 border-red-800">
              VAY {formatMoney(amt)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-red-500/20">
        <div className="flex justify-between items-center mb-4 bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
          <div className="font-bold text-green-700 dark:text-green-400">Tiền trong túi hiện tại:</div>
          <div className="font-black text-xl text-green-600 dark:text-green-400 flex items-center gap-1"><Banknote size={20} /> {formatMoney(money)}</div>
        </div>
        <button onClick={handleRepay} disabled={debt <= 0 || money <= 0} className="w-full p-4 bg-green-600 text-white font-black text-xl rounded-2xl disabled:opacity-50 active:scale-95 transition-all shadow-lg">
          THANH TOÁN NỢ 
        </button>
      </div>
    </div>
  );

  return (
    <motion.div className={`w-full h-full flex flex-col ${bgClass}`} animate={isShaking ? { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
      <div className={`h-14 shrink-0 flex items-center px-4 border-b z-10 ${headerClass}`}>
        <button onClick={() => { if (activeGame !== 'menu') setActiveGame('menu'); else onBack(); }} className={`p-2 -ml-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
          <ChevronLeft size={24} />
        </button>
        <div className="font-bold text-lg ml-2 flex-1 text-center pr-8 drop-shadow-sm uppercase tracking-wide">
          {activeGame === 'menu' ? 'GOWin Casino' : activeGame === 'sicbo' ? 'Tài Xỉu Pro' : activeGame === 'baucua' ? 'Bầu Cua' : activeGame === 'slots' ? 'Slot 3x3' : activeGame === 'roulette' ? 'Roulette' : activeGame === 'blackjack' ? 'Xì Dách' : activeGame === 'xocdia' ? 'Xóc Đĩa' : activeGame === 'crash' ? 'Crash' : activeGame === 'baccarat' ? 'Baccarat' : activeGame === 'horseracing' ? 'Đua Ngựa' : activeGame === 'dragontiger' ? 'Rồng Hổ' : activeGame === 'daga' ? 'Đá Gà' : activeGame === 'football' ? 'Bóng Đá' : activeGame === 'baicao' ? 'Bài Cào' : activeGame === 'dothach' ? 'Đổ Thạch' : activeGame === 'carracing' ? 'Đua Xe' : activeGame === 'scratch' ? 'Vé Số Cào' : activeGame === 'stockmarket' ? 'Chứng Khoán' : 'Tín Dụng Đen'}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div key={activeGame} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
            {activeGame === 'menu' && renderMenu()}
            {activeGame === 'sicbo' && renderSicbo()}
            {activeGame === 'slots' && renderSlots()}
            {activeGame === 'blackjack' && renderBlackjack()}
            {activeGame === 'roulette' && renderRoulette()}
            {activeGame === 'bank' && renderBank()}
            {activeGame === 'baucua' && renderBaucua()}
            {activeGame === 'xocdia' && renderXocdia()}
            {activeGame === 'crash' && renderCrash()}
            {activeGame === 'dragontiger' && renderDragonTiger()}
            {activeGame === 'daga' && renderDaga()}
            {activeGame === 'football' && renderFootball()}
            {activeGame === 'baicao' && renderBaicao()}
            {activeGame === 'dothach' && renderDothach()}
            {activeGame === 'carracing' && renderCarRacing()}
            {activeGame === 'scratch' && renderScratch()}
            {activeGame === 'stockmarket' && renderStockMarket()}
            {activeGame === 'baccarat' && renderBaccarat()}
            {activeGame === 'horseracing' && renderHorseRacing()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
