if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const path = require("path");
const ejsMate = require("ejs-mate");
const bodyParser = require("body-parser");
const axios = require("axios");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const methodOverride = require("method-override");
const asyncError = require("./utilities/asyncError");
const ExpressError = require("./utilities/ExpressError");

const { apiFetch } = require("./apiFetch");
// const Date = require('./public/date')
const Watchbag = require("./models/watchbag");
const Show = require("./models/show");
const User = require("./models/user");

const session = require("express-session");
const flash = require("connect-flash");

const dragndropRoutes = require("./routes/dragndropRoutes");
const mywatchbagRoutes = require("./routes/mywatchbagRoutes");
const userRoutes = require("./routes/userRoutes");

const mongoose = require("mongoose");
// const { watch, findById } = require("./models/watchbag");

const MongoStore = require("connect-mongo");

const dbUrl = `mongodb+srv://${process.env.MONGO_key}.mongodb.net/WatchBag?retryWrites=true&w=majority`;

mongoose.connect(dbUrl, () => {
  console.log("Database Connected");
});

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

const store = new MongoStore({
  mongoUrl: dbUrl,
  secret: "yedpmaiaaphomashaallah",
  touchAfter: 24 * 3600,
});

store.on("error", (e) => {
  console.log("Session Store Error", e);
});

const sessionConfig = {
  store,
  secret: "yedpmaiaaphomashaallah",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  if (req.originalUrl == "/login") {
    res.locals.url = "/";
  } else {
    res.locals.url = req.originalUrl;
  }
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.warning = req.flash("warning");
  next();
});

app.use("/", userRoutes);

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/explore",
  asyncError(async (req, res) => {
    const watchbags = await Watchbag.find({ status: true }).populate("author");
    res.render("explore/index", { watchbags });
  })
);

app.get(
  "/explore/:id",
  asyncError(async (req, res) => {
    const watchbag = await Watchbag.findById(req.params.id)
      .populate("author")
      .populate("showsCurrent")
      .populate("showsWatched")
      .populate("showsOnHold");
    res.render("explore/show", { watchbag });
  })
);

app.post(
  "/search",
  asyncError(async (req, res, next) => {
    const weather = await axios.get(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_apikey}&s=${req.body.search}&page=1-10`
    );
    data = weather.data;
    if (data.Error) {
      return next(new ExpressError("Movie Not Found", 404));
    }
    res.render("search", { data });
  })
);

app.get(
  "/search/:info",
  asyncError(async (req, res) => {
    const weather = await axios.get(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_apikey}&i=${req.params.info}`
    );
    data = weather.data;
    if (data.Error) {
      return next(new ExpressError("Movie Not Found", 404));
    }
    res.render("info", { data });
  })
);

app.use("/mywatchbags", mywatchbagRoutes);

app.use("/mywatchbags/:id/dnd", dragndropRoutes);

app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Boom" } = err;
  res.status(statusCode).render("error", { message });
});

app.listen(3000 || process.env.PORT, () => {
  console.log("Serving on Port 3000");
});
