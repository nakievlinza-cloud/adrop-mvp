import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { CreatorSpecializationBadge } from "../../components/CreatorSpecializationBadge";
import { CreatorOnboarding } from "../../components/CreatorOnboarding";
import { Star, MapPin, Link as LinkIcon, Edit3, User, CreditCard, Save, ExternalLink, Upload, X, Plus, Play } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { uploadImageToImgBB } from "../../lib/imgbb";
import { db, storage } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { getAvatarSrc } from "../../lib/avatar";

const PLATFORM_OPTIONS = [
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube Shorts" },
  { id: "instagram", label: "Instagram Reels" }
] as const;

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
  instagram: "Instagram Reels"
};

const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube"
};

const VERTICAL_OPTIONS = [
  { id: "crypto", label: "Crypto" },
  { id: "betting", label: "Betting" },
  { id: "gambling", label: "Gambling" },
  { id: "dating", label: "Dating" },
  { id: "nutra", label: "Nutra" }
];

const VERTICAL_LABELS: Record<string, string> = {
  crypto: "Crypto",
  betting: "Betting",
  gambling: "Gambling",
  dating: "Dating",
  nutra: "Nutra",
  ecommerce: "E-commerce",
  other: "Другое"
};

const FORMAT_OPTIONS = [
  { id: "ugc", label: "UGC" },
  { id: "clip", label: "Баннер/Клип" }
];

const FORMAT_LABELS: Record<string, string> = {
  ugc: "UGC",
  clip: "Баннер/Клип"
};

