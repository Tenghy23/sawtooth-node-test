const express = require('express');

const app = express();
const user = require('./routes/user')
const port = process.env.PORT || 8080;

// setup 
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// register routes
app.get('/health', (req, res) => {
    res.json({
        message: 'Running'
    })
})
app.use('/auth', user)


// server run
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost${port}/health`)
})