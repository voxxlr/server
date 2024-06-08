const fs = require('fs');
const jwt = require('jsonwebtoken');
const { Storage } = require('@google-cloud/storage');
const { Datastore } = require('@google-cloud/datastore');
const { GoogleAuth, DownscopedClient } = require('google-auth-library');

const CLOUD = 1;
const MAP = 2;
const PANORAMA = 3;
const MODEL = 4;

const TYPESTRING = 
{
    1: "cloud",
    2: "map",
    3: "panorama",
    4: "model"
}

const TYPEINDEX =
{
    "cloud": 1,
    "map": 2,
    "panorama": 3,
    "model": 4
}


//
// private functions
//

docsCache = {}
metaCache = {}
urlCache = {}
clientCache = {}

_getDataset = async (id) =>
{
    if (!docsCache[id])
    {
        const [doc] = await datastore.get(datastore.key(['cloud', id]));
        docsCache[id] = doc
    }

    let doc = docsCache[id];
    return doc
}

_getMeta = async (entity) =>
{
    let id = parseInt(entity[datastore.KEY].id)
    if (!metaCache[id])
    {
        const [meta] = await datastore.get(datastore.key(['meta', id]));
        if (!meta)
        {
            meta = { content: {} }
        }
        metaCache[id] = JSON.parse(meta.content)
    }
    return metaCache[id]
}

_getInfo = async (entity, query, info) =>
{
    if (query.tags)
    {
        info.tags = entity.tags
    }
    if (query.location && entity.location)
    {
        info.location = { lat: entity.location.latitude, lon: entity.location.longitude }
    }
    if (query.type)
    {
        info.type = TYPESTRING[entity.type]
    }

    if (query.meta)
    {
        info.meta = {}
        let meta = await _getMeta(entity)
        await Promise.all((query.meta || []).map(async tag =>
        {
            if (meta.hasOwnProperty(tag))
            {
                info.meta[tag] = meta[tag]
            }
        }))
    }

    if (query.files)
    {
        info.files = {}
        await Promise.all((query.files || []).map(async path =>
        {
            info.files[path] = await _getUrl(entity.bucket, `${-entity[datastore.KEY].id}/file/${path}`)
        }))
    }

    return info;
}

_getSource = async (entity) =>
{
    let client = await _getClient(entity.bucket);

    let accessToken = await client.getAccessToken();

    let source = {}

    switch (entity.type)
    {
        case CLOUD:
            // TODO get rid of this
            if (-entity[datastore.KEY].id < 1669915336962)
            {
                source.data = "https://storage.googleapis.com/voxxlr-" + entity.bucket + "/" + (-entity[datastore.KEY].id) + "/%s.bin?bearer_token=" + accessToken.token;
            }
            else
            {
                source.data = "https://storage.googleapis.com/voxxlr-" + entity.bucket + "/" + (-entity[datastore.KEY].id) + "/root/%s.bin?bearer_token=" + accessToken.token;
            }
            break;
        case MODEL:
            source.data = "https://storage.googleapis.com/voxxlr-" + entity.bucket + "/" + (-entity[datastore.KEY].id) + "/root/%s?bearer_token=" + accessToken.token;
            break;
        case MAP:
            source.data = "https://storage.googleapis.com/voxxlr-" + entity.bucket + "/" + (-entity[datastore.KEY].id) + "/root/PATH/FILE.TYPE?bearer_token=" + accessToken.token;
            break;
        case PANORAMA:
            source.data = "https://storage.googleapis.com/voxxlr-" + entity.bucket + "/" + (-entity[datastore.KEY].id) + "/root/FILE.png?bearer_token=" + accessToken.token;
            break;
    }

    return source;
}


_setMeta = async (entity, content) =>
{
    let id = parseInt(entity[datastore.KEY].id)

    await datastore.save({ key: datastore.key(['meta', id]), excludeFromIndexes: ["content"], data: { content: JSON.stringify(content) } })
}

