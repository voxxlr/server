
module.exports = (gce) =>
{
    let SB = gce.SB;

    return {

        save: async (bucket, id, name, base64) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            sb.file(`${id}/file/${name}`).save(Buffer.from(base64, 'base64'))
        },

        upload: async (bucket, id, name) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            let file = sb.file(`${id}/file/${name}`);

            let url = await file.getSignedUrl({
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                action: 'resumable',
                contentType: 'application/octet-stream',
            })

            return url[0];
        },

        get: async(bucket, id, name) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            let file = sb.file(`${id}/file/${name}`);

            let url = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 15 * 60 * 1000,
            })

            return { url: url[0], path: file.name.substring(`${id}/file/`.length) };
        },

        delete: async (bucket, id, name) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            let file = sb.file(`${id}/file/${name}`);
            await file.delete();
        },

        list: async (bucket, id, path) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            const [files] = await sb.getFiles({ prefix: `${id}/file/${path}` });

            let expires = Date.now() + 15 * 60 * 1000 // 15 minutes
            let list = await Promise.all((files || []).map(async file =>
            {
                let url = await file.getSignedUrl({
                    version: 'v4',
                    action: 'read',
                    expires
                })
                return { url: url[0], path: file.name.substring(`${id}/file/`.length) };
            }))
            return list;
        }
    }
}