# Deploy-F: запуск ADROP

Самый безопасный путь для этого проекта - загружать его в Deploy-F как `Docker`-приложение, а не как "просто Node.js".

Почему:

- у проекта есть и `frontend`, и `backend`
- frontend собирается через `Vite`
- backend нужен для `/api`, Firebase Admin и платежей
- в Docker мы сами контролируем build и команду запуска

## Что уже подготовлено

- `Dockerfile` собирает frontend и запускает сервер
- сервер теперь умеет раздавать `dist` и API с одного домена
- есть команда для сборки zip: `npm run deployf:zip`

## Что нужно указать в Deploy-F

### Формат загрузки

Загрузите zip-архив проекта и выберите запуск через `Docker`.

### Порт

Deploy-F обычно сам прокидывает `PORT`.
Проект уже умеет его подхватывать.

## Обязательные переменные окружения

Без них приложение не поднимется корректно:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
  - JSON сервисного аккаунта Firebase одной строкой

## Нужны для клиентского Telegram-логина

Если в продукте используете вход через Telegram:

- `VITE_TELEGRAM_BOT_USERNAME`
- `VITE_TELEGRAM_BOT_ID`
- `VITE_TELEGRAM_AUTH_ORIGIN`
  - поставьте сюда ваш будущий Deploy-F домен, например `https://your-app.deploy-f.com`

## Нужны для платежей

Если хотите, чтобы работали пополнения и платежные сети:

- `PAYMENTS_WALLET_TRC20`
- `PAYMENTS_WALLET_ERC20`
- `PAYMENTS_WALLET_BEP20`
- `PAYMENTS_ETH_RPC_URL`
- `PAYMENTS_BSC_RPC_URL`
- `TRONGRID_API_KEY`

Если пока платежи не нужны, кошельки можно не указывать. Тогда API поднимется, но платежные сети будут пустыми.

## Опционально

- `PAYMENT_MIN_AMOUNT`
- `PAYMENT_EXPIRY_MINUTES`
- `FIRESTORE_DATABASE_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Как собрать архив

```bash
npm run deployf:zip
```

После этого в корне появится файл:

```bash
deploy-f-project.zip
```

## Что делать дальше

1. Зайти в Deploy-F
2. Создать новое приложение
3. Выбрать `Docker`
4. Загрузить `deploy-f-project.zip`
5. Вбить обязательные переменные окружения
6. Дождаться сборки
7. Открыть выданный домен

## Что обязательно сделать в Firebase после деплоя

Когда Deploy-F выдаст вам домен приложения, добавьте его в:

- `Firebase Console -> Authentication -> Settings -> Authorized domains`

Иначе могут не работать:

- логин
- подтверждение email
- редиректы после авторизации

## Что проверить после первого запуска

1. Открывается ли главная страница
2. Работает ли регистрация и логин
3. Есть ли ответы на:
   - `GET /health`
   - `GET /api/payments/config` после логина
4. Домен добавлен в `Firebase Authorized domains`
5. Не ломаются ли Firebase rules / Firestore данные

## Важный честный момент

Код уже можно выкладывать как тестовый онлайн-сервис, но до полностью "боевого" продукта еще есть шаги:

- проверить все env на проде
- проверить Firebase email-flow на домене
- проверить платежи на реальных RPC / кошельках
- убедиться, что Telegram auth работает на продовом origin
- пройтись по всем ролям: бренд / креатор / админ
