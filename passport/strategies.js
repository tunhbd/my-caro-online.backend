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
const { NEED_TO_REMOVE_FIELDS_TOKEN } = require('../defines/constants');
const { hashPassword } = require('../utils/password');

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
      .then(user => cb(null, user))
      .catch(err => cb(err, null));
  }));
};

// Local Strategy
const useLocalStrategy = () => {
  passport.use(new LocalStrategy(
    function (username, password, cb) {
      userModel
        .findOne({ username, password: hashPassword(password) })
        .then(user => {
          if (!user) {
            return cb(null, null);
          }
          cb(null, omit(user, NEED_TO_REMOVE_FIELDS_TOKEN))
        })
        .catch(err => cb(err, null));
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
      userModel
        .findOne({ google_id: profile.id })
        .then(user => {
          if (user) {
            return cb(null, omit(user, [...NEED_TO_REMOVE_FIELDS_TOKEN, 'facebook_id']));
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

          userModel
            .addNew(newUserData)
            .then(user => cb(null, omit(user, [...NEED_TO_REMOVE_FIELDS_TOKEN, 'facebook_id'])))
            .catch(err => cb(err, null));
        })
        .catch(err => cb(err, null));
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
      userModel
        .findOne({
          facebook_id: profile.id
        })
        .then(user => {
          if (user) {
            return cb(null, omit(user, [...NEED_TO_REMOVE_FIELDS_TOKEN, 'google_id']));
          }

          const newUserData = {
            username: profile.id,
            facebook_id: profile.id,
            display_name: profile.displayName,
            avatar: profile.photos[0] ? profile.photos[0].value : null,
            email: profile.emails[0] ? profile.emails[0].value : null
          }

          userModel
            .addNew(newUserData)
            .then(user => cb(null, omit(user, [...NEED_TO_REMOVE_FIELDS_TOKEN, 'google_id'])))
            .catch(err => cb(err, null));
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