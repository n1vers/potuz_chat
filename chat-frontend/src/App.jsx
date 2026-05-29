import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Главная страница с чатом */}
        <Route path="/" element={<Chat />} />
        
        {/* Страница входа */}
        <Route path="/login" element={<Login />} />
        
        {/* Страница профиля */}
        <Route path="/profile" element={<Profile />} />

        {/* Защита от несуществующих страниц: если ввели бред, кидаем на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}