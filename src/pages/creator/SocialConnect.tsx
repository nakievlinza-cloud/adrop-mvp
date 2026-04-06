import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ExternalLink,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  Copy,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { apiRequest } from "../../lib/api";

type SocialPlatformId = "tiktok" | "youtube" | "instagram";

type VerificationStatus = "verified" | "legacy";

interface SocialAccount {
  platform: SocialPlatformId;
  username: string;
  url: string;
  followers?: string;
  verificationStatus?: VerificationStatus;
  verificationMethod?: "bio_code";
  verificationCode?: string;
  verifiedAt?: any;
}

type VerifyOwnershipResponse = {
  verified: boolean;
  platform: SocialPlatformId;
  username: string;
  profileUrl: string;
  reason?: string | null;
};

const platforms = [
  {
    id: "tiktok" as const,
    name: "TikTok",
    icon: "♪",
    color: "bg-black",
    textColor: "text-white",
    borderColor: "border-white/20",
    instruction: "Откройте TikTok, зайдите в Редактировать профиль и вставьте код в bio/описание аккаунта.",
  },
  {
    id: "youtube" as const,
    name: "YouTube Shorts",
    icon: "▶",
    color: "bg-red-600",
    textColor: "text-white",
    borderColor: "border-white/20",
    instruction: "Откройте описание канала YouTube и временно добавьте туда код подтверждения.",
  },
  {
    id: "instagram" as const,
    name: "Instagram Reels",
    icon: "◎",
    color: "bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500",
    textColor: "text-white",
    borderColor: "border-white/20",
    instruction: "Откройте Instagram, нажмите Редактировать профиль и вставьте код в bio аккаунта.",
  },
];

function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").replace(/\/+$/, "");
}

function buildProfileUrl(platform: SocialPlatformId, handle: string) {
  const cleanHandle = normalizeUsername(handle);
  switch (platform) {
    case "tiktok":
      return `https://www.tiktok.com/@${cleanHandle}`;
    case "instagram":
      return `https://www.instagram.com/${cleanHandle}/`;
    case "youtube":
      return `https://www.youtube.com/@${cleanHandle}`;
    default:
      return "";
  }
}

function isVerifiedAccount(account: Partial<SocialAccount> | null | undefined) {
  return Boolean(account && (account.verificationStatus === "verified" || account.verifiedAt));
}

function generateVerificationCode(platform: SocialPlatformId) {
  const prefix = {
    tiktok: "TT",
    instagram: "IG",
    youtube: "YT",
  }[platform];

  const bytes = new Uint32Array(1);
  window.crypto.getRandomValues(bytes);
  const suffix = bytes[0].toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(6, "7");
  return `ADROP-${prefix}-${suffix}`;
}

