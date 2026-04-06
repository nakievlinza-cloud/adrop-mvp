import { motion } from "framer-motion";

const PRIVACY_POLICY_SECTIONS = [
  {
    title: "1. Сбор информации",
    body: "Мы собираем информацию, которую вы предоставляете нам напрямую при регистрации аккаунта, обновлении профиля, использовании наших сервисов или обращении в службу поддержки. Эта информация может включать ваше имя, адрес электронной почты, ссылки на социальные сети и реквизиты криптовалютных кошельков для осуществления выплат.",
  },
  {
    title: "2. Использование информации",
    body: "Мы используем собранную информацию для предоставления, поддержки и улучшения наших услуг, обработки транзакций и отправки соответствующих уведомлений, связи с вами по вопросам безопасности, поддержки и административным вопросам, а также подбора наиболее релевантных рекламных предложений.",
    list: [
      "Предоставления, поддержки и улучшения наших услуг;",
      "Обработки транзакций и отправки соответствующих уведомлений;",
      "Связи с вами по вопросам безопасности, поддержки и административным вопросам;",
      "Подбора наиболее релевантных рекламных предложений.",
    ],
  },
  {
    title: "3. Защита данных",
    body: "Мы принимаем разумные меры для защиты вашей личной информации от потери, кражи, неправильного использования, несанкционированного доступа, раскрытия, изменения и уничтожения. Пароли хранятся в зашифрованном виде с использованием современных криптографических алгоритмов.",
  },
  {
    title: "4. Передача данных третьим лицам",
    body: "Мы не продаем и не передаем вашу личную информацию третьим лицам без вашего согласия, за исключением случаев, когда это необходимо для предоставления наших услуг, например при передаче публичного профиля креатора рекламодателю при отклике на оффер, или если этого требует закон.",
  },
  {
    title: "5. Ваши права",
    body: "Вы имеете право запросить доступ к вашей личной информации, ее исправление или удаление. Вы также можете в любой момент отозвать свое согласие на обработку данных, удалив свой аккаунт в настройках профиля.",
  },
];

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-8 text-sm leading-7 text-foreground/75">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.24em] text-foreground/45">
        Последнее обновление: 11 марта 2026 г.
      </div>

      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">{section.title}</h2>
          <p>{section.body}</p>
          {section.list && (
            <ul className="space-y-2 pl-5 text-foreground/70">
              {section.list.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="w-full px-6 py-16 sm:px-8 lg:px-12 2xl:px-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-card/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <div className="mb-10 space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-foreground/45">ADROP Legal</p>
          <h1 className="text-3xl font-display font-bold text-white sm:text-4xl">Политика конфиденциальности</h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground/60">
            Описываем, какие данные платформа получает при регистрации и работе с офферами,
            как они используются и какие права остаются у пользователя.
          </p>
        </div>

        <PrivacyPolicyContent />
      </motion.div>
    </div>
  );
}