_getUrl = async (bucket, path) =>
{
    let timestamp = Date.now();

    let entry = urlCache[path];
    if (!entry || entry.expires < timestamp - 60000)
    {
        let file = await storage.bucket(`voxxlr-${bucket}`).file(path)

        let url = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: timestamp + 15 * 60 * 1000 // 15 minutes
        })

        entry = { expires: timestamp + 15 * 60 * 1000, url }
        urlCache[path] = entry;
    }
    return entry.url;
}

_getClient = async (bucket) =>
{
    if (!clientCache[bucket])
    {
        clientCache[bucket] = new DownscopedClient(authClient,
        {
            accessBoundary:
            {
                accessBoundaryRules: [
                    {
                        availableResource: `//storage.googleapis.com/projects/_/buckets/voxxlr-${bucket}`,
                        availablePermissions: ['inRole:roles/storage.objectViewer'],
                    },
                ],
            },
        });
    }

    return clientCache[bucket];
}

//
// public Api
//

connect = async () =>
{
    auth = new GoogleAuth({ keyFile: process.argv.slice(2)[0], scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    storage = new Storage({ authClient: auth });
    datastore = new Datastore({ authClient: auth });

    authClient = await auth.getClient();
}

//
// Document API
//

doc =
{
    list: async (config, key) =>
    {
        let appKey = await _getKey(key);
        let content = {};
        let cursor = null;

        if (appKey.data.hasOwnProperty("tags"))
        {
            let query = datastore.createQuery('cloud');
            query.select('__key__');
            query.limit(config.hasOwnProperty("limit") ? config.limit : 3);
            if (config.hasOwnProperty("cursor"))
            {
                query.start(config.cursor);
            }
            if (config.type)
            {
                query.filter('type', '=', TYPEINDEX[config.type]);
            }
            // add restriction from app key
            appKey.data.tags.forEach(tag =>
            {
                query.filter('tags', '=', tag);
            })
            // add restriction from query
            config.tags.forEach(tag =>
            {
                query.filter('tags', '=', tag);
            })
            query.filter('account', '=', appKey.account);
            query.end();

            const result = await datastore.runQuery(query);
            cursor = (result[1].moreResults == 'MORE_RESULTS_AFTER_LIMIT' ? result[1].endCursor : null)

            content = result[0].map(entry =>
            {
                return { id: -entry[datastore.KEY].id }
            })
        }
        else if (appKey.data.hasOwnProperty("id"))
        {
            content = {id: -appKey.data["id"]}
            cursor = null
        }

        if (config.hasOwnProperty("select"))
        {
            content = await Promise.all(content.map(async info =>
            {
                let entity = await _getDataset(-info.id);

                let select = config["select"];

                await _getInfo(entity, select, info)
                if (select.token)
                {
                    info.token = jwt.sign({ p: appKey.permission, t: entity.type, i: info.id }, process.env.secret)
                }
                return info
            }))
        }

        return { cursor, content };
    },

    find: async (key, id) =>
    {
        let appKey = await _getKey(key);
        if (appKey)
        {
            let entity = await _getDataset(-id);
            if (entity)
            {
                let token = jwt.sign({ p: appKey.permission, t: entity.type, i: id }, process.env.secret)

                if (appKey.data["id"] == id)
                {
                    return token;
                }
                else
                {
                    if (entity.account == appKey.account)
                    {
                        if (!appKey.data.tags)
                        {
                            return token;
                        }
                        else
                        {
                            // TODO make sure  tags match with appkey as well. 
                            return token;
                        }
                    }
                }
            }
        }
        return null;
    },


    //
    // token based
    //

    get: async (token, select) =>
    {
        let entity = await _getDataset(-token.i)
        let info = await _getInfo(entity, select, { id: token.i })
        info.root = JSON.parse(entity.root)
        info.token = jwt.sign(token, process.env.secret)
        info.source = await _getSource(entity)
        return info;
    },

    delete: async (token) =>
    {
        let entity = await _getDataset(-token.i)

        // delete on bucket
        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);

        console.log(`deleting voxxlr-${entity.bucket}/${token.i}/`)
        await bucket.deleteFiles({ force: true, prefix: `${token.i}/` });
        console.log(`done`)

        // delete point cloud
        await datastore.delete(datastore.key(['cloud', -token.i]));
        if (docsCache[-token.i])
        {
            delete docsCache[-token.i];
        }

        // delete meta data
        if (meta[-token.i])
        {
            delete meta[-token.i];
        }
        await datastore.delete(datastore.key(['meta', -token.i]));
    },

    tag: async (token, fields) =>
    {
        let entity = await _getDataset(-token.i)

        if (fields.hasOwnProperty("tags"))
        {
            entity.tags = fields["tags"];
        }

        if (fields.hasOwnProperty("location"))
        {
            entity.location = { latitude: fields["location"]["lat"], longitude: fields["location"]["lon"] };
        }
        console.log(entity);
        await datastore.save(entity)
    }
}

//
// File API
//
file = 
{
    save: async (token, name, base64) =>
    {
        let entity = await _getDataset(-token.i)
        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);
        bucket.file(`${token.i}/file/${name}`).save(Buffer.from(base64, 'base64'))
    },

    upload: async (token, name) =>
    {
        let entity = await _getDataset(-token.i)
        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);
        let file = bucket.file(`${token.i}/file/${name}`);

        let url = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            action: 'resumable',
            contentType: 'application/octet-stream',
        })

        return url[0];
    },

    get: async (token, name) =>
    {
        let entity = await _getDataset(-token.i)

        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);
        let file = bucket.file(`${token.i}/file/${name}`);

        let url = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000,
        })

        return { url: url[0], path: file.name.substring(`${token.i}/file/`.length) };
    },

    delete: async (token, name) =>
    {
        let entity = await _getDataset(-token.i)

        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);
        let file = bucket.file(`${token.i}/file/${name}`);
        file.delete();
    },

    list: async (token, path) =>
    {
        let entity = await _getDataset(-token.i)
        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);

        const [files] = await bucket.getFiles({ prefix: `${token.i}/file/${path}` });

        let expires = Date.now() + 15 * 60 * 1000 // 15 minutes
        let list = await Promise.all((files || []).map(async file =>
        {
            let url = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires
            })
            return { url: url[0], path: file.name.substring(`${token.i}/file/`.length) };
        }))
        return list;
    }
}

