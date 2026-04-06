import { type ChangeEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  AiUserIcon,
  AlertCircleIcon,
  ArrowReloadHorizontalIcon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  Edit02Icon,
  LinkSquare01Icon,
  Location01Icon,
  Mail01Icon,
  MoneyBag02Icon,
  MoneyExchange03Icon,
  MoneyReceiveSquareIcon,
  PaymentSuccess02Icon,
  QrCode01Icon,
  SparklesIcon,
  Upload01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { uploadImageToImgBB } from "../../lib/imgbb";
import { useAuthStore } from "../../store/authStore";
import { AppIcon } from "../../components/ui/icon";
import { apiRequest } from "../../lib/api";
import { getAvatarSrc } from "../../lib/avatar";
import {
  formatPaymentDate,
  formatUsdtAmount,
  PAYMENT_STATUS_META,
  type PaymentNetwork,
  type PaymentNetworkConfig,
  type PaymentRecord,
  shouldShowRepeatPayment,
  toDate,
} from "../../lib/payments";

type PaymentConfigResponse = {
  networks: Array<PaymentNetworkConfig & { maskedAddress: string }>;
  minimumAmount: number;
  expiryMinutes: number;
};

type PaymentsResponse = {
  payments: PaymentRecord[];
};

type PaymentResponse = {
  payment: PaymentRecord;
};

type SuccessModalState = {
  show: boolean;
  title: string;
  description: string;
};

const EMPTY_SUCCESS_MODAL: SuccessModalState = {
  show: false,
  title: "",
  description: "",
};

const INITIAL_PAYMENT_CONFIG: PaymentConfigResponse = {
  networks: [],
  minimumAmount: 10,
  expiryMinutes: 45,
};

function getPaymentSortValue(payment: PaymentRecord) {
  return (
    toDate(payment.updatedAt)?.getTime() ||
    toDate(payment.createdAt)?.getTime() ||
    0
  );
}

function sortPayments(payments: PaymentRecord[]) {
  return [...payments].sort((left, right) => {
    return getPaymentSortValue(right) - getPaymentSortValue(left);
  });
}

function truncateValue(value: string, start = 8, end = 8) {
  if (!value) return "";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function CustomerProfile() {
  const { user, userData } = useAuthStore();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"profile" | "finance">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedNetworkId, setSelectedNetworkId] = useState<PaymentNetwork | "">("");
  const [successModal, setSuccessModal] =
    useState<SuccessModalState>(EMPTY_SUCCESS_MODAL);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PaymentRecord[]>([]);
  const [paymentConfig, setPaymentConfig] =
    useState<PaymentConfigResponse>(INITIAL_PAYMENT_CONFIG);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentActionError, setPaymentActionError] = useState("");
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [activePaymentActionId, setActivePaymentActionId] = useState<string | null>(null);
  const [draftPayment, setDraftPayment] = useState<PaymentRecord | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");

  const [editName, setEditName] = useState(userData?.name || "");
  const [editDescription, setEditDescription] = useState(userData?.description || "");

  const balance = Number(userData?.balance || 0);
  const modalPayment =
    (draftPayment && transactions.find((payment) => payment.id === draftPayment.id)) ||
    draftPayment;
  const latestOpenPayment =
    transactions.find((payment) =>
      ["pending", "processing", "cancelled", "failed"].includes(payment.status),
    ) || null;
  const hasPaymentNetworks = paymentConfig.networks.length > 0;

  useEffect(() => {
    const activeQueryTab = new URLSearchParams(window.location.search).get("tab");

    if (location.includes("tab=finance") || activeQueryTab === "finance") {
      setActiveTab("finance");
    } else {
      setActiveTab("profile");
    }
  }, [location]);

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || "");
      setEditDescription(userData.description || "");
    }
  }, [userData]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setPaymentConfig(INITIAL_PAYMENT_CONFIG);
      return;
    }

    void loadPayments();
    void loadPaymentConfig();
  }, [user]);

  useEffect(() => {
    if (!paymentConfig.networks.length) {
      setSelectedNetworkId("");
      return;
    }

    setSelectedNetworkId((current) => {
      if (current && paymentConfig.networks.some((network) => network.id === current)) {
        return current;
      }
      return paymentConfig.networks[0].id;
    });
  }, [paymentConfig.networks]);

  useEffect(() => {
    if (activeTab !== "finance") return;

    const activePaymentIds = transactions
      .filter((payment) => payment.status === "pending" || payment.status === "processing")
      .map((payment) => payment.id);

    if (!activePaymentIds.length) return;

    const intervalId = window.setInterval(() => {
      activePaymentIds.forEach((paymentId) => {
        void checkPaymentStatus(paymentId, true);
      });
    }, 20000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, transactions]);

  async function loadPaymentConfig() {
    if (!user) return;

    try {
      const response = await apiRequest<PaymentConfigResponse>("/api/payments/config");
      setPaymentConfig(response);
      setPaymentsError("");
    } catch (error: any) {
      console.error("Error loading payment config:", error);
      setPaymentsError(error.message || "Не удалось загрузить настройки платежей.");
    }
  }

  async function loadPayments() {
    if (!user) return;

    setPaymentsLoading(true);
    try {
      const response = await apiRequest<PaymentsResponse>("/api/payments");
      setTransactions(sortPayments(response.payments || []));
      setPaymentsError("");
    } catch (error: any) {
      console.error("Error loading payments:", error);
      setPaymentsError(error.message || "Не удалось загрузить историю платежей.");
    } finally {
      setPaymentsLoading(false);
    }
  }

  function openTab(tab: "profile" | "finance") {
    setActiveTab(tab);
    setLocation(tab === "finance" ? "/customer/profile?tab=finance" : "/customer/profile");
  }

  function upsertPayment(payment: PaymentRecord) {
    setTransactions((current) => {
      const nextPayments = current.filter((item) => item.id !== payment.id);
      nextPayments.push(payment);
      return sortPayments(nextPayments);
    });

    setDraftPayment((current) => (current?.id === payment.id ? payment : current));
  }

  function openSuccessModal(title: string, description: string) {
    setSuccessModal({
      show: true,
      title,
      description,
    });
  }

  function closeSuccessModal() {
    setSuccessModal(EMPTY_SUCCESS_MODAL);
  }

  function closeDepositModal() {
    setIsDepositModalOpen(false);
    setDraftPayment(null);
    setPaymentActionError("");
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || !event.target.files[0] || !user) return;

    const file = event.target.files[0];
    setIsUploadingLogo(true);
    setLogoUploadError("");

    try {
      const logoUrl = await uploadImageToImgBB(file);

      await updateDoc(doc(db, "users", user.uid), {
        avatar: logoUrl,
        avatarUrl: logoUrl,
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      setLogoUploadError("Не удалось загрузить логотип. Попробуйте другой файл.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: editName,
        description: editDescription,
      });
      setIsEditing(false);
      openSuccessModal("Профиль сохранен", "Изменения уже доступны на платформе.");
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  }

  function handleCopy(value: string) {
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    window.setTimeout(() => {
      setCopiedValue((current) => (current === value ? null : current));
    }, 2000);
  }

  async function handleCreateDeposit() {
    if (!selectedNetworkId) {
      setPaymentActionError("Выберите сеть для пополнения.");
      return;
    }

    const amount = Number.parseFloat(depositAmount);
    if (!Number.isFinite(amount) || amount < paymentConfig.minimumAmount) {
      setPaymentActionError(
        `Минимальная сумма пополнения ${paymentConfig.minimumAmount} USDT.`,
      );
      return;
    }

    setIsSubmittingDeposit(true);
    setPaymentActionError("");

    try {
      const response = await apiRequest<PaymentResponse>("/api/payments/deposits", {
        method: "POST",
        body: JSON.stringify({
          amount,
          network: selectedNetworkId,
        }),
      });

      upsertPayment(response.payment);
      setDraftPayment(response.payment);
    } catch (error: any) {
      console.error("Error creating deposit:", error);
      setPaymentActionError(error.message || "Не удалось создать платеж.");
    } finally {
      setIsSubmittingDeposit(false);
    }
  }

  async function handleMarkPaid(paymentId: string) {
    setActivePaymentActionId(paymentId);
    setPaymentActionError("");

    try {
      const response = await apiRequest<PaymentResponse>(
        `/api/payments/deposits/${paymentId}/mark-paid`,
        {
          method: "POST",
        },
      );

      upsertPayment(response.payment);
      openSuccessModal(
        "Платеж отправлен на проверку",
        "Мы отслеживаем транзакцию и обновим статус после подтверждения сети.",
      );
    } catch (error: any) {
      console.error("Error marking payment as paid:", error);
      setPaymentActionError(error.message || "Не удалось отправить платеж на проверку.");
    } finally {
      setActivePaymentActionId(null);
    }
  }

  async function checkPaymentStatus(paymentId: string, silent = false) {
    if (!silent) {
      setActivePaymentActionId(paymentId);
      setPaymentActionError("");
    }

    try {
      const response = await apiRequest<PaymentResponse>(`/api/payments/${paymentId}/check`, {
        method: "POST",
      });

      upsertPayment(response.payment);
    } catch (error: any) {
      console.error("Error checking payment:", error);
      if (!silent) {
        setPaymentActionError(error.message || "Не удалось обновить статус платежа.");
      }
    } finally {
      if (!silent) {
        setActivePaymentActionId(null);
      }
    }
  }

  async function handleRetryPayment(payment: PaymentRecord) {
    setActivePaymentActionId(payment.id);
    setPaymentActionError("");

    try {
      const response = await apiRequest<PaymentResponse>(`/api/payments/${payment.id}/retry`, {
        method: "POST",
      });

      upsertPayment(response.payment);
      setDraftPayment(response.payment);
      setDepositAmount(String(response.payment.requestedAmount));
      setSelectedNetworkId(response.payment.network);
      setIsDepositModalOpen(true);
    } catch (error: any) {
      console.error("Error retrying payment:", error);
      setPaymentActionError(error.message || "Не удалось создать повторный платеж.");
    } finally {
      setActivePaymentActionId(null);
    }
  }

  async function handleOpenNewDeposit() {
    openTab("finance");
    setDraftPayment(null);
    setDepositAmount("");
    setPaymentActionError("");

    if (!hasPaymentNetworks || paymentsError) {
      await loadPaymentConfig();
    }

    setIsDepositModalOpen(true);
  }

  function handleOpenExistingPayment(payment: PaymentRecord) {
    setDraftPayment(payment);
    setDepositAmount(String(payment.requestedAmount));
    setSelectedNetworkId(payment.network);
    setPaymentActionError("");
    setIsDepositModalOpen(true);
  }

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
        <button
          onClick={() => openTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "profile"
              ? "bg-white/10 text-white"
              : "text-foreground/60 hover:text-white"
          }`}
        >
          <AppIcon icon={AiUserIcon} size={18} />
          <span>Профиль компании</span>
        </button>
        <button
          onClick={() => openTab("finance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "finance"
              ? "bg-white/10 text-white"
              : "text-foreground/60 hover:text-white"
          }`}
        >
          <AppIcon icon={Wallet01Icon} size={18} />
          <span>Финансы и пополнение</span>
        </button>
      </div>

      {activeTab === "profile" ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-card border border-white/5 rounded-3xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-clip-primary/10 blur-3xl rounded-full pointer-events-none" />

            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
              <div className="w-32 shrink-0">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-background relative group">
                  <img
                    src={
                      userData?.avatarUrl ||
                      userData?.avatar ||
                      getAvatarSrc(null, userData?.name, "customer")
                    }
                    alt="Company Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isEditing && (
                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                      {isUploadingLogo ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <AppIcon icon={Upload01Icon} className="text-white" size={26} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </>
                      )}
                    </label>
                  )}
                </div>
                {logoUploadError && (
                  <p className="mt-2 text-xs text-red-400">{logoUploadError}</p>
                )}
              </div>

              <div className="flex-1 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="text-3xl font-display font-bold mb-2 bg-transparent border-b border-white/20 focus:border-clip-primary outline-none w-full max-w-md"
                      />
                    ) : (
                      <h1 className="text-3xl font-display font-bold mb-2">
                        {userData?.name || "Компания"}
                      </h1>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-foreground/60 text-sm">
                      <span className="flex items-center gap-1.5">
                        <AppIcon icon={Location01Icon} size={16} />
                        <span>{userData?.country || "Не указано"}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <AppIcon icon={Mail01Icon} size={16} />
                        <span>{user?.email}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => (isEditing ? void handleSaveProfile() : setIsEditing(true))}
                    className={`h-10 px-4 rounded-xl border transition-colors flex items-center gap-2 text-sm font-medium ${
                      isEditing
                        ? "bg-clip-primary border-clip-primary text-white"
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <AppIcon icon={CheckmarkCircle02Icon} size={18} />
                        <span>Сохранить</span>
                      </>
                    ) : (
                      <>
                        <AppIcon icon={Edit02Icon} size={18} />
                        <span>Редактировать</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-sm font-medium text-foreground/80">
                    Заказчик
                  </span>
                  <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-sm font-medium text-foreground/80">
                    На платформе с{" "}
                    {userData?.createdAt?.toDate?.().getFullYear() ||
                      new Date().getFullYear()}{" "}
                    года
                  </span>
                </div>

                {isEditing ? (
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    className="w-full h-24 bg-background border border-white/10 rounded-xl p-3 focus:outline-none focus:border-clip-primary transition-colors text-foreground/80 resize-none"
                    placeholder="Расскажите о вашем проекте..."
                  />
                ) : (
                  <p className="text-foreground/80 max-w-2xl">
                    {userData?.description || "Описание компании не заполнено."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-white/5 rounded-3xl p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-display font-bold mb-1">История пополнений</h2>
                  <p className="text-foreground/60 text-sm">
                    Все платежи тянутся из реальной истории `payments` и обновляют статусы по
                    факту проверки сети.
                  </p>
                </div>
                <button
                  onClick={() => void loadPayments()}
                  className="h-11 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <AppIcon icon={ArrowReloadHorizontalIcon} size={18} />
                  <span>Обновить</span>
                </button>
              </div>

              {paymentsError && (
                <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3">
                  <AppIcon icon={AlertCircleIcon} size={18} className="mt-0.5 shrink-0" />
                  <span>{paymentsError}</span>
                </div>
              )}

              {paymentsLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-32 rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse"
                    />
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((payment) => {
                    const statusMeta = PAYMENT_STATUS_META[payment.status];
                    const isBusy = activePaymentActionId === payment.id;

                    return (
                      <div
                        key={payment.id}
                        className="rounded-2xl border border-white/5 bg-white/[0.03] p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-sm font-semibold text-white">
                                {payment.reference}
                              </span>
                              <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusMeta.className}`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${statusMeta.dotClassName}`}
                                />
                                <span>{statusMeta.label}</span>
                              </span>
                            </div>
                            <div className="text-sm text-foreground/70 flex flex-wrap gap-4">
                              <span>{payment.networkLabel || payment.network}</span>
                              <span>{formatPaymentDate(payment.createdAt)}</span>
                              <span>ID: {truncateValue(payment.id, 6, 6)}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                              <div className="rounded-xl border border-white/5 bg-background/50 p-3">
                                <p className="text-xs uppercase tracking-[0.14em] text-foreground/50 mb-1">
                                  Запрошено
                                </p>
                                <p className="font-mono text-lg font-bold text-white">
                                  {formatUsdtAmount(payment.requestedAmount)} USDT
                                </p>
                              </div>
                              <div className="rounded-xl border border-white/5 bg-background/50 p-3">
                                <p className="text-xs uppercase tracking-[0.14em] text-foreground/50 mb-1">
                                  К оплате
                                </p>
                                <p className="font-mono text-lg font-bold text-clip-primary">
                                  {formatUsdtAmount(payment.payableAmount)} USDT
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-foreground/60 space-y-1 pt-1">
                              <p>Адрес: {truncateValue(payment.address, 10, 8)}</p>
                              {payment.note && <p>{payment.note}</p>}
                              {payment.txHash && <p>TX: {truncateValue(payment.txHash, 10, 10)}</p>}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:max-w-[280px] lg:justify-end">
                            <button
                              onClick={() => handleOpenExistingPayment(payment)}
                              className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                            >
                              Реквизиты
                            </button>

                            {payment.status === "pending" && (
                              <button
                                onClick={() => void handleMarkPaid(payment.id)}
                                disabled={isBusy}
                                className="h-10 px-4 rounded-xl bg-clip-primary hover:bg-clip-primary/90 text-white transition-colors text-sm font-medium disabled:opacity-60"
                              >
                                {isBusy ? "Проверяем..." : "Я оплатил"}
                              </button>
                            )}

                            {(payment.status === "pending" ||
                              payment.status === "processing") && (
                              <button
                                onClick={() => void checkPaymentStatus(payment.id)}
                                disabled={isBusy}
                                className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium disabled:opacity-60"
                              >
                                {isBusy ? "Обновляем..." : "Проверить статус"}
                              </button>
                            )}

                            {shouldShowRepeatPayment(payment.status) && (
                              <button
                                onClick={() => void handleRetryPayment(payment)}
                                disabled={isBusy}
                                className="h-10 px-4 rounded-xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/20 transition-colors text-sm font-medium disabled:opacity-60"
                              >
                                {isBusy ? "Создаем..." : "Повторить платеж"}
                              </button>
                            )}

                            {payment.explorerUrl && (
                              <a
                                href={payment.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium inline-flex items-center gap-2"
                              >
                                <AppIcon icon={LinkSquare01Icon} size={16} />
                                <span>Explorer</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <div className="w-16 h-16 rounded-3xl border border-white/10 bg-white/5 mx-auto mb-4 flex items-center justify-center">
                    <AppIcon icon={MoneyExchange03Icon} size={28} className="text-foreground/50" />
                  </div>
                  <p className="text-foreground/70 font-medium mb-1">
                    Пополнений пока не было
                  </p>
                  <p className="text-foreground/50 text-sm">
                    Создайте первое пополнение, и история появится здесь автоматически.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-clip-primary/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-clip-primary/15 text-clip-primary flex items-center justify-center">
                    <AppIcon icon={Wallet01Icon} size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold">Ваш баланс</h3>
                    <p className="text-foreground/60 text-sm">Доступно для новых заказов</p>
                  </div>
                </div>
                <p className="text-4xl font-mono font-bold text-white mb-6">
                  {formatUsdtAmount(balance)} USDT
                </p>

                <button
                  onClick={() => void handleOpenNewDeposit()}
                  className="w-full h-12 rounded-xl font-semibold text-white bg-clip-primary hover:bg-clip-primary/90 transition-all shadow-lg shadow-clip-primary/20 flex items-center justify-center gap-2"
                >
                  <AppIcon icon={ArrowUpRight01Icon} size={18} />
                  <span>Пополнить баланс</span>
                </button>

                {!hasPaymentNetworks && (
                  <p className={`text-xs mt-3 ${paymentsError ? "text-red-300" : "text-yellow-300"}`}>
                    {paymentsError
                      ? `Ошибка платежного API: ${paymentsError}`
                      : "Платежные сети пока не настроены. Пополнение станет доступно сразу после подключения кошелька на сервере."}
                  </p>
                )}
              </div>
            </div>

            {latestOpenPayment && (
              <div className="bg-card border border-white/5 rounded-3xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-clip-primary">
                    <AppIcon icon={MoneyReceiveSquareIcon} size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold">Актуальный платеж</h3>
                    <p className="text-foreground/60 text-sm">
                      Последняя операция, требующая внимания
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-background/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{latestOpenPayment.reference}</span>
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_META[latestOpenPayment.status].className}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${PAYMENT_STATUS_META[latestOpenPayment.status].dotClassName}`}
                      />
                      <span>{PAYMENT_STATUS_META[latestOpenPayment.status].label}</span>
                    </span>
                  </div>
                  <p className="font-mono text-xl font-bold text-white">
                    {formatUsdtAmount(latestOpenPayment.payableAmount)} USDT
                  </p>
                  <div className="text-sm text-foreground/60 space-y-1">
                    <p>{latestOpenPayment.networkLabel || latestOpenPayment.network}</p>
                    <p>До оплаты: {formatPaymentDate(latestOpenPayment.expiresAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleOpenExistingPayment(latestOpenPayment)}
                      className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                      Открыть платеж
                    </button>
                    {(latestOpenPayment.status === "pending" ||
                      latestOpenPayment.status === "processing") && (
                      <button
                        onClick={() => void checkPaymentStatus(latestOpenPayment.id)}
                        className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                      >
                        Проверить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-white/5 rounded-3xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-clip-primary">
                  <AppIcon icon={MoneyBag02Icon} size={22} />
                </div>
                <div>
                  <h3 className="font-bold">Поддерживаемые сети</h3>
                  <p className="text-foreground/60 text-sm">
                    Адрес подставляется в платеж автоматически
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {hasPaymentNetworks ? (
                  paymentConfig.networks.map((network) => (
                    <div
                      key={network.id}
                      className="rounded-2xl border border-white/5 bg-background/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{network.label}</p>
                          <p className="text-sm text-foreground/60">
                            Адрес: {network.maskedAddress}
                          </p>
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-green-400">
                          Active
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/40 p-4 text-sm text-foreground/60">
                    {paymentsError || "Сети оплаты пока не подключены."}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/5 bg-background/40 p-4 text-sm text-foreground/60">
                <div className="flex items-center gap-2 mb-2 text-white">
                  <AppIcon icon={Clock01Icon} size={16} />
                  <span>Правила платежа</span>
                </div>
                <p>
                  Минимум: {paymentConfig.minimumAmount} USDT. Время жизни реквизитов:{" "}
                  {paymentConfig.expiryMinutes} минут. Повтор платежа доступен только для
                  статусов «В обработке» и «Отменен».
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isDepositModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDepositModal}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-background/50">
                <div>
                  <h2 className="text-xl font-display font-bold">Пополнение баланса</h2>
                  <p className="text-sm text-foreground/60">
                    Создаем реальный платеж и отслеживаем его статус в истории
                  </p>
                </div>
                <button
                  onClick={closeDepositModal}
                  className="text-foreground/60 hover:text-white"
                >
                  <AppIcon icon={Cancel01Icon} size={22} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {paymentActionError && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex items-start gap-3">
                    <AppIcon icon={AlertCircleIcon} size={18} className="mt-0.5 shrink-0" />
                    <span>{paymentActionError}</span>
                  </div>
                )}

                {!modalPayment ? (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Сумма пополнения (USDT)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50">
                          $
                        </span>
                        <input
                          type="number"
                          min={paymentConfig.minimumAmount}
                          step="0.01"
                          value={depositAmount}
                          onChange={(event) => setDepositAmount(event.target.value)}
                          className="w-full h-12 bg-background border border-white/10 rounded-xl pl-8 pr-4 focus:outline-none focus:border-clip-primary transition-colors font-mono"
                          placeholder="100.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium">Сеть оплаты</label>
                      {paymentConfig.networks.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {paymentConfig.networks.map((network) => {
                            const isActive = selectedNetworkId === network.id;

                            return (
                              <button
                                key={network.id}
                                onClick={() => setSelectedNetworkId(network.id)}
                                className={`rounded-2xl border p-4 text-left transition-colors ${
                                  isActive
                                    ? "border-clip-primary bg-clip-primary/10"
                                    : "border-white/10 bg-background hover:bg-white/5"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-white">{network.label}</p>
                                    <p className="text-sm text-foreground/60">
                                      Адрес: {network.maskedAddress}
                                    </p>
                                  </div>
                                  {isActive && (
                                    <AppIcon
                                      icon={CheckmarkCircle02Icon}
                                      className="text-clip-primary"
                                      size={20}
                                    />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-background/40 p-4 space-y-3">
                          <p className="text-sm text-foreground/60">
                            {paymentsError ||
                              "Платежные сети ещё не загрузились. Нажмите кнопку ниже, чтобы обновить конфиг платежей."}
                          </p>
                          <button
                            onClick={() => void loadPaymentConfig()}
                            className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                          >
                            Обновить сети
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-background/40 p-4 text-sm text-foreground/60">
                      Минимальная сумма пополнения {paymentConfig.minimumAmount} USDT.
                      После создания платежа система покажет точную сумму к оплате с
                      идентификатором.
                    </div>

                    <button
                      onClick={() => void handleCreateDeposit()}
                      disabled={isSubmittingDeposit || !selectedNetworkId}
                      className="w-full h-12 rounded-xl font-semibold text-white bg-clip-primary hover:bg-clip-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingDeposit ? "Создаем платеж..." : "Получить реквизиты"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6 items-start">
                      <div className="bg-white rounded-3xl p-4 border border-white/10 relative flex items-center justify-center min-h-[220px]">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                            modalPayment.address,
                          )}`}
                          alt="QR Code"
                          className="w-full max-w-[220px] rounded-2xl"
                        />
                        <div className="absolute bottom-4 right-4 w-11 h-11 rounded-2xl bg-black/80 text-white flex items-center justify-center shadow-xl">
                          <AppIcon icon={QrCode01Icon} size={22} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-white text-lg">
                            {modalPayment.reference}
                          </span>
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_META[modalPayment.status].className}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${PAYMENT_STATUS_META[modalPayment.status].dotClassName}`}
                            />
                            <span>{PAYMENT_STATUS_META[modalPayment.status].label}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-2xl border border-white/5 bg-background/40 p-4">
                            <p className="text-xs uppercase tracking-[0.14em] text-foreground/50 mb-1">
                              К оплате
                            </p>
                            <p className="font-mono text-2xl font-bold text-clip-primary">
                              {formatUsdtAmount(modalPayment.payableAmount)} USDT
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/5 bg-background/40 p-4">
                            <p className="text-xs uppercase tracking-[0.14em] text-foreground/50 mb-1">
                              Сеть
                            </p>
                            <p className="font-semibold text-white">
                              {modalPayment.networkLabel || modalPayment.network}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-foreground/60">
                            Отправьте ровно эту сумму на указанный адрес. Платеж привязан к
                            точной сумме и reference.
                          </p>
                          <div className="flex items-center gap-2 bg-background border border-white/10 rounded-xl p-2">
                            <code className="flex-1 text-sm font-mono truncate px-2">
                              {modalPayment.address}
                            </code>
                            <button
                              onClick={() => handleCopy(modalPayment.address)}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              {copiedValue === modalPayment.address ? (
                                <AppIcon
                                  icon={CheckmarkCircle02Icon}
                                  size={18}
                                  className="text-green-400"
                                />
                              ) : (
                                <AppIcon icon={Copy01Icon} size={18} />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-yellow-300">
                            Реквизиты активны до {formatPaymentDate(modalPayment.expiresAt)}.
                          </p>
                        </div>

                        {modalPayment.note && (
                          <div className="rounded-2xl border border-white/5 bg-background/40 p-4 text-sm text-foreground/70">
                            {modalPayment.note}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {modalPayment.status === "pending" && (
                        <button
                          onClick={() => void handleMarkPaid(modalPayment.id)}
                          disabled={activePaymentActionId === modalPayment.id}
                          className="flex-1 min-w-[160px] h-12 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-60"
                        >
                          {activePaymentActionId === modalPayment.id
                            ? "Проверяем..."
                            : "Я оплатил"}
                        </button>
                      )}

                      {(modalPayment.status === "pending" ||
                        modalPayment.status === "processing") && (
                        <button
                          onClick={() => void checkPaymentStatus(modalPayment.id)}
                          disabled={activePaymentActionId === modalPayment.id}
                          className="flex-1 min-w-[160px] h-12 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors disabled:opacity-60"
                        >
                          {activePaymentActionId === modalPayment.id
                            ? "Обновляем..."
                            : "Проверить статус"}
                        </button>
                      )}

                      {shouldShowRepeatPayment(modalPayment.status) && (
                        <button
                          onClick={() => void handleRetryPayment(modalPayment)}
                          disabled={activePaymentActionId === modalPayment.id}
                          className="flex-1 min-w-[160px] h-12 rounded-xl border border-yellow-400/20 bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/20 font-medium transition-colors disabled:opacity-60"
                        >
                          {activePaymentActionId === modalPayment.id
                            ? "Создаем..."
                            : "Повторить платеж"}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {modalPayment.explorerUrl && (
                        <a
                          href={modalPayment.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[160px] h-12 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <AppIcon icon={LinkSquare01Icon} size={18} />
                          <span>Открыть в explorer</span>
                        </a>
                      )}
                      <button
                        onClick={closeDepositModal}
                        className="flex-1 min-w-[160px] h-12 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-colors"
                      >
                        Закрыть
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successModal.show && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSuccessModal}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <AppIcon icon={PaymentSuccess02Icon} size={40} className="text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">{successModal.title}</h2>
                <p className="text-foreground/70">{successModal.description}</p>
              </div>
              <div className="p-6 bg-background/50">
                <button
                  onClick={closeSuccessModal}
                  className="w-full h-12 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                >
                  <AppIcon icon={SparklesIcon} size={18} />
                  <span>Понятно</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
