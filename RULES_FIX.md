# 🔥 Firebase Firestore Rules - Fix

## Вариант 1 (простейший):

Скопируй и вставь **ТОЛЬКО ЭТО**:

```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Вариант 2 (если первый не работает):

Если первый вариант не работает, попробуй вообще без условий:

```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## ⚠️ Важно:

1. **УДАЛИ ВСЁ** что есть в поле Rules перед вставкой
2. **НЕ копируй** ничего лишнего (комментариев, текста и т.д.)
3. **Только код** выше
4. Проверь что нет **лишних пробелов** в начале

## 🎯 Если всё равно ошибка:

1. Открой Firebase Console
2. Firestore → Rules
3. Сделай **скриншот** того что там написано
4. Или напиши **какой именно текст** видишь в поле

Возможно у тебя там что-то осталось от старых правил!
