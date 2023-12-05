const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Server is running...');
 // res.render('pages/index', { msg: req.rawHeaders }) ;});

})

module.exports = router;
