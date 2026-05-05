const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_name,
    api_key: process.env.CLOUDINARY_key,
    api_secret: process.env.CLOUDINARY_secret
})


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'WatchBag',
      allowedFormats: ['png','jpeg','jpg']
    },
});

module.exports = {
    cloudinary, storage
}