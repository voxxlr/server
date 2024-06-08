module.exports = (gce) =>
{
    let DS = gce.DS;

    cache = {}

    return {

        set: async (id, content) =>
        {
            await DS.save({
                key: DS.key(['meta', -id]),
                excludeFromIndexes: ["content"],
                data: { content: JSON.stringify(content) }
            })
            cache[id] = content;
        },

        get: async (id) =>
        {
            if (!cache[id])
            {
                const [meta] = await DS.get(DS.key(['meta', -id]));
                if (meta)
                {
                    cache[id] = JSON.parse(meta.content)
                }
            }
            return cache[id]
        },

        delete: async (id) =>
        {
            if (cache[id])
            {
                delete cache[id];
            }
            await DS.delete(DS.key(['meta', -id]));
        }
    };
}
