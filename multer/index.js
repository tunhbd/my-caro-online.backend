const multer = require('multer');

const multerImageConfig = {
  storage: multer.diskStorage({
    destination: function (req, file, next) {
      next(null, __dirname + '/../public/media/images/users');
    },

    //Then give the file a unique name
    filename: function (req, file, next) {
      const ext = file.mimetype.split('/')[1];
      const filename = `${req.user.username}.${ext}`;
      req.avatarImage = filename;
      req.avatarImageExt = ext;
      next(null, filename);
    }
  }),

  //A means of ensuring only images are uploaded. 
  fileFilter: function (req, file, next) {
    if (!file) {
      next();
    }
    const image = file.mimetype.startsWith('image/');
    if (image) {
      // console.log('photo uploaded');
      next(null, true);
    } else {
      console.log("file not supported");

      //TODO:  A better message response to user on failure.
      return next();
    }
  }
}

const uploadImageFile = multer(multerImageConfig).single('avatar');

module.exports = {
  uploadImageFile
}