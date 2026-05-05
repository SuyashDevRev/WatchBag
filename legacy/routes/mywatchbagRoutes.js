const express = require("express");
const router = express.Router();
const asyncError = require("../utilities/asyncError");
const axios = require("axios");
const Watchbag = require("../models/watchbag");
const Show = require("../models/show");
const { apiFetch } = require("../apiFetch");
const ExpressError = require("../utilities/ExpressError");
const multer = require("multer");
const { storage } = require("../cloudinary");
const upload = multer({ storage });
// const { campgroundSchema } = require('../schemas')
const isLoggedin = require("../utilities/login");
const watchbag = require("../models/watchbag");

router.get(
  "/",
  isLoggedin,
  asyncError(async (req, res) => {
    const watchbags = await Watchbag.find({ author: req.user._id });
    res.render("watchbags/index", { watchbags });
  })
);

router.get("/new", isLoggedin, (req, res) => {
  res.render("watchbags/new");
});

router.put("/:id/status", async (req, res) => {
  const watchbag = await Watchbag.findById(req.params.id);
  (await (watchbag.status == true))
    ? (watchbag.status = false)
    : (watchbag.status = true);
  await watchbag.save();
  res.redirect(`/mywatchbags/${req.params.id}`);
});

router.post(
  "/",
  isLoggedin,
  upload.single("image"),
  asyncError(async (req, res) => {
    const watchbag = new Watchbag(req.body);
    watchbag.author = req.user._id;
    watchbag.createdOn = new Date().toLocaleDateString();
    watchbag.image = { url: req.file.path, filename: req.file.filename };
    await watchbag.save();
    req.flash("success", "Awesome! New Watchbag Created");
    res.redirect(`/mywatchbags`);
  })
);

router.delete(
  "/:id",
  asyncError(async (req, res) => {
    await Watchbag.findByIdAndDelete(req.params.id);
    req.flash("success", "Watchbag deleted Successfully");
    res.redirect("/mywatchbags");
  })
);

router.get(
  "/:id",
  isLoggedin,
  asyncError(async (req, res) => {
    const id = req.params.id;
    const watchbag = await Watchbag.findById(req.params.id)
      .populate("showsCurrent")
      .populate("showsWatched")
      .populate("showsOnHold")
      .populate("showsDropped");
    res.render("watchbags/show", { watchbag, id, data: false });
  })
);

router.post(
  "/:id",
  asyncError(async (req, res, next) => {
    const id = req.params.id;
    const watchbag = await Watchbag.findById(req.params.id)
      .populate("showsCurrent")
      .populate("showsWatched")
      .populate("showsOnHold")
      .populate("showsDropped");

    const weather = await axios.get(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_apikey}&s=${req.body.showname}&page=1-10`
    );
    data = weather.data;
    if (data.Error) {
      return next(new ExpressError("Movie Not Found", 404));
    }
    res.render("watchbags/show", { watchbag, id, data });
  })
);

router.post(
  "/:id/:imdbID",
  asyncError(async (req, res, next) => {
    const id = req.params.id;
    const watchbag = await Watchbag.findById(id);

    const weather = await axios.get(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_apikey}&i=${req.params.imdbID}`
    );
    data = weather.data;
    if (data.Error) {
      return next(new ExpressError("Movie Not Found", 404));
    }
    const show = new Show({
      name: data.Title,
      image: data.Poster,
      year: data.Year,
      imdbID: data.imdbID,
    });
    show.startedOn = new Date().toLocaleDateString();
    watchbag.showsCurrent.push(show);
    await show.save();
    await watchbag.save();
    req.flash("success", "Looks like a new item is Added!");
    res.redirect(`/mywatchbags/${id}`);
  })
);

module.exports = router;
