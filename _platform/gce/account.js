
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
    };
}