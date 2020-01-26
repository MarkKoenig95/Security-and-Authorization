//////////////////////// Global Variables /////////////////////////////////////////////
require("dotenv").config();
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");
const express = require("express");
const app = express();

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github").Strategy;

const port = process.env.PORT || 3000;

//////////////////////// Express App Setup /////////////////////////////////////////////

app.set("view engine", "ejs");
app.set(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
  })
);
app.use(passport.initialize());
app.use(passport.session());

//////////////////////// Mongoose Setup /////////////////////////////////////////////

const databaseName = "secretsDB";
const globalMongoURL = `mongodb+srv://admin-mark:${process.env.PASSWORD}@cluster0-sdkut.mongodb.net/${databaseName}`;
const localMongoURL = `mongodb://localhost:27017/${databaseName}`;

const mongoURL = process.env.NODE_ENV ? globalMongoURL : localMongoURL;

mongoose
  .connect(mongoURL, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
  })
  .catch(err => {
    console.log(err);
    console.log(mongoURL);
  });

mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  username: String,
  hash: String,
  secrets: [String],
  googleId: String,
  githubId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

//////////////////////// Passport Setup /////////////////////////////////////////////

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
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.HOMEPAGE}/auth/google/secrets`
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.HOMEPAGE}/auth/github/secrets`
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ githubId: profile.id }, function(err, user) {
        return cb(err, user);
      });
    }
  )
);

//////////////////////// Get routes /////////////////////////////////////////////

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    User.find({ secrets: { $ne: null } }, (err, users) => {
      let secrets = [];
      users.forEach(user => {
        user.secrets.forEach(secret => {
          secrets.push(secret);
        });
      });
      res.render("secrets", { secrets: secrets });
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

//////////////////////// Post routes /////////////////////////////////////////////

app.post("/register", (req, res) => {
  let password = req.body.password;
  let username = req.body.username;
  // eslint-disable-next-line no-unused-vars
  User.register({ username: username }, password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
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

app.post("/submit", (req, res) => {
  User.findById(req.user._id, (err, user) => {
    if (!err) {
      user.secrets.push(req.body.secret);
      user.save();
      res.redirect("/secrets");
    } else {
      console.log(err);
    }
  });
});

//////////////////////// OAuth 2.0 with Google and GitHub /////////////////////////////////////////////

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

app.get("/auth/github", passport.authenticate("github"));

app.get(
  "/auth/github/secrets",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  }
);

app.listen(port, () => {
  console.log("Listening on port", port);
});
