const express = require('express');
const router = express.Router({mergeParams: true});
const asyncError = require('../utilities/asyncError')
const Watchbag = require('../models/watchbag')
const Show = require('../models/show')
const ExpressError = require('../utilities/ExpressError')


router.get('/toW/:dadid', asyncError( async ( req, res ) => {
    const watchbag = await Watchbag.findById(req.params.id )
    const show = await Show.findById( req.params.dadid )
    if ( watchbag.showsCurrent.includes(show._id) ){
    await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsCurrent : req.params.dadid } }); 
    watchbag.showsWatched.push(show);
    watchbag.save()
    req.flash('success','Successfully moved to Watched')
    }
    if ( watchbag.showsOnHold.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsOnHold : req.params.dadid } }); 
        watchbag.showsWatched.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Watched')
    }
    if ( watchbag.showsDropped.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsDropped : req.params.dadid } }); 
        watchbag.showsWatched.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Watched')
    }


    res.redirect(`/mywatchbags/${req.params.id}`);
}));

router.get('/toC/:dadid', asyncError( async ( req, res ) => {
    const watchbag = await Watchbag.findById( req.params.id )
    const show = await Show.findById( req.params.dadid )
    if ( watchbag.showsWatched.includes(show._id) ){
    await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsWatched : req.params.dadid } });
    watchbag.showsCurrent.push(show);
    watchbag.save()
    req.flash('success','Successfully moved to Currently Watching')
    }
    if ( watchbag.showsOnHold.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsOnHold : req.params.dadid } });
        watchbag.showsCurrent.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Currently Watching')
    }
    if ( watchbag.showsDropped.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsDropped : req.params.dadid } });
        watchbag.showsCurrent.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Currently Watching')
    }
    res.redirect(`/mywatchbags/${req.params.id}`);
}));

router.get('/toH/:dadid', asyncError( async ( req, res ) => {
    const watchbag = await Watchbag.findById( req.params.id )
    const show = await Show.findById( req.params.dadid )
    if ( watchbag.showsWatched.includes(show._id) ){
    await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsWatched : req.params.dadid } });
    watchbag.showsOnHold.push(show);
    watchbag.save()
    req.flash('success','Successfully moved to Currently Watching')
    }
    if ( watchbag.showsCurrent.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsCurrent : req.params.dadid } });
        watchbag.showsOnHold.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Currently Watching')
    }
    if ( watchbag.showsDropped.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsDropped : req.params.dadid } });
        watchbag.showsOnHold.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Currently Watching')
    }
    res.redirect(`/mywatchbags/${req.params.id}`);
}));

router.get('/toD/:dadid', asyncError( async ( req, res ) => {
    const watchbag = await Watchbag.findById( req.params.id )
    const show = await Show.findById( req.params.dadid )
    if ( watchbag.showsWatched.includes(show._id) ){
    await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsWatched : req.params.dadid } });
    watchbag.showsDropped.push(show);
    watchbag.save()
    req.flash('success','Successfully moved to Currently Watching')
    }
    if ( watchbag.showsCurrent.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsCurrent : req.params.dadid } });
        watchbag.showsDropped.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Currently Watching')
    }
    if ( watchbag.showsOnHold.includes(show._id) ){
        await Watchbag.findByIdAndUpdate(req.params.id , { $pull:{ showsOnHold : req.params.dadid } });
        watchbag.showsDropped.push(show);
        watchbag.save()
        req.flash('success','Successfully moved to Currently Watching')
    }    
    res.redirect(`/mywatchbags/${req.params.id}`);
}));

module.exports = router