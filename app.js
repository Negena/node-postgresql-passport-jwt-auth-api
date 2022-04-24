const express = require('express');
const app = express();
const ejs = require("ejs");
const pool  = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const initializePassport = require("./passportConfig");

initializePassport(passport);

app.set("view engine",'ejs');
app.use(express.urlencoded({exnteded: false}));

app.use(
  session({
  secret: "secret",
  resave: false,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get("/", (req,res) => {
   res.render("index");
});

app.post("/register", async(req,res) => {
  let {name, email, password, password2} = req.body;
  //console.log({name, email, password});
  let errors = [];

  if (!name || !email || !password || !password2){
    errors.push({msg: "please enter all required fields"});
  }

  if (password.length < 6) {
    errors.push({msg: "password should be at least six characters"});
  }

  if (password != password2) {
    errors.push({msg: "passwords do not match"});
  }

  if (errors.length > 0) {
    res.render("register", {errors});
  }else {
    //form validation have passed
    let hashedPassword = await bcrypt.hash(password, 10);
    //console.log(hashedPassword);
    pool.query(
     `SELECT * FROM users
      WHERE email = $1`, [email], (err,result) =>{
        if (err) throw err;
       console.log(result.rows)

        if (result.rows.length > 0) {
          errors.push({ msg: "User already registered"});
          res.render("register", {errors});
        }else {
          pool.query(`INSERT INTO users (name, email, password)
          VALUES ($1, $2, $3)
          RETURNING id, password`,
          [name, email, hashedPassword],
           (err,result) => {
            if (err) throw err;
            else {
              console.log(result.rows)
              req.flash("success", "you are now registered, please log in");
              res.redirect("/login")
            }
          })
        }
      }
    )
  }
});

app.post("/login", passport.authenticate('local', {
  successRedirect: "/dashboard",
  failureRedirect: '/login',
  failureFlash: true
}))

app.get("/register", checkAuth, (req,res) => {
   req.flash("success", null)
   res.render("register");
});

app.get("/login",  checkAuth,(req,res) => {
   res.render("login");
});

app.get("/dashboard", checkNotAuth, (req,res) => {
   res.render("dashboard" , {user: req.user.name});
});

app.get("/logout", (req,res) => {
  req.logOut();
  req.flash("success" , "you have logged out");
  res.redirect("/login")
});

function checkAuth(req, res, next) {
if (req.isAuthenticated()) {
  return res.redirect("/dashboard")
}
next()
}

function checkNotAuth(req,res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect("/login")
}

app.listen(3000, () => {
  console.log("works")
});
