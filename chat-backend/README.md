# Refactored Chat Backend

## Что изменено
- Полностью изменена структура проекта
- Роуты перенесены в src/
- Добавлен websocket через Socket.IO
- Новый HTTP server вместо обычного app.listen()
- Изменены пути API
- Добавлен health endpoint

## WebSocket события

### Подключение
```js
const socket = io("http://localhost:5000");
```

### Вход в комнату
```js
socket.emit("join-room", "chat-id");
```

### Отправка сообщения
```js
socket.emit("send-message", {
  chatId: "chat-id",
  text: "hello",
  sender: "alex"
});
```

### Получение сообщения
```js
socket.on("new-message", (message) => {
  console.log(message);
});
```

## Запуск
```bash
npm install
npm run dev
```
