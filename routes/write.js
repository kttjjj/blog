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


router.get('/', function(req, res, next) {
    var sess = checkSession(req);

    if(!sess) {
        res.redirect('/err');
    }

    pool.getConnection(function(err, connection) {
        var tagsql = "select type from tag";
        connection.query(tagsql, [], function(err, rows) {
            if (err) {
                console.error("tagdsql err : " + err);
            }
            console.log("tagsql rows : " + JSON.stringify(rows));
            res.render('write', {
                sess: sess,
                tag: rows
            });
            connection.release();
        });
    });
});

// 글쓰기 로직 처리 POST
router.post('/', function(req, res, next) {
    var sess = checkSession(req);
    var name = req.body.name;
    var user_idx = req.body.user_idx;
    var title = req.body.title;
    var content = req.body.content;
    var ip = req.body.ip;
    var tag = req.body.tag;
    var datas = [name, user_idx, title, content, ip, tag];

    pool.getConnection(function(err, connection) {
        var boardsql = "insert into board(name, user_idx, title, content, create_date, ip, tag) values(?,?,?,?,now(),?,?)";
        connection.query(boardsql, datas, function(err, rows) {
            if (err) {
                console.error("boardsql err : " + err);
            }

            console.log("boardsql rows : " + JSON.stringify(rows));

            res.redirect('/list/1');
            connection.release();
        });
    });
});

module.exports = router;
