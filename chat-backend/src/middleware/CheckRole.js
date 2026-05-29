module.exports = function(role) {
  return function(req, res, next) {
    // Предполагаем, что authMiddleware уже добавил пользователя в req.user
    if (req.user && req.user.role === role) {
      next();
    } else {
      res.status(403).json({ message: "У вас недостаточно прав" });
    }
  };
};