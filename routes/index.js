var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var pool = mysql.createPool({
    connectionLimit: 3,
    host: 'localhost',
    user: 'root',
    database: 'blog',
    password: '1234'
});

// 세션 체크 함수
function checkSession(req) {
  var sess = false;
  if(req.session.passport) {
    sess = req.session.passport.user;
  }
  return sess;
}

//메인 페이지
router.get('/', function(req, res, next) {
  var sess = checkSession(req);
  res.render('index', {sess: sess});
});

// 게시판 목록 불러오는 페이지
router.get('/list/:page', function(req,res,next) {
    var sess = checkSession(req);
    var page = Number(req.params.page);

    pool.getConnection(function(err, connection) {
        if (err) {
            console.error('connection err : ' + err);
        }
        var sql = "select * from board;";
        connection.query(sql, [], function(err, rows) {
            if (err) {
                console.error('err : ' + err);
            }
            connection.query("select count(*) cnt from board where is_delete=false", [], function(err, rows) {
                if (err) {
                    console.error('err : ', err);
                }
                console.log("rows : " + rows); //[{cnt:1}]
                var cnt = rows[0].cnt;
                var size = 10; // 보여줄 글의 수
                var totalPage = Math.ceil(cnt / size);

                if(page >= totalPage || page < 1) {
                  page = totalPage;
                }

                var begin = (page - 1) * size; // 시작 글
                var pageSize = 10; // 링크 갯수
                var startPage = Math.floor((page - 1) / pageSize) * pageSize + 1;
                var endPage = startPage + (pageSize - 1);

                if (endPage > totalPage) {
                    endPage = totalPage;
                }

                var max = cnt - ((page - 1) * size);

                var selectsql =
                  "select idx, title, content, DATE_FORMAT(update_date, '%Y-%m-%d %H:%i:%s') update_date, hit, counts, name from board where is_delete=false order by idx desc limit ?,?"
                connection.query(selectsql, [begin, size], function(err, rows) {
                    if (err) {
                        console.error('selectsql err : ' + err);
                    }
                    console.log('rows : ' + rows);
                    res.render('list', {
                        rows: rows,
                        page: page,
                        pageSize: pageSize,
                        startPage: startPage,
                        endPage: endPage,
                        totalPage: totalPage,
                        max: max,
                        sess: sess
                    });
                    connection.release();
                });
            });
        });
    });
});

// 글쓰기 화면 표시 GET
router.get('/write', function(req, res, next){
    var sess = checkSession(req);
    res.render('write',{sess: sess});
});

// 글쓰기 로직 처리 POST
router.post('/write', function(req, res, next){
    var sess = checkSession(req);
    var name = req.body.name;
    var user_idx = req.body.user_idx;
    var title = req.body.title;
    var content = req.body.content;
    var ip = req.body.ip;
    var datas = [name, user_idx, title, content, ip];
    var tag_idx = req.body.tag;

    pool.getConnection(function (err, connection) {
        var boardsql = "insert into board(name, user_idx, title, content, create_date, ip) values(?,?,?,?,now(),?)";
        connection.query(boardsql, datas, function (err, rows) {
            if (err) {
              console.error("boardsql err : " + err);
            }
            console.log("boardsql rows : " + JSON.stringify(rows));

            var selectsql = "insert into board_tag(board_idx, tag_idx) values((select idx from board where user_idx = ? order by idx limit 0,1),?);";
            connection.query(selectsql, [user_idx, tag_idx], function(err, rows) {
                if(err) {
                  console.error("selectsql err : " + err);
                }
                console.log("selectsql rows : " + rows);

                res.redirect('/list/1');
                connection.release();
            });
        });
    });
});

