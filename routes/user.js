const { registerUser } = require('../controllers/user');
const router = require('express').Router();

router.post('/register', registerUser)

// export this router out of this file
module.exports = router;