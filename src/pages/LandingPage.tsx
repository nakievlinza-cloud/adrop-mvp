import { motion } from "framer-motion";
import { Link } from "wouter";
import { DeviceMockup } from "../components/DeviceMockup";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  CheckmarkCircle02Icon,
  LayoutGridIcon,
  Message01Icon,
  MoneyReceiveFlow01Icon,
  PlayCircleIcon,
  Rocket01Icon,
  SecurityCheckIcon,
  UserGroupIcon,
  ZapIcon,
} from "@hugeicons/core-free-icons";
import {
  BeakerIcon,
  TicketIcon,
  CircleStackIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import "@flaticon/flaticon-uicons/css/brands/all.css";
import { useCMSStore } from "../store/cmsStore";
import { useState } from "react";
import chromeDollar from "../assets/landing/chrome-dollar.png";
import chromeUgc from "../assets/landing/chrome-ugc.png";
import { AppIcon } from "../components/ui/icon";

const PLATFORM_LOGOS = [
  { label: "TikTok", caption: "Быстрый старт коротких роликов", iconClass: "fi fi-brands-tik-tok", tone: "text-[#ff6f91]" },
  { label: "Instagram Reels", caption: "Нативный охват через креаторов", iconClass: "fi fi-brands-instagram", tone: "text-[#ff8a6b]" },
  { label: "YouTube Shorts", caption: "Видеоохват и тест новых связок", iconClass: "fi fi-brands-youtube", tone: "text-[#7ecbff]" },
];

const VERTICAL_PILLS = [
  { label: "Крипто", caption: "Привлечение web3-аудитории", icon: CircleStackIcon, tone: "text-[#b997ff]" },
  { label: "Дейтинг", caption: "Конверсия через сторителлинг", icon: HeartIcon, tone: "text-[#ff8ccf]" },
  { label: "Гемблинг", caption: "CPA-креативы под азартные офферы", icon: TicketIcon, tone: "text-[#ffd36e]" },
  { label: "Нутра", caption: "Нативные UGC-креативы под оффер", icon: BeakerIcon, tone: "text-[#8ae6a6]" },
];

const FLOW_STEPS = [
  {
    title: "Бренд создаёт оффер",
    description:
      "Заполняет бриф, задаёт KPI, бюджет и вертикаль. Минимальный бюджет кампании — $100: так оффер сразу выглядит рабочим для креаторов и быстрее собирает релевантные отклики.",
    icon: Briefcase01Icon,
    accent: "from-primary/20 to-primary/5",
    iconTone: "text-primary",
  },
  {
    title: "Креатор получает приглашение и пишет в чат",
    description:
      "Подходящий креатор заходит в диалог, уточняет детали и быстро согласует формат без потерь в коммуникации.",
    icon: Message01Icon,
    accent: "from-ugc-primary/20 to-ugc-primary/5",
    iconTone: "text-ugc-primary",
  },
  {
    title: "Публикация и оплата по результату",
    description:
      "После запуска кампания двигается по прозрачному пайплайну, а бренд отслеживает статусы и выплаты в одном кабинете.",
    icon: MoneyReceiveFlow01Icon,
    accent: "from-clip-primary/20 to-clip-primary/5",
    iconTone: "text-clip-primary",
  },
];

const CTA_BENEFITS = [
  "Бриф, чат и выплаты в одном кабинете",
  "Подборка креаторов под нужную вертикаль",
  "Быстрый запуск кампаний от $100",
];

const MARQUEE_ITEMS = [
  "TikTok",
  "Instagram Reels",
  "YouTube Shorts",
  "Крипто",
  "Дейтинг",
  "Гемблинг",
  "Нутра",
];

const PremiumBackground = ({
  hoveredRole,
}: {
  hoveredRole: "creator" | "customer" | null;
}) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div
      animate={{ opacity: [0.85, 1, 0.88], scale: [1, 1.03, 1] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      className="absolute left-1/2 top-20 h-[24rem] w-[52rem] -translate-x-1/2 blur-[90px]"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, rgba(61,204,255,0.08) 22%, rgba(255,84,132,0.06) 44%, rgba(8,12,20,0) 76%)",
      }}
    />

    <motion.div
      animate={{ scale: [1, 1.06, 1], x: [0, 18, 0], y: [0, -24, 0] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-24 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full blur-[140px]"
      style={{
        background:
          hoveredRole === "creator"
            ? "radial-gradient(circle, rgba(255,84,132,0.34) 0%, rgba(255,84,132,0.12) 38%, rgba(255,84,132,0) 72%)"
            : hoveredRole === "customer"
              ? "radial-gradient(circle, rgba(61,204,255,0.34) 0%, rgba(61,204,255,0.12) 38%, rgba(61,204,255,0) 72%)"
              : "radial-gradient(circle, rgba(255,84,132,0.26) 0%, rgba(61,204,255,0.18) 42%, rgba(103,72,255,0) 74%)",
      }}
    />

    <motion.div
      animate={{ scale: [1, 1.04, 1], x: [0, -24, 0], y: [0, 20, 0] }}
      transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      className="absolute left-[-12rem] top-[24%] h-[28rem] w-[28rem] rounded-full blur-[130px]"
      style={{
        background: "radial-gradient(circle, rgba(255,84,132,0.20) 0%, rgba(255,84,132,0.08) 42%, rgba(255,84,132,0) 76%)",
      }}
    />

    <motion.div
      animate={{ scale: [1, 1.05, 1], x: [0, 22, 0], y: [0, -18, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
      className="absolute right-[-10rem] top-[28%] h-[26rem] w-[26rem] rounded-full blur-[130px]"
      style={{
        background: "radial-gradient(circle, rgba(61,204,255,0.22) 0%, rgba(61,204,255,0.08) 40%, rgba(61,204,255,0) 76%)",
      }}
    />

    <div
      className="absolute left-1/2 top-[-10rem] h-[42rem] w-[72rem] -translate-x-1/2 rotate-[-12deg] opacity-[0.12] blur-[36px]"
      style={{
        background:
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 45%, rgba(61,204,255,0.18) 50%, rgba(255,255,255,0.08) 56%, rgba(255,255,255,0) 100%)",
      }}
    />

    <div
      className="absolute inset-0 opacity-[0.15]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
        backgroundSize: "88px 88px",
        maskImage: "radial-gradient(circle at 50% 35%, black 0%, rgba(0,0,0,0.92) 32%, transparent 82%)",
      }}
    />

    <div
      className="absolute inset-x-0 top-0 h-[38rem] opacity-70"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,14,24,0.06) 0%, rgba(10,14,24,0.22) 28%, rgba(10,14,24,0.72) 72%, rgba(10,14,24,0.94) 100%)",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.08), transparent 22%), radial-gradient(circle at 50% 100%, rgba(4,7,13,0.88), rgba(4,7,13,0.98) 68%)",
      }}
    />
  </div>
);

