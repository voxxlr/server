const { DownscopedClient } = require('google-auth-library');

const CLOUD = 1;
const MAP = 2;
const PANORAMA = 3;
const MODEL = 4;


const TYPEINDEX =
{
    "cloud": 1,
    "map": 2,
    "panorama": 3,
    "model": 4
}


module.exports = (gce) =>
{
    let SB = gce.SB;
    let DS = gce.DS;
    let AUTH = gce.AUTH;

    let cache = {}
    let client = {}

    let getDataset = async (id) =>
    {
        if (!cache[id])
        {
            const [doc] = await DS.get(DS.key(['cloud', -id]));
            cache[id] = doc
        }

        return cache[id];
    }

    return {
        
        list: async (config) =>
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

        get: async (id) =>
        {
            return await getDataset(id)
        },

        delete: async (id) =>
        {
            let entity = await getDataset(id)
            let bucket = SB.bucket(`voxxlr-${entity.bucket}`);
          
            // schedule data for deletion
            await bucket.addLifecycleRule({
                action: {
                    type: 'Delete',
                },
                condition: { age: 0, "matchesPrefix": [`${id}/`] },
            });

            await DS.delete(DS.key(['cloud', -id]));
            if (cache[id])
            {
                delete cache[id];
            }
        },

        tag: async (id, fields) =>
        {
            let entity = await getDataset(id)

            if (fields.hasOwnProperty("tags"))
            {
                if (fields["tags"] instanceof array)
                {
                    entity.tags = fields["tags"];
                }
            }

            if (fields.hasOwnProperty("location"))
            {
                entity.location = { latitude: fields["location"]["lat"], longitude: fields["location"]["lon"] };
            }
           
            await DS.save(entity)
        },

        source: async (id, type) =>
        {
            let entity = await getDataset(id)

            let client = await getClient(entity.bucket);

            let accessToken = await client.getAccessToken();
            switch (type)
            {
                case CLOUD:
                    // TODO get rid of this
                    if (id < 1669915336962)
                    {
                        return `https://storage.googleapis.com/voxxlr-${entity.bucket}/${id}/%s.bin?bearer_token=${accessToken.token}`;
                    }
                    else
                    {
                        return `https://storage.googleapis.com/voxxlr-${entity.bucket}/${id}/root/%s.bin?bearer_token=${accessToken.token}`;
                    }
                case MODEL:
                    return `https://storage.googleapis.com/voxxlr-${entity.bucket}/${id}/root/%s?bearer_token=${accessToken.token}`;
                case MAP:
                    return `https://storage.googleapis.com/voxxlr-${entity.bucket}/${id}/root/PATH/FILE.TYPE?bearer_token=${accessToken.token}`;
                case PANORAMA:
                    return `https://storage.googleapis.com/voxxlr-${entity.bucket}/${id}/root/FILE.png?bearer_token=${accessToken.token}`;
            }
        },
        
        file: async (id, path) =>
        {
            let entity = await getDataset(id)

            let file = await SB.bucket(`voxxlr-${entity.bucket}`).file(`${id}/file/${path}`)

            return await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 15 * 60 * 1000 // 15 minutes
            });
        },

        imageUrl: async (account, dataset) =>
        {
            let bucket = SB.bucket(`voxxlr-${account}`);
            let file = bucket.file(`${dataset}/file/preview.jpg`);

            let url = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 7 * 23 * 60 * 60 * 1000,
            })
            return url[0];
        }
    }
}