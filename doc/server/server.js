const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv');
const { logger } = require('#common');

process.chdir(__dirname)
dotenv.config({path: '../../.env'});

const app = express()
app.enable('strict routing')
app.use(cors());
if (process.env.log)
{
    app.use(logger)
}

let PLATFORM = require('../../_platform/gce/auth.js')();

let ket_api = require('../../_platform/gce/key.js')(PLATFORM);
let meta_api = require('../../_platform/gce/meta.js')(PLATFORM);
let file_api = require('../../_platform/gce/file.js')(PLATFORM);
let data_api = require('../../_platform/gce/dataset.js')(PLATFORM);

app.use('/key', require('./routes/key.js')(ket_api))
app.use('/meta', require('./routes/meta.js')(meta_api))
app.use('/file', require('./routes/file.js')(file_api, data_api))
app.use(require('./routes/index.js')(ket_api, data_api, meta_api))

app.use(express.static('../client/'))

app.use(function (err, req, res, next) {
    res.status(500).send(err.message)
})

app.listen(3021,  "0.0.0.0", async () =>
{
    console.log(`---- doc server running at http://0.0.0.0:3021/... --- `);
});
