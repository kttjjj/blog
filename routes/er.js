const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const nodemailer = require('nodemailer');
const smtpchange = require('nodemailer-smtp-transport');

// 세션 체크 함수
function checkSession(req) {
    var sess = false;
    if (req.session.passport) {
        sess = req.session.passport.user;
    }
    return sess;
}

var smtpTransport = nodemailer.createTransport(smtpchange({
    service: 'Gmail',
    auth: {
        user: 'jumpeggsmtp@gmail.com',
        pass: '1234qwerasdf'
    }
}));

router.get('/', function(req,res){
    res.render('err');
});

module.exports = router;
