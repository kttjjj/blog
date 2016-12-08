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

router.post('/', multipartMiddleware, function(req, res) {
    var fs = require('fs');

    fs.readFile(req.files.upload.path, function(err, data) {
        var newPath = __dirname + '/../public/uploads/' + req.files.upload.name;
        fs.writeFile(newPath, data, function(err) {
            if (err) console.log({
                err: err
            });
            else {
                html = "";
                html += "<script type='text/javascript'>";
                html += "    var funcNum = " + req.query.CKEditorFuncNum + ";";
                html += "    var url     = \"/uploads/" + req.files.upload.name + "\";";
                html += "    var message = \"Uploaded file successfully\";";
                html += "";
                html += "    window.parent.CKEDITOR.tools.callFunction(funcNum, url, message);";
                html += "</script>";

                res.send(html);
            }
        });
    });
});

module.exports = router;
