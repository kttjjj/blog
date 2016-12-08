const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
const app = express();
const fs = require('fs');
const flash = require("connect-flash");

const routes = require('./routes/index');
const er = require('./routes/er');
const dlt = require('./routes/dlt');
const list = require('./routes/list');
const news = require('./routes/news');
const read = require('./routes/read');
const update = require('./routes/update');
const write = require('./routes/write');
const uploader = require('./routes/uploader');

// view engine setups
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

// login modules
const passport = require('passport');
const bcrypt = require('bcrypt-nodejs');
const salt = bcrypt.genSaltSync(33);

app.listen(3000, function() {
    console.log('listening on port 3000!');
});

// mysql config
const mysqlClient = mysql.createConnection({
    host: 'ktj.ceudwvegpor3.ap-northeast-2.rds.amazonaws.com',
    user: 'root',
    password: 'aaff7523',
    database: 'blog'
});

//session config
app.use(session({
    secret: '@#@#MYSIGN#@#@#',
    resave: false,
    saveUninitialized: true
}));

app.use('/', routes);
app.use('/er', er);
app.use('/news', news);
app.use('/read', read);
app.use('/update', update);
app.use('/write', write);
app.use('/list', list);
app.use('/dlt', dlt);
app.use('/uploader', uploader);

// passport config
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    mysqlClient.query('select * from user where idx = ?', [user.idx], function(err, rows) {
        done(null, user);
    });
});

// passport LoginStrategy
const LocalStrategy = require('passport-local').Strategy;
passport.use('local',
    new LocalStrategy({
            usernameField: 'email',
            passwordField: 'passwd',
            passReqToCallback: true
        },
        function(req, email, passwd, done) {
            mysqlClient.query('select * from user where email = ?', [email],
                function(error, result) {
                    if (error) {
                        return done(error);
                    } else if (result.length === 0) {
                        return done(error);
                    } else if (result.length > 0) {
                        console.log("checking your password now");
                        if (bcrypt.compareSync(passwd, result[0].passwd)) {
                            return done(null, result[0]);
                        } else {
                            return done(error);
                        }
                    } else {
                        return done(error);
                    }
                });
        })
);
const FacebookStrategy = require('passport-facebook').Strategy;
passport.use('facebook',
    new FacebookStrategy({
            clientID: '362620347422367',
            clientSecret: '2a6898d4caa3d48877e57a47859a3d6b',
            callbackURL: "http://localhost:3000/auth/facebook/callback",
            profileFields: ['displayName', 'emails']
        },
        function(accessToken, refreshToken, profile, done) {
            if (profile.emails) {
                mysqlClient.query('select * from user where email = ?', [profile.emails[0].value],
                    function(error, result) {
                        if (result.length === 0) {
                            mysqlClient.query('insert into user(name,email,passwd) values(?,?,?)', [profile.displayName, profile.emails[0].value, accessToken],
                                function(error, result) {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        let user = {
                                            name: profile.displayName,
                                            email: profile.emails[0].value
                                        };
                                        done(null, user);
                                    }
                                }
                            );
                        } else {
                            done(null, false, req.flash('message', '이메일이 등록된 아이디로 로그인해주세요'));
                        }
                    });

            }
        }));
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
passport.use('google',
    new GoogleStrategy({
            clientID: '692989383748-mbjh6qqmm2jo2ndl5t68i59hk3kelkpr.apps.googleusercontent.com',
            clientSecret: '5d4Mr7fjsUAre1k4DULfiWOY',
            callbackURL: "http://localhost:3000/auth/google/callback"
        },
        function(token, tokenSecret, profile, done) {
            mysqlClient.query('select * from user where email = ?', [profile.emails[0].value],
                function(error, result) {
                    if (result.length === 0) {
                        mysqlClient.query('insert into user(name,email,passwd) values(?,?,?)', [profile.displayName, profile.emails[0].value, token],
                            function(error, result) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    let user = {
                                        name: profile.displayName,
                                        email: profile.emails[0].value
                                    };
                                    done(null, user);
                                }
                            }
                        );
                    } else {
                        done(null, result[0]);
                    }
                });
        }
    ));

const isAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

function checkSession(req) {
    var sess = false;
    if (req.session.passport) {
        sess = req.session.passport.user;
    }
    return sess;
}

// login router
app.get('/login', function(req, res, next) {
    let sess = checkSession(req);
    res.render('login',{
        sess: sess
    });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/fail',
    failureFlash: false
}));

app.get('/fail', function(req, res, next) {
    let message = "다시 시도해 주세요.";
    res.render('fail',{
        message: message
    });
});

app.post('/sign-up', function(req, res, next) {
    mysqlClient.query('insert into user(email, passwd, name) values(?,?,?)', [req.body.email, bcrypt.hashSync(req.body.passwd, salt), req.body.name],
        function(error, result) {
            if (error) {
                console.log(error);
                res.json({
                    message: 'sign-up fail'
                });
            } else {
                console.log("sign-up success");
                res.redirect('/login');
            }
        });
});

app.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['email']
}));

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        successRedirect: '/',
        failureRedirect: '/fail',
        failureFlash: true
    }));

app.get('/auth/google', passport.authenticate('google', {
    scope: ['email']
}));

app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/',
        failureRedirect: '/fail'
    }));

    app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
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
