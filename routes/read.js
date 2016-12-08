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

// 본문 내용 보는 페이지
router.get('/:no/:hit/:page', function(req, res, next) {
    var idx = req.params.no;
    var hit = Number(req.params.hit) + 1;
    var page = Number(req.params.page);
    var sess = checkSession(req);

    pool.getConnection(function(err, connection) {
        var count_sql = "update board set hit=? where idx=?";
        connection.query(count_sql, [hit, idx], function(err, count) {
            if (err) {
                console.error("count_sql error" + err);
            }
            console.log("count : " + count);

            var sql =
                "select idx, name, title, user_idx, content, counts, date_format(update_date,'%Y-%m-%d %H:%i:%s') update_date, hit from board where idx=?";
            connection.query(sql, [idx], function(err, board) {
                if (err) {
                    console.error("sql error" + err);
                }
                console.log("1개 글 조회 결과 확인 : " + board);

                var comment_sql =
                    "select idx, comment, name, date_format(update_date,'%Y-%m-%d %H:%i:%s') update_date from comment where board_idx=?";
                connection.query(comment_sql, [idx], function(err, comments) {
                    if (err) {
                        console.error("comment_sql error" + err);
                    }
                    console.log("리플 조회 결과 확인 : " + comments);
                    var email_sql =
                        "select email from user where idx=?";
                    connection.query(email_sql, board[0].user_idx , function(err, user_email) {
                        if (err) {
                            console.error("email_sql error" + err);
                        }
                        console.log("유저 이메일 조회 : " + user_email[0].email);
                        res.render('read', {
                            rows: board[0],
                            comments: comments,
                            sess: sess,
                            page: page,
                            email: user_email[0].email
                        });
                        connection.release();
                    });
                });
            });
        });
    });
});

router.post('/:no/:hit/:page', function(req, res, next) {
    var sess = checkSession(req);
    var board_idx = Number(req.params.no);
    var name = req.body.name;
    var comment = req.body.comment;
    var ip = req.body.ip;
    var counts = Number(req.body.counts) + 1;
    var datas = [name, comment, board_idx, ip];
    var hit = req.params.hit;
    var page = req.params.page;
    var email = req.body.email;
    var link = req.body.link;
    console.log('sess.email : ' + sess.email);
    console.log('email : ' + email);
    console.log('link : ' + link);
    pool.getConnection(function(err, connection) {
        var comment_sql = "insert into comment(name, comment, board_idx, ip, create_date) values(?,?,?,?,now())";
        connection.query(comment_sql, datas, function(err, row) {
            if (err) {
                console.error("comment_sql error : " + err);
            }

            var counts_sql = "update board set counts=? where idx=?";
            connection.query(counts_sql, [counts, board_idx], function(err, count) {
                if (err) {
                    console.error("counts_sql err : " + err);
                }

                var mailOptions = {
                    from: sess.email,
                    to: email,
                    subject: '댓글이 달렸습니다.',
                    html: link
                };

                smtpTransport.sendMail(mailOptions, function(error, response) {
                    if (error) {
                        console.log(error);
                    }
                    smtpTransport.close();
                });

                res.redirect('/read/' + board_idx + "/" + hit + '/' + page);
                connection.release();
            });
        });
    });
});

module.exports = router;
