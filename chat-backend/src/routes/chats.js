const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Chat = require("../models/Chat");
const authMiddleware = require("../middleware/authMiddleware");
const { makePrivateChatId } = require("../utility/chat");

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildDialog(chat, currentUserId) {
  if (chat.type === "private") {
    const otherUser = chat.participants.find((participant) => {
      return String(participant._id) !== String(currentUserId);
    });

    if (!otherUser) {
      return null;
    }

    return {
      chatId: chat.chatId,
      type: "private",
      chatType: "private",
      title: otherUser.username,
      subtitle: otherUser.about || "Личный чат",
      user: otherUser,
      participants: chat.participants,
      lastMessage: chat.lastMessage || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  if (chat.type === "group") {
    return {
      chatId: chat.chatId,
      type: "group",
      chatType: "group",
      title: chat.title || "Групповой чат",
      subtitle: `${chat.participants.length} участников`,
      user: null,
      participants: chat.participants,
      lastMessage: chat.lastMessage || null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  return null;
}

router.get("/users", authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;

    const filter = {
      _id: {
        $ne: req.user.id,
      },
    };

    if (q && q.trim()) {
      const safeQuery = escapeRegex(q.trim());

      filter.$or = [
        {
          username: new RegExp(safeQuery, "i"),
        },
        {
          email: new RegExp(safeQuery, "i"),
        },
      ];
    }

    const users = await User.find(filter)
      .select("username email avatar about createdAt")
      .sort({
        username: 1,
      })
      .limit(40)
      .lean();

    res.json({
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Ошибка загрузки пользователей",
    });
  }
});

router.get("/dialogs", authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;

    const chats = await Chat.find({
      participants: req.user.id,
    })
      .populate("participants", "username email avatar about createdAt")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar about",
        },
      })
      .sort({
        updatedAt: -1,
      })
      .lean();

    let dialogs = chats
      .map((chat) => buildDialog(chat, req.user.id))
      .filter(Boolean);

    if (q && q.trim()) {
      const safeQuery = escapeRegex(q.trim());
      const regex = new RegExp(safeQuery, "i");

      dialogs = dialogs.filter((dialog) => {
        if (dialog.type === "private") {
          return (
            regex.test(dialog.user.username) ||
            regex.test(dialog.user.email) ||
            regex.test(dialog.user.about || "")
          );
        }

        if (dialog.type === "group") {
          return (
            regex.test(dialog.title) ||
            dialog.participants.some((participant) => {
              return (
                regex.test(participant.username) ||
                regex.test(participant.email) ||
                regex.test(participant.about || "")
              );
            })
          );
        }

        return false;
      });
    }

    dialogs.sort((a, b) => {
      const dateA = a.lastMessage
        ? new Date(a.lastMessage.createdAt)
        : new Date(a.updatedAt);

      const dateB = b.lastMessage
        ? new Date(b.lastMessage.createdAt)
        : new Date(b.updatedAt);

      return dateB - dateA;
    });

    res.json({
      dialogs,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Ошибка загрузки диалогов",
    });
  }
});

router.post("/private/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Неверный id пользователя",
      });
    }

    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({
        message: "Нельзя создать личный чат с самим собой",
      });
    }

    const targetUser = await User.findById(userId).select(
      "username email avatar about createdAt"
    );

    if (!targetUser) {
      return res.status(404).json({
        message: "Пользователь не найден",
      });
    }

    const chatId = makePrivateChatId(String(req.user.id), String(targetUser._id));

    // 1. Ищем чат по уникальному chatId личной переписки
    let chat = await Chat.findOne({ chatId });

    // 2. Если чата еще нет в базе — создаем его
    if (!chat) {
      chat = await Chat.create({
        chatId,
        type: "private",
        participants: [req.user.id, targetUser._id],
        createdBy: req.user.id,
      });
    }

    // 3. Делаем глубокий populate, чтобы гарантировать наличие объектов участников
    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "username email avatar about createdAt")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar about",
        },
      })
      .lean();

    // 4. Собираем диалог через твою функцию
    let dialog = buildDialog(populatedChat, req.user.id);

    // КРИТИЧЕСКАЯ ПОДСТРАХОВКА: Если buildDialog почему-то вернул null,
    // собираем диалог вручную из гарантированных данных targetUser, чтобы фронтенд не падал!
    if (!dialog) {
      dialog = {
        chatId: populatedChat.chatId,
        type: "private",
        chatType: "private",
        title: targetUser.username,
        subtitle: targetUser.about || "Личный чат",
        user: targetUser,
        participants: populatedChat.participants,
        lastMessage: populatedChat.lastMessage || null,
        createdAt: populatedChat.createdAt,
        updatedAt: populatedChat.updatedAt,
      };
    }

    // Возвращаем статус 200 или 201 и собранный диалог
    res.status(200).json({
      dialog,
    });
  } catch (error) {
    console.error("ОШИБКА_СОЗДАНИЯ_ЛИЧНОГО_ЧАТА:", error);
    res.status(500).json({
      message: "Ошибка создания личного чата",
      error: error.message
    });
  }
});

router.post("/group", authMiddleware, async (req, res) => {
  try {
    const { title, participantIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Введите название группы",
      });
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 2 || trimmedTitle.length > 80) {
      return res.status(400).json({
        message: "Название группы должно быть от 2 до 80 символов",
      });
    }

    if (!Array.isArray(participantIds)) {
      return res.status(400).json({
        message: "Выберите участников группы",
      });
    }

    const uniqueParticipantIds = [
      ...new Set(participantIds.map((id) => String(id))),
    ].filter((id) => String(id) !== String(req.user.id));

    if (uniqueParticipantIds.length < 1) {
      return res.status(400).json({
        message: "Выберите хотя бы одного участника кроме себя",
      });
    }

    const hasInvalidId = uniqueParticipantIds.some((id) => {
      return !mongoose.Types.ObjectId.isValid(id);
    });

    if (hasInvalidId) {
      return res.status(400).json({
        message: "Один из id пользователей неверный",
      });
    }

    const users = await User.find({
      _id: {
        $in: uniqueParticipantIds,
      },
    }).select("_id");

    if (users.length !== uniqueParticipantIds.length) {
      return res.status(404).json({
        message: "Один или несколько пользователей не найдены",
      });
    }

    const groupObjectId = new mongoose.Types.ObjectId();
    const chatId = `group_${groupObjectId.toString()}`;

    const chat = await Chat.create({
      chatId,
      type: "group",
      title: trimmedTitle,
      participants: [req.user.id, ...uniqueParticipantIds],
      createdBy: req.user.id,
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "username email avatar about createdAt")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatar about",
        },
      })
      .lean();

    const dialog = buildDialog(populatedChat, req.user.id);

    res.status(201).json({
      dialog,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Ошибка создания группового чата",
    });
  }
});

module.exports = router;