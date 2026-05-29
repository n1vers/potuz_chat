const jwt = require("jsonwebtoken");
const User = require("../models/User"); // 1. Импортируем модель пользователя

// 2. Добавляем слово async перед функцией
async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "Вы не авторизованы",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Ищем пользователя в MongoDB Атлас по его ID
    const dbUser = await User.findById(decoded.id);

    if (!dbUser) {
      return res.status(401).json({
        message: "Пользователь не найден в базе данных",
      });
    }

    // 4. Записываем в req.user данные из базы (включая роль!)
    req.user = {
      id: dbUser._id,
      username: dbUser.username,
      role: dbUser.role, // Вот теперь checkRole("admin") увидит твою роль!
    };

    next();
  } catch (error) {
    console.error("Ошибка в authMiddleware:", error);
    return res.status(401).json({
      message: "Неверный или истёкший токен",
    });
  }
}

module.exports = authMiddleware;