var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var nodemailer = require('nodemailer');
var smtpchange = require('nodemailer-smtp-transport');

var pool = mysql.createPool({
    connectionLimit: 3,
    host: 'ktj.ceudwvegpor3.ap-northeast-2.rds.amazonaws.com',
    user: 'root',
    database: 'blog',
    password: 'aaff7523'
});

var smtpTransport = nodemailer.createTransport(smtpchange({
    service: 'Gmail',
    auth: {
        user: 'jumpeggsmtp@gmail.com',
        pass: '1234qwerasdf'
    }
}));

// 세션 체크 함수
function checkSession(req) {
    var sess = false;
    if (req.session.passport) {
        sess = req.session.passport.user;
    }
    return sess;
}

//메인 페이지
router.get('/', function(req, res, next) {
    var sess = checkSession(req);
    res.render('index', {
        sess: sess
    });
});

module.exports = router;
