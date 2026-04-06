/**
 * Telegram Bot Setup Script
 *
 * Этот скрипт настраивает webhook и команды для Telegram бота
 *
 * Установка:
 * npm install node-telegram-bot-api
 *
 * Запуск:
 * node telegram-bot.cjs
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Токен из .env
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is required');
}

// Инициализация бота
const bot = new TelegramBot(TOKEN, { polling: true });

// URL вашего приложения (для продакшена)
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-domain.com';

console.log('🤖 Бот запущен!');

// Приветственное сообщение при старте
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Друг';

  const welcomeMessage = `
🎉 Привет, *${firstName}*!

Добро пожаловать в **ADROP** — маркетплейс UGC контента для grey niches!

📋 *Что дальше?*

1️⃣ Нажми кнопку ниже для авторизации
2️⃣ Выбери свою роль (Креатор или Бренд)
3️⃣ Начни зарабатывать или находить креаторов!

💰 *Для креаторов:* Создавай UGC контент и получай оплату
🚀 *Для брендов:* Находи лучших креаторов для твоих офферов

Готов начать? Жми кнопку ниже! 👇
  `;

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🚀 Авторизоваться на ADROP',
          url: 'http://localhost:3000/auth' // Замените на ваш домен в продакшене
        }
      ]]
    }
  });
});

// Команда помощи
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📚 *Справка по ADROP Bot*

Доступные команды:
/start - Начать работу и авторизоваться
/help - Эта справка
/profile - Ваш профиль
/offers - Доступные офферы
/support - Поддержка

❓ *Вопросы?*
Пишите: @adrop_support
  `;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Обработка обычных сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Если это не команда
  if (!text.startsWith('/')) {
    bot.sendMessage(chatId, `
👋 Я бот ADROP!

Для авторизации на платформе нажми:
/start

Или перейди по ссылке:
http://localhost:3000/auth
    `);
  }
});

// Обработка callback query (нажатие на inline кнопки)
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  bot.answerCallbackQuery(query.id);

  if (query.data === 'auth') {
    bot.sendMessage(chatId, `
🔐 Для авторизации перейдите по ссылке:

http://localhost:3000/auth

После авторизации вы сможете:
• Выбрать роль (Креатор/Бренд)
• Заполнить профиль
• Начать работу!
    `);
  }
});

// Настройка webhook (опционально, для продакшена)
async function setWebhook() {
  try {
    await bot.setWebHook(`${WEBHOOK_URL}/telegram-webhook`);
    console.log(`✅ Webhook установлен: ${WEBHOOK_URL}/telegram-webhook`);
  } catch (error) {
    console.error('❌ Ошибка установки webhook:', error);
  }
}

// Расскомментируйте для продакшена
// setWebhook();

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error(`❌ Polling error: ${error.code} - ${error.message}`);
});

console.log('✅ Бот готов к работе!');
console.log('📝 Откройте Telegram и найдите @adrop_auth_bot');
console.log('🔑 Нажмите /start для начала');
