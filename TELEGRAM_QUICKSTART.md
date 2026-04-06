# 🚀 Быстрый старт с Telegram авторизацией

## Что уже реализовано ✅

1. **Telegram OAuth вход** — кнопка "Войти через Telegram" на странице `/auth`
2. **Автоматическая регистрация** — новые пользователи выбирают роль (Креатор/Бренд)
3. **Сохранение данных** — имя, username, аватар из Telegram
4. **Повторный вход** — существующие пользователи заходят без выбора роли
5. **Валидация данных** — проверка подписи Telegram для безопасности

## Как протестировать БЕЗ реального бота (mock mode)

Если у вас еще нет Telegram бота, можно протестировать UI:

1. **Откройте файл** `/src/lib/telegramAuth.ts`
2. **Замените** функцию валидации:

```typescript
export async function validateTelegramAuth(authData: TelegramAuthData): Promise<boolean> {
  // ❌ ЗАКОММЕНТИРУЙТЕ РЕАЛЬНУЮ ПРОВЕРКУ
  // if (!TELEGRAM_BOT_TOKEN) { ... }

  // ✅ ДОБАВЬТЕ MOCK РЕЖИМ
  console.log('🧪 Mock Telegram auth:', authData);
  return true; // Всегда возвращаем true для тестов
}
```

3. **Добавьте тестовые данные** в AuthPage.tsx:

```typescript
// В useEffect где обрабатываем Telegram callback
if (hasData && tgData.id && tgData.hash) {
  // ❌ ЗАКОММЕНТИРУЙТЕ РЕАЛЬНУЮ ЛОГИКУ

  // ✅ ДОБАВЬТЕ ТЕСТОВЫЕ ДАННЫЕ
  const mockTgData = {
    id: 123456789,
    first_name: "Иван",
    username: "test_user",
    photo_url: "https://i.pravatar.cc/150?img=33",
    auth_date: Math.floor(Date.now() / 1000),
    hash: "test_hash"
  };
  handleTelegramAuth(mockTgData);
}
```

## Как настроить РЕАЛЬНЫЙ Telegram бот

### Вариант 1: Через BotFather (простой)

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Придумайте имя: `ADROP Bot`
4. Придумайте username: `adrop_auth_bot`
5. **Скопируйте токен**: `123456789:ABCdefGHI...`

### Вариант 2: Использовать тестовый бот (для локальных тестов)

Используйте свой токен и username от BotFather. Не храните токен в репозитории.

## Файл `.env`

Создайте `.env` в корне:

```bash
# Токен бота от BotFather (используется сервером)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Username бота
VITE_TELEGRAM_BOT_USERNAME=adrop_auth_bot
```

## Запуск проекта

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск
npm run dev
npm run dev:server

# 3. Откройте
http://localhost:3000/auth
```

## Тестирование

1. Нажмите **"Войти через Telegram"**
2. Разрешите доступ в popup
3. Выберите роль:
   - **Креатор** → попадете в `/creator/offers`
   - **Бренд** → попадете в `/customer/dashboard`

## Где хранятся данные пользователя?

В Firestore коллекции `users`:

```typescript
{
  uid: "...",
  telegramId: "123456789",  // ← ID из Telegram
  telegramUsername: "username",
  name: "Иван Иванов",
  avatar: "https://...",
  role: "creator" | "customer",
  // ... остальные данные
}
```

## Дополнительные фичи для продакшена

- [ ] Привязка Telegram к существующему email аккаунту
- [ ] Смена роли после регистрации
- [ ] Отвязка Telegram
- [ ] Вход через Telegram Mini App
- [ ] Web-push уведомления через Telegram

## Проблемы?

**"Ошибка валидации"** → Проверьте токен в `.env`
**"Popup не открывается"** → Разрешите popup в браузере
**"Нет данных от Telegram"** → Проверьте консоль браузера

---

📖 **Полная инструкция**: `TELEGRAM_SETUP.md`
