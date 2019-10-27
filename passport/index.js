const passport = require('passport');

const {
  useLocalStrategy,
  useJwtStrategy,
  useFacebookStrategy,
  useGoogleStrategy
} = require('./strategies');

module.exports = app => {
  // app.use(expressSession({ secret: 'NguyenHuuTu-1612772', resave: true, saveUninitialized: true }));
  app.use(passport.initialize());

  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (obj, done) {
    done(null, obj);
  });

  // app.use(passport.session());

  useLocalStrategy();
  useJwtStrategy();
  useFacebookStrategy();
  useGoogleStrategy();
}

