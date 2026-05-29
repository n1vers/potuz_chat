import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Стейты для редактирования текстовых полей профиля
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Стейты для смены пароля
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Загрузка профиля при старте
  useEffect(() => {
    axios.get("http://localhost:5000/v1/auth/me", { withCredentials: true })
      .then((res) => {
        setUser(res.data.user);
        setUsername(res.data.user.username || "");
        setAbout(res.data.user.about || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки профиля", err);
        setLoading(false);
        navigate("/login");
      });
  }, [navigate]);

  // Функция выхода из аккаунта
  async function handleLogout() {
    if (!window.confirm("Вы уверены, что хотите выйти из профиля?")) return;
    try {
      // Стучимся на бэкенд для очистки сессии/кук
      await axios.post("http://localhost:5000/api/auth/logout", {}, { withCredentials: true });
    } catch (err) {
      console.error("Ошибка при выходе на сервере:", err);
    } finally {
      // В любом случае чистим фронтенд и уводим юзера
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }

  // 1. Сохранение изменений (Ник + О себе)
  async function handleSaveChanges() {
    if (!username.trim()) {
      alert("Никнейм не может быть пустым!");
      return;
    }

    try {
      const res = await axios.put(
        "http://localhost:5000/v1/profile/update", 
        { 
          username: username.trim(),
          about: about.trim() 
        }, 
        { withCredentials: true }
      );
      
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setIsEditing(false);
      alert("Профиль успешно обновлен!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Не удалось обновить профиль");
    }
  }

  // 2. Смена пароля
  async function handleChangePassword(e) {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      alert("Заполните оба поля пароля");
      return;
    }

    try {
      await axios.put(
        "http://localhost:5000/v1/auth/password", 
        { oldPassword, newPassword }, 
        { withCredentials: true }
      );
      alert("Пароль успешно изменен!");
      setOldPassword("");
      setNewPassword("");
      setIsChangingPassword(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Ошибка при смене пароля");
    }
  }

  // 3. Загрузка новой аватарки
  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await axios.post(
        "http://localhost:5000/v1/profile/avatar", 
        formData, 
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        }
      );
      
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      alert("Аватар успешно обновлен!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Не удалось загрузить аватар");
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "#121214", color: "#fff" }}>
        <h3>Загрузка профиля...</h3>
      </div>
    );
  }
  if (!user) return null;

  const avatarSrc = user.avatar ? `http://localhost:5000/static${user.avatar}` : null;
  const firstLetter = username ? username.charAt(0).toUpperCase() : "?";

  // Стилизация интерфейса (Палитра под стать твоему Login.jsx)
  const styles = {
    wrapper: {
      display: "flex",
      minHeight: "100vh",
      width: "100vw",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#121214",
      fontFamily: "'Inter', sans-serif",
      margin: 0,
      padding: "20px",
      boxSizing: "border-box"
    },
    card: {
      backgroundColor: "#1a1a1e",
      padding: "32px",
      borderRadius: "16px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      border: "1px solid #29292e",
      width: "100%",
      maxWidth: "420px",
      boxSizing: "border-box"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px"
    },
    backLink: {
      textDecoration: "none",
      color: "#00b4d8",
      fontSize: "14px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "4px"
    },
    logoutBtn: {
      background: "none",
      border: "none",
      color: "#ed4337",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px"
    },
    avatarWrapper: {
      position: "relative",
      cursor: "pointer",
      width: "110px",
      height: "110px",
      borderRadius: "50%",
      overflow: "hidden",
      border: "3px solid #00b4d8",
      boxShadow: "0 0 15px rgba(0, 180, 216, 0.2)",
      transition: "transform 0.2s"
    },
    avatarHint: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      background: "rgba(0, 0, 0, 0.6)",
      color: "#fff",
      fontSize: "11px",
      textAlign: "center",
      padding: "4px 0",
      fontWeight: "500"
    },
    label: {
      display: "block",
      textAlign: "left",
      color: "#7c7c8a",
      fontSize: "12px",
      marginBottom: "6px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px"
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "8px",
      border: "1px solid #29292e",
      backgroundColor: "#202024",
      color: "#ffffff",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box"
    },
    section: {
      borderTop: "1px solid #29292e",
      paddingTop: "20px",
      marginBottom: "20px"
    },
    primaryBtn: {
      background: "#00b4d8",
      color: "#fff",
      border: "none",
      padding: "10px 16px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "14px"
    },
    secondaryBtn: {
      background: "#202024",
      color: "#7c7c8a",
      border: "1px solid #29292e",
      padding: "10px 16px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px"
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        
        {/* ВЕРХНЯЯ НАВИГАЦИЯ */}
        <div style={styles.header}>
          <Link to="/" style={styles.backLink}>← В чат</Link>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪 Выйти
          </button>
        </div>

        {/* СЕКЦИЯ АВАТАРА */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={styles.avatarWrapper}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            title="Нажмите для загрузки нового фото"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", backgroundColor: "#00b4d8", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "44px", fontWeight: "bold" }}>
                {firstLetter}
              </div>
            )}
            <div style={styles.avatarHint}>Изменить</div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            style={{ display: "none" }} 
          />

          {!isEditing ? (
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <h2 style={{ margin: "0 0 4px 0", color: "#ffffff", fontSize: "22px" }}>{user.username}</h2>
              <p style={{ color: "#7c7c8a", margin: "0 0 14px 0", fontSize: "14px" }}>{user.email}</p>
              <button 
                onClick={() => setIsEditing(true)} 
                style={{ ...styles.secondaryBtn, color: "#00b4d8", borderColor: "#00b4d8", padding: "6px 14px", fontSize: "13px" }}
              >
                ✏️ Редактировать профиль
              </button>
            </div>
          ) : (
            <div style={{ width: "100%", marginTop: "16px" }}>
              <label style={styles.label}>Имя пользователя</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
              />
            </div>
          )}
        </div>

        {/* СЕКЦИЯ "О СЕБЕ" */}
        <div style={styles.section}>
          <label style={styles.label}>О себе</label>
          
          {!isEditing ? (
            <p style={{ color: user.about ? "#fff" : "#7c7c8a", margin: 0, fontSize: "14px", lineHeight: "1.5", backgroundColor: "#202024", padding: "12px", borderRadius: "8px", border: "1px solid #29292e", fontStyle: user.about ? "normal" : "italic" }}>
              {user.about || "Информация отсутствует"}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
              <textarea
                style={{ ...styles.input, resize: "vertical", fontFamily: "inherit" }}
                rows="3"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength="500"
                placeholder="Расскажите немного о себе..."
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleSaveChanges} style={{ ...styles.primaryBtn, flex: 1, backgroundColor: "#2ec4b6" }}>Сохранить</button>
                <button onClick={() => { setIsEditing(false); setUsername(user.username); setAbout(user.about || ""); }} style={{ ...styles.secondaryBtn, flex: 1 }}>Отмена</button>
              </div>
            </div>
          )}
        </div>

        {/* СЕКЦИЯ СМЕНЫ ПАРОЛЯ */}
        <div style={{ ...styles.section, marginBottom: 0 }}>
          {!isChangingPassword ? (
            <button onClick={() => setIsChangingPassword(true)} style={{ ...styles.secondaryBtn, width: "100%", fontWeight: "600" }}>
              🔒 Безопасность и пароль
            </button>
          ) : (
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ margin: "0 0 4px 0", color: "#fff", fontSize: "15px" }}>Смена пароля</h4>
              
              <input 
                type="password" 
                placeholder="Текущий пароль" 
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                style={styles.input}
              />
              <input 
                type="password" 
                placeholder="Новый пароль" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
              />
              
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button type="submit" style={{ ...styles.primaryBtn, flex: 1 }}>Обновить</button>
                <button type="button" onClick={() => { setIsChangingPassword(false); setOldPassword(""); setNewPassword(""); }} style={{ ...styles.secondaryBtn, flex: 1 }}>Отмена</button>
              </div>
            </form>
          )}
        </div>

        <small style={{ color: "#54545e", display: "block", textAlign: "center", marginTop: "24px", fontSize: "11px", fontWeight: "500" }}>
          Участник с: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "---"}
        </small>
      </div>
    </div>
  );
}