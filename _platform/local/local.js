const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');

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


_getInfo = async function(dir, fields, files)
{
    let info =
    {
        id: dir
    }

    let file = `${rootPath}/${dir}/tags.json`
    let tags = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
    Object.assign(info, tags)

    info.files = {}
    if (files)
    {
        await Promise.all((files || []).map(async file =>
        {
            info.files[file] = `http://${process.env.doc_domain}/local?path=${rootPath}/${dir}/file/${file}`
        }))
    }


    info.meta = {}
    if (fields)
    {
        let file = `${rootPath}/${dir}/meta.json`
        let meta = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : { name: dir };

        await Promise.all((fields || []).map(async tag =>
        {
            if (meta.hasOwnProperty(tag))
            {
                info.meta[tag] = meta[tag]
            }
        }))
    }

    return info
}

connect = async (app) =>
{
    rootPath = process.env.path.replace(/\\/g, "/") + "/";
    console.log(`using local  ${rootPath}`);

    // used to access packets in local.js
    app.get('/local', async (req, res) =>
    {
        res.sendFile(req.query.path);
    })
}

doc =
{
    list: async (config, key) =>
    {
        let list = fs.readdirSync(rootPath).filter((file) =>
        {
            if (config.cursor)
            {
                if (config.cursor == rootPath + file)
                {
                    config.cursor = null;
                }
                return false;
            }

            if (config.limit-- > 0)
            {
                if (fs.statSync(rootPath + file).isDirectory())
                {
                    return fs.existsSync(`${rootPath}${file}/root.json`);
                }
            };

            return false;
        });

        let content = []
        await Promise.all(list.map(async (dir) =>
        {
            let root = JSON.parse(fs.readFileSync(`${rootPath}${dir}/root.json`, 'utf8'));
            if (config.type == null || config.type.includes(root["type"]))
            {
                let info = await _getInfo(dir, config.meta, config.files)

                info.token = jwt.sign({ p: "W", t: TYPEINDEX[root["type"]], id: dir }, process.env.secret)
                content.push(info);

                config.cursor = rootPath + dir
            }
        }));

        return { content, cursor: config.cursor };
    },

    find: async (key, id) =>
    {
         return null;
    },


    //
    // token based
    //

    get: async (token, meta, files, host) =>microsoft_
    {
        let info = await _getInfo(token.id, meta, files)
        info.id = token.id
        info.type = TYPESTRING[token.t]
        info.root = JSON.parse(fs.readFileSync(`${rootPath}/${token.id}/root.json`, 'utf8'))
        info.token = jwt.sign(token, process.env.secret)

        //
        switch (token.t) 
        {
            case 1://"cloud"
                info.source = { data: `http://${process.env.doc_domain}/local?path=${rootPath}/${token.id}/root/%s.bin` }
                break;
            case 4://"model"
                info.source = { data: `http://${process.env.doc_domain}/local?path=${rootPath}/${token.id}/root/model.bin` }
                break;
            case 2://"map"
                info.source = { data: `http://${process.env.doc_domain}/local?path=${rootPath}/${token.id}/root/PATH/FILE.TYPE`, }
                break;
            case 3://"panorama"
                info.source = { data: `http://${process.env.doc_domain}/local?path=${rootPath}/${token.id}/root/FILE.png`, }
                break;
        }

        return info;

       /*
        let entity = await _getDataset(-token.i)

        let info = await _getInfo(entity, meta)
        info.root = JSON.parse(entity.root)
        info.token = jwt.sign(token, process.env.secret)
        info.source = await _getSource(entity)

        return info;
        */
    },

    delete: async (token) =>
    {
    },

    tag: async (token, values) =>
    {
        let file = `${rootPath}/${dir}/tags.json`

        let json = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
        for (var key in values)
        {
            json[key] = values[key]
        }
        fs.writeFileSync(file, JSON.stringify(json));
    }
}

//
// File API
//
file =
{
    save: async (token, name, base64) =>
    {
        let file = `${rootPath}/${token.id}/file/${name}`
        fs.mkdirSync(`${path.dirname(file)}`, { recursive: true });
        fs.writeFileSync(`${file}`, base64, { encoding: "base64" })
    },

    upload: async (token, name) =>
    {
        /*
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
         */
        return "";
    },

    get: async (token, name) =>
    {
        /*
        let entity = await _getDataset(-token.i)

        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);
        let file = bucket.file(`${token.i}/file/${name}`);

        let url = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000,
        })

        return { url: url[0], path: file.name.substring(`${token.i}/file/`.length) };
        */
    },

    delete: async (token, name) =>
    {
        /*
        let entity = await _getDataset(-token.i)

        let bucket = storage.bucket(`voxxlr-${entity.bucket}`);
        let file = bucket.file(`${token.i}/file/${name}`);
        file.delete();
        */
    },

    list: async (token, path) =>
    {
        fs.readdirSync(`${rootPath}/${token.id}/file/${path}`).forEach(file =>
        {
            const extname = path.extname(file);
            const filename = path.basename(file, extname);
            const absolutePath = path.resolve(folder, file);

            log("File : ", file);
            log("filename : ", filename);
            log("extname : ", extname);
            log("absolutePath : ", absolutePath);
        });
        /*
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
        */
    }
}

//
// Meta API
//


meta =
{
    set: async (token, meta) =>
    {
        let file = `${rootPath}/${token.id}/meta.json`

        let json = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
        for (var key in meta)
        {
            json[key] = meta[key]
        }
        fs.writeFileSync(file, JSON.stringify(json));
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

keys =
{
    get: async (token, id) =>
    {
    },

    put: async (token, id, data) =>
    {
    },

    post: async (token, id, data) =>
    {
    },

    delete: async (token, id) =>
    {
    }
}

module.exports = { connect, meta, doc, file, keys }



/*
module.exports.DataSource = class
{
    async addFile(token, name, base64) 
    { 
        let file = `${rootPath}/${token.id}/file/${name}`

        fs.mkdirSync(`${path.basename(path.dirname(file))}`, { recursive: true });
        fs.writeFileSync(`${file}`, base64, { encoding: "base64" })
    }

    async uploadFile(token, name, base64) 
    {
        throw new Error("not implemented");
    }
}
*/