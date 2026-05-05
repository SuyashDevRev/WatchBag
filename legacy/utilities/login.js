const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("warning", "Login to Continue!");
    return res.redirect("/login");
  }
  next();
};

module.exports = isLoggedIn;
