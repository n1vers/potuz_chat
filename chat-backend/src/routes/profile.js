const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware"); // Убедись, что название файла совпадает с твоим бэкендом

const router = express.Router();

// ИСПРАВЛЕНИЕ ПУТИ: выходим на уровень выше из src, чтобы попасть в корневой public
// Мы находимся в src/routes, значит выход на 1 уровень вверх -> src
const avatarsDir = path.join(__dirname, "..", "public", "uploads", "avatars");

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, avatarsDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    // ИСПРАВЛЕНИЕ: Вместо req.user.id (которого тут еще нет), используем случайное число
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Можно загружать только изображения"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

// ИСПРАВЛЕНИЕ: Поменяли "/" на "/update", чтобы совпадало с твоим фронтендом!
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { username, about } = req.body;
    const update = {};

    if (username) {
      const trimmedUsername = username.trim();

      if (trimmedUsername.length < 2 || trimmedUsername.length > 30) {
        return res.status(400).json({
          message: "Имя должно быть от 2 до 30 символов",
        });
      }

      const existingUser = await User.findOne({
        username: trimmedUsername,
        _id: { $ne: req.user.id },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Это имя уже занято",
        });
      }

      update.username = trimmedUsername;
    }

    if (about !== undefined) {
      if (about.length > 500) {
        return res.status(400).json({
          message: "Описание не должно быть длиннее 500 символов",
        });
      }
      update.about = about.trim();
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
    }).select("-passwordHash");

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка обновления профиля" });
  }
});

router.post(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Файл не загружен" });
      }

      // Путь, который запишется в базу данных
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: avatarUrl },
        { new: true }
      ).select("-passwordHash");

      res.json({ user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Ошибка загрузки аватарки" });
    }
  }
);

module.exports = router;