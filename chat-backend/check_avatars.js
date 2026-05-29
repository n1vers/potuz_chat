const mongoose = require('mongoose');
const User = require('./src/models/User'); // Путь к твоей модели User

async function check() {
    await mongoose.connect('mongodb+srv://dokovand00_db_user:Fkla4ppdvk0uU2kK@cluster0.g7yjg0o.mongodb.net/?appName=Cluster0');
    const users = await User.find({});
    users.forEach(u => console.log(`User: ${u.username}, Avatar: ${u.avatar}`));
    process.exit();
}
check();