export function CreatorProfile() {
  const { user, userData } = useAuthStore();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"profile" | "payments" | "reviews">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [addWorkModalOpen, setAddWorkModalOpen] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState("");
  const [workSource, setWorkSource] = useState<"file" | "link">("link");
  const [workTitle, setWorkTitle] = useState("");
  const [workLink, setWorkLink] = useState("");
  const [workPlatform, setWorkPlatform] = useState<string>("");
  const [workVertical, setWorkVertical] = useState<string>("");
  const [workFormat, setWorkFormat] = useState<string>("");
  const [workDescription, setWorkDescription] = useState("");
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [workError, setWorkError] = useState("");
  const [previewWork, setPreviewWork] = useState<any | null>(null);

  // Editable fields
  const [editName, setEditName] = useState(userData?.name || "");
  const [editAbout, setEditAbout] = useState(userData?.about || "");
  const [editCountry, setEditCountry] = useState(userData?.country || "");

  const balance = userData?.balance || 0;

  // Fetch portfolio from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "portfolio"), where("creatorId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const portfolioData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPortfolio(portfolioData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setReviewsLoading(true);
    const q = query(
      collection(db, "reviews"),
      where("creatorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
      setReviewsLoading(false);
    }, () => {
      setReviewsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const resetWorkForm = () => {
    setWorkTitle("");
    setWorkLink("");
    setWorkPlatform("");
    setWorkVertical("");
    setWorkFormat("");
    setWorkDescription("");
    setWorkFile(null);
    setWorkError("");
  };

  const openWorkModal = (source: "link" | "file") => {
    setWorkSource(source);
    setWorkError("");
    setAddWorkModalOpen(true);
  };

  const detectPlatformFromLink = (link: string) => {
    const normalized = link.toLowerCase();
    if (normalized.includes("tiktok.com")) return "tiktok";
    if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "youtube";
    if (normalized.includes("instagram.com")) return "instagram";
    return "";
  };

  const handleWorkLinkChange = (value: string) => {
    setWorkLink(value);
    if (!workPlatform) {
      const detected = detectPlatformFromLink(value);
      if (detected) {
        setWorkPlatform(detected);
      }
    }
  };

  const handleOpenWork = (work: any) => {
    if (work.type === "link" && work.link) {
      window.open(work.link, "_blank", "noopener,noreferrer");
      return;
    }
    if (work.type === "video" || work.type === "image") {
      setPreviewWork(work);
    }
  };

  const handleAddWorkFromFile = async () => {
    if (!workFile || !user) {
      setWorkError("Выберите файл для загрузки.");
      return;
    }

    setIsUploading(true);
    setWorkError("");
    try {
      const safeName = workFile.name.replace(/\s+/g, "_");
      const fileRef = ref(storage, `portfolio/${user.uid}/${Date.now()}_${safeName}`);
      await uploadBytes(fileRef, workFile);
      const fileUrl = await getDownloadURL(fileRef);
      const isVideo = workFile.type.startsWith("video");
      const platformLabel = workPlatform ? (PLATFORM_LABELS[workPlatform] || workPlatform) : null;

      await addDoc(collection(db, "portfolio"), {
        creatorId: user.uid,
        imageUrl: fileUrl,
        title: workTitle.trim() || workFile.name,
        type: isVideo ? "video" : "image",
        platform: platformLabel,
        platformId: workPlatform || null,
        vertical: workVertical || null,
        format: workFormat || null,
        description: workDescription.trim() || null,
        source: "file",
        createdAt: serverTimestamp()
      });

      setAddWorkModalOpen(false);
      resetWorkForm();
    } catch (error: any) {
      console.error("Error uploading portfolio item:", error);
      setWorkError(error.message || "Ошибка при загрузке портфолио");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddWorkFromLink = async () => {
    if (!workLink.trim() || !user) return;

    setIsUploading(true);
    setWorkError("");
    try {
      let thumbnail = "";
      const detectedPlatform = detectPlatformFromLink(workLink);
      const platformId = workPlatform || detectedPlatform;

      if (!platformId) {
        setWorkError("Поддерживаются только TikTok, YouTube Shorts и Instagram Reels.");
        setIsUploading(false);
        return;
      }

      // Detect platform and get thumbnail
      if (platformId === "tiktok") {
        // Try to get TikTok oEmbed
        try {
          const oembedResponse = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(workLink)}`);
          if (oembedResponse.ok) {
            const oembedData = await oembedResponse.json();
            thumbnail = oembedData.thumbnail_url || oembedData.cover_url || "";
          }
        } catch (e) {
          console.log("Could not fetch TikTok oEmbed");
        }
      } else if (platformId === "youtube") {
        // Extract video ID and get thumbnail
        const videoIdMatch = workLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (videoIdMatch) {
          thumbnail = `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
        }
      } else if (platformId === "instagram") {
        // Instagram doesn't provide public thumbnails without API
        thumbnail = "https://placehold.co/600x1067/1a1a2e/FFF?text=Instagram";
      }

      // Add to Firestore
      await addDoc(collection(db, "portfolio"), {
        creatorId: user.uid,
        link: workLink.trim(),
        title: workTitle.trim() || `Работа из ${PLATFORM_LABELS[platformId] || "соцсети"}`,
        type: "link",
        platform: PLATFORM_LABELS[platformId] || platformId,
        platformId,
        vertical: workVertical || null,
        format: workFormat || null,
        description: workDescription.trim() || null,
        thumbnail: thumbnail,
        source: "link",
        createdAt: serverTimestamp()
      });

      // Reset form
      setAddWorkModalOpen(false);
      resetWorkForm();
    } catch (error: any) {
      console.error("Error adding work from link:", error);
      setWorkError(error.message || "Ошибка при добавлении работы");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (location.includes("tab=payments")) {
      setActiveTab("payments");
    } else if (location.includes("tab=reviews")) {
      setActiveTab("reviews");
    } else if (location.includes("tab=orders")) {
      setLocation("/creator/my-responses");
    } else {
      setActiveTab("profile");
    }
  }, [location]);

  // Update edit fields when userData changes
  useEffect(() => {
    if (userData) {
      setEditName(userData.name || "");
      setEditAbout(userData.about || "");
      setEditCountry(userData.country || "");
    }
  }, [userData]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    const file = e.target.files[0];
    setIsUploading(true);
    setAvatarUploadError("");

    try {
      const avatarUrl = await uploadImageToImgBB(file);

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        avatar: avatarUrl,
        avatarUrl: avatarUrl
      });

    } catch (error) {
      console.error("Error uploading avatar:", error);
      setAvatarUploadError("Не удалось загрузить аватар. Попробуйте другой файл.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: editName,
        about: editAbout,
        country: editCountry
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  // Removed auto-show onboarding - prices are now optional
  // Creators work through offers, prices are just for reference

  return (
    <>
      <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === "profile" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
          }`}
        >
          <User className="w-4 h-4" /> Мой профиль
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === "reviews" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
          }`}
        >
          <Star className="w-4 h-4" /> Отзывы
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === "payments" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Настройки выплат
        </button>
      </div>

      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile Header */}
          <div className="bg-card border border-white/5 rounded-3xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-ugc-primary/10 blur-3xl rounded-full pointer-events-none" />
            
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
              <div className="w-32 shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background relative group">
                  <img
                    src={getAvatarSrc(userData?.avatarUrl || userData?.avatar, userData?.name, "creator")}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isEditing && (
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                      {isUploading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </>
                      )}
                    </label>
                  )}
                </div>
                {avatarUploadError && (
                  <p className="mt-2 text-xs text-red-400">{avatarUploadError}</p>
                )}
              </div>

              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-3xl font-display font-bold mb-2 bg-transparent border-b border-white/20 focus:border-ugc-primary outline-none w-full max-w-md"
                      />
                    ) : (
                      <h1 className="text-3xl font-display font-bold mb-2">{userData?.name || "Креатор"}</h1>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-foreground/60 text-sm">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCountry}
                          onChange={(e) => setEditCountry(e.target.value)}
                          placeholder="Страна"
                          className="bg-transparent border-b border-white/20 focus:border-ugc-primary outline-none"
                        />
                      ) : (
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {editCountry || "Не указано"}</span>
                      )}
                      {(() => {
                        const connectedAccounts = Array.isArray(userData?.socialAccounts) ? userData.socialAccounts : [];
                        const items = connectedAccounts.length > 0
                          ? connectedAccounts
                              .map((account: any) => ({
                                key: `social-${account.platform}-${account.username}`,
                                label: SOCIAL_PLATFORM_LABELS[account.platform] || account.platform,
                                url: account.url
                              }))
                              .filter((item: any) => item.url)
                          : ([
                              { key: "tiktok", label: "TikTok", url: userData?.platforms?.tiktok },
                              { key: "instagram", label: "Instagram", url: userData?.platforms?.instagram },
                              { key: "youtube", label: "YouTube", url: userData?.platforms?.youtube }
                            ] as const).filter((item) => item.url);

                        return items.map((item: any) => (
                          <a
                            key={item.key}
                            href={item.url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <LinkIcon className="w-4 h-4" />
                            {item.label}
                          </a>
                        ));
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    className={`h-10 px-4 rounded-xl border transition-colors flex items-center gap-2 text-sm font-medium ${
                      isEditing ? "bg-ugc-primary border-ugc-primary text-white" : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {isEditing ? <><Save className="w-4 h-4" /> Сохранить</> : <><Edit3 className="w-4 h-4" /> Редактировать</>}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  {userData?.specializations && userData.specializations.length > 0 && (
                    <CreatorSpecializationBadge specialization={userData.specializations} size="lg" />
                  )}
                  <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-full text-sm font-medium">
                    <Star className="w-4 h-4 fill-current" /> {userData?.rating || "5.0"} ({userData?.reviews || 0} отзывов)
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    value={editAbout}
                    onChange={(e) => setEditAbout(e.target.value)}
                    className="w-full h-24 bg-background border border-white/10 rounded-xl p-3 focus:outline-none focus:border-ugc-primary transition-colors text-foreground/80 resize-none"
                    placeholder="Расскажите о себе..."
                  />
                ) : (
                  <p className="text-foreground/80 max-w-2xl">
                    {userData?.about || "Описание профиля не заполнено."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Portfolio */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display font-bold">Портфолио</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openWorkModal("link")}
                      className="text-sm text-white bg-ugc-primary hover:bg-ugc-primary/90 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Добавить по ссылке
                    </button>
                    <button
                      onClick={() => openWorkModal("file")}
                      className="text-sm text-ugc-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4" />
                      {isUploading ? 'Загрузка...' : 'Загрузить файл'}
                    </button>
                  </div>
                </div>

                {portfolio.length === 0 ? (
                  <div className="bg-card border border-white/5 rounded-3xl p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                      <Upload className="w-10 h-10 text-foreground/40" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Портфолио пусто</h3>
                    <p className="text-foreground/60 mb-6 max-w-md mx-auto">
                      Добавьте свои лучшие работы, чтобы заказчики могли увидеть ваши возможности
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => openWorkModal("link")}
                        className="h-12 px-6 rounded-xl font-bold text-white bg-ugc-primary hover:bg-ugc-primary/90 transition-all shadow-lg shadow-ugc-primary/20 flex items-center gap-2"
                      >
                        <LinkIcon className="w-5 h-5" /> Добавить по ссылке
                      </button>
                      <button
                        onClick={() => openWorkModal("file")}
                        disabled={isUploading}
                        className="h-12 px-6 rounded-xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-5 h-5" /> {isUploading ? 'Загрузка...' : 'Загрузить файл'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {portfolio.map((work, index) => {
                      const platformKey =
                        work.platformId ||
                        (work.link?.includes("tiktok.com")
                          ? "tiktok"
                          : work.link?.includes("youtube.com") || work.link?.includes("youtu.be")
                            ? "youtube"
                            : work.link?.includes("instagram.com")
                              ? "instagram"
                              : "");
                      const platformLabel =
                        work.platform || (platformKey ? PLATFORM_LABELS[platformKey] : "");
                      const formatLabel = work.format ? FORMAT_LABELS[work.format] || work.format : "";
                      const verticalLabel = work.vertical ? VERTICAL_LABELS[work.vertical] || work.vertical : "";
                      const metaItems = [platformLabel, formatLabel, verticalLabel].filter(Boolean);

                      return (
                        <motion.div
                          key={work.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative rounded-2xl overflow-hidden bg-card border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className="aspect-[9/16] relative bg-gray-900">
                            {work.type === "link" ? (
                              work.thumbnail ? (
                                <img
                                  src={work.thumbnail}
                                  alt={work.title}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : platformKey === "tiktok" ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00f2ea] to-[#ff0050]">
                                  <div className="text-center text-white p-4">
                                    <svg className="w-12 h-12 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                    </svg>
                                    <p className="text-sm font-medium">TikTok</p>
                                  </div>
                                </div>
                              ) : platformKey === "youtube" ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF0000] to-[#282828]">
                                  <div className="text-center text-white p-4">
                                    <svg className="w-12 h-12 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                    <p className="text-sm font-medium">YouTube</p>
                                  </div>
                                </div>
                              ) : platformKey === "instagram" ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]">
                                  <div className="text-center text-white p-4">
                                    <svg className="w-12 h-12 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                                    </svg>
                                    <p className="text-sm font-medium">Instagram</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ugc-primary to-purple-600">
                                  <div className="text-center text-white p-4">
                                    <LinkIcon className="w-12 h-12 mx-auto mb-2" />
                                    <p className="text-sm font-medium">{platformLabel || "Ссылка"}</p>
                                  </div>
                                </div>
                              )
                            ) : work.type === "video" ? (
                              <video
                                src={work.imageUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={work.imageUrl}
                                alt={work.title}
                                className="w-full h-full object-cover"
                              />
                            )}

                            {(work.type === "video" || work.type === "link") && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWork(work);
                                }}
                                aria-label="Открыть видео"
                                className="absolute inset-0 z-10 flex items-center justify-center opacity-100 transition-opacity"
                              >
                                <div className="relative flex flex-col items-center gap-2">
                                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-xl flex items-center justify-center">
                                    <Play className="w-7 h-7 text-white ml-0.5" />
                                  </div>
                                  <span className="text-sm font-medium text-white bg-white/15 backdrop-blur-md border border-white/30 px-3 py-1 rounded-full">
                                    Открыть
                                  </span>
                                </div>
                              </button>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <p className="text-sm font-medium mb-1 truncate">{work.title}</p>
                              {metaItems.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {metaItems.map((item) => (
                                    <span key={item} className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 text-white/80">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {work.link && (
                                <a
                                  href={work.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-ugc-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Открыть
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Stats */}
            <div className="space-y-8">

              {userData?.audienceStats && (
                <div className="bg-card border border-white/5 rounded-2xl p-6">
                  <h3 className="text-xl font-display font-bold mb-6">Статистика аудитории</h3>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground/60">Мужчины / Женщины</span>
                        <span className="font-medium">{userData.audienceStats.gender.male}% / {userData.audienceStats.gender.female}%</span>
                      </div>
                      <div className="h-2 w-full bg-pink-500/20 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500" style={{ width: `${userData.audienceStats.gender.male}%` }} />
                        <div className="h-full bg-pink-500" style={{ width: `${userData.audienceStats.gender.female}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground/60">Топ возраст</span>
                        <span className="font-medium">{userData.audienceStats.topAge} ({userData.audienceStats.topAgePercentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${userData.audienceStats.topAgePercentage}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground/60">Топ ГЕО</span>
                        <span className="font-medium">{userData.audienceStats.topGeo} ({userData.audienceStats.topGeoPercentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${userData.audienceStats.topGeoPercentage}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "reviews" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
          <div className="bg-card border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold">Отзывы</h2>
                <p className="text-sm text-foreground/60">Отзывы доступны только вам. Публично виден только рейтинг.</p>
              </div>
              <div className="flex items-center gap-2 text-yellow-400 font-medium">
                <Star className="w-5 h-5 fill-current" />
                <span>{userData?.rating || "5.0"}</span>
                <span className="text-foreground/50 text-sm">({userData?.reviews || 0})</span>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="text-center py-12 text-foreground/60">Загружаем отзывы...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
                <p className="text-foreground/60">Пока нет отзывов.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const ratingValue = Number(review.rating || 0);
                  return (
                    <div key={review.id} className="border border-white/10 rounded-2xl p-5 bg-white/5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{review.customerName || "Бренд"}</p>
                          {review.offerTitle && (
                            <p className="text-xs text-foreground/50 mt-1">{review.offerTitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const starValue = i + 1;
                            const filled = starValue <= ratingValue;
                            return (
                              <Star key={starValue} className={`w-4 h-4 ${filled ? "fill-current" : ""}`} />
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80 mt-3">
                        {review.comment || "Без комментария"}
                      </p>
                      {review.createdAt?.toDate && (
                        <p className="text-xs text-foreground/50 mt-2">
                          {new Date(review.createdAt.toDate()).toLocaleDateString("ru-RU")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {activeTab === "payments" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-white/5 rounded-3xl p-8">
              <h2 className="text-2xl font-display font-bold mb-6">Настройки выплат</h2>
              <p className="text-foreground/60 mb-8">
                Укажите реквизиты для получения выплат за выполненные заказы. В данный момент мы поддерживаем только криптовалютные переводы в USDT.
              </p>

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Сеть (Network)</label>
                  <select className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors appearance-none">
                    <option value="trc20">USDT (TRC20) - Рекомендуется</option>
                    <option value="erc20">USDT (ERC20)</option>
                    <option value="bep20">USDT (BEP20)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Адрес кошелька</label>
                  <input 
                    type="text" 
                    defaultValue="T9yD14Nj9j7xAB4dbGeiX9h8unkKXcul"
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors font-mono text-sm"
                  />
                  <p className="text-xs text-foreground/50 mt-2">
                    Пожалуйста, внимательно проверьте адрес. Переводы на неверный адрес невозможно отменить.
                  </p>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <button type="button" className="h-12 px-8 rounded-xl font-semibold text-white bg-ugc-primary hover:bg-ugc-primary/90 transition-all flex items-center gap-2">
                    <Save className="w-4 h-4" /> Сохранить реквизиты
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-card border border-white/5 rounded-3xl p-8">
              <h2 className="text-2xl font-display font-bold mb-6">История операций</h2>
              {payoutRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-foreground/60 text-sm">
                        <th className="pb-4 font-medium">ID Транзакции</th>
                        <th className="pb-4 font-medium">Дата</th>
                        <th className="pb-4 font-medium">Сумма</th>
                        <th className="pb-4 font-medium text-right">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.map((req) => (
                        <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 font-mono text-sm text-foreground/80">{req.id}</td>
                          <td className="py-4 text-sm text-foreground/60">{req.date}</td>
                          <td className="py-4 font-mono font-bold text-green-400">${req.amount.toFixed(2)}</td>
                          <td className="py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              req.status === 'Выплачено' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              req.status === 'В обработке' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {req.status === 'В обработке' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mr-2 animate-pulse" />}
                              {req.status === 'Выплачено' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2" />}
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <p className="text-foreground/60">У вас пока нет истории операций.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-card border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full pointer-events-none" />
              <h3 className="text-lg font-display font-bold mb-2">Ваш баланс</h3>
              <p className="text-4xl font-mono font-bold text-green-400 mb-6">${balance.toFixed(2)}</p>
              
              <button 
                onClick={() => {
                  const amount = parseFloat(window.prompt("Введите сумму для вывода (USDT):", balance.toString()) || "0");
                  if (amount > 0) {
                    if (amount <= balance) {
                      alert("Заявка на выплату успешно создана!");
                    } else {
                      alert("Ошибка: недостаточно средств или неверная сумма.");
                    }
                  }
                }}
                disabled={balance <= 0}
                className="w-full h-12 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Запросить выплату
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>

    {/* Modals outside main container */}
    <AnimatePresence>
      {previewWork && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewWork(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[111]"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold">{previewWork.title || "Просмотр"}</h3>
                {previewWork.platform && (
                  <p className="text-xs text-foreground/60">{previewWork.platform}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewWork(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              {previewWork.type === "video" ? (
                <video
                  src={previewWork.imageUrl}
                  controls
                  playsInline
                  className="w-full max-h-[70vh] rounded-2xl bg-black"
                />
              ) : (
                <img
                  src={previewWork.imageUrl}
                  alt={previewWork.title}
                  className="w-full max-h-[70vh] object-contain rounded-2xl bg-black"
                />
              )}
              {previewWork.description && (
                <p className="text-sm text-foreground/70 mt-4">{previewWork.description}</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Onboarding Modal */}
    {showOnboarding && (
      <CreatorOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        userId={user?.uid || ""}
        initialData={userData}
      />
    )}

    {/* Add Work Modal */}
    <AnimatePresence>
      {addWorkModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setAddWorkModalOpen(false);
              resetWorkForm();
            }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-[101]"
          >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Добавить работу</h3>
                <button
                  onClick={() => {
                    setAddWorkModalOpen(false);
                    resetWorkForm();
                  }}
                  className="text-foreground/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {workError && (
                  <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
                    {workError}
                  </div>
                )}

                <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setWorkSource("link")}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                      workSource === "link" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
                    }`}
                  >
                    Ссылка
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkSource("file")}
                    className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                      workSource === "file" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
                    }`}
                  >
                    Файл
                  </button>
                </div>

                {workSource === "link" ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">Ссылка на видео</label>
                    <input
                      type="url"
                      value={workLink}
                      onChange={(e) => handleWorkLinkChange(e.target.value)}
                      placeholder="https://www.tiktok.com/@user/video/..."
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors font-mono text-sm"
                    />
                    <p className="text-xs text-foreground/50 mt-2">
                      Поддерживаются: TikTok, YouTube Shorts, Instagram Reels
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">Файл видео или изображения</label>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="video/*,image/*"
                        onChange={(e) => setWorkFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:bg-white/5 hover:border-white/20 transition-all">
                        {workFile ? (
                          <>
                            <p className="text-sm font-medium">{workFile.name}</p>
                            <p className="text-xs text-foreground/50 mt-1">Файл выбран</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mx-auto mb-2 text-foreground/50" />
                            <p className="text-sm font-medium">Нажмите или перетащите файл</p>
                            <p className="text-xs text-foreground/50 mt-1">MP4, MOV, JPG, PNG</p>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Площадка</label>
                    <select
                      value={workPlatform}
                      onChange={(e) => setWorkPlatform(e.target.value)}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors appearance-none"
                    >
                      <option value="">Не выбрано</option>
                      {PLATFORM_OPTIONS.map((platform) => (
                        <option key={platform.id} value={platform.id}>
                          {platform.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Формат</label>
                    <select
                      value={workFormat}
                      onChange={(e) => setWorkFormat(e.target.value)}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors appearance-none"
                    >
                      <option value="">Не выбрано</option>
                      {FORMAT_OPTIONS.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Вертикаль</label>
                    <select
                      value={workVertical}
                      onChange={(e) => setWorkVertical(e.target.value)}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors appearance-none"
                    >
                      <option value="">Не выбрано</option>
                      {VERTICAL_OPTIONS.map((vertical) => (
                        <option key={vertical.id} value={vertical.id}>
                          {vertical.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Название</label>
                    <input
                      type="text"
                      value={workTitle}
                      onChange={(e) => setWorkTitle(e.target.value)}
                      placeholder="Например: UGC для крипто-бренда"
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Описание (необязательно)</label>
                  <textarea
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="Коротко о ролике, оффере, формате"
                    rows={3}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 focus:outline-none focus:border-ugc-primary transition-colors text-sm resize-none"
                  />
                </div>

                {workSource === "link" && (
                  <div className="bg-ugc-primary/5 border border-ugc-primary/20 rounded-xl p-4">
                    <p className="text-sm text-ugc-primary">
                      <LinkIcon className="w-4 h-4 inline mr-2" />
                      Превью для TikTok и YouTube подтянем автоматически.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setAddWorkModalOpen(false);
                      resetWorkForm();
                    }}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={workSource === "link" ? handleAddWorkFromLink : handleAddWorkFromFile}
                    disabled={isUploading || (workSource === "link" ? !workLink.trim() : !workFile)}
                    className="flex-1 h-12 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ugc-primary/20"
                  >
                    {isUploading ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
