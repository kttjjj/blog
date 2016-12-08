const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const nodemailer = require('nodemailer');
const smtpchange = require('nodemailer-smtp-transport');

const pool =  mysql.createPool({
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

// 게시판 목록 불러오는 페이지
router.get('/:page', function(req, res, next) {
    let sess = checkSession(req);
    let search = "";
    let page = Number(req.params.page);
    let type = req.query.type;
    let cntsql;
    let selectsql;
    search = req.query.search;

    if (search === undefined) {
        cntsql = "select count(*) cnt from board where is_delete=false";
        selectsql = "select idx, title, content, DATE_FORMAT(update_date, '%Y-%m-%d %H:%i:%s') update_date, hit, counts, name, tag";
        selectsql = selectsql + " from board where is_delete=false  order by idx desc limit ?,?";
    } else {
        cntsql = "select count(*) cnt from board where is_delete=false && " + type + " LIKE '%" + search + "%'";
        selectsql = "select idx, title, content, DATE_FORMAT(update_date, '%Y-%m-%d %H:%i:%s') update_date, hit, counts, name, tag from";
        selectsql = selectsql + " board where is_delete=false &&  " + type + "  LIKE '%" + search + "%' order by idx desc limit ?,?";
    }
    console.log('search : ' + search);
    console.log('type : ' + type);

    pool.getConnection(function(err, connection) {
        if (err) {
            console.error('connection err : ' + err);
        }
        let sql = "select * from board;";
        connection.query(sql, [], function(err, rows) {
            if (err) {
                console.error('err : ' + err);
            }

            connection.query(cntsql, [], function(err, rows) {
                if (err) {
                    console.error('cntsql err : ' + err);
                }
                console.log("rows : " + rows); //[{cnt:1}]
                let cnt = rows[0].cnt;
                let size = 20; // 보여줄 글의 수
                let totalPage = Math.ceil(cnt / size);

                if (page >= totalPage || page < 1) {
                    page = totalPage;
                }

                let begin = (page - 1) * size; // 시작 글
                if(begin < 0) {
                    begin = 0;
                }
                let pageSize = 10; // 링크 갯수
                let startPage = Math.floor((page - 1) / pageSize) * pageSize + 1;
                let endPage = startPage + (pageSize - 1);

                if (endPage > totalPage) {
                    endPage = totalPage;
                }

                let max = cnt - ((page - 1) * size);

                connection.query(selectsql, [begin, size], function(err, rows) {
                    if (err) {
                        console.error('selectsql err : ' + err);
                    }
                    console.log('rows : ' + rows);

                    if(rows != "") {
                        res.render('list', {
                            rows: rows,
                            page: page,
                            pageSize: pageSize,
                            startPage: startPage,
                            endPage: endPage,
                            totalPage: totalPage,
                            max: max,
                            sess: sess,
                            search: search,
                            type: type
                        });
                    } else {
                        res.render('errPage');
                    }

                    connection.release();
                });
            });
        });
    });
});

module.exports = router;
