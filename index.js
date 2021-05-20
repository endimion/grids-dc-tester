const express = require('express');
const router = express.Router();

const handleIndex = (req, res) => {
    res.render('index', {});
}

router.get('/', handleIndex);

module.exports = router;