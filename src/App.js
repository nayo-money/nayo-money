import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Gift, 
  CreditCard, 
  TrendingUp, 
  Wallet, 
  ExternalLink,
  Layout,
  Eye,
  Settings,
  Image as ImageIcon,
  Type,
  Instagram,
  Mail,
  BookOpen,
  Coffee,
  CheckCircle2,
  Calendar,
  Flame,
  Camera,
  Upload,
  Lock,
  LogOut,
  User,
  Key,
  Globe,
  Facebook,
  Youtube,
  MessageCircle,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  Star,
  Heart,
  ShoppingBag,
  Plane,
  Smartphone,
  Zap,
  Tag,
  Award
} from 'lucide-react';

// --- Firebase Configuration (您的專屬設定) ---
const firebaseConfig = {
  apiKey: "AIzaSyB_GxJGqyup8FqUlQ-mNRizfIO5kEJTerQ",
  authDomain: "nayo-money.firebaseapp.com",
  projectId: "nayo-money",
  storageBucket: "nayo-money.firebasestorage.app",
  messagingSenderId: "865531095302",
  appId: "1:865531095302:web:cff95db293040c34fd5687"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'nayo-money'; 

// --- Icon Mapping ---
// For Social Links
const SOCIAL_ICONS = {
  instagram: { icon: Instagram, label: 'Instagram' },
  facebook: { icon: Facebook, label: 'Facebook' },
  youtube: { icon: Youtube, label: 'YouTube' },
  line: { icon: MessageCircle, label: 'Line' },
  mail: { icon: Mail, label: 'Email' },
  blog: { icon: BookOpen, label: '部落格' },
  sponsor: { icon: Coffee, label: '贊助' },
  twitter: { icon: Twitter, label: 'Twitter' },
  linkedin: { icon: Linkedin, label: 'LinkedIn' },
  website: { icon: Globe, label: '網站' },
  other: { icon: LinkIcon, label: '其他' },
};

// For Category Tabs (Available icons for selection)
const CATEGORY_ICONS = {
  flame: { icon: Flame, label: '火焰 (熱門)' },
  credit: { icon: CreditCard, label: '信用卡' },
  chart: { icon: TrendingUp, label: '圖表 (證券)' },
  wallet: { icon: Wallet, label: '錢包 (數位帳戶)' },
  star: { icon: Star, label: '星星' },
  heart: { icon: Heart, label: '愛心' },
  bag: { icon: ShoppingBag, label: '購物袋' },
  plane: { icon: Plane, label: '飛機 (旅遊)' },
  phone: { icon: Smartphone, label: '手機' },
  zap: { icon: Zap, label: '閃電' },
  tag: { icon: Tag, label: '標籤' },
  award: { icon: Award, label: '獎牌' },
  gift: { icon: Gift, label: '禮物' },
};

// Default Categories (if none set)
const DEFAULT_CATEGORIES = [
  { id: 'hot', label: '本月主打', icon: 'flame' },
  { id: 'credit', label: '信用卡', icon: 'credit' },
  { id: 'securities', label: '證券開戶', icon: 'chart' },
  { id: 'digital', label: '數位帳戶', icon: 'wallet' },
];

// --- Color Palette ---
const THEME = {
  bg: '#F5F0EB',          
  card: '#FFFFFF',        
  primary: '#B6968B',     
  primaryDark: '#9A7A6F', 
  secondary: '#EBE1DD',   
  accent: '#D4A5A5',      
  textMain: '#4A3B32',    
  textLight: '#8C7B75',   
  badgeBg: '#F0EAE6',     
  tagBg: '#EEE9E6',       
  tagText: '#7D6A65',     
};

// --- Helper: Image Compression ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH < img.width ? MAX_WIDTH : img.width;
        canvas.height = MAX_WIDTH < img.width ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Helper Component: Image Upload Input ---
const ImageUpload = ({ imageUrl, onImageChange, placeholder = "圖片預覽" }) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const compressedBase64 = await compressImage(file);
      onImageChange(compressedBase64);
    } catch (err) {
      console.error("Image upload error:", err);
      alert("圖片處理失敗，請試試看別張圖片");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      {imageUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-stone-200 bg-white">
          <img src={imageUrl} alt="Uploaded" className="w-full h-32 object-contain bg-stone-50" />
          <button 
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2"
          >
            <Edit2 size={20} /> 更換圖片
          </button>
          <button 
            type="button"
            onClick={() => onImageChange('')}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button 
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="w-full h-32 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:border-[#B6968B] hover:text-[#B6968B] hover:bg-[#B6968B]/5 transition-all gap-2"
        >
          {loading ? (
             <span className="animate-pulse">處理中...</span>
          ) : (
            <>
              <Upload size={24} />
              <span className="text-sm font-medium">點擊上傳圖片</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

// --- Helper Component: Dynamic List Input ---
const DynamicListInput = ({ items, onChange, placeholder, icon: Icon, addButtonText = "新增項目" }) => {
  const updateItem = (index, newValue) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  const addItem = () => {
    onChange([...items, '']);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-center group">
          {Icon && <Icon size={16} className="text-[#B6968B] shrink-0" />}
          <div className="flex-1 relative">
             <input
              className="input w-full py-2.5 text-sm pr-8"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              autoFocus={item === ''}
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="p-2 text-stone-300 hover:text-red-500 hover:bg-stone-100 rounded-full transition-colors"
            title="刪除此行"
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="text-xs font-bold text-[#B6968B] flex items-center gap-1.5 hover:opacity-80 px-1 py-1.5 transition-opacity"
      >
        <div className="w-5 h-5 rounded-full bg-[#B6968B]/10 flex items-center justify-center">
            <Plus size={12} />
        </div>
        {addButtonText}
      </button>
    </div>
  );
};

// --- Logo Component ---
const NayoLogo = () => (
  <div className="flex items-center justify-center gap-2 mb-2">
    <div className="relative">
      <h1 className="text-3xl font-bold tracking-wide" style={{ color: THEME.textMain }}>
        Nayo 娜攸
      </h1>
      <div className="absolute -top-1 -right-3">
        <div className="w-2 h-2 rounded-full bg-[#D4A5A5]" />
      </div>
    </div>
  </div>
);

// --- Component: Social Icon Button (Enhanced) ---
const SocialButton = ({ type, url, label, showLabel, onClick }) => {
  const socialConfig = SOCIAL_ICONS[type] || SOCIAL_ICONS.other;
  const Icon = socialConfig.icon;
  const displayLabel = label || socialConfig.label;

  if (!url && !onClick) return null;
  
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const Wrapper = url ? 'a' : 'button';
  const props = url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : { onClick: handleClick };

  if (showLabel) {
    return (
        <Wrapper 
          {...props}
          className="flex items-center gap-2 h-12 px-5 rounded-2xl bg-white shadow-sm border border-[#EBE6E1] text-[#B6968B] hover:scale-105 hover:shadow-md transition-all duration-300 min-w-[140px] justify-center"
        >
          <Icon size={20} strokeWidth={1.5} />
          <span className="text-sm font-bold text-stone-600">{displayLabel}</span>
        </Wrapper>
    );
  }

  return (
    <Wrapper 
      {...props}
      className="flex flex-col items-center gap-1 group relative"
    >
      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-[#EBE6E1] flex items-center justify-center text-[#B6968B] group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <span className="text-[10px] font-medium text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 whitespace-nowrap bg-white/80 px-2 py-0.5 rounded-full pointer-events-none">
        {displayLabel}
      </span>
    </Wrapper>
  );
};

// --- Component: Tab ---
const Tab = ({ id, label, iconKey, isActive, onClick }) => {
  const Icon = CATEGORY_ICONS[iconKey]?.icon || Flame; // Fallback to Flame
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-sm whitespace-nowrap
        ${isActive 
          ? 'bg-[#B6968B] text-white transform scale-105 shadow-md' 
          : 'bg-white text-[#8C7B75] hover:bg-stone-50'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
};

// --- Component: Link Card ---
const LinkCard = ({ link, onEdit, onDelete, isEditing }) => {
  const giftList = typeof link.giftContent === 'string' ? link.giftContent.split('\n').filter(Boolean) : [];
  const conditionList = typeof link.conditions === 'string' ? link.conditions.split('\n').filter(Boolean) : [];

  return (
    <div className="relative group mb-5 bg-white rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-white">
      
      {isEditing && (
        <div className="absolute top-2 right-2 flex gap-2 z-20">
          <button 
            onClick={(e) => { e.preventDefault(); onEdit(link); }}
            className="p-2 bg-white/90 backdrop-blur rounded-full text-stone-600 shadow-sm hover:text-[#B6968B] transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); onDelete(link.id); }}
            className="p-2 bg-white/90 backdrop-blur rounded-full text-stone-600 shadow-sm hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <a 
        href={isEditing ? '#' : link.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`block p-5 ${isEditing ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              {link.bankName && (
                <span className="px-2 py-1 text-xs font-bold rounded-md" style={{ backgroundColor: THEME.tagBg, color: THEME.tagText }}>
                  {link.bankName}
                </span>
              )}
              {link.tag && (
                <span className="px-2 py-1 text-xs font-bold rounded-md" style={{ backgroundColor: '#EADCD5', color: '#8C6B61' }}>
                  {link.tag}
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold mb-1" style={{ color: THEME.textMain }}>
              {link.title}
            </h3>
            <p className="text-sm font-medium mb-1" style={{ color: THEME.textLight }}>
              {link.subtitle || link.description}
            </p>
          </div>

          {link.badgeValue && (
            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl shrink-0 ml-3 shadow-sm border border-stone-100 bg-gradient-to-br from-stone-50 to-stone-100">
              <div className="text-xs font-bold text-center leading-tight px-1" style={{ color: THEME.textMain }}>
                {link.badgeValue}
              </div>
              <div className="text-[9px] mt-1 px-1.5 py-0.5 rounded-full bg-[#4A3B32] text-white">
                價值
              </div>
            </div>
          )}
        </div>

        {(giftList.length > 0 || link.giftImageUrl) && (
          <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#FCF9F7', border: '1px solid #F5EFE9' }}>
            <div className="flex items-center gap-2 mb-2">
              <Gift size={14} className="text-[#B6968B]" />
              <span className="text-xs font-bold text-[#8C7B75]">首刷好禮</span>
            </div>
            
            {link.giftType === 'image' && link.giftImageUrl ? (
               <img 
                src={link.giftImageUrl} 
                alt="Gift" 
                className="w-full h-32 object-contain rounded-lg bg-white border border-stone-100" 
              />
            ) : (
              <ul className="text-sm space-y-1" style={{ color: THEME.textMain }}>
                {giftList.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D4A5A5] shrink-0" />
                    <span className="break-words w-full">{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(conditionList.length > 0 || link.deadline) && (
          <div className="flex flex-wrap justify-between items-end text-[10px] text-stone-400 mb-4 px-1 gap-2">
            <div className="flex-1 min-w-[50%]">
              {conditionList.length > 0 && (
                <div className="flex flex-col gap-1">
                  {conditionList.map((cond, i) => (
                    <div key={i} className="flex gap-1.5 items-start">
                       <CheckCircle2 size={10} className="mt-0.5 shrink-0 text-[#B6968B]" />
                       <span className="leading-tight">{cond}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {link.deadline && (
              <div className="flex items-center gap-1 font-medium whitespace-nowrap bg-stone-50 px-2 py-0.5 rounded-full">
                <Calendar size={10} />
                <span>期限: {link.deadline}</span>
              </div>
            )}
          </div>
        )}

        <div 
          className="w-full py-3 rounded-xl text-white font-bold text-center shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          style={{ backgroundColor: THEME.primary }}
        >
          立即申辦領取
          <ExternalLink size={16} />
        </div>
      </a>
    </div>
  );
};

// --- Component: Login Modal ---
const LoginModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error(err);
      setError('登入失敗：請檢查 Email 與密碼是否正確');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#4A3B32]">管理員登入</h2>
          <button onClick={onClose}><X size={24} className="text-stone-400" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label flex items-center gap-1"><User size={14}/> Email</label>
            <input 
              type="email" 
              className="input" 
              placeholder="請輸入您在的Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label flex items-center gap-1"><Key size={14}/> 密碼</label>
            <input 
              type="password" 
              className="input" 
              placeholder="請輸入密碼"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <div className="text-red-500 text-sm font-bold text-center">{error}</div>}

          <button 
            type="submit" 
            className="btn-primary py-3 text-lg mt-2 shadow-lg disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Profile Editor Modal (Updated: Categories Manager) ---
const ProfileEditorModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [data, setData] = useState({
    name: 'Nayo 娜攸',
    bio: '生活 x 理財 x 貓咪 | 陪你一起變有錢 🤎',
    avatarUrl: '',
    siteTitle: 'Nayo 娜攸理財', 
    faviconUrl: '', 
    socialLinks: [],
    categories: [] // New: Custom Categories
  });

  useEffect(() => {
    if (initialData) {
      let links = initialData.socialLinks || [];
      if (links.length === 0 && (initialData.igUrl || initialData.email)) {
        if (initialData.igUrl) links.push({ id: 'ig', type: 'instagram', url: initialData.igUrl, label: 'Instagram', showLabel: false });
        if (initialData.email) links.push({ id: 'mail', type: 'mail', url: `mailto:${initialData.email}`, label: 'Email', showLabel: false });
        if (initialData.blogUrl) links.push({ id: 'blog', type: 'blog', url: initialData.blogUrl, label: '部落格', showLabel: false });
        if (initialData.sponsorUrl) links.push({ id: 'sponsor', type: 'sponsor', url: initialData.sponsorUrl, label: '贊助娜攸', showLabel: true }); 
      }
      
      // Default Categories if empty
      let cats = initialData.categories;
      if (!cats || cats.length === 0) {
        cats = DEFAULT_CATEGORIES;
      }

      setData({ ...data, ...initialData, socialLinks: links, categories: cats });
    }
  }, [initialData]);

  // Social Links Handlers
  const addSocialLink = () => setData({ ...data, socialLinks: [...data.socialLinks, { id: Date.now().toString(), type: 'instagram', url: '', label: '', showLabel: false }] });
  const updateSocialLink = (index, field, value) => { const newLinks = [...data.socialLinks]; newLinks[index] = { ...newLinks[index], [field]: value }; setData({ ...data, socialLinks: newLinks }); };
  const removeSocialLink = (index) => setData({ ...data, socialLinks: data.socialLinks.filter((_, i) => i !== index) });

  // Category Handlers
  const addCategory = () => setData({ ...data, categories: [...data.categories, { id: `cat-${Date.now()}`, label: '新分類', icon: 'tag' }] });
  const updateCategory = (index, field, value) => { const newCats = [...data.categories]; newCats[index] = { ...newCats[index], [field]: value }; setData({ ...data, categories: newCats }); };
  const removeCategory = (index) => { if(confirm('刪除分類後，該分類下的連結可能無法正常顯示，確定刪除？')) setData({ ...data, categories: data.categories.filter((_, i) => i !== index) }); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">編輯個人檔案 & 網站設定</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-5 space-y-6">
           {/* Avatar Upload */}
           <div className="flex items-start gap-4">
            <div className="w-20 h-20 shrink-0">
               <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200 overflow-hidden relative">
                  {data.avatarUrl ? <img src={data.avatarUrl} className="w-full h-full object-cover" /> : <Camera size={24} className="text-stone-400" />}
               </div>
            </div>
            <div className="flex-1">
               <label className="label">上傳大頭貼</label>
               <ImageUpload 
                 imageUrl={""} 
                 onImageChange={(base64) => setData({...data, avatarUrl: base64})}
                 placeholder="選擇圖片"
               />
            </div>
           </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="label">顯示名稱</label>
              <input className="input" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Slogan (副標題)</label>
              <input className="input" value={data.bio} onChange={e => setData({...data, bio: e.target.value})} />
            </div>
          </div>

          <hr className="border-stone-100" />
          
          {/* Website Settings */}
          <div>
            <label className="label flex items-center gap-1 text-[#B6968B]"><Globe size={14}/> 網站顯示設定</label>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 space-y-3">
               <div>
                 <label className="label text-[10px]">網站標題 (Browser Title)</label>
                 <input className="input" placeholder="例如：Nayo 娜攸理財" value={data.siteTitle} onChange={e => setData({...data, siteTitle: e.target.value})} />
               </div>
               <div>
                 <label className="label text-[10px]">網站小圖示 (Favicon)</label>
                 <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 border border-stone-200 rounded-lg flex items-center justify-center bg-white overflow-hidden shrink-0">
                       {data.faviconUrl ? <img src={data.faviconUrl} className="w-full h-full object-contain"/> : <span className="text-[8px] text-stone-400">無</span>}
                    </div>
                    <div className="flex-1">
                        <ImageUpload imageUrl={""} onImageChange={(base64) => setData({...data, faviconUrl: base64})} placeholder="上傳 Logo" />
                    </div>
                 </div>
               </div>
            </div>
          </div>

          <hr className="border-stone-100" />
          
          {/* Category Tabs Manager (New) */}
          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="label flex items-center gap-1 text-[#B6968B]"><Layout size={14}/> 分類標籤管理 (Tabs)</label>
                <button onClick={addCategory} className="text-xs bg-[#B6968B] text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={12} /> 新增分類
                </button>
            </div>
            <div className="space-y-2">
                {data.categories.map((cat, index) => (
                    <div key={cat.id || index} className="flex gap-2 items-center bg-stone-50 p-2 rounded-lg border border-stone-100">
                        <select 
                            className="p-2 rounded border border-stone-200 text-sm outline-none w-24 shrink-0"
                            value={cat.icon}
                            onChange={(e) => updateCategory(index, 'icon', e.target.value)}
                        >
                            {Object.keys(CATEGORY_ICONS).map(key => (
                                <option key={key} value={key}>{CATEGORY_ICONS[key].label}</option>
                            ))}
                        </select>
                        <input 
                            className="flex-1 p-2 rounded border border-stone-200 text-sm outline-none"
                            value={cat.label}
                            onChange={(e) => updateCategory(index, 'label', e.target.value)}
                            placeholder="分類名稱"
                        />
                        <button onClick={() => removeCategory(index)} className="p-2 text-stone-300 hover:text-red-500">
                            <X size={16} />
                        </button>
                    </div>
                ))}
                <p className="text-[10px] text-stone-400 mt-1">* ID: {data.categories.map(c => c.id).join(', ')} (請勿頻繁修改分類，以免連結找不到歸屬)</p>
            </div>
          </div>

          <hr className="border-stone-100" />
          
          {/* Social Links Manager */}
          <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-[#4A3B32]">社群連結管理</h3>
                <button onClick={addSocialLink} className="text-xs bg-[#B6968B] text-white px-2 py-1 rounded flex items-center gap-1">
                    <Plus size={12} /> 新增
                </button>
            </div>
            
            <div className="space-y-3">
                {data.socialLinks.map((link, index) => (
                    <div key={link.id || index} className="bg-stone-50 p-3 rounded-xl border border-stone-100 relative group">
                        <button onClick={() => removeSocialLink(index)} className="absolute top-2 right-2 text-stone-300 hover:text-red-500">
                            <X size={16} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2 pr-6">
                            <div>
                                <label className="text-[10px] font-bold text-stone-400 block mb-1">平台圖示</label>
                                <select 
                                    className="w-full p-2 rounded border border-stone-200 text-sm outline-none"
                                    value={link.type}
                                    onChange={(e) => updateSocialLink(index, 'type', e.target.value)}
                                >
                                    {Object.keys(SOCIAL_ICONS).map(key => (
                                        <option key={key} value={key}>{SOCIAL_ICONS[key].label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-stone-400 block mb-1">顯示文字</label>
                                <input 
                                    className="w-full p-2 rounded border border-stone-200 text-sm outline-none"
                                    placeholder="按鈕文字"
                                    value={link.label}
                                    onChange={(e) => updateSocialLink(index, 'label', e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="mb-2">
                            <input 
                                className="w-full p-2 rounded border border-stone-200 text-sm outline-none"
                                placeholder="連結網址 (https://...)"
                                value={link.url}
                                onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id={`showLabel-${index}`}
                                checked={link.showLabel}
                                onChange={(e) => updateSocialLink(index, 'showLabel', e.target.checked)}
                                className="w-4 h-4 accent-[#B6968B]"
                            />
                            <label htmlFor={`showLabel-${index}`} className="text-xs text-stone-600 font-medium cursor-pointer">
                                在按鈕旁顯示文字 (打字)
                            </label>
                        </div>
                    </div>
                ))}
            </div>
          </div>

          <button onClick={() => onSave(data)} className="btn-primary mt-4">儲存所有設定</button>
        </div>
      </div>
    </div>
  );
};

// ... LinkEditorModal (Updated to use Dynamic Categories) ...
const LinkEditorModal = ({ isOpen, onClose, onSave, initialData, categories = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    bankName: '',
    tag: '',
    url: '',
    category: 'credit',
    badgeValue: '',
    giftType: 'text',
    giftImageUrl: '',
    deadline: ''
  });

  const [giftContentList, setGiftContentList] = useState([]);
  const [conditionsList, setConditionsList] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setGiftContentList(initialData.giftContent ? initialData.giftContent.split('\n') : []);
      setConditionsList(initialData.conditions ? initialData.conditions.split('\n') : []);
    } else {
      setFormData({
        title: '', subtitle: '', bankName: '', tag: '', url: '', category: categories[0]?.id || 'hot',
        badgeValue: '', giftType: 'text', giftImageUrl: '', deadline: ''
      });
      setGiftContentList([]);
      setConditionsList([]);
    }
  }, [initialData, isOpen, categories]);

  const handleSaveInternal = () => {
    const finalData = {
      ...formData,
      giftContent: giftContentList.join('\n'),
      conditions: conditionsList.join('\n')
    };
    onSave(finalData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">編輯推廣連結</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">分類</label>
              <select className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">銀行/機構</label>
              <input className="input" placeholder="例如：台新銀行" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="label">卡片/帳戶名稱 (大標題)</label>
            <input className="input" placeholder="例如：Richart @GoGo卡" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          <div>
            <label className="label">副標題/特色 (顯示於標題下方)</label>
            <input className="input" placeholder="例如：新戶送 $2000 即享券" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} />
          </div>

           <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">左上標籤 (選填)</label>
              <input className="input" placeholder="例如：#網購神卡" value={formData.tag} onChange={e => setFormData({...formData, tag: e.target.value})} />
            </div>
            <div>
              <label className="label">右上價值標章 (選填)</label>
              <input className="input" placeholder="例如：$2,200" value={formData.badgeValue} onChange={e => setFormData({...formData, badgeValue: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="label">推廣連結 URL</label>
            <input className="input" type="url" placeholder="https://..." value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} />
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
            <div className="flex justify-between items-center mb-2">
                 <label className="label mb-0 flex items-center gap-1"><Gift size={14}/> 首刷禮內容 (選填)</label>
            </div>
            
            <div className="flex gap-2 mb-3">
               <button type="button" onClick={() => setFormData({...formData, giftType: 'text'})} className={`flex-1 py-1.5 text-xs rounded border transition-colors ${formData.giftType === 'text' ? 'bg-[#B6968B] text-white border-[#B6968B]' : 'bg-white text-stone-500 hover:bg-stone-100'}`}>條列式文字</button>
               <button type="button" onClick={() => setFormData({...formData, giftType: 'image'})} className={`flex-1 py-1.5 text-xs rounded border transition-colors ${formData.giftType === 'image' ? 'bg-[#B6968B] text-white border-[#B6968B]' : 'bg-white text-stone-500 hover:bg-stone-100'}`}>圖片模式</button>
            </div>

            {formData.giftType === 'text' ? (
              <DynamicListInput 
                items={giftContentList}
                onChange={setGiftContentList}
                placeholder="輸入好禮項目..."
                addButtonText="新增好禮"
              />
            ) : (
              <ImageUpload 
                imageUrl={formData.giftImageUrl}
                onImageChange={(base64) => setFormData({...formData, giftImageUrl: base64})}
                placeholder="上傳首刷禮圖片"
              />
            )}
          </div>

          <div>
             <label className="label flex items-center gap-1">
                <CheckCircle2 size={12}/> 條件限制 (選填)
             </label>
             <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                 <DynamicListInput 
                    items={conditionsList}
                    onChange={setConditionsList}
                    placeholder="例如：核卡30天內消費滿..."
                    addButtonText="新增條件"
                  />
             </div>
          </div>
          
           <div>
              <label className="label">截止期限 (選填)</label>
              <input className="input" placeholder="例如：2025/12/31" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
            </div>

          <button onClick={handleSaveInternal} className="btn-primary py-3 text-lg mt-2">
            <Save size={20} /> 儲存連結
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const isAdmin = user && !user.isAnonymous;

  const [links, setLinks] = useState([]);
  const [profile, setProfile] = useState(null);
  // Filter now uses the category ID
  const [filter, setFilter] = useState('hot'); 
  
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  // --- Dynamic Title & Favicon Update ---
  useEffect(() => {
    if (profile) {
      document.title = profile.siteTitle || 'Nayo 娜攸理財';
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      if (profile.faviconUrl) {
        link.href = profile.faviconUrl;
      }
    }
  }, [profile]);

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); 
      if (!currentUser) {
        signInAnonymously(auth).catch((err) => {
            console.warn("Guest login skipped/failed:", err.code);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Links & Profile
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'links'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubLinks = onSnapshot(q, (snapshot) => {
        setLinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Link fetch error:", error));

    const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'profile');
    const unsubProfile = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) setProfile(doc.data());
      else setProfile({
        name: 'Nayo 娜攸',
        bio: '生活 x 理財 x 貓咪 | 陪你一起變有錢 🤎',
        siteTitle: 'Nayo 娜攸理財',
        socialLinks: [],
        categories: DEFAULT_CATEGORIES
      });
    });

    return () => { unsubLinks(); unsubProfile(); };
  }, []);

  const handleSaveLink = async (formData) => {
    if (!user || !isAdmin) return;
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'links');
    try {
      if (editingLink) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'links', editingLink.id), { ...formData, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collectionRef, { ...formData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setLinkModalOpen(false);
      setEditingLink(null);
    } catch (err) { alert("儲存失敗: " + err.message); }
  };

  const handleSaveProfile = async (data) => {
    if (!user || !isAdmin) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'profile'), data, { merge: true });
      setProfileModalOpen(false);
    } catch (err) { alert("儲存失敗: " + err.message); }
  };

  const handleDelete = async (id) => {
    if (!user || !isAdmin) return;
    if (!confirm('確定刪除？')) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'links', id)); } catch(e){ console.error(e); }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Determine active categories
  const currentCategories = profile?.categories?.length > 0 ? profile.categories : DEFAULT_CATEGORIES;

  // Ensure filter is valid
  useEffect(() => {
    if (currentCategories.length > 0 && !currentCategories.find(c => c.id === filter)) {
        setFilter(currentCategories[0].id);
    }
  }, [currentCategories, filter]);

  const filteredLinks = useMemo(() => {
    // If 'hot' is selected, show links marked as 'hot' OR show all if user wants (custom logic can be added)
    // Here we strictly filter by category ID
    // However, if we want "Hot" to be a special filter that shows links from ANY category marked as "hot", that requires extra data field.
    // Assuming simple Category filtering for now based on the request.
    return links.filter(l => l.category === filter);
  }, [links, filter]);

  return (
    <div className="min-h-screen font-sans pb-24 selection:bg-[#D4A5A5] selection:text-white" style={{ backgroundColor: THEME.bg }}>
      
      {/* --- Admin Toggle (Login/Logout) --- */}
      <div className="fixed bottom-8 right-6 z-50 flex flex-col gap-3">
        {isAdmin && (
          <button onClick={() => { setEditingLink(null); setLinkModalOpen(true); }} className="w-14 h-14 bg-[#B6968B] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform animate-in zoom-in">
            <Plus size={28} />
          </button>
        )}
        <button 
          onClick={isAdmin ? handleLogout : () => setLoginModalOpen(true)} 
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all border-2 border-white
            ${isAdmin ? 'bg-stone-800 text-white' : 'bg-white text-stone-400 hover:text-[#B6968B]'}`}
          title={isAdmin ? "登出管理員" : "管理員登入"}
        >
          {isAdmin ? <LogOut size={20} /> : <Lock size={20} />}
        </button>
      </div>

      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-[#F5F0EB] flex flex-col">
        
        {/* Header Content */}
        <div className="pt-10 px-6 text-center pb-6">
          <NayoLogo />
          <div className="flex justify-center mb-6">
             <div className="w-24 h-24 rounded-full bg-stone-100 p-1 border border-[#EBE1DD] shadow-sm relative group overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-stone-200 flex items-center justify-center text-stone-400">
                    <Camera size={28} />
                  </div>
                )}
             </div>
          </div>

          <p className="inline-block px-4 py-1.5 rounded-full bg-white/60 text-sm font-medium text-[#8C7B75] backdrop-blur-sm shadow-sm border border-white/50 mb-6">
             {profile?.bio || '生活 x 理財 x 貓咪 | 陪你一起變有錢 🤎'}
          </p>

          {/* Social Icons Row (Dynamic) */}
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {profile?.socialLinks?.map((link, index) => (
                <SocialButton 
                    key={link.id || index}
                    type={link.type}
                    url={link.url}
                    label={link.label}
                    showLabel={link.showLabel}
                    onClick={null} 
                />
            ))}
            
            {/* Fallback for legacy data */}
            {(!profile?.socialLinks || profile.socialLinks.length === 0) && (
               <>
                 <SocialButton type="instagram" url={profile?.igUrl} />
                 <SocialButton type="mail" url={profile?.email ? `mailto:${profile.email}` : null} />
                 <SocialButton type="blog" url={profile?.blogUrl} />
                 <SocialButton type="sponsor" url={profile?.sponsorUrl} showLabel={true} />
               </>
            )}
          </div>

          {isAdmin && (
            <button onClick={() => setProfileModalOpen(true)} className="text-xs text-[#B6968B] underline opacity-80 hover:opacity-100">
              編輯個人檔案與社群
            </button>
          )}
        </div>

        {/* Dynamic Categories / Tabs */}
        <div className="sticky top-0 z-40 bg-[#F5F0EB]/95 backdrop-blur-md py-3 px-2 flex overflow-x-auto no-scrollbar gap-2 mb-2 shadow-sm border-b border-white/20">
          {currentCategories.map(cat => (
              <Tab 
                key={cat.id} 
                id={cat.id} 
                label={cat.label} 
                iconKey={cat.icon} 
                isActive={filter === cat.id} 
                onClick={setFilter} 
              />
          ))}
        </div>

        {/* Content List */}
        <div className="px-5 py-4 pb-12 flex-1">
           {filteredLinks.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <div className="w-20 h-20 bg-stone-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Layout size={32} />
              </div>
              <p>這裡還沒有內容喔</p>
              {isAdmin && <p className="text-xs mt-2">點擊右下角 + 新增</p>}
            </div>
           ) : (
             filteredLinks.map(link => (
               <LinkCard 
                 key={link.id} 
                 link={link} 
                 isEditing={isAdmin}
                 onEdit={(l) => { setEditingLink(l); setLinkModalOpen(true); }}
                 onDelete={handleDelete}
               />
             ))
           )}
        </div>

        {/* Footer Credit & Login Link */}
        <div className="text-center pb-8 pt-4 border-t border-black/5 mx-6">
           <div className="text-[10px] text-stone-300 mb-2">Nayo Money © 2025</div>
           {!isAdmin && (
             <button 
               onClick={() => setLoginModalOpen(true)}
               className="text-[9px] text-stone-300 hover:text-[#B6968B] transition-colors"
             >
               管理員登入
             </button>
           )}
        </div>

      </div>

      {/* Modals */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
      />
      <LinkEditorModal 
        isOpen={linkModalOpen} 
        onClose={() => { setLinkModalOpen(false); setEditingLink(null); }}
        onSave={handleSaveLink}
        initialData={editingLink}
        categories={currentCategories} // Pass dynamic categories to link editor
      />
      <ProfileEditorModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)}
        onSave={handleSaveProfile}
        initialData={profile}
      />
      
      {/* Global Styles */}
      <style>{`
        .input {
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.75rem;
          border: 1px solid #EBE1DD;
          outline: none;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .input:focus {
          border-color: #B6968B;
          box-shadow: 0 0 0 2px rgba(182, 150, 139, 0.1);
        }
        .label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #8C7B75;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .btn-primary {
          width: 100%;
          padding: 0.75rem;
          border-radius: 0.75rem;
          background-color: #B6968B;
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: opacity 0.2s;
        }
        .btn-primary:hover {
          opacity: 0.9;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}