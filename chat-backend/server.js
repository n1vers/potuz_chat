require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors"); // <-- 1. Импортируем cors

const initDatabase = require("./src/config/db");
const authApi = require("./src/routes/auth");
const profileApi = require("./src/routes/profile");
const chatsApi = require("./src/routes/chats");
const messagesApi = require("./src/routes/messages");
const setupRealtime = require("./src/gateway/socket");

const app = express();
const server = http.createServer(app);

// 2. Инициализируем сокеты (мы обновим их конфигурацию на шаге 2)
setupRealtime(server);
initDatabase();

app.disable("x-powered-by");

// 3. ПОДКЛЮЧАЕМ CORS (СТРОГО перед обработкой запросов и роутов!)
app.use(cors({
  origin: "http://localhost:5173", // Адрес твоего фронтенда
  credentials: true                // Позволяет браузеру передавать куки авторизации
}));

// Ставим это сразу после app.use(cookieParser());
app.use(cookieParser()); // Перенесли выше, чтобы статика была ниже всех middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Исправленный путь: 
// Если папка лежит в src/public, и мы хотим, чтобы 
// путь /static/uploads/... открывал src/public/uploads/...
// Эта строка говорит: когда просят /static/uploads/..., ищи файл в src/public/uploads/...
app.use("/static", express.static(path.join(__dirname, "src", "public")));

// Твои роуты авторизации теперь будут доступны как по /v1/auth, так и по /api/auth
app.use("/api/auth", authApi); 
app.use("/v1/auth", authApi);
app.use("/v1/profile", profileApi);
app.use("/v1/chats", chatsApi);
app.use("/v1/messages", messagesApi);

app.get("/health", (_, response) => {
  response.json({
    ok: true,
    uptime: process.uptime(),
  });
});

app.use((request, response) => {
  response.status(404).json({
    error: "Route not found",
    path: request.originalUrl,
  });
});

const APP_PORT = process.env.PORT || 5000;

server.listen(APP_PORT, () => {
  console.log(`Realtime API started on port ${APP_PORT}`);
});