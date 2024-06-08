
module.exports = (gce) =>
{
    let DS = gce.DS;
    let SB = gce.SB;

    return  {

        get: async (id) =>
        {

            let [account] = await DS.get(DS.key(['account', id]));
            return account;
        },

        delete: async (account) =>
        {
            // schedule data for deletion
            const [metadata] = await SB.bucket(`voxxlr-${account.created}`).addLifecycleRule({
                action: {
                    type: 'Delete',
                },
                condition: { age: 0 },
            });

            console.log(`deleted bucket - voxxlr-${account.created}`);

            await DS.delete(account[DS.KEY]);
            console.log(`deleted account - ${account[DS.KEY].name}`);

        },

        create: async (email) =>
        {
            let now = Date.now();

            await DS.save({ key: DS.key(['account', email]), data: { created: now } });
            console.log(`created account - ${now}`);

            const [bucket] = await SB.createBucket(`voxxlr-${now}`);
            await bucket.setCorsConfiguration([
                {
                    maxAgeSeconds: 3600,
                    method: ["POST", "PUT", "GET", "HEAD", "OPTIONS"],
                    origin: ["*"],
                    responseHeader: ["Origin", "Content-Type", "Content-Length", "Location", "Range", "x-goog-resumable", "x-goog-meta-info"],
                }
            ]);
            console.log(`created bucket - voxxlr-${now}`);
        }


    /*
        get: async (id) =>
        {
            if (!cache[id])
            {
                const [link] = await DS.get(DS.key(['link', id]));
                cache[id] = link
            }
            return cache[id];
        },

        list: async (account) =>
        {
            let list = []
            query = DS.createQuery('link');
            query.select('__key__');
            query.filter('account', '=', account);
            query.end();
            result = await DS.runQuery(query);
            result[0].forEach(entry =>
            {
                list.push(parseInt(entry[DS.KEY].id));
            })
            return list;
        },

        delete: async (id) =>
        {
            await DS.delete(DS.key(['link', id]));
            if (cache[id])
            {
                delete cache[id];
            }
            console.log(`deleted link - ${id}`);
        },
        /*
        update: async (key, data) =>
        {
            DS.save(key);
        },

        create: async (data) =>
        {
            let base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            let id = '';
            for (var i = 0; i < 16; i++)
            {
                id += base64.charAt(Math.floor(Math.random() * base64.length));
            }
            console.log(`created key - ${id}`);

            await DS.save({ key: DS.key(['key', id]), excludeFromIndexes: ["data"], data });
            return id;
        },

        default: async (account) =>
        {
            let query = DS.createQuery('key');
            query.select('__key__');
            query.filter('account', '=', account);
            query.filter('name', '=', "ACCOUNT");
            query.end();
            const result = await DS.runQuery(query);

            let key;
            if (result[0].length == 0)
            {
                key = await API.create({ account, calls: 0, data: { tags: [] }, name: "ACCOUNT", permission: "W" });
            }
            else
            {
                key = result[0][0][DS.KEY].name;
            }

            return key;
        }
        */
    };
}