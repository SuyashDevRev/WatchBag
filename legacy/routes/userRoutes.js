const express = require('express');
const router = express.Router({ mergeParams : true });
const asyncError = require('../utilities/asyncError')
const User = require('../models/user');
const Watchbag = require('../models/watchbag')
const passport = require('passport');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage })


router.get('/register', ( req, res ) => {
    res.render('users/register')
})

router.post('/register' , upload.single('image') , asyncError( async ( req, res ) => {
    try{
        const { username, email, password } = req.body;
        const user = new User({username, email})
        user.image = { url: req.file.path , filename: req.file.filename }
        const registeredUser = await User.register(user, password);
        req.login( registeredUser, function(err) {
            if (err) { return next(err); }
            req.flash('success','Successfully Registered!')
            res.redirect('/')
          });
    }
    catch(e){
        req.flash('error', e.message )
        res.redirect('/register')
    }
}));

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), ( req, res ) => {
    req.flash('success', 'Successfully Logged In')
    const redirectUrl = res.locals.url || '/';
    res.redirect(redirectUrl);
})


router.get('/login', ( req, res ) => {
    res.render('users/login')
})



router.get('/logout', async ( req, res ) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success', 'Successfully Logged Out')
        res.redirect('/')
      });
})

router.get('/profile', async ( req, res ) => {
    const watchbags = await Watchbag.find( { author: req.user._id } )
    res.render('users/userPr', { watchbags })
})

router.post('/profile', upload.single('image') , async ( req, res ) => {
    console.log(req.file);
    const user = await User.findByIdAndUpdate( req.user._id )
    // on going image update
})


module.exports = router;