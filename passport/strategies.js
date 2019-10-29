const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { omit, get } = require('lodash');

const { JWT, FACEBOOK, GOOGLE } = require('../config').PASSPORT;
const { userModel } = require('../database');
const { CustomError } = require('../defines/errors');
const NEED_TO_REMOVE_FIELDS_TOKEN = [
  'avatar',
  'gender',
  'email',
  'birthday',
  'display_name',
  'password'
]

// JWT Strategy
const useJwtStrategy = () => {
  const opts = {
    secretOrKey: JWT.SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
  };

  passport.use(new JwtStrategy(opts, function (jwt_payload, cb) {
    if (!jwt_payload) {
      return cb(null, null);
    }

    userModel
      .findOne({ username: jwt_payload.username })
      .then(res => {
        if (res.error) {
          return cb(res.error, null);
        }

        if (res.data) {
          return cb(null, omit(res.data, NEED_TO_REMOVE_FIELDS_TOKEN));
        }

        return cb(null, null);
      })
      .catch(err => {
        console.log('err', err);
        cb(new CustomError(500, err), null)
      });
  }));
};

// Local Strategy
const useLocalStrategy = () => {
  passport.use(new LocalStrategy(
    function (username, password, done) {
      userModel
        .findOne({ username, password: hashPassword(password) })
        .then(res => {
          if (res.error) {
            return done(res.error, null);
          }
          if (res.data) {
            return done(null, omit(Object.assign({}, res.data), NEED_TO_REMOVE_FIELDS_TOKEN));
          }

          return done(null, null);
        })
        .catch(err => {
          return done(new CustomError(500, err), null);
        });
    }
  ));
};

// Google Strategy
const useGoogleStrategy = () => {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE.CLIENT_ID,
    clientSecret: GOOGLE.CLIENT_SECRET,
    callbackURL: GOOGLE.CALLBACK_URL,
    profileFields: ['email', 'birthday', 'gender']
  },
    function (accessToken, refreshToken, profile, cb) {
      userModel.findOne({ google_id: profile.id })
        .then(async res => {
          if (res.error) {
            return cb(res.error, null);
          }

          if (res.data) {
            return cb(null, omit(res.data, [...NEED_TO_REMOVE_FIELDS_TOKEN, 'facebook_id']));
          }

          const newUserData = {
            username: profile.id,
            google_id: profile.id,
            display_name: profile.displayName,
            avatar: profile.photos[0] ? profile.photos[0].value : null,
            gender: profile.gender
              ? profile.gender === 'male'
                ? 1
                : profile.gender === 'female'
                  ? 0
                  : 2
              : null,
            birthday: get(profile, ['json', 'birthday'], null),
            email: get(profile, ['emails', 0, 'value'], null)
          }

          await userModel
            .addNew(newUserData)
            .then(res => {
              if (!res.error) {
                return cb(null, omit(newUserData, NEED_TO_REMOVE_FIELDS_TOKEN));
              }

              return cb(res.error, null);
            })
            .catch(err => cb(new CustomError(500, err), null));
        })
        .catch(err => {
          return cb(new CustomError(500, err), null);
        });
    }
  ));
};

// Facebook Strategy
const useFacebookStrategy = () => {
  passport.use(new FacebookStrategy({
    clientID: FACEBOOK.CLIENT_ID,
    clientSecret: FACEBOOK.CLIENT_SECRET,
    callbackURL: FACEBOOK.CALLBACK_URL,
    profileFields: ['id', 'displayName', 'photos', 'emails'],
  },
    async function (accessToken, refreshToken, profile, cb) {
      userModel.findOne({
        facebook_id: profile.id
      })
        .then(async res => {
          if (res.error) {
            return cb(res.error, null);
          }

          if (res.data) {
            return cb(null, omit(res.data, [...NEED_TO_REMOVE_FIELDS_TOKEN, 'google_id']));
          }

          const newUserData = {
            username: profile.id,
            facebook_id: profile.id,
            display_name: profile.displayName,
            avatar: profile.photos[0] ? profile.photos[0].value : null,
            email: profile.emails[0] ? profile.emails[0].value : null
          }

          await userModel
            .addNew(newUserData)
            .then(res => {
              if (!res.error) {
                return cb(null, omit(newUserData, NEED_TO_REMOVE_FIELDS_TOKEN));
              }

              return cb(res.error, null);
            })
            .catch(err => cb(new CustomError(500, err), null));
        })
        .catch(err => cb(new CustomError(500, err), null));
    }
  ));
};

module.exports = {
  useLocalStrategy,
  useJwtStrategy,
  useFacebookStrategy,
  useGoogleStrategy
}