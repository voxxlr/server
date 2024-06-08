module.exports = (gce) =>
{
    let DS = gce.DS;

    cache = {}

    let API =  {
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

        create: async (link) =>
        {
            let id = Date.now();
            await DS.save({ key: DS.key(['link', id]), excludeFromIndexes: ["url"], data: link });
            return id;
        },

        update: async (id, data) =>
        {
            let link = await API.get(id);
            Object.assign(link, data)
            await DS.save(link)
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

    };
    return API;
}