const HeroAssetScene = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden xl:block">
    <motion.div
      animate={{ y: [0, -14, 0], rotate: [-8, -5, -8] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      className="absolute left-[-14rem] top-2 h-[28rem] w-[36rem] 2xl:left-[-8rem] 2xl:h-[30rem] 2xl:w-[40rem]"
    >
      <div
        className="absolute left-24 top-24 h-72 w-72 rounded-full blur-[88px]"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(61,204,255,0.12) 34%, rgba(61,204,255,0) 74%)",
        }}
      />
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={chromeUgc}
          alt=""
          className="absolute left-[-0.5rem] top-[-4.5rem] max-w-none w-[44rem] object-contain opacity-[0.34] 2xl:left-[0.5rem] 2xl:w-[47rem]"
          style={{
            filter: "drop-shadow(0 34px 90px rgba(4,8,18,0.42))",
            maskImage:
            "radial-gradient(ellipse at 54% 54%, black 0%, black 36%, rgba(0,0,0,0.94) 50%, rgba(0,0,0,0.62) 60%, transparent 74%)",
          }}
        />
        <div
          className="absolute right-[-2rem] top-[-1rem] h-[22rem] w-[18rem]"
          style={{
            background:
              "radial-gradient(ellipse at 8% 52%, rgba(4,7,13,0) 0%, rgba(4,7,13,0.72) 44%, rgba(4,7,13,0.94) 70%, rgba(4,7,13,1) 100%)",
          }}
        />
      </div>
    </motion.div>

    <motion.div
      animate={{ y: [0, 12, 0], rotate: [10, 7, 10] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      className="absolute right-[-1rem] top-[2.5rem] w-[18rem] 2xl:right-[1rem] 2xl:top-[1rem] 2xl:w-[22rem]"
    >
      <div
        className="absolute inset-0 scale-90 rounded-full blur-[82px]"
        style={{
          background: "radial-gradient(circle, rgba(255,84,132,0.14) 0%, rgba(255,255,255,0.08) 28%, rgba(255,84,132,0) 76%)",
        }}
      />
      <img
        src={chromeDollar}
        alt=""
        className="relative w-full object-contain opacity-[0.94]"
        style={{ filter: "drop-shadow(0 38px 120px rgba(4,8,18,0.52))" }}
      />
    </motion.div>
  </div>
);

export function LandingPage() {
  const store = useCMSStore();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [hoveredRole, setHoveredRole] = useState<"creator" | "customer" | null>(null);

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      <PremiumBackground hoveredRole={hoveredRole} />

      <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 pt-32 pb-24 relative z-10">
        {/* Hero Section */}
        <div className="relative mx-auto mb-24 flex min-h-[34rem] max-w-[92rem] items-center justify-center md:justify-start">
          <HeroAssetScene />

          <div className="text-center md:text-left max-w-5xl mx-auto flex flex-col items-center md:items-start relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <h1 className="text-[4rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] font-hero leading-[0.85] uppercase tracking-tighter mb-8 flex flex-col items-center md:items-start w-full">
                <span className="text-white">{store.heroLine1}</span>
                <span className="text-primary">{store.heroLine2}</span>
                <span className="text-white">{store.heroLine3}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-ugc-primary border-b-[0.5rem] md:border-b-[1rem] border-primary pb-2 md:pb-4 inline-block">
                  {store.heroLine4}
                </span>
              </h1>
              <p className="text-xl text-foreground/60 mb-10 max-w-2xl font-sans text-center md:text-left">
                {store.heroDescription}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                <Link href="/auth?mode=register&role=customer">
                  <button className="h-14 px-8 rounded-xl bg-white text-black font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center gap-2">
                    Запустить кампанию <AppIcon icon={ArrowRight01Icon} size={18} />
                  </button>
                </Link>
                <Link href="/auth?mode=register&role=creator">
                  <button className="h-14 px-8 rounded-xl bg-card border border-white/10 text-white font-semibold text-lg hover:bg-white/5 transition-colors flex items-center gap-2">
                    Стать креатором
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Platform Ecosystem */}
        <div className="mb-32 relative">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-foreground/40 uppercase tracking-widest mb-4">
              Платформы запуска
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Работаем с TikTok, Instagram Reels и YouTube Shorts
            </h2>
            <p className="text-foreground/60 max-w-3xl mx-auto">
              Через эти платформы запускаем UGC-кампании, тестируем креативы и собираем первые рабочие связки для брендов и креаторов.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {PLATFORM_LOGOS.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="group relative flex items-center gap-4 rounded-[1.75rem] border border-white/8 bg-card/60 px-5 py-5 backdrop-blur-xl"
              >
                <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-white/10 transition-all duration-300 group-hover:bg-emerald-400 group-hover:shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]"
                >
                  <i className={`${item.iconClass} text-[1.7rem] leading-none ${item.tone}`} />
                </motion.div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-white">{item.label}</div>
                  <div className="text-sm text-foreground/50">{item.caption}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {VERTICAL_PILLS.map((pill, index) => {
              const Icon = pill.icon;

              return (
                <motion.div
                  key={pill.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-foreground/70"
                >
                  <Icon className={`h-[18px] w-[18px] ${pill.tone}`} />
                  <span className="font-medium text-white/88">{pill.label}</span>
                  <span className="text-foreground/45">{pill.caption}</span>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 overflow-hidden relative rounded-[1.75rem] border border-white/6 bg-white/[0.02] py-4">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

            <div className="flex w-max">
              {[0, 1].map((track) => (
                <motion.div
                  key={track}
                  animate={{ x: ["0%", "-100%"] }}
                  transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                  className="flex shrink-0 items-center gap-8 whitespace-nowrap px-6"
                >
                  {MARQUEE_ITEMS.map((item, index) => (
                    <div
                      key={`${track}-${item}-${index}`}
                      className="group flex items-center gap-3 text-base font-semibold text-white/72 transition-colors duration-300 hover:text-emerald-400"
                    >
                      <span className="h-2 w-2 rounded-full bg-white/22 transition-all duration-300 group-hover:bg-emerald-400 group-hover:shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Roles Cards */}
        <div className="grid md:grid-cols-2 gap-6 xl:gap-7 mb-28">
          {/* Creator Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative group cursor-pointer"
            onMouseEnter={() => setHoveredRole("creator")}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-ugc-primary/20 via-pink-500/20 to-ugc-primary/5 rounded-3xl blur-xl transition-all duration-500 ${hoveredRole === 'creator' ? 'blur-2xl opacity-100' : 'opacity-50'}`} />
            <div className={`relative h-full bg-card/50 backdrop-blur-xl border border-ugc-primary/20 rounded-3xl px-6 py-6 lg:px-7 lg:py-7 flex flex-col items-center text-center overflow-hidden transition-colors duration-500 ${hoveredRole === 'creator' ? 'bg-ugc-primary/10' : ''}`}>
              <div className={`absolute top-0 right-0 p-5 transition-opacity duration-500 ${hoveredRole === 'creator' ? 'opacity-20' : 'opacity-10'}`}>
                <AppIcon icon={PlayCircleIcon} className="h-24 w-24 text-ugc-primary lg:h-28 lg:w-28" size={112} />
              </div>
              
              <h2 className="text-2xl lg:text-[1.8rem] font-display font-bold mb-2 text-gradient-creator">КРЕАТОР</h2>
              <p className="text-sm lg:text-[15px] text-foreground/60 mb-5">Монетизируйте аудиторию нативными интеграциями</p>
              
              <div className="relative mb-5 h-[15.5rem] w-full overflow-hidden sm:h-[17rem] lg:h-[18rem]">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 scale-[0.5] origin-top sm:scale-[0.56] lg:scale-[0.6]">
                  <DeviceMockup contentType="ugc" animated />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mb-5">
                <div className="bg-background/50 rounded-2xl p-3.5 lg:p-4 border border-white/5">
                  <div className="text-xl lg:text-2xl font-mono font-bold text-white mb-1">$4.2k</div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">Ср. доход в мес.</div>
                </div>
                <div className="bg-background/50 rounded-2xl p-3.5 lg:p-4 border border-white/5">
                  <div className="text-xl lg:text-2xl font-mono font-bold text-white mb-1">24ч</div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">Быстрые выплаты</div>
                </div>
              </div>

              <Link href="/auth?mode=register&role=creator" className="w-full">
                <button className="w-full h-11 rounded-xl bg-ugc-primary/10 text-ugc-primary font-semibold hover:bg-ugc-primary hover:text-white transition-all border border-ugc-primary/20">
                  Стать креатором
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Customer Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative group cursor-pointer"
            onMouseEnter={() => setHoveredRole("customer")}
            onMouseLeave={() => setHoveredRole(null)}
          >
            <div className={`absolute inset-0 bg-gradient-to-bl from-clip-primary/20 via-blue-500/20 to-clip-primary/5 rounded-3xl blur-xl transition-all duration-500 ${hoveredRole === 'customer' ? 'blur-2xl opacity-100' : 'opacity-50'}`} />
            <div className={`relative h-full bg-card/50 backdrop-blur-xl border border-clip-primary/20 rounded-3xl px-6 py-6 lg:px-7 lg:py-7 flex flex-col items-center text-center overflow-hidden transition-colors duration-500 ${hoveredRole === 'customer' ? 'bg-clip-primary/10' : ''}`}>
              <div className={`absolute top-0 left-0 p-5 transition-opacity duration-500 ${hoveredRole === 'customer' ? 'opacity-20' : 'opacity-10'}`}>
                <AppIcon icon={LayoutGridIcon} className="h-24 w-24 text-clip-primary lg:h-28 lg:w-28" size={112} />
              </div>

              <h2 className="text-2xl lg:text-[1.8rem] font-display font-bold mb-2 text-gradient-customer">РЕКЛАМОДАТЕЛЬ</h2>
              <p className="text-sm lg:text-[15px] text-foreground/60 mb-5">Масштабируйте офферы с помощью аутентичного контента</p>
              
              <div className="relative mb-5 h-[15.5rem] w-full overflow-hidden sm:h-[17rem] lg:h-[18rem]">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 scale-[0.5] origin-top sm:scale-[0.56] lg:scale-[0.6]">
                  <DeviceMockup contentType="clip" animated />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mb-5">
                <div className="bg-background/50 rounded-2xl p-3.5 lg:p-4 border border-white/5">
                  <div className="text-xl lg:text-2xl font-mono font-bold text-white mb-1">50M+</div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">Охват аудитории</div>
                </div>
                <div className="bg-background/50 rounded-2xl p-3.5 lg:p-4 border border-white/5">
                  <div className="text-xl lg:text-2xl font-mono font-bold text-white mb-1">CPA</div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wider">Оплата за результат</div>
                </div>
              </div>

              <Link href="/auth?mode=register&role=customer" className="w-full">
                <button className="w-full h-11 rounded-xl bg-clip-primary/10 text-clip-primary font-semibold hover:bg-clip-primary hover:text-white transition-all border border-clip-primary/20">
                  Запустить кампанию
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-32">
          <div className="bg-card border border-white/5 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <AppIcon icon={SecurityCheckIcon} size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-display font-bold mb-3">Безопасно и надежно</h3>
            <p className="text-foreground/60">Никакой передачи видеофайлов. Креаторы публикуют контент напрямую в свои аккаунты, соблюдая правила платформ.</p>
          </div>
          <div className="bg-card border border-white/5 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-ugc-primary/10 flex items-center justify-center mb-6">
              <AppIcon icon={UserGroupIcon} size={24} className="text-ugc-primary" />
            </div>
            <h3 className="text-xl font-display font-bold mb-3">Проверенные креаторы</h3>
            <p className="text-foreground/60">Доступ к отобранной базе креаторов, специализирующихся на высококонверсионных вертикалях и нативных форматах.</p>
          </div>
          <div className="bg-card border border-white/5 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-clip-primary/10 flex items-center justify-center mb-6">
              <AppIcon icon={ZapIcon} size={24} className="text-clip-primary" />
            </div>
            <h3 className="text-xl font-display font-bold mb-3">Быстрый запуск</h3>
            <p className="text-foreground/60">От брифа до запущенной кампании менее чем за 48 часов. Аналитика и трекинг в реальном времени.</p>
          </div>
        </div>

        {store.testimonials.length > 0 && (
          <div className="mb-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-bold mb-4">{store.testimonialsTitle}</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {store.testimonials.map((testimonial, index) => (
                <div key={index} className="bg-card border border-white/5 rounded-3xl p-8 relative">
                  <div className="text-4xl text-primary/20 font-serif absolute top-6 right-8">"</div>
                  <p className="text-foreground/80 mb-8 relative z-10">{testimonial.text}</p>
                  <div className="flex items-center gap-4">
                    <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <div className="font-bold">{testimonial.name}</div>
                      <div className="text-sm text-foreground/50">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mb-32 max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">{store.faqTitle}</h2>
          </div>
          
          <div className="space-y-4">
            {store.faqItems.map((item, index) => (
              <div key={index} className="bg-card border border-white/5 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-bold text-lg">{item.question}</span>
                  <AppIcon
                    icon={ArrowDown01Icon}
                    size={18}
                    className={`transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-foreground/60">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-foreground/40 uppercase tracking-widest mb-4">
              Как это работает
            </p>
            <h2 className="text-4xl font-display font-bold mb-4">
              От первого оффера до результата без лишних касаний
            </h2>
            <p className="text-foreground/60 max-w-3xl mx-auto">
              Ровно тот MVP-поток, который нужен для первых брендов и креаторов: оффер, приглашение, чат, запуск и прозрачная оплата.
            </p>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-3">
            {FLOW_STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-card/70 p-8 backdrop-blur-xl"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${step.accent} opacity-60`} />
                <div className="relative z-10">
                  <div className="mb-8 flex items-start justify-between gap-4">
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.12 }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-background/60"
                    >
                      <AppIcon icon={step.icon} size={24} className={step.iconTone} />
                    </motion.div>
                    <div className="text-5xl font-display font-bold tracking-tight text-white/12">
                      0{index + 1}
                    </div>
                  </div>
                  <h3 className="mb-3 text-2xl font-display font-bold">{step.title}</h3>
                  <p className="text-foreground/65">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-card/70 px-6 py-10 sm:px-10 sm:py-12 mb-10">
          <div
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(circle at 18% 28%, rgba(255,84,132,0.14), transparent 34%), radial-gradient(circle at 82% 18%, rgba(61,204,255,0.16), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
            }}
          />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.24em] text-foreground/45">
                Быстрый старт
              </p>
              <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
                Запустите первую кампанию или получите первый оффер уже на этой неделе
              </h2>
            </div>

            <div className="rounded-[2rem] border border-white/8 bg-background/40 p-6 backdrop-blur-xl">
              <div className="mb-6 space-y-3">
                {CTA_BENEFITS.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 text-foreground/75">
                    <AppIcon icon={CheckmarkCircle02Icon} size={18} className="mt-0.5 text-primary" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/auth?mode=register&role=customer">
                  <button className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-base font-semibold text-black transition-colors hover:bg-gray-100">
                    <AppIcon icon={Rocket01Icon} size={18} />
                    Запустить первую кампанию
                  </button>
                </Link>
                <Link href="/auth?mode=register&role=creator">
                  <button className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 text-base font-semibold text-white transition-colors hover:bg-white/[0.06]">
                    <AppIcon icon={Message01Icon} size={18} />
                    Получить первый оффер
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
