require("dotenv").config()

const express = require('express')
const app = express()
const path = require('path')
const passport = require("./config/passport")
const methodOverride = require('method-override');
const connectDB = require("./config/db")
const session = require("express-session")
const nocache = require("nocache")

connectDB();

const userRouter = require("./routes/userRouter")
const adminRouter = require('./routes/adminRouter')

const errorHandler = require("./middlewares/errorHandler")

app.use(nocache())
app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}))

app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
    res.locals.user = req.session.user || null
    res.locals.username = req.session.username || null
    next();
});

app.use("/", userRouter)
app.use("/admin", adminRouter)

app.use((req, res, next) => {
    res.status(404).render('user/errorPage', {
        status: 404,
        message: 'Page not found',
        error: {}
    });
});

app.use(errorHandler);

app.listen(process.env.PORT, () => {
    console.log(`server is running on http://localhost:${process.env.PORT}`)
})
