const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Absolute path to backend/uploads
const uploadDir = path.join(__dirname, "..", "uploads");

// Make sure uploads folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);

        cb(null, `${Date.now()}${extension}`);
    }
});

const upload = multer({
    storage: storage
});

module.exports = upload;