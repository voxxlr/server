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

        let doc = cache[id];
        return doc
    }

    let getClient = async (bucket) =>
    {
        if (!client[bucket])
        {
            client[bucket] = new DownscopedClient(await AUTH.getClient(),
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

        return client[bucket];
    }

    return {
        list: async (config) =>
        {
            let content = {};
            let cursor = null;

            let query = DS.createQuery('cloud');
            query.select('__key__');
            query.limit(config.hasOwnProperty("limit") ? config.limit : 1000);
            if (config.hasOwnProperty("cursor"))
            {
                query.start(config.cursor);
            }
            if (config.type)
            {
                query.filter('type', '=', TYPEINDEX[config.type]);
            }
            if (config.tags)
            {
                config.tags.forEach(tag =>
                {
                    query.filter('tags', '=', tag);
                })
            }
            query.filter('account', '=', config.account);
            query.end();

            const result = await DS.runQuery(query);
            cursor = (result[1].moreResults == 'MORE_RESULTS_AFTER_LIMIT' ? result[1].endCursor : null)

            content = result[0].map(entry =>
            {
                return -entry[DS.KEY].id
            })

            return { cursor, content };
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

        tag: async (entity, fields) =>
        {
            if (fields.hasOwnProperty("tags"))
            {
                entity.tags = fields["tags"];
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