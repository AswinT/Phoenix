const passport = require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy
require("dotenv").config()
const User = require("../models/user")

const googleClientID = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
if (googleClientID && googleClientSecret && 
    !googleClientID.includes('REPLACE_WITH_YOUR') && 
    !googleClientSecret.includes('REPLACE_WITH_YOUR')) {
    
    passport.use(new GoogleStrategy({
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: "/auth/google/callback"
    }, async function (accessToken, refreshToken, profile, done) {
        try {
            let user = await User.findOne({ googleId: profile.id })

            if (user) {
                if (user.isBlocked) {
                    return done(null, false, { message: "Your account has been blocked. Please contact support." })
                }
                return done(null, user)
            }

            const email = profile.emails[0].value
            user = await User.findOne({ email: email })

            if (user) {
                if (user.isBlocked) {
                    return done(null, false, { message: "Your account has been blocked. Please contact support." })
                }

                user.googleId = profile.id
                await user.save()
                return done(null, user)
            } else {
                user = new User({
                    fullname: profile.displayName,
                    email: email,
                    googleId: profile.id,
                    isBlocked: false,
                    isAdmin: false
                })

                await user.save()
                return done(null, user)
            }
        } catch (error) {
            console.error("Google OAuth Error:", error)
            return done(error, null)
        }
    }))
}

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id)
        done(null, user)
    } catch (err) {
        done(err, null)
    }
})

module.exports = passport
