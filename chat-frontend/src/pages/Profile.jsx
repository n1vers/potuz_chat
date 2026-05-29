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
      // Также обновляем локальное хранилище, чтобы в чате мгновенно менялся твой ник "(Вы)"
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

  if (loading) return <div style={{ textAlign: "center", marginTop: "50px" }}>Загрузка профиля...</div>;
  if (!user) return null;

  const avatarSrc = user.avatar ? `http://localhost:5000/static${user.avatar}` : null;
  const firstLetter = username ? username.charAt(0).toUpperCase() : "?";

  return (
    <div style={{ padding: "20px", maxWidth: "450px", margin: "40px auto", fontFamily: "sans-serif", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: "16px", background: "#fff" }}>
      
      <Link to="/" style={{ display: "inline-block", marginBottom: "20px", textDecoration: "none", color: "#0084ff", fontWeight: "bold" }}>← В чат</Link>
      
      {/* СЕКЦИЯ АВАТАРА */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ position: "relative", cursor: "pointer", width: "130px", height: "130px", borderRadius: "50%", overflow: "hidden" }}
          title="Нажмите, чтобы изменить аватар"
        >
          {avatarSrc ? (
            <img 
              src={avatarSrc} 
              alt="Avatar" 
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "3px solid #0084ff" }} 
            />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#0084ff", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "54px", fontWeight: "bold", border: "3px solid #0084ff" }}>
              {firstLetter}
            </div>
          )}
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleAvatarChange} 
          accept="image/*" 
          style={{ display: "none" }} 
        />

        {!isEditing ? (
          <>
            <h2 style={{ margin: "15px 0 5px 0", color: "#1a1a1a" }}>{user.username}</h2>
            <p style={{ color: "gray", margin: "0 0 15px 0" }}>{user.email}</p>
            <button onClick={() => setIsEditing(true)} style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #0084ff", background: "none", color: "#0084ff", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>✏️ Редактировать профиль</button>
          </>
        ) : (
          <div style={{ width: "100%", marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Никнейм:</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", outline: "none" }}
            />
          </div>
        )}
      </div>

      {/* СЕКЦИЯ "О СЕБЕ" */}
      <div style={{ borderTop: "1px solid #eee", paddingTop: "20px", marginBottom: "20px" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>О себе:</h4>
        
        {!isEditing ? (
          <p style={{ color: "#555", margin: 0, lineHeight: "1.5", backgroundColor: "#f9f9f9", padding: "12px", borderRadius: "8px", fontStyle: user.about ? "normal" : "italic" }}>
            {user.about || "Информация отсутствует"}
          </p>
        ) : (
          <>
            <textarea
              style={{ width: "100%", boxSizing: "border-box", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", outline: "none", fontSize: "14px", resize: "vertical", fontFamily: "sans-serif" }}
              rows="3"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength="500"
              placeholder="Расскажите немного о себе..."
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={handleSaveChanges} style={{ flex: 1, background: "#28a745", border: "none", color: "white", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Сохранить</button>
              <button onClick={() => { setIsEditing(false); setUsername(user.username); setAbout(user.about || ""); }} style={{ background: "#eee", border: "none", color: "#333", padding: "10px", borderRadius: "8px", cursor: "pointer" }}>Отмена</button>
            </div>
          </>
        )}
      </div>

      {/* СЕКЦИЯ СМЕНЫ ПАРОЛЯ */}
      <div style={{ borderTop: "1px solid #eee", paddingTop: "20px" }}>
        {!isChangingPassword ? (
          <button 
            onClick={() => setIsChangingPassword(true)} 
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc", background: "#f5f5f5", color: "#333", cursor: "pointer", fontWeight: "600" }}
          >
            🔒 Сменить пароль
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <h4 style={{ margin: "0 0 5px 0", color: "#333" }}>Смена пароля:</h4>
            <input 
              type="password" 
              placeholder="Старый пароль" 
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }}
            />
            <input 
              type="password" 
              placeholder="Новый пароль" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #ccc", outline: "none", fontSize: "14px" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
              <button type="submit" style={{ flex: 1, padding: "10px", background: "#0084ff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Обновить пароль</button>
              <button type="button" onClick={() => { setIsChangingPassword(false); setOldPassword(""); setNewPassword(""); }} style={{ padding: "10px", background: "#eee", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer" }}>Отмена</button>
            </div>
          </form>
        )}
      </div>

      <small style={{ color: "silver", display: "block", textAlign: "center", marginTop: "30px" }}>
        В системе с: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "---"}
      </small>
    </div>
  );
}