const { createPrivateKey } = require('../services/credential');

const users = {

}

exports.registerUser = (req,res) => {

    const privateKey = createPrivateKey();
    const { userId } = req.body;
    users[userId] = privateKey;
    
    if (users[userId]) {
        return res.status(409).json({
            message: 'User already exist'
        })
    }

    res.json({
        userId: req.body.userId,
        privateKey
    })
}

