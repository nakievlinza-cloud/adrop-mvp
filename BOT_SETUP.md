# 🤖 Запуск Telegram бота ADROP

## Что уже настроено ✅

- ✅ Токен бота добавлен в `.env`
- ✅ Автозаполнение полей из Telegram (имя, username, аватар)
- ✅ Авторизация через OAuth
- ✅ Выбор роли после входа
- ✅ Скрипт бота с приветственным сообщением

## Шаг 1: Установка зависимостей бота

```bash
# Создайте отдельную папку для бота (опционально)
mkdir telegram-bot
cd telegram-bot

# Скопируйте bot-package.json как package.json
cp ../bot-package.json ./package.json

# Скопируйте telegram-bot.cjs
cp ../telegram-bot.cjs ./telegram-bot.cjs

# Установите зависимости
npm install
```

## Шаг 2: Запуск бота

### Вариант A: Простой запуск (для тестов)

```bash
# Из корня проекта
node telegram-bot.cjs
```

### Вариант B: С автоперезагрузкой (для разработки)

```bash
npm run dev
```

### Вариант C: В фоне (для продакшена)

```bash
# Linux/Mac
nohup node telegram-bot.cjs > bot.log 2>&1 &

# Windows
start node telegram-bot.cjs
```

## Шаг 3: Проверка работы бота

1. Откройте Telegram
2. Найдите бота по username: `@adrop_auth_bot`
3. Нажмите **Start** или отправьте `/start`
4. Бот пришлет приветственное сообщение с кнопкой

## Что делает бот?

### При команде `/start`:

```
🎉 Привет, [Имя]!

Добро пожаловать в ADROP — маркетплейс UGC контента!

📋 Что дальше?

1️⃣ Нажми кнопку ниже для авторизации
2️⃣ Выбери свою роль (Креатор или Бренд)
3️⃣ Начни зарабатывать или находить креаторов!

💰 Для креаторов: Создавай UGC контент и получай оплату
🚀 Для брендов: Находи лучших креаторов для твоих офферов

[🚀 Авторизоваться на ADROP]
```

### При нажатии кнопки:

1. Пользователь переходит на `http://localhost:3000/auth`
2. Нажимает "Войти через Telegram"
3. Выбирает роль
4. **Автозаполнение:**
   - ✅ Имя (из Telegram first_name)
   - ✅ Username (никнейм)
   - ✅ Аватар
   - ✅ Telegram ID
   - ✅ Ссылка на TikTok (если есть username)

## Структура данных после регистрации

### Креатор:
```json
{
  "name": "Иван Иванов",
  "username": "ivan_petrov",
  "nickname": "ivan_petrov",
  "avatar": "https://...",
  "telegramId": "123456789",
  "telegramUsername": "ivan_petrov",
  "about": "✨ Привет! Я Иван Иванов - креатор UGC контента",
  "platforms": {
    "tiktok": "https://tiktok.com/@ivan_petrov"
  },
  "role": "creator"
}
```

### Бренд:
```json
{
  "name": "Иван Иванов",
  "companyName": "Иван Иванов",
  "username": "ivan_petrov",
  "telegramId": "123456789",
  "role": "customer"
}
```

## Настройка для продакшена

### 1. Измените URL в боте:

```javascript
// В telegram-bot.cjs замените:
url: 'http://localhost:3000/auth'

// На:
url: 'https://your-domain.com/auth'
```

### 2. Установите webhook:

```javascript
// Раскомментируйте в telegram-bot.cjs:
setWebhook();
```

### 3. Настройте .env:

```env
TELEGRAM_BOT_TOKEN=8262715032:AAG96g-QDuasiRyA8byTZyKLJJQzs5LgyZc
WEBHOOK_URL=https://your-domain.com
```

## Дополнительные команды бота

Добавьте в `telegram-bot.cjs`:

```javascript
// Профиль пользователя
bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;

  // Здесь можно получить данные из Firestore по telegramId
  bot.sendMessage(chatId, `
👤 Ваш профиль:

Имя: ${msg.from.first_name}
Username: @${msg.from.username || 'не указан'}
Telegram ID: ${msg.from.id}

Для редактирования профиля зайдите на сайт:
https://your-domain.com/profile
  `);
});

// Список офферов
bot.onText(/\/offers/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
📋 Актуальные офферы:

Посмотреть все офферы:
https://your-domain.com/offers

Для брендов - создание офферов:
https://your-domain.com/create-offer
  `);
});

// Поддержка
bot.onText(/\/support/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `
💬 Нужна помощь?

Напишите нам: @adrop_support
Или воспользуйтесь формой на сайте:
https://your-domain.com/support
  `);
});
```

## Тестирование flow

### Полный сценарий:

1. **Пользователь находит бота** → `@adrop_auth_bot`
2. **Нажимает Start** → Бот отправляет приветствие
3. **Нажимает кнопку** → Переходит на `/auth`
4. **Нажимает "Войти через Telegram"** → Popup авторизация
5. **Выбирает роль** → Креатор или Бренд
6. **Данные автозаполнены** → Имя, username, аватар
7. **Редирект** → В dashboard

## Отладка

### Бот не отвечает?

```bash
# Проверьте логи
tail -f bot.log

# Перезапустите бота
pkill -f "node telegram-bot.cjs"
node telegram-bot.cjs
```

### Ошибка токена?

```bash
# Проверьте .env
cat .env | grep TELEGRAM

# Должно быть:
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
```

### OAuth не работает?

- Проверьте что URL верный
- Убедитесь что токен активен
- Проверьте консоль браузера

## Следующие улучшения

- [ ] Отправка уведомлений о новых офферах
- [ ] Напоминания о未完成 работах
- [ ] Статистика заработка в боте
- [ ] Поиск креаторов через бота
- [ ] Управление офферами из бота

---

🎉 Все готово! Запускайте бота и тестируйте!

```bash
node telegram-bot.cjs
```
