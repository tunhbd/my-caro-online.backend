const passport = require('passport');
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { omit, hasIn, isEmpty } = require('lodash');
const fs = require('fs');

const { JWT } = require('../config').PASSPORT;
const { userModel } = require('../database');
const { AuthResponse } = require('../defines/responses');
const { CustomError } = require('../defines/errors');
const {
  NOT_NEED_FIELDS_PROFILE,
  NEW_USER_FIELDS,
  UPDATE_USER_FIELDS
} = require('../defines/constants');
const { hashPassword } = require('../utils/password');
const { uploadImageFile } = require('../multer');
const {
  GoogleDriveClient,
  MIME_TYPES,
  GOOGLE_DRIVE_PERMISSION_ROLE,
  GOOGLE_DRIVE_PERMISSION_TYPE
} = require('google-drive-client/build/src');

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
    console.log('user', req.user);
    const resData = req.user
      ? new AuthResponse(null, { token: jwt.sign(req.user, JWT.SECRET) })
      : new AuthResponse(null, null)
    res.status(200).send(`
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
  if (
    !NEW_USER_FIELDS.every(field => hasIn(req.body, field))
    || !isEmpty(omit(req.body, NEW_USER_FIELDS))
  ) {
    return res
      .status(200)
      .json(new AuthResponse(new CustomError(400, 'Bad request'), {
        success: false
      }));
  }

  userModel
    .addNew(req.body)
    .then(user => {
      res.status(200).json(new AuthResponse(null, { success: true, message: 'Register Successfully' }));
    })
    .catch(err => {
      console.log('register error', err);
      res.status(200).json(new AuthResponse(new CustomError(500, err), {
        success: false,
        message: 'Process failed'
      }))
    });
});

router.get(
  '/me',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    userModel
      .findOne({ username: req.user.username })
      .then(user => res.status(200).json(new AuthResponse(null, {
        profile: omit(user, NOT_NEED_FIELDS_PROFILE)
      })))
      .catch(err => res.status(200).json(new AuthResponse(err, null)))
  }
);

router.post(
  '/me',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const data = req.body;
    const { username } = req.user;

    if (
      !UPDATE_USER_FIELDS.every(field => hasIn(data, field))
      || !isEmpty(omit(data, UPDATE_USER_FIELDS))
    ) {
      return res.status(200).json(new AuthResponse(new CustomError(400, 'Bad request'), null));
    }

    await userModel
      .updateOne({ username }, data)
      .then(user => res.status(200).json(new AuthResponse(null, {
        profile: omit(user, NOT_NEED_FIELDS_PROFILE)
      })))
      .catch(err => console.log(err) && res.status(200).json(new AuthResponse(err, null)));
  }
)

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
);

router.post('/check-exists-username', (req, res) => {
  const { username } = req.body;

  userModel
    .findOne({ username })
    .then(user => {
      if (user) {
        res.status(200).json(new AuthResponse(null, { exists: true }));
      } else {
        res.status(200).json(new AuthResponse(null, { exists: false }));
      }
    })
    .catch(err => {
      console.log('check exists username error', err);
      res.status(200).json(new AuthResponse(err, null));
    })
});

router.post(
  '/change-password',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    if (!req.user) {
      res.status(200).json(new AuthResponse(new CustomError(401, 'Unauthorizated'), null));
    } else {
      const { password } = req.body;
      const { username } = req.user;

      if (!password) {
        return res.status(200).json(new AuthResponse(new CustomError(400, 'Bad request'), null));
      }

      userModel
        .updateOne({ username }, { password: hashPassword(password) })
        .then(user => res
          .status(200)
          .json(new AuthResponse(null, omit(user, NOT_NEED_FIELDS_PROFILE)))
        )
        .catch(err => res.status(200).json(new AuthResponse(err, null)))
    }
  }
);

router.post(
  '/check-password',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { password } = req.body;

    if (!passport) {
      return res.status(200).json(new AuthResponse(new CustomError(400, 'Bad request'), null));
    }

    userModel
      .findOne({ username: req.user.username })
      .then(user => {
        if (!user) {
          return res.status(200).json(new AuthResponse(new CustomError(401, 'Unauthorizated'), null));
        }

        res
          .status(200)
          .json(new AuthResponse(null, {
            correct: user.password === hashPassword(password)
          }));
      })
      .catch(err => res.status(200).json(new AuthResponse(new CustomError(500, err), null)));
  }
)

router.post(
  '/upload-avatar',
  passport.authenticate('jwt', { session: false }),
  uploadImageFile,
  (req, res) => {
    const { username } = req.user;
    const ggdClient = new GoogleDriveClient({
      credentialsPath: __dirname + '/../credentials.json',
      tokenPath: __dirname + '/../token.json',
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appfolder'
      ]
    });

    const fileUrl = __dirname + '/../public/media/images/users/' + req.avatarImage;

    if (req.user.avatar_id) {
      ggdClient.deleteFile(req.user.avatar_id).catch(err => console.log(err));
    }

    ggdClient
      .uploadFile({
        filename: req.avatarImage,
        mimeType: MIME_TYPES[req.avatarImageExt],
        fileUrl,
        folderId: null,
        toFolder: 'my-caro-online-user-avatars',
        permissions: [
          {
            role: GOOGLE_DRIVE_PERMISSION_ROLE.READER,
            type: GOOGLE_DRIVE_PERMISSION_TYPE.ANYONE
          }
        ]
      })
      .then(ret => {
        fs.unlink(fileUrl, () => { });
        userModel
          .updateOne({ username }, { avatar: ret.downloadUrl, avatar_id: ret.fileId })
          .then(user => res
            .status(200)
            .json(new AuthResponse(null, { profile: omit(user, NOT_NEED_FIELDS_PROFILE) })))
          .catch(err => res.status(200).json(new AuthResponse(err, null)));
      })
      .catch(err => console.log(err) && res.status(200).json(new AuthResponse(err, null)));
  }
);

module.exports = router;
