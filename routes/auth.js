const express = require('express');
const router = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function configurePassport(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly']
  },
  (accessToken, refreshToken, profile, done) => {
    // Store tokens on the user object
    const user = { profile, accessToken, refreshToken };
    return done(null, user);
  }));

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
}

router.get('/google', passport.authenticate('google'));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: process.env.FRONTEND_URL + '?error=auth_failed' }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL + '?login=success');
  }
);

router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ loggedIn: true, name: req.user.profile.displayName, email: req.user.profile.emails[0].value });
  } else {
    res.json({ loggedIn: false });
  }
});

router.post('/logout', (req, res) => {
  req.logout(() => res.json({ success: true }));
});

module.exports = { router, configurePassport };
