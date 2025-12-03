const fs = require('fs');
const path = require('path');
const express = require('express')
const dotenv = require('dotenv')
const { logger } = require('#common');

process.chdir(__dirname)

// Load .env - check local first, then parent (for local dev)
if (fs.existsSync('./.env')) {
    dotenv.config({path: './.env'});
} else {
    dotenv.config({path: '../.env'});
}

// Load platform modules - check local first (for Cloud Functions), then parent (for local dev)
const platformPath = fs.existsSync('./platform') ? './platform' : '../_platform/gce';
let PLATFORM = require(`${platformPath}/auth.js`)();
let key_api = require(`${platformPath}/key.js`)(PLATFORM);
let meta_api = require(`${platformPath}/meta.js`)(PLATFORM);
let data_api = require(`${platformPath}/dataset.js`)(PLATFORM);
let link_api = require(`${platformPath}/link.js`)(PLATFORM);
let account_api = require(`${platformPath}/account.js`)(PLATFORM);

const app = express()
if (process.env.log)
{
    app.use(logger)
}

app.use('/', require('./routes/index.js')(account_api, meta_api, key_api, link_api, data_api))
app.use('/login', require('./routes/login.js')(account_api))
app.use(express.static('./routes'))
app.use(function (err, req, res, next) {
    res.status(500).send(err.message)
})

// Export for Cloud Functions
exports.www = app;

// Run locally when executed directly (not imported by Cloud Functions)
if (require.main === module) 
{
    let port = process.env.PORT || 80;
    let host = "localhost";

    app.listen(port, host, async () =>
    {
        console.log(`---- www server running at http://${host}:${port}/... --- `);
    });
}
