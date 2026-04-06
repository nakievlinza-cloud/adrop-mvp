import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Copy, Check, Gift, TrendingUp, DollarSign, Share2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export function CreatorReferral() {
  const { user, userData } = useAuthStore();
  const [copied, setCopied] = useState(false);

  // Generate referral link using user ID
  const generateReferralLink = () => {
    const baseUrl = window.location.origin;
    const shortCode = btoa(user?.uid || "").substring(0, 8);
    return `${baseUrl}/ref/${shortCode}`;
  };

  const referralLink = generateReferralLink();

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = {
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
  };

  const benefits = [
    { icon: DollarSign, title: "10% от первых транзакций", desc: "Зарабатывайте с каждого приглашённого креатора или заказчика" },
    { icon: Users, title: "Без ограничений", desc: "Приглашайте неограниченное количество людей" },
    { icon: TrendingUp, title: "Пожизненный процент", desc: "Получайте процент от всех первых платежей рефералов" },
  ];

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-ugc-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-ugc-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Реферальная программа</h1>
        <p className="text-foreground/60">
          Приглашайте друзей и зарабатывайте вместе с ними
        </p>
      </div>

      {/* Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-ugc-primary/10 to-clip-primary/10 border border-white/10 rounded-2xl p-8 mb-8"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">Ваша реферальная ссылка</h2>
            <p className="text-sm text-foreground/60">
              Делитесь ссылкой с друзьями и получайте 10% от их первых транзакций
            </p>
          </div>
          <div className="w-full md:w-auto">
            <div className="flex items-center gap-2 bg-background border border-white/10 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-transparent px-3 text-sm font-mono focus:outline-none min-w-[200px] md:min-w-[300px]"
              />
              <button
                onClick={handleCopy}
                className="h-10 px-4 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-lg font-medium transition-all flex items-center gap-2 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Копировать
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-foreground/60 text-sm mb-1">Всего рефералов</p>
          <p className="text-3xl font-mono font-bold">{stats.totalReferrals}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-foreground/60 text-sm mb-1">Активных</p>
          <p className="text-3xl font-mono font-bold">{stats.activeReferrals}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-foreground/60 text-sm mb-1">Заработано</p>
          <p className="text-3xl font-mono font-bold text-green-400">${stats.totalEarnings}</p>
        </motion.div>
      </div>

      {/* Benefits */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Преимущества программы</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
            >
              <div className="w-12 h-12 bg-ugc-primary/10 rounded-xl flex items-center justify-center mb-4">
                <benefit.icon className="w-6 h-6 text-ugc-primary" />
              </div>
              <h3 className="font-bold mb-2">{benefit.title}</h3>
              <p className="text-sm text-foreground/60">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-card border border-white/10 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Как это работает?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-ugc-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-6 h-6 text-ugc-primary" />
            </div>
            <h3 className="font-bold mb-2">1. Поделитесь ссылкой</h3>
            <p className="text-sm text-foreground/60">
              Отправьте реферальную ссылку друзьям или разместите её в социальных сетях
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-ugc-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-ugc-primary" />
            </div>
            <h3 className="font-bold mb-2">2. Другие регистрируются</h3>
            <p className="text-sm text-foreground/60">
              Приведённые пользователи регистрируются по вашей ссылке
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-ugc-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-6 h-6 text-ugc-primary" />
            </div>
            <h3 className="font-bold mb-2">3. Получайте доход</h3>
            <p className="text-sm text-foreground/60">
              Получайте 10% от первых транзакций каждого приглашённого пользователя
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
