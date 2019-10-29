const passport = require('passport');
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { omit } = require('lodash');

const { JWT } = require('../config').PASSPORT;
const { userModel } = require('../database');
const { AuthResponse } = require('../defines/responses');
const { CustomError } = require('../defines/errors');

router.post('/login', function (req, res, next) {
  passport.authenticate('local', { session: false }, function (err, user, info) {
    if (err) {
      console.log('login error', err);
      return res.status(200).json(new AuthResponse(err, { token: null }));
    }

    if (!user) {
      return res.status(200).json(new AuthResponse(null, { token: null }))
    }

    req.logIn(user, { session: false }, function (err) {
      if (err) {
        console.log('login error', err);
        return res.status(200).json(new AuthResponse(new CustomError(500, err), { token: null }));
      }

      return res.status(200).json(new AuthResponse(null, { token: jwt.sign(user, JWT.SECRET) }));
    });
  })(req, res, next);
});

router.get('/facebook', passport.authenticate('facebook', {
  scope: ['email']
}));

router.get(
  '/facebook/callback',
  passport.authenticate('facebook'),
  (req, res) => {
    const resData = req.user
      ? new AuthResponse(null, { token: jwt.sign(req.user, JWT.SECRET) })
      : new AuthResponse(null, null)
    res.send(`
    <html>
      <body onload="onLoad()">
        <script>
          window.opener.postMessage(${JSON.stringify({ type: 'LOGIN_VIA_SOCIAL', messageData: resData })}, '*');
          window.close();
        </script>
      </body>
    </html>
    `).end();
  });

router.get('/google', passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/user.birthday.read'
  ]
}));

router.get(
  '/google/callback',
  passport.authenticate('google'),
  (req, res) => {
    // if (!req.user) {
    //   res.status(200).json(new AuthResponse(null, null));
    // } else {
    //   res.status(200).json(new AuthResponse(null, { token: jwt.sign(req.user, JWT.SECRET) }));
    // }

    const resData = req.user
      ? new AuthResponse(null, { token: jwt.sign(req.user, JWT.SECRET) })
      : new AuthResponse(null, null)
    res.send(`
    <html>
      <body onload="onLoad()">
        <script>
          window.opener.postMessage(${JSON.stringify({ type: 'LOGIN_VIA_SOCIAL', messageData: resData })}, '*');
          window.close();
        </script>
      </body>
    </html>
    `).end();
  });

router.post('/register', (req, res) => {
  userModel
    .addNew(req.body)
    .then(ret => {
      if (ret.error) {
        console.log('register error', ret.error);
        res.status(200).json(new AuthResponse(ret.error, {
          success: false,
          message: 'Process failed'
        }));
      }
      else {
        res.status(200).json(new AuthResponse(null, { success: true, message: 'Register Successfully' }));
      }
    })
    .catch(err => {
      console.log('register error', err);
      res.status(200).json(new AuthResponse(new CustomError(500, err), null))
    });
});

router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userModel
      .findOne({ username: req.user.username })
      .then(ret => {
        if (ret.error) {
          console.log('profile error', ret.error);
          res.status(ret.error.code).json(new AuthResponse(ret.error, null));
        } else {
          res.status(200).json(new AuthResponse(null, {
            profile: omit(ret.data, ['password'])
          }));
        }
      });
  }
);

router.get(
  '/check-authorizated',
  (req, res) => {
    const authorization = req.headers.authorization || null;

    if (!authorization) {
      res.status(200).json(new AuthResponse(null, { authorizated: false }));
    }

    const token = authorization.split(' ')[1];
    let user = null;
    try {
      user = jwt.verify(token, JWT.SECRET);
    } catch (err) {
      //
    }

    res.status(200).json(new AuthResponse(null, { authorizated: user ? true : false }));
  }
)

module.exports = router;
