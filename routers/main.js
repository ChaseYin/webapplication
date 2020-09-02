var express = require('express');
var router = express.Router();
const request = require('request')
var Category = require('../models/Category');
var User = require("../models/User");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var bcrypt = require('bcrypt');
var ejs = require('ejs')
var token = '';
var googleName = '';


var responseData;
router.use(function(req,res,next){
    responseData = {
        code:0,
        message:''
    }
    next();
})
var resData;
router.use(function(req,res,next){
  resData = {
      code:0,
      message:''
  }
  next();
})


const passport = require('passport');
const cors = require('cors')
const bodyParser = require('body-parser');
const { userInfo } = require('os');
require('./passport-setup')

router.use(cors())
router.use(bodyParser.urlencoded({extended: false}))
router.use(bodyParser.json())

router.get('/',function(req,res,next){
    // 读取所有的分类信息
    // Category.find().sort({_id:-1}).then((categories)=>{
    //     console.log(categories);
    // var googleName = req.body.username;
    // console.log("主页获得的googleName 是："+googleName);
        res.render('main/index',{
            userInfo:req.userInfo
            // categories:categories
        })
    // })
})

router.post('/google/return',function(req,res){
  // 读取所有的分类信息
  // Category.find().sort({_id:-1}).then((categories)=>{
  //     console.log(categories);
  resData.userInfo = {
    username: req.body.username,
    _id: req.body._id
  }
  console.log('resData是：'+resData)
  userInfo.username = googleName;
  // userInfo._id = 123;

  console.log("Post请求获得的google用户名是"+userInfo.username)
      //  res.render('main/index',{userInfo})
      // res.json(userInfo)
  // })
})



const isLoggedIn = (req, res, next) => {
    if(req.user){
        next();
    }
    else{
        res.sendStatus(401);
    }
}



router.get('/good', isLoggedIn, (req, res)=> {
  googleName = req.user.displayName;
  var userInfo={}
  console.log("google的用户名是：  "+googleName)
    //res.send(`Welcome to my application Mr ${req.user.displayName}!`)
    //console.log('userinfo 包含： ====='+req.user.username)
    responseData.message = 'Login Successfully!';
                    responseData.userInfo = {
                    username:googleName
                };  
                // res.json(responseData);
                // console.log(responseData);
                res.render('main/googleLoggedIn',{googleName:googleName});
})

router.get('/googleConsole', (req, res)=> {
                res.render('main/googleConsole',{googleName:googleName});
})



router.get('/failed', (req, res)=> res.send('Your authentation has been failed!'))

router.get('/google',passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/logout',(req,res) =>{
    req.session = null;
    req.logout();
    res.redirect('/')
})

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/failed' }),//authenticate failed!
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/good');
  });

  //forgot password here:

  router.get('/forgot', function(req, res) {
    res.render('main/forgot');
  });

  router.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ username: req.body.email }, function(err, user) {
          if (!user) {
            //req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'yinxiaof993@gmail.com',
            pass: 'yinxiaofeng0206'
          }
        });
        var mailOptions = {
          to: user.username,
          from: 'yinxiaof993993@gmail.com',
          subject: 'Node.js Password Reset By Xiaofeng Yin',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          res.redirect('/sentEmail')
          // res.render('main/sentEmail')
          // req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }

    ], function(err) {
      if (err) 
      return next(err);
      res.redirect('/forgot');
    });
  });
  
  router.get('/sentEmail',function(req, res) {
    res.render('main/sentEmail')
  })

  router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        console.log('Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      
      res.render('main/reset', {token: req.params.token});
    });
    //console.log("get重制密码页面成功！！")
  });

  // router.post('/reset',function(req, res){
  //   console.log(req.body)
  //   // let token = req.body.token
  //   console.log('token='+token)
  // })

  router.post('/reset', function(req, res) {
    //console.log('现在进入post方法！！！！：')
    async.waterfall([
      function(done) {
        //console.log('token是！！！：'+token)
        console.log('请求的密码是'+req.body.password)
        User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            //req.flash('error', 'Password reset token is invalid or has expired.');
            //
            console.log("Password reset token is invalid or has expired.[2]");
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;

              const saltRounds = 10;
              var password = req.body.password;
              var hashPassword = req.body.password;
              bcrypt.genSalt(saltRounds,function(err,salt){
                  bcrypt.hash(password,salt,function(err,hash){
                       hashPassword = hash;
                      // password = hash;
                      // repassword = hash;
                      storeUserData();
                  })
              })
              function storeUserData(){
                  //console.log('hashpassword是：'+hashPassword)
                  user.password = hashPassword
                  
                  //console.log("新的用户密码是"+user.password)
                  user.save();
                  console.log("Successfully changed password")
                  done(err, user);
              }
              
             //这里需要设置hash密码
            //   user.save(function(err) {
            //       if(err){console.log('没有设置成功')}
            //     req.logIn(user, function(err) {
            //       done(err, user);
            //     });
            //   });
            })
          } else {
              //req.flash("error", "Passwords do not match.");
              console.log('Password do not match')
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: 'yinxiaof993@gmail.com',
            pass: 'yinxiaofeng0206'
          }
        });
        var mailOptions = {
          to: user.username,
          from: 'yinxiaof993@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          //req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/changePassword');
    });
  });

  router.get('/changePassword',function(req,res,next){
    res.render('main/changePassword',{});
    //console.log('收获请求');
});
  router.get('/sentEmail',function(req,res,next){
    res.render('main/sentEmail',{});
    //console.log('收获请求');
});


router.get('/about',function(req,res,next){
    res.render('main/about',{});
    //console.log('收获请求');
});
module.exports = router;