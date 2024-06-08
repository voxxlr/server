module.exports = (gce) =>
{
    let DS = gce.DS;

    cache = {}

    let API =  {
        get: async (id) =>
        {
            if (id && !cache[id]) {
                const [key] = await DS.get(DS.key(['key', id]));
                if (key) {
                    if (typeof (key.data) == "string") {
                        key.data = JSON.parse(key["data"])
                    }
                    cache[id] = key
                }
            }

            return cache[id];
        },

        list: async (account) =>
        {
            let list = []
            query = DS.createQuery('key');
            query.select('__key__');
            query.filter('account', '=', account);
            query.end();
            result = await DS.runQuery(query);

            result[0].forEach(entry =>
            {
                list.push(entry[DS.KEY].name);
            })
            return list;
        },

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

        delete: async (id) =>
        {
            await DS.delete(DS.key(['key', id]));
            if (cache[id])
            {
                delete cache[id];
            }
            console.log(`deleted key - ${id}`);
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
    };

    return API;
}