import axios from "axios";
import { useState } from "react";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false); // Режим: вход или регистрация
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // Тестовая роль: user или admin

  async function handleSubmit() {
    if (!email || !password || (isRegister && !username)) {
      alert("Заполните все поля!");
      return;
    }

    const url = isRegister 
      ? "http://localhost:5000/api/auth/register" 
      : "http://localhost:5000/api/auth/login";

    try {
      const response = await axios.post(url, {
        username: isRegister ? username : undefined,
        email,
        password,
        role: isRegister ? role : undefined // Отправляем роль на бэкенд при регистрации
      }, { withCredentials: true });

      localStorage.setItem("user", JSON.stringify(response.data.user));
      window.location.href = "/";
    } catch (error) {
      alert(error.response?.data?.message || "Произошла ошибка");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      handleSubmit();
    }
  }

  // Цветовая палитра под стать основному чату
  const styles = {
    container: {
      display: "flex",
      height: "100vh",
      width: "100vw",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#121214",
      fontFamily: "'Inter', sans-serif",
      margin: 0,
      padding: 0,
      boxSizing: "border-box"
    },
    card: {
      backgroundColor: "#1a1a1e",
      padding: "40px",
      borderRadius: "16px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      border: "1px solid #29292e",
      width: "100%",
      maxWidth: "360px",
      textAlign: "center"
    },
    title: {
      color: "#ffffff",
      margin: "0 0 24px 0",
      fontSize: "24px",
      fontWeight: "700"
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      marginBottom: "16px",
      borderRadius: "8px",
      border: "1px solid #29292e",
      backgroundColor: "#202024",
      color: "#ffffff",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.2s"
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
    select: {
      width: "100%",
      padding: "12px 16px",
      marginBottom: "20px",
      borderRadius: "8px",
      border: "1px solid #29292e",
      backgroundColor: "#202024",
      color: "#00b4d8", // Подсветим роль голубым акцентом
      fontSize: "14px",
      fontWeight: "600",
      outline: "none",
      boxSizing: "border-box",
      cursor: "pointer"
    },
    submitBtn: {
      width: "100%",
      padding: "14px",
      borderRadius: "8px",
      backgroundColor: "#00b4d8",
      color: "#ffffff",
      border: "none",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "background-color 0.2s, transform 0.1s",
      marginBottom: "16px"
    },
    switchBtn: {
      background: "none",
      border: "none",
      color: "#7c7c8a",
      cursor: "pointer",
      fontSize: "13px",
      textDecoration: "underline",
      transition: "color 0.2s"
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isRegister ? "Создать аккаунт" : "Войти в сеть"}</h2>

        {/* Никнейм — только при регистрации */}
        {isRegister && (
          <div>
            <label style={styles.label}>Имя пользователя</label>
            <input
              placeholder="Например, ivan_dev"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.input}
            />
          </div>
        )}

        <div>
          <label style={styles.label}>Электронная почта</label>
          <input
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>Пароль</label>
          <input
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.input}
          />
        </div>

        {/* ТЕСТОВЫЙ ВЫБОР РОЛИ — только при регистрации */}
        {isRegister && (
          <div>
            <label style={styles.label}>Тестовая роль (для прав админа)</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)} 
              style={styles.select}
            >
              <option value="user" style={{ backgroundColor: "#202024", color: "#fff" }}>Обычный Пользователь (User)</option>
              <option value="admin" style={{ backgroundColor: "#202024", color: "#fff" }}>Администратор (Admin)</option>
            </select>
          </div>
        )}

        <button 
          onClick={handleSubmit} 
          style={styles.submitBtn}
          onMouseEnter={(e) => e.target.style.backgroundColor = "#0096b4"}
          onMouseLeave={(e) => e.target.style.backgroundColor = "#00b4d8"}
        >
          {isRegister ? "Зарегистрироваться" : "Войти"}
        </button>

        <button 
          onClick={() => setIsRegister(!isRegister)} 
          style={styles.switchBtn}
          onMouseEnter={(e) => e.target.style.color = "#00b4d8"}
          onMouseLeave={(e) => e.target.style.color = "#7c7c8a"}
        >
          {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
        </button>
      </div>
    </div>
  );
}