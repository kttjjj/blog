var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session');
var app = express();

var routes = require('./routes/index');
var users = require('./routes/users');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// login modules
var passport = require('passport');
var bcrypt = require('bcrypt-nodejs');
var salt = bcrypt.genSaltSync(33);

app.listen(3000, function(){
   console.log('listening on port 3000!');
});

// mysql config
var mysqlClient = mysql.createConnection({
  user:'root',
  password:'1234',
  database : 'blog'
});

//session config
app.use(session({
  secret: '@#@#MYSIGN#@#@#',
  resave: false,
  saveUninitialized: true
}));

app.use('/', routes);
app.use('/users', users);

// passport config
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done){
  done(null, user);
});

passport.deserializeUser(function(user, done){
    mysqlClient.query('select * from user where idx = ?', [user.idx], function(err, rows){
      done(null, user);
    });
});

// passport LoginStrategy
var LocalStrategy = require('passport-local').Strategy;
passport.use('local',
  new LocalStrategy({
    usernameField : 'email',
    passwordField : 'passwd',
    passReqToCallback : true
  },
  function(req, email, passwd, done){
    mysqlClient.query('select * from user where email = ?', [email],
      function(error, result){
        if(error){
          return done(error);
        }else if(result.length == 0){
          return done(error);
        }else if(result.length > 0){
          console.log("checking your password now");
          if(bcrypt.compareSync(passwd, result[0].passwd)){
            return done(null, result[0]);
          }else{
            return done(error);
          }
        }else{
          return done(error);
        }
      })
  })
);
var FacebookStrategy = require('passport-facebook').Strategy;
passport.use('facebook',
    new FacebookStrategy({
        clientID: '362620347422367',
        clientSecret: '2a6898d4caa3d48877e57a47859a3d6b',
        callbackURL: "http://localhost:3000/auth/facebook/callback",
        profileFields: ['displayName', 'emails']
    },
    function(accessToken, refreshToken, profile, done) {
      mysqlClient.query('select * from user where email = ?', [profile.emails[0].value],
        function(error, result){
          if(result.length == 0){
            mysqlClient.query('insert into user(name,email,passwd) values(?,?,?)',[profile.displayName, profile.emails[0].value, accessToken],
              function(error, result){
                if(error){
                  console.log(error);
                }else{
                  var user = {
                    name : profile.displayName,
                    email : profile.emails[0].value
                  };
                  done(null, user);
                }
              }
            )
          }else{
            done(null, result[0]);
          }
        });

    }
));
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
passport.use('google',
    new GoogleStrategy({
      clientID: '692989383748-mbjh6qqmm2jo2ndl5t68i59hk3kelkpr.apps.googleusercontent.com',
      clientSecret: '5d4Mr7fjsUAre1k4DULfiWOY',
      callbackURL: "http://localhost:3000/auth/google/callback"
    },
    function(token, tokenSecret, profile, done){
       mysqlClient.query('select * from user where email = ?', [profile.emails[0].value],
        function(error, result){
          if(result.length == 0){
            mysqlClient.query('insert into user(name,email,passwd) values(?,?,?)',[profile.displayName, profile.emails[0].value, token],
              function(error, result){
                if(error){
                  console.log(error);
                }else{
                  var user = {
                    name : profile.displayName,
                    email : profile.emails[0].value
                  };
                  done(null, user);
                }
              }
            )
          }else{
            done(null, result[0]);
          }
        });
    }
));

var isAuthenticated = function(req, res, next){
   if(req.isAuthenticated()){
      return next();
   }
   res.redirect('/login');
};

// login router
app.get('/login', function(req, res, next){
  res.render('login');
});

app.post('/login', passport.authenticate('local',{
  successRedirect : '/',
  failureRedirect : '/fail',
  failureFlash : false
}));

app.get('/fail', function(req, res, next){
  res.render('fail');
});

app.post('/sign-up', function(req, res, next){
  mysqlClient.query('insert into user(email, passwd, name) values(?,?,?)',[req.body.email, bcrypt.hashSync(req.body.passwd, salt), req.body.name],
    function(error, result){
      if(error){
        console.log(error);
        res.json({message : 'sign-up fail'});
      }else{
        console.log("sign-up success");
        res.redirect('/login');
      }
    });
});

app.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email']}));
app.get('/auth/facebook/callback',
  passport.authenticate('facebook',{
    successRedirect : '/',
    failureRedirect : '/fail'
}));

app.get('/auth/google', passport.authenticate('google', {scope: ['email']}));
app.get('/auth/google/callback',
  passport.authenticate('google',{
    successRedirect : '/',
    failureRedirect : '/fail'
}));
 // catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
