import { motion } from "framer-motion";

export function AboutPage() {
  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">О платформе ADROP</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-foreground/80 leading-relaxed mb-8">
            ADROP — это инновационный маркетплейс, соединяющий амбициозные бренды с талантливыми контент-креаторами. Мы верим, что будущее рекламы за аутентичным, пользовательским контентом (UGC) и нативными интеграциями.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
            <div className="bg-card border border-white/10 p-8 rounded-3xl">
              <h3 className="text-2xl font-bold text-ugc-primary mb-4">Для Креаторов</h3>
              <p className="text-foreground/70">
                Мы предоставляем прозрачный доступ к высокооплачиваемым офферам от брендов в вертикалях Crypto, Betting, Gambling, Dating и Nutra. Никаких долгих согласований — выбирайте оффер, снимайте контент и получайте выплаты в USDT.
              </p>
            </div>
            <div className="bg-card border border-white/10 p-8 rounded-3xl">
              <h3 className="text-2xl font-bold text-clip-primary mb-4">Для Брендов</h3>
              <p className="text-foreground/70">
                Масштабируйте свой маркетинг с помощью сотен креаторов. Запускайте кампании от $100, получайте понятный бюджет для бренда и готовый контент для таргета или органические просмотры в TikTok, Reels и Shorts.
              </p>
            </div>
          </div>

          <h2 className="text-3xl font-bold mt-12 mb-6">Наша миссия</h2>
          <p className="text-foreground/80 leading-relaxed">
            Сделать рынок инфлюенс-маркетинга прозрачным, автоматизированным и безопасным для обеих сторон. Мы берем на себя всю рутину: от поиска и брифования до безопасных сделок и выплат в криптовалюте, чтобы вы могли сосредоточиться на главном — создании крутого контента и развитии бизнеса.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
