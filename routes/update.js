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

// 글 수정 페이지
router.get('/:idx/:page', function(req, res, next) {
    var idx = req.params.idx;
    var page = req.params.page;
    var sess = checkSession(req);

    pool.getConnection(function(err, connection) {
        if (err) {
            console.error("커넥션 객체 얻어오기 에러 : " + err);
        }
        var sql = "select idx, name, title, content, date_format(update_date,'%Y-%m-%d %H:%i:%s') update_date, hit from board where idx=?";
        connection.query(sql, idx, function(err, rows) {
            if (err) {
                console.error('update err : ' + err);
            }
            console.log("update에서 1개 글 조회 결과 확인 : " + rows[0]);
            res.render('update', {
                row: rows[0],
                page: page,
                sess: sess
            });
            connection.release();
        });
    });
});

// 글 수정한 내용 데이터에 update후 read페이지로 보내줌
router.post('/', function(req, res, next) {
    var idx = req.body.idx;
    var title = req.body.title;
    var content = req.body.content;
    var ip = req.body.ip;
    var hit = req.body.hit;
    var datas = [title, content, ip, idx];
    var page = req.body.page;

    pool.getConnection(function(err, connection) {
        var sql = "update board set title=?, content=?, ip=?, update_date=now() where idx=?";
        connection.query(sql, datas, function(err, result) {
            console.log(result);
            if (err) {
                console.error("글 수정 중 에러 발생 err : ", err);
            }
            res.redirect('/read/' + idx + '/' + hit + '/' + page);
            connection.release();
        });
    });
});

module.exports = router;
