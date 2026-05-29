const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 30,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    about: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    role: { 
    type: String, 
    enum: ["user", "admin"], // Задаем список разрешенных ролей
    default: "user"         // Если роль не передана, автоматом будет обычный юзер
  },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);