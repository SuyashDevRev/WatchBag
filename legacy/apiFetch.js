const axios = require('axios')

module.exports.apiFetch =  async ( req, res, next ) => {
    const weather = await axios.get(`http://www.omdbapi.com/?i=tt3896198&apikey=${process.env.OMDB_apikey}&t=${req.body.showname}`);
    data = weather.data;
    req.apiData = data;
    next(); 
}