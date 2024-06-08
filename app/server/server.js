const crypto = require('crypto');
const fs = require('fs');
const mustache = require("mustache");
const express = require('express')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const dotenv = require('dotenv')
const { logger, error, Auth, asyncHandler} = require('#common');

process.chdir(__dirname)
dotenv.config({path: '../../.env'});

let PLATFORM = require('../../_platform/gce/auth.js')();
let key_api = require('../../_platform/gce/key.js')(PLATFORM);
let data_api = require('../../_platform/gce/dataset.js')(PLATFORM);
let link_api = require('../../_platform/gce/link.js')(PLATFORM);
let account_api = require('../../_platform/gce/account.js')(PLATFORM);
let process_api = require('../../_platform/gce/process.js')(PLATFORM);

DOMAINS =
{
    doc_domain: process.env.doc_domain,
    app_domain: process.env.app_domain,
    www_domain: process.env.www_domain,
}


const app = express()
app.use(cors());
if (process.env.log)
{
    app.use(logger)
}


// Apps index files
APPS = {}
// manifest object for use in mustache
MANIFEST = {}

const manifest = JSON.parse(fs.readFileSync("./manifest.json", 'utf8'));

for (var category in manifest["categories"])
{
    if (!MANIFEST.hasOwnProperty(category))
    {
        MANIFEST[category] = { apps: [], ...manifest["categories"][category] };
    }
}

for (var key in manifest["apps"])
{
    //install frontend
    APPS[key] = fs.readFileSync(`../client/${key}/index.html`, 'utf8')
    
    //install backend
    if (fs.existsSync(`./routes/${key}/server.js`))
    {
        app.use(`/${key}/`, require(`./routes/${key}/server.js`)(key_api, account_api, data_api, process_api))
    }

    MANIFEST[manifest["apps"][key].category]["apps"].push({ "name": key, ...manifest["apps"][key] });
}

app.use('/link', require('./routes/links.js')(link_api))

app.get('(*)/index.html', asyncHandler(async (req, res, next) => 
{
    res.type('html')

    if (true) // TODO add a flag for this
    {
        let app = req.path.slice(1, req.path.lastIndexOf("/index.html"));
        APPS[app] = fs.readFileSync(`../client/${app}/index.html`, 'utf8');
    }

    res.send(mustache.render(APPS[req.path.slice(1, req.path.lastIndexOf("/index.html"))], { ...DOMAINS, "manifest": { ...MANIFEST }, "key": req.query.key, "dataset": req.query.dataset, "permission": key.permission }));
}))

app.get('/launchpad.html', asyncHandler(async (req, res, next) =>
{
    if (req.query.account)
    {
        const account = jwt.verify(decodeURIComponent(req.query.account), process.env.secret)
        if (account)
        {
            let key = await key_api.default(account.i);
            fs.readFile(`../client/launchpad.html`, 'utf8', function (err, text)
            {
                res.type('html')
                res.send(mustache.render(text, { ...DOMAINS, "manifest": { ...MANIFEST },  "key": key }));
            });
    
        }
    }
    else res.redirect(`${process.env.www_domain}/login.html?target=launchpad`); 
}))

app.get('/manifest', asyncHandler(async (req, res, next) => {

    res.send(JSON.stringify(manifest));
}))


// App links
app.get('/:id([0-9]*$)/', asyncHandler(async (req, res, next) =>
{
    let id = parseInt(req.params.id)
    
    let link = await link_api.get(id);
    if (link)
    {
        let page = Object.assign({ key: link.key }, DOMAINS);

        if (link["password"])
        {
            page["password"] = crypto.createHash('md5').update(link.password).digest("hex");
        }

        let key = await key_api.get(link.key);
        if (typeof (key.data) == "string") // TODO remove at some point
        {
            key.data = JSON.parse(key["data"])
        }

        if (key)
        {
            page["permission"] = key.permission;

            if ("id" in key.data)
            {
                let doc = await data_api.get(key.data.id);
                if (doc)
                {
                    page["dataset"] = jwt.sign({ p: key.permission, t: doc.type, i: key.data.id, b: doc.bucket }, process.env.secret)
                }
            }

            if (true) // TODO add a flag for this
            {
                 APPS[link.app] = fs.readFileSync(`../client/${link.app}/index.html`, 'utf8');
            }

            res.type('html')
            res.send(mustache.render(APPS[link.app], page));
        }
        else
        {
            res.status(http.NOT_FOUND).json({ error: `Api key not found: ${link.key}` }).end()
        }
    }
    else
    {
        res.status(http.NOT_FOUND).json({ error: `Link not found: ${link.key}` }).end()
    }
}))

app.use(express.static('../client/'))

app.use(function (err, req, res, next) {
    res.status(500).send(err.message)
})

app.listen(3022, "0.0.0.0", async () =>
{
    console.log(`---- app server running at http://0.0.0.0:3022/... --- `);
});
