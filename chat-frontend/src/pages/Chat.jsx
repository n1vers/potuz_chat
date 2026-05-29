import { useEffect, useState, useRef } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { socket } from "../socket/socket";

export default function Chat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const [selectedUserProfile, setSelectedUserProfile] = useState(null); 
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [showEmoji, setShowEmoji] = useState(false);
  const [dialogs, setDialogs] = useState([]); 
  const [activeDialog, setActiveDialog] = useState(null); 
  const [user, setUser] = useState(null);

  // Стейт для темной/светлой темы с сохранением в localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : true; // по умолчанию темная
  });

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // НАБОР ЦВЕТОВ ДЛЯ ТЕМ (Палитра)
  const theme = {
    bgMain: darkMode ? "#121214" : "#f0f2f5",          // Главный фон (справа)
    bgSidebar: darkMode ? "#1a1a1e" : "#ffffff",       // Фон боковой панели
    bgCard: darkMode ? "#202024" : "#f8f9fa",          // Фон неактивного диалога/инпута
    bgCardActive: darkMode ? "#29292e" : "#e4e6eb",    // Фон активного диалога
    textMain: darkMode ? "#e1e1e6" : "#1c1e21",        // Основной текст
    textTitle: darkMode ? "#ffffff" : "#000000",       // Заголовки
    textSub: darkMode ? "#7c7c8a" : "#65676b",         // Подписи / второстепенный текст
    border: darkMode ? "#29292e" : "#e4e6eb",          // Границы и разделители
    accent: "#00b4d8",                                 // Голубой акцент (кнопки, активный глобал)
    msgMe: "#00b4d8",                                  // Мои сообщения
    msgOther: darkMode ? "#202024" : "#ffffff",        // Чужие сообщения
    textMsgOther: darkMode ? "#e1e1e6" : "#1c1e21"     // Текст чужих сообщений
  };

  // --- ИЗМЕНЕНИЕ 1: УМНАЯ ФУНКЦИЯ НОРМАЛИЗАЦИИ ПУТИ АВАТАРОК ---
  // ФИНАЛЬНАЯ НАСТРОЙКА ПОД ТВОЮ СТАТИКУ (/static)
  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    
    // Если это полная внешняя ссылка — отдаем как есть
    if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://")) {
      return avatarPath; 
    }

    // Если путь в базе уже начинается со слова "/static"
    if (avatarPath.startsWith("/static")) {
      return `http://localhost:5000${avatarPath}`;
    }

    // Если путь начинается со слэша (как твои /uploads/avatars/...)
    if (avatarPath.startsWith("/")) {
      return `http://localhost:5000/static${avatarPath}`; 
      // На выходе получим: http://localhost:5000/static/uploads/avatars/avatar-xxx.jpg
    }
    
    // Если вдруг в базе путь лежит без слэша в начале ("uploads/avatars/...")
    return `http://localhost:5000/static/${avatarPath}`;
  };
  // Функция, которая делает из "2026-05-14T07:49..." просто "10:49"
  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    // Извлекаем часы и минуты, добавляя ноль в начало, если цифра меньше 10
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Функция для красивого разделения сообщений по дням
  const formatMessageDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Если это сегодня
    if (date.toDateString() === today.toDateString()) {
      return "Сегодня";
    }
    // Если это вчера
    if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера";
    }
    // Если более старая дата — выводим "14 мая 2026"
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        navigate("/login");
      }
    } catch (e) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadDialogs = () => {
    axios.get("http://localhost:5000/v1/chats/dialogs", { withCredentials: true })
      .then((res) => {
        setDialogs(res.data.dialogs || []);
      })
      .catch((err) => console.error("Ошибка загрузки диалогов:", err));
  };

  useEffect(() => {
    if (!user) return;
    loadDialogs();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setMessages([]); 

    if (activeDialog === null) {
      socket.emit("join-global");

      axios.get("http://localhost:5000/v1/messages/global", { withCredentials: true })
        .then((res) => setMessages(res.data.messages || []))
        .catch((err) => console.error("Ошибка истории глобального чата:", err));

      socket.on("receive-global-message", (data) => {
        setMessages((prev) => [...prev, data]);
        loadDialogs(); 
      });
    } else {
      socket.emit("join-room", activeDialog.chatId);

      axios.get(`http://localhost:5000/v1/messages/${activeDialog.chatId}`, { withCredentials: true })
        .then((res) => setMessages(res.data.messages || []))
        .catch((err) => console.error("Ошибка истории личных сообщений:", err));

      const handlePrivateMessage = (newMsg) => {
        setMessages((prev) => {
          const isDuplicate = prev.some((msg) => msg._id === newMsg._id);
          if (isDuplicate) return prev; 
          return [...prev, newMsg];
        });
        loadDialogs(); 
      };

      socket.on("new-message", handlePrivateMessage);
      socket.on("receive-message", handlePrivateMessage); 
    }

    socket.on("message-deleted", (deletedMessageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== deletedMessageId));
      loadDialogs();
    });

    return () => {
      socket.off("receive-global-message");
      socket.off("new-message");
      socket.off("receive-message");
      socket.off("message-deleted");
    };
  }, [activeDialog, user]);

  if (!user) {
    return <div style={{ padding: "20px", textAlign: "center", color: theme.textMain, backgroundColor: theme.bgMain, height: "100vh" }}>Загрузка...</div>;
  }

  async function handleUserClick(senderData) {
    if (!senderData) return;
    if (typeof senderData === "object" && senderData.username === user.username) return;
    if (typeof senderData === "string" && senderData === user.username) return;

    try {
      const username = typeof senderData === "object" ? senderData.username : senderData;
      const searchRes = await axios.get(`http://localhost:5000/v1/chats/users?q=${username}`, { withCredentials: true });
      const foundUser = searchRes.data.users?.find(u => u.username === username);

      if (foundUser) {
        setSelectedUserProfile(foundUser); 
      } else {
        alert("Не удалось загрузить профиль пользователя");
      }
    } catch (error) {
      console.error("Ошибка при получении профиля:", error);
    }
  }

  async function startPrivateChat(targetUserId) {
    try {
      const chatRes = await axios.post(`http://localhost:5000/v1/chats/private/${targetUserId}`, {}, { withCredentials: true });
      const newDialog = chatRes.data.dialog;

      if (!newDialog) return;

      if (!dialogs.some(d => d.chatId === newDialog.chatId)) {
        setDialogs(prev => [newDialog, ...prev]);
      }

      setActiveDialog(newDialog);
      setSelectedUserProfile(null); 
    } catch (error) {
      console.error("Не удалось открыть личный чат:", error);
    }
  }

  async function deleteMessage(messageId) {
    if (!window.confirm("Вы уверены, что хотите удалить это сообщение?")) return;

    try {
      await axios.delete(`http://localhost:5000/v1/messages/${messageId}`, { withCredentials: true });
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      
      socket.emit("delete-message", { messageId, chatId: activeDialog === null ? "global" : activeDialog.chatId });
      loadDialogs();
    } catch (error) {
      console.error("Ошибка при удалении сообщения:", error);
      alert(error.response?.data?.message || "Не удалось удалить сообщение");
    }
  }

  async function sendMessage() {
    if (!message.trim() && !selectedImage) return;

    const currentChatId = activeDialog === null ? "global" : activeDialog.chatId;
    let currentChatType = "global";
    if (activeDialog !== null) {
      currentChatType = activeDialog.type || activeDialog.chatType || "private";
    }

    try {
      const formData = new FormData();
      formData.append("chatId", currentChatId);
      formData.append("chatType", currentChatType);
      formData.append("text", message.trim());
      
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const res = await axios.post("http://localhost:5000/v1/messages", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      const savedMessage = res.data.message;

      if (activeDialog === null) {
        socket.emit("send-global-message", savedMessage);
      } else {
        socket.emit("send-message", savedMessage);
        setMessages((prev) => [...prev, savedMessage]);
      }

      setMessage("");
      setSelectedImage(null);
      setShowEmoji(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDialogs(); 

    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault(); 
      sendMessage();
    }
  }

  function handleEmojiClick(emojiData) {
    setMessage((prev) => prev + emojiData.emoji);
  }

  function renderLastMessagePreview(d) {
    if (!d.lastMessage) return d.subtitle || "Нет сообщений";
    
    let senderName = "";
    let text = "";

    if (typeof d.lastMessage === "object") {
      const msgSender = d.lastMessage.sender;
      const isMessageFromMe = msgSender && (msgSender._id === user.id || msgSender.username === user.username);
      
      senderName = isMessageFromMe ? "Вы" : (msgSender?.username || "Пользователь");
      text = d.lastMessage.imageUrl ? "📎 Картинка" : d.lastMessage.text;
    } else {
      text = "Сообщение...";
    }

    return `${senderName ? senderName + ": " : ""}${text}`;
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", backgroundColor: theme.bgMain, color: theme.textMain, transition: "all 0.2s" }}>
      
      {/* ЛЕВАЯ ПАНЕЛЬ: Диалоги */}
      <div style={{ width: "350px", borderRight: `1px solid ${theme.border}`, padding: "20px", display: "flex", flexDirection: "column", backgroundColor: theme.bgSidebar, transition: "all 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "22px", color: theme.textTitle, fontWeight: "700" }}>Чаты</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: 0 }}
              title={darkMode ? "Включить светлую тему" : "Включить темную тему"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <Link to="/profile" style={{ textDecoration: "none", fontSize: "14px", color: theme.accent, fontWeight: "600" }}>👤 Профиль</Link>
          </div>
        </div>

        <div 
          onClick={() => setActiveDialog(null)}
          style={{
            padding: "14px",
            marginBottom: "20px",
            background: activeDialog === null ? theme.accent : theme.bgCard,
            color: activeDialog === null ? "#ffffff" : theme.textTitle,
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            textAlign: "center",
            boxShadow: activeDialog === null ? `0 4px 12px rgba(0,180,216,0.3)` : "none",
            transition: "all 0.2s"
          }}
        >
          🌍 Глобальный чат
        </div>

        <h4 style={{ color: theme.textSub, margin: "0 0 12px 5px", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.8px" }}>Личные диалоги</h4>
        
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {dialogs.length === 0 ? (
            <p style={{ color: theme.textSub, fontSize: "13px", textAlign: "center", marginTop: "20px" }}>Нет активных переписок.</p>
          ) : (
            dialogs.map((d, index) => {
              if (!d) return null;
              const isSelected = activeDialog?.chatId === d.chatId;
              
              // --- ИЗМЕНЕНИЕ 2: Нормализуем аватарку в списке диалогов ---
              const dialogAvatar = getAvatarUrl(d.user?.avatar);
              const isOnline = d.user?.isOnline || false; 

              return (
                <div 
                  key={`${d.chatId || 'chat'}-${index}`}
                  onClick={() => setActiveDialog(d)}
                  style={{
                    padding: "12px", 
                    borderRadius: "10px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? theme.bgCardActive : theme.bgCard,
                    border: isSelected ? `1px solid ${theme.accent}` : `1px solid transparent`,
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ position: "relative", width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0 }}>
                    {dialogAvatar ? (
                      <img src={dialogAvatar} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                        {d.title?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ 
                      position: "absolute", bottom: "0", right: "0", width: "10px", height: "10px", borderRadius: "50%", 
                      backgroundColor: isOnline ? "#04d361" : "#7c7c8a", 
                      border: `2px solid ${theme.bgCard}`
                    }} />
                  </div>

                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: "600", color: theme.textTitle, fontSize: "14px" }}>{d.title}</div>
                      {isOnline && <span style={{ fontSize: "10px", color: "#04d361" }}>online</span>}
                    </div>
                    <div style={{ fontSize: "12px", color: isSelected ? theme.textMain : theme.textSub, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginTop: "4px" }}>
                      {renderLastMessagePreview(d)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ПРАВАЯ ПАНЕЛЬ: Окно сообщений */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: theme.bgMain, transition: "all 0.2s" }}>
        
        {/* Шапка чата */}
        <div style={{ padding: "18px 20px", backgroundColor: theme.bgSidebar, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: theme.textTitle }}>
              {activeDialog === null ? "🌍 Общий глобальный чат" : `💬 ${activeDialog.title}`}
            </h3>
            {activeDialog !== null && (
              <span style={{ fontSize: "12px", color: activeDialog.user?.isOnline ? "#04d361" : theme.textSub }}>
                {activeDialog.user?.isOnline ? "В сети" : "Не в сети"}
              </span>
            )}
          </div>
        </div>
        
        {/* Лента сообщений с группировкой по датам и временем */}
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {Array.isArray(messages) && messages.map((msg, index) => {
            if (!msg) return null;

            const hasSenderObj = msg.sender && typeof msg.sender === "object";
            const senderName = hasSenderObj ? msg.sender.username : (msg.sender || "Пользователь");
            const isMe = senderName === user.username;
            const avatarUrl = hasSenderObj && msg.sender.avatar ? getAvatarUrl(msg.sender.avatar) : null;

            // Логика для группировки по датам:
            // Проверяем, отличается ли дата текущего сообщения от предыдущего
            const currentMsgDate = formatMessageDate(msg.createdAt);
            const prevMsgDate = index > 0 ? formatMessageDate(messages[index - 1]?.createdAt) : null;
            const showDateSeparator = currentMsgDate !== prevMsgDate;

            return (
              <div key={`${msg._id || 'msg'}-${index}`} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                
                {/* РАЗДЕЛИТЕЛЬ ДАТЫ (например: Сегодня, Вчера, 14 мая) */}
                {showDateSeparator && (
                  <div style={{ 
                    alignSelf: "center", 
                    margin: "20px 0 10px 0", 
                    backgroundColor: darkMode ? "#202024" : "#e4e6eb", 
                    color: theme.textSub, 
                    padding: "4px 12px", 
                    borderRadius: "12px", 
                    fontSize: "12px", 
                    fontWeight: "600" 
                  }}>
                    {currentMsgDate}
                  </div>
                )}

                {/* САМО СООБЩЕНИЕ */}
                <div style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "65%", display: "flex", gap: "10px", alignItems: "flex-end" }}>                
                  {!isMe && (
                    <div 
                      onClick={() => handleUserClick(msg.sender)}
                      style={{ cursor: "pointer", width: "34px", height: "34px", borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}
                    >
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="avatar" 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                          onError={(e) => { 
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ width: "100%", height: "100%", backgroundColor: theme.accent, color: "white", display: avatarUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "13px" }}>
                        {senderName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

                  <div style={{ 
                    padding: "10px 14px", 
                    borderRadius: isMe ? "14px 14px 0px 14px" : "14px 14px 14px 0px", 
                    backgroundColor: isMe ? theme.msgMe : theme.msgOther,
                    color: isMe ? "#ffffff" : theme.textMsgOther,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                    border: isMe ? "none" : `1px solid ${theme.border}`,
                    position: "relative"
                  }}>
                    <span 
                      onClick={() => handleUserClick(msg.sender)}
                      style={{ 
                        display: "block", 
                        fontSize: "11px", 
                        fontWeight: "700",
                        marginBottom: "4px",
                        cursor: !isMe ? "pointer" : "default",
                        color: isMe ? "#fff" : theme.accent
                      }}
                    >
                      {senderName} {isMe && "(Вы)"}
                    </span>
                    
                    {msg.imageUrl && (
                      <div style={{ marginTop: "5px", marginBottom: "5px" }}>
                        <img 
                          src={`http://localhost:5000/v1/messages/image/${msg._id}`} 
                          alt="Вложение" 
                          style={{ maxWidth: "100%", maxHeight: "250px", borderRadius: "8px", display: "block", cursor: "pointer" }}
                          onClick={() => window.open(`http://localhost:5000/v1/messages/image/${msg._id}`, "_blank")}
                        />
                      </div>
                    )}

                    {/* Текст и кнопка удаления + ВРЕМЯ */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "25px" }}>
                      <div style={{ wordBreak: "break-word", fontSize: "14px", lineHeight: "1.4", paddingBottom: "2px" }}>
                        {msg.text}
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                        {/* ВРЕМЯ ОТПРАВКИ */}
                        <span style={{ 
                          fontSize: "10px", 
                          color: isMe ? "rgba(255,255,255,0.7)" : theme.textSub,
                          userSelect: "none"
                        }}>
                          {formatTime(msg.createdAt)}
                        </span>

                        {/* КНОПКА УДАЛЕНИЯ ДЛЯ АДМИНА */}
                        {user.role === "admin" && (
                          <button 
                            onClick={() => deleteMessage(msg._id)} 
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: 0, color: isMe ? "#ffcbd1" : "#f75a68", opacity: 0.6, transition: "opacity 0.2s" }}
                            onMouseEnter={(e) => e.target.style.opacity = "1"}
                            onMouseLeave={(e) => e.target.style.opacity = "0.6"}
                            title="Удалить сообщение"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Контейнер ввода сообщения */}
        <div style={{ padding: "20px", backgroundColor: theme.bgSidebar, borderTop: `1px solid ${theme.border}`, position: "relative", transition: "all 0.2s" }}>
          
          {selectedImage && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", backgroundColor: theme.bgCard, padding: "8px 12px", borderRadius: "8px", width: "fit-content" }}>
              <span style={{ fontSize: "13px", color: theme.textMain }}>📎 {selectedImage.name}</span>
              <button onClick={() => { setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value=""; }} style={{ border: "none", background: "#f75a68", color: "white", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px" }}>×</button>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button onClick={() => { setShowEmoji(!showEmoji); }} style={{ padding: "5px", fontSize: "20px", border: "none", background: "none", cursor: "pointer" }}>😀</button>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => setSelectedImage(e.target.files[0])}
              accept="image/*"
              style={{ display: "none" }}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()} 
              style={{ padding: "5px", fontSize: "20px", border: "none", background: "none", cursor: "pointer", color: theme.textSub }}
              title="Прикрепить изображение"
            >
              📎
            </button>
            
            {showEmoji && (
              <div style={{ position: "absolute", bottom: "85px", left: "20px", zIndex: 100 }}>
                <EmojiPicker theme={darkMode ? Theme.DARK : Theme.LIGHT} onEmojiClick={handleEmojiClick} />
              </div>
            )}

            <input
              style={{ 
                flex: 1, 
                padding: "12px 16px", 
                borderRadius: "22px", 
                border: `1px solid ${theme.border}`, 
                backgroundColor: theme.bgCard, 
                color: theme.textTitle, 
                fontSize: "14px", 
                outline: "none" 
              }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeDialog === null ? "Написать в общий чат..." : "Написать личное сообщение..."}
            />
            
            <button onClick={sendMessage} style={{ padding: "12px 24px", borderRadius: "22px", background: theme.accent, color: "white", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
              Отправить
            </button>
          </div>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПРОСМОТРА ПРОФИЛЯ */}
      {selectedUserProfile && (
        <div 
          onClick={() => setSelectedUserProfile(null)} 
          style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ background: theme.bgSidebar, border: `1px solid ${theme.border}`, padding: "30px", borderRadius: "16px", maxWidth: "350px", width: "100%", textAlign: "center", position: "relative" }}
          >
            <button 
              onClick={() => setSelectedUserProfile(null)} 
              style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: theme.textSub }}
            >
              ✕
            </button>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}>
              {/* --- ИЗМЕНЕНИЕ 4: Нормализуем аватарку внутри модального окна профиля --- */}
              {selectedUserProfile.avatar ? (
                <img 
                  src={getAvatarUrl(selectedUserProfile.avatar)} 
                  alt="Avatar" 
                  style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${theme.accent}` }} 
                />
              ) : (
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", backgroundColor: theme.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px", fontWeight: "bold" }}>
                  {selectedUserProfile.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <h3 style={{ margin: "10px 0 5px 0", color: theme.textTitle }} id="user-title">{selectedUserProfile.username}</h3>
            <p style={{ color: theme.textSub, fontSize: "13px", margin: "0 0 20px 0" }}>{selectedUserProfile.email}</p>

            <div style={{ textAlign: "left", borderTop: `1px solid ${theme.border}`, paddingTop: "15px", marginBottom: "20px" }}>
              <h5 style={{ margin: "0 0 5px 0", color: theme.textSub }}>О себе:</h5>
              <p style={{ margin: "0 0 10px 0", color: theme.textMain, fontSize: "13px", lineHeight: "1.4" }}>
                {selectedUserProfile.about || "Пользователь ничего не написал о себе."}
              </p>
            </div>

            <button 
              onClick={() => startPrivateChat(selectedUserProfile._id)}
              style={{ width: "100%", padding: "12px", borderRadius: "10px", background: theme.accent, color: "white", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "14px" }}
            >
              ✉️ Написать сообщение
            </button>
          </div>
        </div>
      )}

    </div>
  );
}