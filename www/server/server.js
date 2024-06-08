const fs = require('fs');
const express = require('express')
const dotenv = require('dotenv')
const { logger } = require('#common');

process.chdir(__dirname)
dotenv.config({path: '../../.env'});

let PLATFORM = require('../../_platform/gce/auth.js')();
let key_api = require('../../_platform/gce/key.js')(PLATFORM);
let meta_api = require('../../_platform/gce/meta.js')(PLATFORM);
let data_api = require('../../_platform/gce/dataset.js')(PLATFORM);
let link_api = require('../../_platform/gce/link.js')(PLATFORM);
let account_api = require('../../_platform/gce/account.js')(PLATFORM);

const app = express()
if (process.env.log)
{
    app.use(logger)
}

app.use('/', require('./routes/index.js')(account_api, meta_api, key_api, link_api, data_api))
app.use('/login', require('./routes/login.js')(account_api))

app.use(express.static('../client/'))

app.use(function (err, req, res, next) {
    res.status(500).send(err.message)
})

let port = 80;
let host = "0.0.0.0";

app.listen(port, host, async () =>
{
    console.log(`---- www server running at http://${host}:${port}/... --- `);
});
