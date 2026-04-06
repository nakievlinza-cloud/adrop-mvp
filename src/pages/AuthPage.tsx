import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Play,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Loader2,
  Upload,
  Mail,
  ShieldCheck,
  RefreshCw,
  LogIn,
} from "lucide-react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { uploadImageToImgBB } from "../lib/imgbb";
import { apiRequest } from "../lib/api";
import { PrivacyPolicyContent } from "./PrivacyPage";
import { getAvatarFallback } from "../lib/avatar";

const AVATARS = [
  "Alex Mercer",
  "Nina Vale",
  "Mira Lane",
  "Theo Ross",
  "Ivy North",
  "Luca Hart",
  "Ava Quinn",
  "Leo Cross",
  "Zoe Miles",
  "Noah Reed",
].map((name) => getAvatarFallback(name, "creator"));
const VERTICALS = ["Crypto", "Betting", "Gambling", "Dating", "Nutra"];
const GEO_OPTIONS = ["США", "UK", "СНГ", "Европа", "Global", "Латинская Америка", "Азия", "Другое"];

type UserRole = "creator" | "customer";
type VerificationState = {
  email: string;
  role: UserRole | null;
  message: string;
  emailDeliveryRecorded?: boolean;
};

function getAuthErrorMessage(error: any, fallback: string) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "Этот email уже зарегистрирован. Попробуйте войти в аккаунт.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Неверный email или пароль.";
    case "auth/invalid-email":
      return "Укажите корректный email.";
    case "auth/missing-password":
      return "Введите пароль.";
    case "auth/weak-password":
      return "Пароль должен быть не короче 6 символов.";
    case "auth/too-many-requests":
      return "Слишком много попыток с этого устройства. Мы поставили короткую паузу перед следующей попыткой.";
    default:
      return error?.message || fallback;
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getRequestedRole(value: string | null): UserRole | null {
  return value === "creator" || value === "customer" ? value : null;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getVerificationActionSettings() {
  return {
    url: `${window.location.origin}/auth?mode=login&verified=1`,
    handleCodeInApp: false,
  };
}

export function AuthPage() {
  const [, setLocation] = useLocation();

  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [role, setRole] = useState<UserRole>("creator");
  const [step, setStep] = useState(1);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customerLogo, setCustomerLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [selectedGeo, setSelectedGeo] = useState<string[]>([]);
  const [customerVerticals, setCustomerVerticals] = useState<string[]>([]);
  const [companyDescription, setCompanyDescription] = useState("");
  const [productUrl, setProductUrl] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const [about, setAbout] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [verticals, setVerticals] = useState<string[]>([]);

  const [network, setNetwork] = useState("trc20");
  const [wallet, setWallet] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [retryCooldown, setRetryCooldown] = useState(0);
  const [isOpeningDevVerificationLink, setIsOpeningDevVerificationLink] = useState(false);

  const totalSteps = role === "creator" ? 5 : 4;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isThrottled = retryCooldown > 0;
  const isLocalDev = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const replaceAuthQuery = useCallback((mode: "login" | "register", nextRole?: UserRole | null, extras?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("mode", mode);

    if (mode === "register" && nextRole) {
      params.set("role", nextRole);
    }

    if (extras) {
      Object.entries(extras).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });
    }

    const query = params.toString();
    window.history.replaceState({}, "", query ? `/auth?${query}` : "/auth");
  }, []);

  const clearTransientState = useCallback(() => {
    setError("");
    setInfoMessage("");
    setResetSent(false);
    setVerificationState(null);
    setIsResetPassword(false);
    setAcceptTerms(false);
  }, []);

  const openLoginView = useCallback(() => {
    clearTransientState();
    setIsLogin(true);
    setStep(1);
    replaceAuthQuery("login");
  }, [clearTransientState, replaceAuthQuery]);

  const openRegisterView = useCallback((nextRole?: UserRole | null, nextStep?: number) => {
    clearTransientState();
    const resolvedRole = nextRole || role;
    setIsLogin(false);
    setRole(resolvedRole);
    setStep(nextStep ?? 1);
    replaceAuthQuery("register", resolvedRole);
  }, [clearTransientState, replaceAuthQuery, role]);

  const applyQueryState = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    const requestedRole = getRequestedRole(params.get("role"));
    const isVerifiedReturn = params.get("verified") === "1";
    const verificationRequired = params.get("verify") === "required";

    if (requestedRole) {
      setRole(requestedRole);
    }

    if (requestedMode === "register") {
      setIsLogin(false);
      setIsResetPassword(false);
      setVerificationState(null);
      setResetSent(false);
      setStep(requestedRole ? 2 : 1);
    } else {
      setIsLogin(true);
      setStep(1);
    }

    if (isVerifiedReturn) {
      setInfoMessage("Email подтвержден. Теперь можно войти в аккаунт.");
      const cleanupParams = new URLSearchParams(window.location.search);
      cleanupParams.delete("verified");
      const query = cleanupParams.toString();
      window.history.replaceState({}, "", query ? `/auth?${query}` : "/auth?mode=login");
      return;
    }

    if (verificationRequired) {
      setInfoMessage("Для входа в кабинет подтвердите email по письму, которое мы отправили после регистрации.");
    }
  }, []);

  useEffect(() => {
    applyQueryState();
    const handlePopState = () => applyQueryState();
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [applyQueryState]);

  useEffect(() => {
    if (!isPolicyModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPolicyModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isPolicyModalOpen]);

  useEffect(() => {
    if (!retryCooldown) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRetryCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [retryCooldown]);

  const toggleSpecialization = (spec: string) => {
    setSpecializations((prev) => (prev.includes(spec) ? prev.filter((item) => item !== spec) : [...prev, spec]));
  };

  const toggleVertical = (vert: string) => {
    setVerticals((prev) => (prev.includes(vert) ? prev.filter((item) => item !== vert) : [...prev, vert]));
  };

  const toggleCustomerVertical = (vert: string) => {
    setCustomerVerticals((prev) => (prev.includes(vert) ? prev.filter((item) => item !== vert) : [...prev, vert]));
  };

  const toggleGeo = (geo: string) => {
    setSelectedGeo((prev) => (prev.includes(geo) ? prev.filter((item) => item !== geo) : [...prev, geo]));
  };

  const creatorFinalAvatar = useMemo(() => customAvatar || selectedAvatar, [customAvatar, selectedAvatar]);

  const handleNext = () => setStep((current) => current + 1);
  const handleBack = () => setStep((current) => Math.max(1, current - 1));

  const handleCustomAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) {
      return;
    }

    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploadingAvatar(true);
    setUploadProgress(0);
    setError("");

    try {
      const uploadedAvatar = await uploadImageToImgBB(file, (progress) => {
        setUploadProgress(progress);
      });
      setCustomAvatar(uploadedAvatar);
    } catch (uploadError: any) {
      console.error("Error uploading avatar:", uploadError);
      setError(uploadError.message || "Ошибка при загрузке аватарки");
    } finally {
      setIsUploadingAvatar(false);
      setUploadProgress(0);
    }
  };

  const handleCustomerLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) {
      return;
    }

    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomerLogo(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploadingLogo(true);
    setLogoUploadProgress(0);
    setError("");

    try {
      const uploadedLogo = await uploadImageToImgBB(file, (progress) => {
        setLogoUploadProgress(progress);
      });
      setCustomerLogo(uploadedLogo);
    } catch (uploadError: any) {
      console.error("Error uploading logo:", uploadError);
      setError(uploadError.message || "Ошибка при загрузке логотипа");
    } finally {
      setIsUploadingLogo(false);
      setLogoUploadProgress(0);
    }
  };

  const syncUserVerificationState = async (uid: string, isVerified: boolean) => {
    await setDoc(
      doc(db, "users", uid),
      {
        emailVerified: isVerified,
        lastLoginAt: new Date(),
        ...(isVerified
          ? {
              mustVerifyEmail: false,
              verificationCompletedAt: new Date(),
            }
          : {}),
      },
      { merge: true },
    );
  };

  const sendVerificationLetter = async (user: User, selectedRole: UserRole) => {
    try {
      await sendEmailVerification(user, getVerificationActionSettings());
    } catch (verificationError: any) {
      if (
        verificationError?.code === "auth/unauthorized-continue-uri" ||
        verificationError?.code === "auth/invalid-continue-uri"
      ) {
        await sendEmailVerification(user);
      } else {
        throw verificationError;
      }
    }
    await setDoc(
      doc(db, "users", user.uid),
      {
        role: selectedRole,
        authProvider: "email",
        mustVerifyEmail: true,
        emailVerified: user.emailVerified,
        verificationEmailSentAt: new Date(),
      },
      { merge: true },
    );
  };

  const routeByRole = (selectedRole?: UserRole | null) => {
    if (selectedRole === "creator") {
      setLocation("/creator/offers");
      return;
    }

    setLocation("/customer/dashboard");
  };

  const completeSignIn = async (user: User, fallbackRole?: UserRole | null) => {
    await reload(user);
    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);
    const userData = userSnapshot.exists() ? userSnapshot.data() : null;
    const resolvedRole = (userData?.role as UserRole | undefined) || fallbackRole || role;
    const mustVerifyEmail = Boolean(userData?.mustVerifyEmail);

    if (mustVerifyEmail && !user.emailVerified) {
      const hasSentVerificationEmail = Boolean(userData?.verificationEmailSentAt);
      await signOut(auth);
      setVerificationState({
        email: user.email || email,
        role: resolvedRole,
        emailDeliveryRecorded: hasSentVerificationEmail,
        message: hasSentVerificationEmail
          ? `Мы отправили письмо на ${user.email || email}. Подтвердите email и затем вернитесь ко входу.`
          : `Email для ${user.email || email} ещё не подтверждён. Письмо не было зафиксировано как отправленное, поэтому запросите его повторно или откройте ссылку подтверждения вручную.`,
      });
      setIsLogin(true);
      setIsResetPassword(false);
      replaceAuthQuery("login");
      throw new Error("Подтвердите email перед входом в аккаунт.");
    }

    await syncUserVerificationState(user.uid, user.emailVerified);
    routeByRole(resolvedRole);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const normalizedEmail = normalizeEmail(email);
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await completeSignIn(userCredential.user, role);
    } catch (loginError: any) {
      applyAuthError(loginError, "Ошибка при входе");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, normalizeEmail(email));
      setResetSent(true);
    } catch (resetError: any) {
      applyAuthError(resetError, "Ошибка при отправке письма");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    if (!acceptTerms) {
      setError("Подтвердите согласие с условиями платформы и политикой конфиденциальности.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const normalizedEmail = normalizeEmail(email);
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;
      const finalAvatar = role === "creator" ? creatorFinalAvatar : customerLogo;
      const selectedRole = role;

      await updateProfile(user, {
        displayName: fullName.trim(),
        photoURL: finalAvatar || null,
      });

      const userData = {
        uid: user.uid,
        email: normalizedEmail,
        role: selectedRole,
        authProvider: "email",
        name: fullName.trim(),
        fullName: fullName.trim(),
        companyName: selectedRole === "customer" ? fullName.trim() : null,
        avatar: finalAvatar,
        avatarUrl: finalAvatar,
        balance: 0,
        createdAt: new Date(),
        emailVerified: user.emailVerified,
        mustVerifyEmail: true,
        country: selectedGeo.length > 0 ? selectedGeo[0] : null,
        geo: uniqueStrings(selectedGeo),
        ...(selectedRole === "creator" && {
          about: about.trim(),
          specializations: uniqueStrings(specializations),
          verticals: uniqueStrings(verticals),
          paymentDetails: { network, wallet: wallet.trim() },
          platforms: {
            tiktok: tiktok.trim(),
            instagram: instagram.trim(),
            youtube: youtube.trim(),
          },
          pricing: {
            ugcVideo: { price: 150, description: "UGC Видео", duration: "15-30 сек", scriptIncluded: true },
            bannerIntegration: { price: 50, description: "Интеграция баннера" },
          },
          turnaroundTime: "2-3 дня",
          freeRevisions: 1,
          audienceStats: {
            gender: { male: 50, female: 50 },
            topAge: "18-24",
            topAgePercentage: 45,
            topGeo: selectedGeo.length > 0 ? selectedGeo[0] : "США",
            topGeoPercentage: 60,
          },
        }),
        ...(selectedRole === "customer" && {
          companyDescription: companyDescription.trim(),
          verticals: uniqueStrings(customerVerticals),
          productUrl: productUrl.trim() || null,
          onboardingCompleted: false,
        }),
      };

      await setDoc(doc(db, "users", user.uid), userData);
      await sendVerificationLetter(user, selectedRole);
      await signOut(auth);

      setVerificationState({
        email: normalizedEmail,
        role: selectedRole,
        emailDeliveryRecorded: true,
        message: `Мы отправили письмо с подтверждением на ${normalizedEmail}. Откройте ссылку из письма, затем вернитесь и завершите вход.`,
      });
      setInfoMessage("Аккаунт создан. Осталось подтвердить email.");
      setIsLogin(true);
      setIsResetPassword(false);
      setResetSent(false);
      replaceAuthQuery("login");
    } catch (registerError: any) {
      applyAuthError(registerError, "Ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !password) {
      setError("Введите email и пароль, чтобы повторно отправить письмо.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const normalizedEmail = normalizeEmail(email);
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const userSnapshot = await getDoc(doc(db, "users", userCredential.user.uid));
      const selectedRole = (userSnapshot.exists() ? userSnapshot.data().role : verificationState?.role) as UserRole | undefined;
      await sendVerificationLetter(userCredential.user, selectedRole === "creator" ? "creator" : "customer");
      await signOut(auth);

      setVerificationState({
        email: normalizedEmail,
        role: selectedRole === "creator" ? "creator" : "customer",
        emailDeliveryRecorded: true,
        message: `Повторное письмо отправлено на ${normalizedEmail}. Проверьте входящие и папку Спам.`,
      });
      setInfoMessage(`Письмо отправлено на ${normalizedEmail}.`);
    } catch (resendError: any) {
      applyAuthError(resendError, "Не удалось отправить письмо повторно.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteVerification = async () => {
    if (!email || !password) {
      setError("Введите email и пароль, чтобы завершить вход после подтверждения почты.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const normalizedEmail = normalizeEmail(email);
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await reload(userCredential.user);

      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        setError("Письмо ещё не подтверждено. Откройте ссылку из email и попробуйте снова.");
        return;
      }

      await completeSignIn(userCredential.user, verificationState?.role || role);
    } catch (verificationError: any) {
      applyAuthError(verificationError, "Не удалось завершить вход после подтверждения email.");
    } finally {
      setLoading(false);
    }
  };

  const applyAuthError = useCallback((authError: any, fallback: string) => {
    if (authError?.code === "auth/too-many-requests") {
      setRetryCooldown((current) => Math.max(current, 60));
    }
    setError(getAuthErrorMessage(authError, fallback));
  }, []);

  const handleOpenDevVerificationLink = async () => {
    const targetEmail = verificationState?.email || normalizeEmail(email);
    if (!targetEmail) {
      setError("Не удалось определить email для генерации ссылки подтверждения.");
      return;
    }

    setIsOpeningDevVerificationLink(true);
    setError("");
    setInfoMessage("");

    try {
      const response = await apiRequest<{ link?: string; alreadyVerified?: boolean }>(
        "/api/auth/dev-email-verification-link",
        {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({
            email: targetEmail,
            continueUrl: `${window.location.origin}/auth?mode=login&verified=1`,
          }),
        },
      );

      if (response.alreadyVerified) {
        setInfoMessage("Email уже подтверждён. Можно сразу войти в аккаунт.");
        return;
      }

      if (!response.link) {
        throw new Error("Ссылка подтверждения не была сгенерирована.");
      }

      window.location.assign(response.link);
    } catch (devLinkError: any) {
      setError(devLinkError?.message || "Не удалось открыть ссылку подтверждения.");
    } finally {
      setIsOpeningDevVerificationLink(false);
    }
  };

  const renderConsentCard = (selectedRole: UserRole) => {
    const isCreatorRole = selectedRole === "creator";
    const accentClasses = isCreatorRole
      ? "border-ugc-primary/20 bg-ugc-primary/[0.08]"
      : "border-clip-primary/20 bg-clip-primary/[0.08]";
    const badgeClasses = isCreatorRole
      ? "border-ugc-primary/20 bg-ugc-primary/15 text-ugc-primary"
      : "border-clip-primary/20 bg-clip-primary/15 text-clip-primary";
    const checkboxClasses = acceptTerms
      ? isCreatorRole
        ? "border-ugc-primary bg-ugc-primary text-white shadow-[0_0_18px_rgba(236,72,153,0.25)]"
        : "border-clip-primary bg-clip-primary text-white shadow-[0_0_18px_rgba(34,211,238,0.22)]"
      : "border-white/15 bg-background/90 text-transparent";

    return (
      <div className={`mb-6 rounded-2xl border p-4 sm:p-5 ${accentClasses}`}>
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => setAcceptTerms((current) => !current)}
            aria-pressed={acceptTerms}
            aria-label={acceptTerms ? "Убрать согласие с политикой" : "Подтвердить согласие с политикой"}
            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-all ${checkboxClasses}`}
          >
            ✓
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badgeClasses}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Условия и политика
                </div>
                <p className="mt-3 text-sm leading-6 text-white/85">
                  Я принимаю условия платформы и соглашаюсь с политикой конфиденциальности.
                </p>
              </div>

              {acceptTerms && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Согласие подтверждено
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
              >
                <ShieldCheck className="h-4 w-4" />
                Открыть политику
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 pointer-events-none">
        <div className={`absolute inset-0 blur-[100px] rounded-full mix-blend-screen transition-colors duration-1000 ${role === "creator" ? "bg-ugc-primary/50" : "bg-clip-primary/50"}`} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full relative z-10 ${isLogin ? "max-w-md" : "max-w-[720px]"}`}
      >
        <div className="bg-card border border-white/10 rounded-3xl p-8 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              {isLogin ? "С возвращением" : "Создать аккаунт"}
            </h1>
            <p className="text-foreground/60">
              {isLogin ? "Войдите в свой аккаунт ADROP" : "Присоединяйтесь к маркетплейсу ADROP"}
            </p>
          </div>

          {!isLogin && (
            <div className="w-full h-1.5 bg-white/5 rounded-full mb-8 overflow-hidden">
              <motion.div
                className={`h-full ${role === "creator" ? "bg-ugc-primary" : "bg-clip-primary"}`}
                initial={{ width: 0 }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-200 text-sm text-center">
              {infoMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {isThrottled && (
            <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-200">
              Следующую попытку можно сделать через {retryCooldown} сек. Данные в форме сохранены.
            </div>
          )}

          <div className={`${isLogin ? "" : "mx-auto max-w-[620px]"}`}>
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div
                key={verificationState ? "verify" : isResetPassword ? "reset" : "login"}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {verificationState ? (
                  <div className="space-y-5">
                    <div className="text-center py-2">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                        <Mail className="w-8 h-8 text-sky-300" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Подтвердите email</h3>
                      <p className="text-foreground/60 text-sm leading-6">
                        {verificationState.message}
                      </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-foreground/70 space-y-2">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <span>{verificationState.email}</span>
                      </div>
                      <p>
                        {verificationState.emailDeliveryRecorded
                          ? "После клика по ссылке в письме нажмите кнопку ниже, и мы сразу пустим вас в аккаунт."
                          : "Для этого аккаунта Firebase не подтвердил отправку письма. На localhost можно сразу открыть безопасную ссылку ниже и завершить подтверждение без ожидания почты."}
                      </p>
                    </div>

                    {isLocalDev && (
                      <button
                        type="button"
                        onClick={handleOpenDevVerificationLink}
                        disabled={isOpeningDevVerificationLink}
                        className="w-full h-12 rounded-xl font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isOpeningDevVerificationLink ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        {verificationState.emailDeliveryRecorded
                          ? "Открыть ссылку подтверждения"
                          : "Подтвердить через локальную ссылку"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCompleteVerification}
                      disabled={loading || isThrottled}
                      className="w-full h-12 rounded-xl font-semibold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      {isThrottled ? `Пауза ${retryCooldown}с` : "Я подтвердил email, войти"}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={loading || isThrottled}
                      className="w-full h-12 rounded-xl font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                      {isThrottled ? `Пауза ${retryCooldown}с` : "Отправить письмо ещё раз"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVerificationState(null);
                        openLoginView();
                      }}
                      className="w-full text-center text-sm text-foreground/60 hover:text-white transition-colors"
                    >
                      Вернуться к обычному входу
                    </button>
                  </div>
                ) : isResetPassword ? (
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    {resetSent ? (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                        <h3 className="text-xl font-bold mb-2">Письмо отправлено</h3>
                        <p className="text-foreground/60 mb-6">
                          Проверьте ваш email {email} для сброса пароля.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetPassword(false);
                            setResetSent(false);
                            setEmail("");
                            replaceAuthQuery("login");
                          }}
                          className="text-white hover:underline font-medium"
                        >
                          Вернуться ко входу
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-6">
                          <h3 className="text-xl font-bold mb-2">Сброс пароля</h3>
                          <p className="text-foreground/60 text-sm">
                            Введите email для письма со ссылкой на новый пароль.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Email</label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                            placeholder="you@example.com"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading || isThrottled}
                          className="w-full h-12 rounded-xl font-semibold text-white bg-primary hover:bg-primary/90 transition-all mt-6 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isThrottled ? `Пауза ${retryCooldown}с` : "Отправить ссылку"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsResetPassword(false)}
                          className="w-full text-center text-sm text-foreground/60 hover:text-white mt-4 transition-colors"
                        >
                          Вернуться ко входу
                        </button>
                      </>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Пароль</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                        placeholder="••••••••"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsResetPassword(true);
                        setResetSent(false);
                        setVerificationState(null);
                      }}
                      className="text-sm text-foreground/60 hover:text-white transition-colors"
                    >
                      Забыли пароль?
                    </button>

                    <button
                      type="submit"
                      disabled={loading || isThrottled}
                      className="w-full h-12 rounded-xl font-semibold text-white bg-primary hover:bg-primary/90 transition-all mt-6 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isThrottled ? `Пауза ${retryCooldown}с` : "Войти"}
                    </button>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={`register-step-${step}-${role}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-center">Выберите вашу роль</h3>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <button
                        type="button"
                        onClick={() => {
                          setRole("creator");
                          replaceAuthQuery("register", "creator");
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                          role === "creator"
                            ? "border-ugc-primary bg-ugc-primary/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            : "border-white/10 text-foreground/60 hover:border-white/20"
                        }`}
                      >
                        <Play className={`w-6 h-6 ${role === "creator" ? "text-ugc-primary" : ""}`} />
                        <span className="font-medium">Креатор</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRole("customer");
                          replaceAuthQuery("register", "customer");
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                          role === "customer"
                            ? "border-clip-primary bg-clip-primary/10 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                            : "border-white/10 text-foreground/60 hover:border-white/20"
                        }`}
                      >
                        <LayoutGrid className={`w-6 h-6 ${role === "customer" ? "text-clip-primary" : ""}`} />
                        <span className="font-medium">Бренд</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleNext}
                      className={`w-full h-12 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                        role === "creator"
                          ? "bg-ugc-primary hover:bg-ugc-primary/90 shadow-lg shadow-ugc-primary/20"
                          : "bg-clip-primary hover:bg-clip-primary/90 shadow-lg shadow-clip-primary/20"
                      }`}
                    >
                      Продолжить <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {step === 2 && role === "creator" && (
                  <div>
                    <h3 className="text-lg font-bold mb-6 text-center">Личные данные</h3>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3 text-center">Выберите или загрузите аватар</label>

                      {customAvatar && (
                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <img
                              src={customAvatar}
                              alt="Custom avatar"
                              className="w-24 h-24 rounded-full object-cover border-4 border-ugc-primary shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                            />
                            {isUploadingAvatar && (
                              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              </div>
                            )}
                            {!isUploadingAvatar && (
                              <button
                                type="button"
                                onClick={() => setCustomAvatar(null)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {isUploadingAvatar && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-foreground/60 mb-1">
                            <span>Загрузка...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-ugc-primary transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center mb-4">
                        <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                          {isUploadingAvatar ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Загрузить своё фото
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomAvatarUpload}
                            className="hidden"
                            disabled={isUploadingAvatar}
                          />
                        </label>
                      </div>

                      <div className="text-center text-xs text-foreground/50 mb-4">или выберите готовый</div>

                      <div className="grid grid-cols-5 gap-3">
                        {AVATARS.map((avatar) => (
                          <button
                            key={avatar}
                            type="button"
                            onClick={() => {
                              setSelectedAvatar(avatar);
                              setCustomAvatar(null);
                            }}
                            className={`relative rounded-full overflow-hidden aspect-square border-2 transition-all ${
                              !customAvatar && selectedAvatar === avatar
                                ? "border-ugc-primary scale-110 shadow-[0_0_15px_rgba(139,92,246,0.5)] z-10"
                                : "border-transparent hover:scale-105 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            {!customAvatar && selectedAvatar === avatar && (
                              <div className="absolute inset-0 bg-ugc-primary/20 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-white drop-shadow-md" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div>
                        <label className="block text-sm font-medium mb-2">Имя и Фамилия</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                          placeholder="Иван Иванов"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Пароль</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Подтвердите пароль</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                          placeholder="••••••••"
                        />
                        {passwordMismatch && (
                          <p className="text-xs text-red-400 mt-2">Пароли должны совпадать.</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Ваше местоположение (опционально)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {GEO_OPTIONS.map((geo) => (
                            <button
                              key={geo}
                              type="button"
                              onClick={() => toggleGeo(geo)}
                              className={`h-10 rounded-xl border transition-colors text-sm font-medium ${
                                selectedGeo.includes(geo)
                                  ? "border-ugc-primary bg-ugc-primary/10 text-white"
                                  : "border-white/10 text-foreground/60 hover:border-white/20"
                              }`}
                            >
                              {geo}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={handleBack} className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || passwordMismatch}
                        className="flex-1 h-12 rounded-xl font-semibold text-white bg-ugc-primary hover:bg-ugc-primary/90 transition-all shadow-lg shadow-ugc-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Далее <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && role === "creator" && (
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-center">О себе и специализация</h3>
                    <p className="text-sm text-foreground/60 text-center mb-6">Расскажите о себе и выберите специализацию</p>

                    <div className="space-y-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium mb-2">О себе *</label>
                        <textarea
                          required
                          value={about}
                          onChange={(event) => setAbout(event.target.value)}
                          className="w-full h-32 bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-ugc-primary transition-colors resize-none"
                          placeholder="Расскажите о своём опыте, стиле работы, достижениях..."
                        />
                        <div className="text-xs text-foreground/50 mt-1 flex justify-between">
                          <span>{about.length} символов (мин. 10)</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Специализация * (минимум 1)</label>
                        <div className="grid grid-cols-2 gap-3">
                          {["UGC контент", "Баннеры/Клипы"].map((spec) => (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => toggleSpecialization(spec)}
                              className={`h-12 rounded-xl border flex items-center justify-center gap-2 transition-colors ${
                                specializations.includes(spec)
                                  ? "border-ugc-primary bg-ugc-primary/10 text-white"
                                  : "border-white/10 text-foreground/60 hover:border-white/20"
                              }`}
                            >
                              {spec === "UGC контент" ? <Play className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                              <span className="text-sm font-medium">{spec}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Вертикали * (минимум 1)</label>
                        <p className="text-xs text-foreground/50 mb-3">Выберите ниши, в которых хотите работать</p>
                        <div className="grid grid-cols-2 gap-3">
                          {VERTICALS.map((vert) => (
                            <button
                              key={vert}
                              type="button"
                              onClick={() => toggleVertical(vert)}
                              className={`h-10 rounded-xl border transition-colors text-sm font-medium ${
                                verticals.includes(vert)
                                  ? "border-ugc-primary bg-ugc-primary/10 text-white"
                                  : "border-white/10 text-foreground/60 hover:border-white/20"
                              }`}
                            >
                              {vert}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button type="button" onClick={handleBack} className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={about.trim().length < 10 || specializations.length === 0 || verticals.length === 0}
                        className="flex-1 h-12 rounded-xl font-semibold text-white bg-ugc-primary hover:bg-ugc-primary/90 transition-all shadow-lg shadow-ugc-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Далее <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && role === "creator" && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-center">Реквизиты для выплат</h3>
                    <div className="space-y-4 mb-8">
                      <div>
                        <label className="block text-sm font-medium mb-2">Сеть (Network)</label>
                        <select
                          value={network}
                          onChange={(event) => setNetwork(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors appearance-none"
                        >
                          <option value="trc20">USDT (TRC20)</option>
                          <option value="erc20">USDT (ERC20)</option>
                          <option value="bep20">USDT (BEP20)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Адрес кошелька</label>
                        <input
                          type="text"
                          value={wallet}
                          onChange={(event) => setWallet(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors font-mono"
                          placeholder="T..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={handleBack} className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={handleNext} className="flex-1 h-12 rounded-xl font-semibold text-white bg-ugc-primary hover:bg-ugc-primary/90 transition-all shadow-lg shadow-ugc-primary/20 flex items-center justify-center gap-2">
                        Далее <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 5 && role === "creator" && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-center">Социальные сети</h3>
                    <p className="text-sm text-foreground/60 text-center mb-6">Укажите ссылки на ваши профили, где вы планируете публиковать контент.</p>
                    <form onSubmit={handleRegister}>
                      <div className="space-y-4 mb-8">
                        <div>
                          <label className="block text-sm font-medium mb-2">TikTok</label>
                          <input
                            type="url"
                            value={tiktok}
                            onChange={(event) => setTiktok(event.target.value)}
                            className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                            placeholder="https://tiktok.com/@username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Instagram Reels</label>
                          <input
                            type="url"
                            value={instagram}
                            onChange={(event) => setInstagram(event.target.value)}
                            className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                            placeholder="https://instagram.com/username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">YouTube Shorts</label>
                          <input
                            type="url"
                            value={youtube}
                            onChange={(event) => setYoutube(event.target.value)}
                            className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors"
                            placeholder="https://youtube.com/@username"
                          />
                        </div>
                      </div>
                      {renderConsentCard("creator")}
                      <div className="flex gap-4">
                        <button type="button" onClick={handleBack} className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="submit"
                          disabled={loading || isThrottled || !acceptTerms}
                          className="flex-1 h-12 rounded-xl font-semibold text-white bg-ugc-primary hover:bg-ugc-primary/90 transition-all shadow-lg shadow-ugc-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isThrottled ? `Пауза ${retryCooldown}с` : "Завершить регистрацию"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {step === 2 && role === "customer" && (
                  <div>
                    <h3 className="text-lg font-bold mb-4 text-center">Основные данные</h3>

                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-3 text-center">Логотип проекта (необязательно)</label>
                      {customerLogo ? (
                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <img
                              src={customerLogo}
                              alt="Company logo"
                              className="w-24 h-24 rounded-2xl object-cover border-4 border-clip-primary shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                            />
                            {isUploadingLogo && (
                              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              </div>
                            )}
                            {!isUploadingLogo && (
                              <button
                                type="button"
                                onClick={() => setCustomerLogo(null)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {isUploadingLogo && (
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-foreground/60 mb-1">
                                <span>Загрузка...</span>
                                <span>{logoUploadProgress}%</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-clip-primary transition-all duration-300"
                                  style={{ width: `${logoUploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-center">
                            <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                              {isUploadingLogo ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Загрузка...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  Загрузить логотип
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleCustomerLogoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-4 mb-8">
                      <div>
                        <label className="block text-sm font-medium mb-2">Название проекта / компании</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors"
                          placeholder="Crypto Project"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors"
                          placeholder="you@company.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Пароль</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Подтвердите пароль</label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors"
                          placeholder="••••••••"
                        />
                        {passwordMismatch && (
                          <p className="text-xs text-red-400 mt-2">Пароли должны совпадать.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={handleBack} className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || passwordMismatch}
                        className="flex-1 h-12 rounded-xl font-semibold text-white bg-clip-primary hover:bg-clip-primary/90 transition-all shadow-lg shadow-clip-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Далее <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && role === "customer" && (
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-center">Расскажите о проекте</h3>
                    <p className="text-sm text-foreground/60 text-center mb-6">
                      Это поможет креаторам лучше понять вашу нишу и создавать более качественный контент.
                    </p>

                    <div className="space-y-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium mb-2">Ваши вертикали * (минимум 1)</label>
                        <p className="text-xs text-foreground/50 mb-3">В каких нишах работает ваш проект?</p>
                        <div className="grid grid-cols-2 gap-2">
                          {VERTICALS.map((vert) => (
                            <button
                              key={vert}
                              type="button"
                              onClick={() => toggleCustomerVertical(vert)}
                              className={`h-10 rounded-xl border transition-colors text-sm font-medium ${
                                customerVerticals.includes(vert)
                                  ? "border-clip-primary bg-clip-primary/10 text-white"
                                  : "border-white/10 text-foreground/60 hover:border-white/20"
                              }`}
                            >
                              {vert}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Целевые GEO * (минимум 1)</label>
                        <p className="text-xs text-foreground/50 mb-3">Какие регионы интересуют для рекламы?</p>
                        <div className="grid grid-cols-3 gap-2">
                          {GEO_OPTIONS.map((geo) => (
                            <button
                              key={geo}
                              type="button"
                              onClick={() => toggleGeo(geo)}
                              className={`h-10 rounded-xl border transition-colors text-xs font-medium ${
                                selectedGeo.includes(geo)
                                  ? "border-clip-primary bg-clip-primary/10 text-white"
                                  : "border-white/10 text-foreground/60 hover:border-white/20"
                              }`}
                            >
                              {geo}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Описание компании</label>
                        <textarea
                          value={companyDescription}
                          onChange={(event) => setCompanyDescription(event.target.value)}
                          className="w-full h-24 bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-clip-primary transition-colors resize-none text-sm"
                          placeholder="Кратко опишите ваш проект, целевую аудиторию, уникальные преимущества..."
                        />
                        <div className="text-xs text-foreground/50 mt-1">
                          {companyDescription.length} символов (опционально)
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Ссылка на продукт/сайт</label>
                        <input
                          type="url"
                          value={productUrl}
                          onChange={(event) => setProductUrl(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors text-sm"
                          placeholder="https://yourproject.com"
                        />
                        <p className="text-xs text-foreground/50 mt-1">Удобно для партнёрок (опционально)</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button type="button" onClick={handleBack} className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={customerVerticals.length === 0 || selectedGeo.length === 0}
                        className="flex-1 h-12 rounded-xl font-semibold text-white bg-clip-primary hover:bg-clip-primary/90 transition-all shadow-lg shadow-clip-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        Далее <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && role === "customer" && (
                  <div>
                    <form onSubmit={handleRegister}>
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-clip-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-8 h-8 text-clip-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Готово к регистрации</h3>
                        <p className="text-sm text-foreground/60">
                          После создания аккаунта мы отправим письмо для подтверждения email.
                        </p>
                      </div>

                      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 mb-6 sm:grid-cols-2">
                        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-foreground/45">Проект</div>
                          <div className="mt-2 text-sm font-medium text-white">{fullName}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-foreground/45">Email</div>
                          <div className="mt-2 text-sm font-medium text-white break-all">{email}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-foreground/45">Вертикали</div>
                          <div className="mt-2 text-sm font-medium text-white">{customerVerticals.join(", ")}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                          <div className="text-xs uppercase tracking-[0.16em] text-foreground/45">ГЕО</div>
                          <div className="mt-2 text-sm font-medium text-white">{selectedGeo.join(", ")}</div>
                        </div>
                      </div>
                      {renderConsentCard("customer")}

                      <div className="flex gap-4">
                        <button type="button" onClick={handleBack} className="h-12 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="submit"
                          disabled={loading || isThrottled || !acceptTerms}
                          className="flex-1 h-12 rounded-xl font-semibold text-white bg-clip-primary hover:bg-clip-primary/90 transition-all shadow-lg shadow-clip-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isThrottled ? `Пауза ${retryCooldown}с` : "Создать аккаунт"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          <div className="mt-8 text-center text-sm text-foreground/60">
            {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <button
              onClick={() => {
                if (isLogin) {
                  openRegisterView(role, 1);
                } else {
                  openLoginView();
                }
              }}
              className="text-white hover:underline font-medium"
            >
              {isLogin ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isPolicyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/82 p-4 backdrop-blur-md"
            onClick={() => setIsPolicyModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/10 bg-card shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">ADROP Legal</p>
                  <h2 className="mt-2 text-2xl font-display font-bold text-white">Политика конфиденциальности</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-foreground/60">
                    Можно спокойно прочитать условия прямо здесь и вернуться к регистрации без
                    лишнего перехода на отдельную страницу.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08]"
                  aria-label="Закрыть политику конфиденциальности"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[min(72vh,680px)] overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
                <PrivacyPolicyContent />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
