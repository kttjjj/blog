const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const nodemailer = require('nodemailer');
const smtpchange = require('nodemailer-smtp-transport');

const pool = mysql.createPool({
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

router.get('/:idx', function(req, res, next) {
    var idx = Number(req.params.idx);
    var sess = checkSession(req);
    console.log('idx' + idx);
    pool.getConnection(function(err, connection) {
        if (err) {
            console.error("커넥션 에러 : " + err);
        }
        var sql = "update board set is_delete=true, delete_date=now() where idx=?";
        connection.query(sql, idx, function(err, rows) {
            if (err) {
                console.error('delete err : ' + err);
            }
            console.log("delete에서 1개 글 조회 결과 확인 : " + rows[0]);

            connection.release();
            res.redirect('/list/1');
        });
    });
});

module.exports = router;