// 본문 내용 보는 페이지
router.get('/read/:no/:hit',function(req,res,next) {
    var idx = req.params.no;
    var hit = Number(req.params.hit) + 1;
    var sess = checkSession(req);

    pool.getConnection(function(err,connection) {
      var count_sql = "update board set hit=? where idx=?";
      connection.query(count_sql,[hit, idx], function(err,count) {
          if(err) {
            console.error("count_sql error" + err);
          }
          console.log("count : " + count);

          var sql =
            "select idx, name, title, user_idx, content, counts, date_format(update_date,'%Y-%m-%d %H:%i:%s') update_date, hit from board where idx=?";
          connection.query(sql,[idx], function(err,board) {
              if(err) {
                console.error("sql error" + err);
              }
              console.log("1개 글 조회 결과 확인 : " + board);

              var comment_sql =
                "select idx, comment, name, date_format(update_date,'%Y-%m-%d %H:%i:%s') update_date from comment where board_idx=?";
              connection.query(comment_sql,[idx], function(err,comments) {
                  if(err) {
                    console.error("comment_sql error" + err);
                  }
                  console.log("리플 조회 결과 확인 : " + comments);
                  res.render('read', {
                    rows: board[0],
                    comments: comments,
                    sess: sess
                  });
                  connection.release();
              });
            });
        });
    });
});

router.post('/read/:no/:hit',function(req,res,next) {
    var sess = checkSession(req);
    var board_idx = Number(req.params.no);
    var name = req.body.name;
    var comment = req.body.comment;
    var ip = req.body.ip;
    var counts = Number(req.body.counts) + 1;
    var datas = [name, comment, board_idx, ip];
    var hit = req.params.hit;

    pool.getConnection(function(err,connection) {
        var comment_sql = "insert into comment(name, comment, board_idx, ip, create_date) values(?,?,?,?,now())";
        connection.query(comment_sql, datas, function(err,row) {
            if(err) {
              console.error("comment_sql error : " + err);
            }

            var counts_sql = "update board set counts=? where idx=?";
            connection.query(counts_sql, [counts, board_idx], function(err,count) {
                if(err) {
                  console.error("counts_sql err : " + err);
                }
              res.redirect('/read/' + board_idx + "/" + hit);
              connection.release();
            });
        });
    });
});

// 글 수정 페이지
router.get('/update/:idx',function(req,res,next) {
    var idx = req.params.idx;
    var sess = checkSession(req);

    pool.getConnection(function(err,connection) {
        if(err) {
          console.error("커넥션 객체 얻어오기 에러 : " + err);
        }
        var sql = "select idx, name, title, content, date_format(update_date,'%Y-%m-%d %H:%i:%s') update_date, hit from board where idx=?";
        connection.query(sql, idx, function(err,rows) {
            if(err) {
              console.error('update err : ' + err);
            }
            console.log("update에서 1개 글 조회 결과 확인 : " + rows[0]);
            res.render('update', {row: rows[0]});
            connection.release();
        });
    });
});

// 글 수정한 내용 데이터에 update후 read페이지로 보내줌
router.post('/update',function(req,res,next) {
    var idx = req.body.idx;
    var title = req.body.title;
    var content = req.body.content;
    var ip = req.body.ip;
    var hit = req.body.hit;
    var datas = [title, content, ip, idx];

    pool.getConnection(function(err,connection) {
      var sql = "update board set title=?, content=?, ip=?, update_date=now() where idx=?";
        connection.query(sql,datas,function(err,result) {
            console.log(result);
            if(err) {
              console.error("글 수정 중 에러 발생 err : ",err);
            }
            res.redirect('/read/' + idx + '/' + hit);
            connection.release();
        });
    });
});

router.get('/delete/:idx',function(req,res,next) {
    var idx = Number(req.params.idx);
    var sess = checkSession(req);
    console.log('idx' + idx);
    pool.getConnection(function(err,connection) {
        if(err) {
          console.error("커넥션 에러 : " + err);
        }
        var sql = "update board set is_delete=true, delete_date=now() where idx=?";
        connection.query(sql, idx, function(err, rows) {
            if(err) {
              console.error('delete err : ' + err);
            }
            console.log("delete에서 1개 글 조회 결과 확인 : " + rows[0]);

            connection.release();
            res.redirect('/list/1');
        });
    });
});

module.exports = router;
