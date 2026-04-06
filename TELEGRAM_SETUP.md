# Настройка Telegram авторизации

## Инструкция по настройке Telegram бота

### Шаг 1: Создание бота через BotFather

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям:
   - Введите имя бота (например: `ADROP Auth Bot`)
   - Введите username бота (например: `adrop_auth_bot`)
4. **Сохраните полученный токен** — он выглядит как `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### Шаг 2: Настройка домена

Важно: Telegram требует HTTPS и валидный домен.

Для локальной разработки:
- Используйте [ngrok](https://ngrok.com) или [localtunnel](https://localtunnel.github.io/www/)
- Пример: `ngrok http 3000` даст вам домен типа `https://abc123.ngrok.io`

Для продакшена:
- Убедитесь что ваш домен имеет HTTPS сертификат
- Добавьте домен в BotFather (опционально)

### Шаг 3: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
# Копируйте из .env.example
cp .env.example .env
```

Отредактируйте `.env`:

```env
VITE_TELEGRAM_BOT_USERNAME=adrop_auth_bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Шаг 4: Активация Telegram Login Widget

В коде уже используется Telegram Widget. При нажатии кнопки "Войти через Telegram":

1. Откроется popup окно Telegram
2. Пользователь подтвердит авторизацию
3. Telegram вернет данные на ваш сайт
4. Пользователь сможет выбрать роль (Креатор/Бренд)

### Шаг 5: Проверка работы

1. Запустите проект и auth сервер:
```bash
npm install
npm run dev
npm run dev:server
```

2. Откройте `http://localhost:3000/auth`
3. Нажмите "Войти через Telegram"
4. Разрешите доступ боту
5. Выберите роль (Креатор или Бренд)

## Безопасность

⚠️ **ВАЖНО**: Никогда не коммитьте `.env` файл в Git!

Добавьте в `.gitignore`:
```
.env
.env.local
.env.*.local
```

## Решение проблем

### Проблема: "Ошибка валидации данных Telegram"
- Убедитесь что `TELEGRAM_BOT_TOKEN` указан верно
- Проверьте что домен валидный (для продакшена)

### Проблема: "Telegram Login script not loaded"
- Проверьте консоль браузера на ошибки сети
- Убедитесь что нет блокировок рекламы

### Проблема: Popup окно не открывается
- Проверьте что popup не блокируется браузером
- Разрешите popup для вашего домена

## Альтернатива: OAuth через Telegram Mini App

Если хотите использовать Telegram Mini App вместо Widget:

1. Создайте Mini App через [@BotFather](https://t.me/BotFather)
2. Используйте `Telegram.WebApp` API вместо Widget
3. Измените кнопку в `AuthPage.tsx`

## Дополнительные ресурсы

- [Telegram Widget Documentation](https://core.telegram.org/widgets/login)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