//
// Meta API
//


meta =
{
    set: async (token, meta) =>
    {
        let entity = await _getDataset(-token.i)
        _setMeta(entity, meta)
    },

    get: async (token) =>
    {
        let entity = await _getDataset(-token.i)
        return await _getMeta(entity)
    }
}


//
// File API
//


keyCache = {}

_getKey = async (id) =>
{
    if (!keyCache[id])
    {
        const [key] = await datastore.get(datastore.key(['key', id]));
        // TODO remove at some point
        if (typeof (key.data) == "string")
        {
            key.data = JSON.parse(key["data"])
        }
        keyCache[id] = key
    }

    return keyCache[id];
}

keys =
{
    get: async (token, id) =>
    {
        let key = await _getKey(id);
        if (key.account == token.i)
        {
            return key;
        }
        else throw new Error();
    },

    put: async (token, id, data) =>
    {
        let key = await _getKey(id);
        if (key.account == token.i)
        {
            data.account = token.i
            datastore.save({ key: datastore.key(['key', id]), excludeFromIndexes: ["data"], data });
            keyCache[id] = data
        }
        else throw new Error();
    },

    post: async (token, id, data) =>
    {
        data.account = token.i
        data.calls = 0;
        datastore.save({ key: datastore.key(['key', id]), excludeFromIndexes: ["data"], data });
        keyCache[id] = data
    },
        
    delete: async (token, id) =>
    {
        let key = await _getKey(id);
        if (key.account == token.i)
        {
            datastore.delete(datastore.key(['key', id]));
            delete keyCache[id]
        }
        else throw new Error();
    }
}

module.exports =  { connect, meta, doc, file, keys }
