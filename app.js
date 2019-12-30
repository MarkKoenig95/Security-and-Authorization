//Test comment
require("dotenv").config();
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");
const express = require("express");
const app = express();

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

var port = process.env.PORT;

if (port == null || port == "") {
  port = 3000;
}

app.set("view engine", "ejs");
app.set(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true
  })
);
app.use(passport.initialize());
app.use(passport.session());

// var globalMongoURL = `mongodb+srv://admin-mark:${process.env.PASSWORD}@cluster0-sdkut.mongodb.net/newDB`;
var localMongoURL = "mongodb://localhost:27017/newDB";

mongoose.connect(localMongoURL, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true
});

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  hash: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log(profile);

      User.findOrCreate({ googleId: profile.id }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

const parameters = {};

app.get("/", (req, res) => {
  res.render("home", parameters);
});

app.get("/register", (req, res) => {
  res.render("register", parameters);
});

app.get("/login", (req, res) => {
  res.render("login", parameters);
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets", parameters);
  } else {
    res.redirect("/login");
  }
});

app.post("/register", (req, res) => {
  let password = req.body.password;
  let username = req.body.username;
  // eslint-disable-next-line no-unused-vars
  User.register({ username: username }, password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", (req, res) => {
  let user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, err => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  }
);

app.listen(port, () => {
  console.log("Listening on port", port);
});
