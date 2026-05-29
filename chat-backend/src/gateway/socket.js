const { Server } = require("socket.io");

function setupRealtime(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // <-- Вместо "*" указываем четкий адрес фронтенда
      credentials: true,
    },
  });

 io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);

  // --- ДОБАВИЛИ: Поддержка глобального чата ---
  socket.on("join-global", () => {
    socket.join("global_room");
  });

  socket.on("send-global-message", (savedMessage) => {
    // Просто пересылаем готовый fullMessage со всеми аватарками обратно в глобальную комнату
    io.to("global_room").emit("receive-global-message", savedMessage);
  });

  // --- ИСПРАВИЛИ: Личные комнаты ---
  socket.on("join-room", (roomId) => {
    if (roomId) socket.join(roomId);
  });

  socket.on("send-message", (savedMessage) => {
    if (!savedMessage || !savedMessage.chatId) return;
    
    // ИСПРАВЛЕНИЕ: Вместо ручной сборки payload, отправляем savedMessage целиком!
    // Там уже есть развернутый sender (с username и avatar), правильный text и createdAt из базы данных.
    io.to(savedMessage.chatId).emit("new-message", savedMessage);
  });

  socket.on("disconnect", () => {
    console.log(`client disconnected: ${socket.id}`);
  });
});

  return io;
}

module.exports = setupRealtime;