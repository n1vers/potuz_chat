import axios from "axios";
import { useState } from "react";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false); // Режим: вход или регистрация
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit() {
  if (!email || !password || (isRegister && !username)) {
    alert("Заполните все поля!");
    return;
  }

  const url = isRegister 
    ? "http://localhost:5000/api/auth/register" 
    : "http://localhost:5000/api/auth/login";

  try {
    // ДОБАВЛЯЕМ { withCredentials: true } третьим аргументом
    const response = await axios.post(url, {
      username: isRegister ? username : undefined,
      email,
      password
    }, { withCredentials: true }); // <-- Важно!

    // Бэкенд НЕ возвращает token в response.data, он ставит его в куки автоматически!
    // Удаляем строку: localStorage.setItem("token", response.data.token);

    localStorage.setItem("user", JSON.stringify(response.data.user));

    window.location.href = "/";
  } catch (error) {
    alert(error.response?.data?.message || "Произошла ошибка");
  }
}

  return (
    <div style={{ padding: "20px", maxWidth: "300px", margin: "0 auto" }}>
      <h2>{isRegister ? "Регистрация" : "Вход в аккаунт"}</h2>

      {/* Поле username показываем только при регистрации */}
      {isRegister && (
        <input
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ display: "block", marginBottom: "10px", width: "100%" }}
        />
      )}

      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: "10px", width: "100%" }}
      />

      <input
        placeholder="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: "10px", width: "100%" }}
      />

      <button onClick={handleSubmit} style={{ width: "100%", marginBottom: "10px" }}>
        {isRegister ? "Зарегистрироваться" : "Войти"}
      </button>

      <button 
        onClick={() => setIsRegister(!isRegister)} 
        style={{ background: "none", border: "none", color: "blue", cursor: "pointer", width: "100%" }}
      >
        {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
      </button>
    </div>
  );
}