export function CreatorSocialConnect() {
  const { user } = useAuthStore();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatformId | null>(null);
  const [username, setUsername] = useState("");
  const [url, setUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [verifyingOwnership, setVerifyingOwnership] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationHint, setVerificationHint] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedPlatformMeta = useMemo(
    () => platforms.find((platform) => platform.id === selectedPlatform) || null,
    [selectedPlatform],
  );

  const cleanUsername = useMemo(() => normalizeUsername(username), [username]);
  const profileUrlPreview = useMemo(() => {
    if (!selectedPlatform || !cleanUsername) return "";
    return url.trim() || buildProfileUrl(selectedPlatform, cleanUsername);
  }, [cleanUsername, selectedPlatform, url]);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      return;
    }

    let isMounted = true;
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const currentData = userDoc.exists() ? userDoc.data() : {};
        const currentAccounts = Array.isArray(currentData.socialAccounts) ? currentData.socialAccounts : [];
        if (isMounted) {
          setAccounts(currentAccounts);
        }
      } catch (error) {
        console.error("Error loading social accounts:", error);
      } finally {
        if (isMounted) {
          setLoadingAccounts(false);
        }
      }
    };

    loadAccounts();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const resetModalState = () => {
    setShowAddModal(false);
    setSelectedPlatform(null);
    setUsername("");
    setUrl("");
    setFollowers("");
    setVerificationCode("");
    setVerificationError("");
    setVerificationHint("");
    setCopiedCode(false);
  };

  const openConnectModal = (platform: SocialPlatformId, account?: SocialAccount) => {
    setSelectedPlatform(platform);
    setUsername(account?.username || "");
    setUrl(account?.url || "");
    setFollowers(account?.followers || "");
    setVerificationCode("");
    setVerificationError("");
    setVerificationHint("");
    setCopiedCode(false);
    setShowAddModal(true);
  };

  const handleCopyCode = async () => {
    if (!verificationCode) return;
    try {
      await navigator.clipboard.writeText(verificationCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch (error) {
      console.error("Could not copy verification code:", error);
    }
  };

  const handleGenerateCode = () => {
    if (!selectedPlatform || !cleanUsername) {
      setVerificationError("Сначала укажите username профиля, который хотите подтвердить.");
      return;
    }

    setVerificationCode(generateVerificationCode(selectedPlatform));
    setVerificationError("");
    setVerificationHint("Добавьте код в bio/описание профиля, сохраните изменения и потом нажмите «Проверить и подключить».");
  };

  const handleVerifyAndAddAccount = async () => {
    if (!selectedPlatform || !cleanUsername || !verificationCode || !user) {
      setVerificationError("Не хватает данных для проверки профиля.");
      return;
    }

    setVerifyingOwnership(true);
    setVerificationError("");
    setVerificationHint("");

    try {
      const response = await apiRequest<VerifyOwnershipResponse>("/api/social/verify-ownership", {
        method: "POST",
        body: JSON.stringify({
          platform: selectedPlatform,
          username: cleanUsername,
          url: profileUrlPreview,
          code: verificationCode,
        }),
      });

      if (!response.verified) {
        setVerificationError(response.reason || "Код не найден на странице профиля.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const currentData = userDoc.exists() ? userDoc.data() : {};
      const currentAccounts = Array.isArray(currentData.socialAccounts) ? currentData.socialAccounts : [];
      const nextAccounts = currentAccounts.filter((account: SocialAccount) => account.platform !== selectedPlatform);
      const newAccount: SocialAccount = {
        platform: selectedPlatform,
        username: cleanUsername,
        url: response.profileUrl,
        followers: followers.trim() || undefined,
        verificationStatus: "verified",
        verificationMethod: "bio_code",
        verificationCode,
        verifiedAt: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        socialAccounts: [...nextAccounts, { ...newAccount, verifiedAt: serverTimestamp() }],
      });

      setAccounts([...nextAccounts, newAccount]);
      resetModalState();
    } catch (error: any) {
      console.error("Error verifying social account:", error);
      setVerificationError(error?.message || "Не удалось проверить владение профилем.");
    } finally {
      setVerifyingOwnership(false);
    }
  };

  const handleRemoveAccount = async (index: number) => {
    if (!user) return;

    try {
      const newAccounts = accounts.filter((_, i) => i !== index);
      await updateDoc(doc(db, "users", user.uid), {
        socialAccounts: newAccounts,
      });
      setAccounts(newAccounts);
    } catch (error) {
      console.error("Error removing account:", error);
    }
  };

  const platformAccountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.platform, account]));
  }, [accounts]);

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Подключить соц-сети</h1>
        <p className="text-foreground/60">Теперь аккаунт считается подключённым только после проверки владения через код в bio.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-primary/15 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-white mb-1">Защита от чужих профилей</h2>
            <p className="text-sm text-foreground/70 leading-6">
              Мы больше не просто сохраняем ссылку на аккаунт. Креатор должен доказать, что действительно управляет профилем:
              вставить код в bio и пройти автоматическую проверку страницы.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Подключенные аккаунты</h2>
        {loadingAccounts ? (
          <div className="bg-card border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-foreground/20 animate-spin" />
            </div>
            <p className="text-foreground/60">Загружаем аккаунты...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-card border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-foreground/20" />
            </div>
            <p className="text-foreground/60">Пока нет подключенных аккаунтов</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((account, index) => {
              const platform = platforms.find((item) => item.id === account.platform);
              if (!platform) return null;
              const verified = isVerifiedAccount(account);

              return (
                <motion.div
                  key={`${account.platform}-${account.username}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${platform.color} ${platform.borderColor} border rounded-2xl p-6 relative`}
                >
                  <button
                    onClick={() => handleRemoveAccount(index)}
                    className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>

                  <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-black/20 rounded-xl flex items-center justify-center text-2xl">
                        {platform.icon}
                      </div>
                      <div>
                        <h3 className={`font-bold ${platform.textColor} mb-1`}>{platform.name}</h3>
                        <p className={`text-sm ${platform.textColor}/80`}>@{account.username}</p>
                      </div>
                    </div>
                    <div className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border ${verified ? "border-emerald-300/25 bg-emerald-300/15 text-emerald-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>
                      {verified ? "Проверен" : "Без проверки"}
                    </div>
                  </div>

                  {account.followers && (
                    <div className="mb-3">
                      <p className={`text-xs ${platform.textColor}/60 mb-1`}>Подписчиков</p>
                      <p className={`text-lg font-mono font-bold ${platform.textColor}`}>{account.followers}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <a
                      href={account.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 text-sm ${platform.textColor}/80 hover:${platform.textColor} transition-colors`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Открыть профиль
                    </a>
                    {!verified && (
                      <button
                        onClick={() => openConnectModal(account.platform, account)}
                        className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Подтвердить
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Добавить аккаунт</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const existingAccount = platformAccountMap.get(platform.id);
            const verified = isVerifiedAccount(existingAccount);

            return (
              <motion.button
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  if (verified) return;
                  openConnectModal(platform.id, existingAccount);
                }}
                disabled={verified}
                className={`${platform.color} ${platform.borderColor} border rounded-2xl p-6 text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 relative overflow-hidden`}
              >
                {verified && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className="w-12 h-12 bg-black/20 rounded-xl flex items-center justify-center text-2xl mb-4">
                  {platform.icon}
                </div>
                <h3 className={`font-bold ${platform.textColor} mb-1`}>{platform.name}</h3>
                <p className={`text-sm ${platform.textColor}/70`}>
                  {verified ? "Подключено и проверено" : existingAccount ? "Переподключить с проверкой" : "Подключить аккаунт"}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {showAddModal && selectedPlatformMeta && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={resetModalState}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${selectedPlatformMeta.color} rounded-xl flex items-center justify-center text-xl`}>
                  {selectedPlatformMeta.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold">Подтвердить {selectedPlatformMeta.name}</h3>
                  <p className="text-sm text-foreground/60">Сначала докажите владение профилем, потом аккаунт сохранится в системе.</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Имя пользователя *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full h-12 bg-card border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ссылка на профиль</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={buildProfileUrl(selectedPlatform, "username")}
                  className="w-full h-12 bg-card border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors font-mono text-sm"
                />
                <p className="text-xs text-foreground/50 mt-1">Можно оставить пустым, тогда ссылка соберётся автоматически из username.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Количество подписчиков</label>
                <input
                  type="text"
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                  placeholder="100K"
                  className="w-full h-12 bg-card border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                />
              </div>

              {profileUrlPreview && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-foreground/70">
                  <div className="mb-2 flex items-center gap-2 text-white font-medium">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    Публичный профиль для проверки
                  </div>
                  <div className="break-all font-mono text-xs text-primary">{profileUrlPreview}</div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-background/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Проверка владения аккаунтом
                </div>
                <p className="text-sm text-foreground/70 leading-6">
                  {selectedPlatformMeta.instruction} Аккаунт должен быть открытым, иначе код не увидит проверка.
                </p>

                {verificationCode ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-primary/70 mb-1">Код подтверждения</div>
                        <div className="font-mono text-base font-bold text-white">{verificationCode}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="h-10 px-4 rounded-xl border border-primary/20 bg-white/5 hover:bg-white/10 text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        {copiedCode ? "Скопировано" : "Копировать"}
                      </button>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground/60">
                      1. Вставьте код в bio/описание профиля. 2. Сохраните изменения. 3. Подождите 15-30 секунд. 4. Нажмите «Проверить и подключить».
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Получить код подтверждения
                  </button>
                )}
              </div>

              {verificationHint && (
                <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
                  {verificationHint}
                </div>
              )}

              {verificationError && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={resetModalState}
                  className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                >
                  Отмена
                </button>
                {verificationCode ? (
                  <button
                    onClick={handleVerifyAndAddAccount}
                    disabled={!cleanUsername || verifyingOwnership}
                    className="flex-1 h-12 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ugc-primary/20 flex items-center justify-center gap-2"
                  >
                    {verifyingOwnership ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Проверить и подключить
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateCode}
                    disabled={!cleanUsername}
                    className="flex-1 h-12 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ugc-primary/20"
                  >
                    Получить код
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
