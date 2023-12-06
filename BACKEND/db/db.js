const mongoose = require('mongoose');
mongoose.set('strictQuery', true);
const URI = "mongodb+srv://ziocro:9bMY0VBNDWe2z8vj@cluster0.hyj19vr.mongodb.net/?retryWrites=true&w=majority";

mongoose
    .connect(URI, /*{ useNewUrlParser: true }*/)
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection

//db.on('error', console.error(console, 'MongoDB connection error:'));

module.exports = db;