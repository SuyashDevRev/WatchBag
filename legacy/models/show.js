const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const Date = require('../public/date')

const ShowSchema = new Schema({
  name: String,
  image: String,
  year: String,
  imdbID: String,
  startedOn: {
    type: String,
  },
});

module.exports = mongoose.model("Show", ShowSchema);
