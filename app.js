const encrypt = require("mongoose-encryption");
const mongoose = require("mongoose");
const express = require("express");
const app = express();

var port = process.env.PORT;

if (port == null || port == "") {
  port = 3000;
}

// var globalMongoURL = `mongodb+srv://admin-mark:${process.env.PASSWORD}@cluster0-sdkut.mongodb.net/newDB`;
var localMongoURL = "mongodb://localhost:27017/newDB";

mongoose.connect(localMongoURL, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
  useCreateIndex: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

var secret = process.env.SECRET;

userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

app.set("view engine", "ejs");
app.set(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const parameters = {};

app.get("/", (req, res) => {
  res.render("home", parameters);
});

app.get("/login", (req, res) => {
  res.render("login", parameters);
});

app.get("/register", (req, res) => {
  res.render("register", parameters);
});

app.post("/register", (req, res) => {
  let user = new User({
    email: req.body.username,
    password: req.body.password
  });

  user.save(err => {
    if (!err) {
      res.render("secrets");
    } else {
      console.log(err);
    }
  });
});

app.post("/login", (req, res) => {
  User.findOne({ email: req.body.username }, (err, user) => {
    if (!err) {
      if (user) {
        if (user.password === req.body.password) {
          res.render("secrets");
        } else {
          alert("You have entered the wrong password or email");
        }
      }
    } else {
      console.log(err);
    }
  });
});

app.listen(port, () => {
  console.log("Listening on port", port);
});
