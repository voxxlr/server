const express = require('express')
const jwt = require('jsonwebtoken')
const fs = require('fs');
const mustache = require("mustache")
const { Auth, Http, asyncHandler} = require('#common');

const TYPESTRING =
{
    1: "cloud",
    2: "map",
    3: "panorama",
    4: "model"
}

const CLOUD = 1;
const MAP = 2;
const PANORAMA = 3;
const MODEL = 4;


module.exports = (KEY, DATA, META) =>
{
    let index1d;
    let index2d;
    let index3d;

    switch (process.env.source) {
        case "external":
            {
                index3d = fs.readFileSync("../client/3d/index.html", 'utf8');
                index2d = fs.readFileSync("../client/2d/index.html", 'utf8');
                index1d = fs.readFileSync("../client/1d/index.html", 'utf8');
                 break;
            }
        case "inline":
        default:
            {
                index3d = fs.readFileSync("../client/3d/index.min.html", 'utf8');
                index2d = fs.readFileSync("../client/2d/index.min.html", 'utf8');
                index1d = fs.readFileSync("../client/1d/index.min.html", 'utf8');
                break;
            }
    }


    let selectMeta = async (id, select) =>
    {
        let meta = await META.get(id)

        values = {}
        if (meta)
        select.map(async tag =>
        {
            if (meta.hasOwnProperty(tag))
            {
                values[tag] = meta[tag]
            }
        })
        return values;
    }

    let selectFiles = async (id, select) =>
    {
        let urls = await Promise.all(select.map(async path =>
        {
            return { [path]: await DATA.file(id, path) };
        }))
        
        return urls.reduce((acc, value) =>
        {
            return { ...acc, ...value }
        }, {})
    }

    let selectFields = (id, entity) =>
    {
        let values =
        {
            id,
            'tags': entity.tags,
            'type': TYPESTRING[entity.type]
        };

        if (entity.location)
        {
            values["location"] = { lat: entity.location.latitude, lon: entity.location.longitude }
        }
  
        return values;
    }

    let authorized = (key, entity) =>
    {
        let authorized = true;
        if (key.data.tags)
        {
            key.data.tags.forEach(tag =>
            {
                authorized &&= entity.tags.includes(tag);
            });
        }
        else if (key.data.id)
        {
            authorized == key.data.id == req.params.id;
        }
        return authorized;
    }

    const router = express.Router()

    router.get('/index.html', asyncHandler(async (req, res, next) =>
    {
        let type;
        let content;

        if (req.query.token)
        {
            let token = jwt.verify(decodeURIComponent(req.query.token), process.env.secret);
           
            let entity = await DATA.get(token.i);
            if (entity)
            {
                let values = selectFields(token.i, entity);

                if (req.query.meta)
                {
                    values["meta"] = await selectMeta(token.i, req.query.meta.split(","));
                }

                if (req.query.files)
                {
                    values["files"] = await selectFiles(token.i, req.query.files.split(","));
                }

                values["token"] = req.query.token;
                values["root"] = JSON.parse(entity.root);
                values["source"] = await DATA.source(token.i, entity.type);

                content = JSON.stringify(values);

                switch (token.t)
                {
                    case CLOUD: index = index3d; break;
                    case MODEL: index = index3d; break;
                    case MAP: index = index2d; break;
                    case PANORAMA: index = index1d; break;
                }
               
                res.type('html')
                res.send(mustache.render(index, { content }));                
            }
            else Auth.doc_error(res, Http.NOTFOUND, req.params.id);
        }
        else if (req.query.type)
        {
            switch (req.query.type)
            {
                case "cloud":  index = index3d; break;
                case "model": index = index3dL; break;
                case "map": index = index2d; break;
                case "panorama": index = index1d; break;
            }

            res.type('html')
            res.send(mustache.render(index, {  }));                
        }
        else next();
    }))

    router.get('/1d/index.html', async (req, res, next) =>
    {
        res.type('html')
        res.send(mustache.render(index1d, {}));
    });

    router.get('/2d/index.html', async (req, res, next) =>
    {
        res.type('html')
        res.send(mustache.render(index2d, {}));
    });

    router.get('/3d/index.html', async (req, res, next) =>
    {
        res.type('html')
        res.send(mustache.render(index3d, {}));
    });

    //
    // Key API
    //

    router.post('/list', Auth.key, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);

        if (key)
        {
            if (key.data.tags != undefined)
            {
                req.body.account = key.account;
                req.body.tags = (key.data.tags || []).concat(req.body.tags || []);
    
                let { content, cursor } = await DATA.list(req.body);

                content = await Promise.all(content.map(async id =>
                {
                    let entity = await DATA.get(id);

                    let values = selectFields(id, entity);

                    if (req.body.token)
                    {
                        values["token"] = jwt.sign({ p: key.permission, t: entity.type, i: id, b: entity.bucket }, process.env.secret);
                    }

                    return values;
                }));

                if (req.body.hasOwnProperty("select"))
                {
                    let select = req.body["select"];
                    
                    content = await Promise.all(content.map(async entry =>
                    {
                        if (select.hasOwnProperty("meta"))
                        {
                            entry["meta"] = await selectMeta(entry.id, select["meta"])
                        }

                        if (select.hasOwnProperty("files"))
                        {
                            entry["files"] = await selectFiles(entry.id, select["files"])
                        }
                        return entry;
                    }))
                }

                res.json({ content, cursor });
            }
            else Auth.key_error(res, Http.FORBIDDEN, req.key, 'listing datasets');
        }
        else Auth.key_error(res, Http.NOTFOUND, req.key);
    }))

    router.post('/search', Auth.key, express.json(),  asyncHandler(async (req, res, next) =>
    {
        // TODO implement me
        res.send([]);
    }))

    router.post('/lookup/:id([0-9]*)', Auth.key, express.json(),  asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);

        if (key)
        {
            const entity = await DATA.get(req.params.id);
            if (entity)
            {
                if (authorized(key, entity))
                {
                    let values = selectFields(req.params.id, entity);

                    if (req.body.token)
                    {
                        values["token"] = jwt.sign({ p: key.permission, t: entity.type, i: req.params.id, b: entity.bucket }, process.env.secret);
                    }

                    if (req.body.hasOwnProperty("select"))
                    {
                        let select = req.body["select"];

                        if (select.hasOwnProperty("meta"))
                        {
                            values["meta"] = await selectMeta(req.params.id, select["meta"])
                        }

                        if (select.hasOwnProperty("files"))
                        {
                            values["files"] = await selectFiles(req.params.id, select["files"])
                        }
                    }

                    res.json(values);
                }
                else Auth.key_error(res, Http.FORBIDDEN, req.key, `access to ${req.params.id}`);
            }
            else Auth.doc_error(res, Http.NOTFOUND, req.params.id);
        }
        else Auth.key_error(res, Http.NOTFOUND, req.key);
    }))


    router.get('/token/:id([0-9]*)', Auth.key, asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        if (key)
        {
            let entity = await DATA.get(req.params.id);
            if (entity)
            {
                if (authorized(key, entity))
                {
                    res.send(jwt.sign({ p: key.permission, t: entity.type, i: req.params.id, b: entity.bucket }, process.env.secret));
                }
                else Auth.key_error(res, Http.FORBIDDEN, req.key, `reading ${req.params.id}`);
            }
            else Auth.doc_error(res, Http.NOTFOUND, req.params.id);
        }
        else Auth.key_error(res, Http.NOTFOUND, req.key);
     }))

    //
    // Token API
    //

    router.get('/', Auth.doc, asyncHandler(async (req, res, next) =>
    {
        let entity = await DATA.get(req.doc.i);
        if (entity)
        {
            let values = selectFields(req.doc.i, entity);

            values["token"] = req.headers['x-doc-token'];
            values["root"] = JSON.parse(entity.root);
            values["source"] = await DATA.source(req.doc.i, entity.type);

            if (req.query.meta)
            {
                values["meta"] = await selectMeta(req.doc.i, req.query.meta.split(","));
            }

            if (req.query.files)
            {
                values["files"] = await selectFiles(req.doc.i, req.query.files.split(","));
            }

            //res.send(values);
            res.json(values);
        }
        else Auth.doc_error(res, Http.NOTFOUND, req.doc.id);
    }))

    router.delete('/', Auth.doc, asyncHandler(async (req, res, next) =>
    {
        if (req.doc.p == 'W')
        {
            await DATA.delete(req.doc.i);
            await META.delete(req.doc.i);
            res.end();
        }
        else Auth.doc_error(res, Http.FORBIDDEN, req.doc.i);
    }))

    router.patch('/tag', Auth.doc, express.json(),  asyncHandler(async (req, res, next) =>
    {
        if (req.doc.p == 'W')
        {
            let entity = await DATA.get(req.doc.i);
            if (entity)
            {
                await DATA.tag(entity, req.body);
                res.end();
            }
            else Auth.doc_error(res, Http.NOTFOUND, req.doc.i);
        }
        else Auth.doc_error(res, Http.FORBIDDEN, req.doc.i);
    }))    

    return router;
}
