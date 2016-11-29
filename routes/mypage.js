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

router.get('/', function (req, res) {
  var sess = checkSession(req);
  if (sess) {
    res.redirect('/err');
  }
  var email = sess.email;
  pool.getConnection(function (err, connection) {
    if (err) {
        console.error("커넥션 에러 : " + err);
    }
    var sql = "select *from user where email=?";
    connection.query(sql, email, function(err, rows) {
        if (err) {
            console.error('select err : ' + err);
        }
        console.log("user 조회 결과 : " + rows[0]);

        connection.release();
        res.render('mypage', {
          sess: sess,
          rows: rows
        });
    });
  });
});

module.exports = router;
