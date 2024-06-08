const express = require('express')
const { Auth, asyncHandler } = require('#common');

module.exports = (KEY, ACCOUNT, DATA, COMPUTE) =>
{
    const router = express.Router()

    router.get('/list', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        let list = await COMPUTE.listDataset(account.created);
        res.send(list);
    }))

    router.post('/dataset', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        let id = await COMPUTE.createDataset(account.created, req.body.name, req.body.type, req.body.tags.join(','));
        res.send({ id, name: req.body.name, type: req.body.type, tags: req.body.tags });
    }))

    router.patch('/dataset/:id(*)', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        COMPUTE.updateDataset(account.created, req.params.id, req.body);
        res.end();
    }))

    router.delete('/dataset/:id(*)', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        COMPUTE.deleteDataset(account.created, req.params.id);
        res.end();
    }))

    router.get('/dataset/:id(*)', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        let list = await COMPUTE.listFiles(account.created, req.params.id);
        res.send(list);
    }))

    router.post('/file/:id(*)', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        let url = await COMPUTE.uploadFile(account.created, req.params.id, req.body.path);
        res.send(url);
    }))

    router.patch('/file/:id(*)/:path(*)', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        console.log("asdasdasdasd");
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        await COMPUTE.updateFile(account.created, req.params.id, req.params.path, { metadata: req.body });
        res.end();
    }))

    router.delete('/file/:id(*)', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let account = await ACCOUNT.get(key.account);
        await COMPUTE.deleteFile(account.created, req.params.id, req.body.file);
        res.end();
    }))

    router.post('/process', Auth.key2, express.json(), asyncHandler(async (req, res, next) =>
    {
        try
        {
            let key = await KEY.get(req.key);
            let account = await ACCOUNT.get(key.account);

            await COMPUTE.startProcess(key.account, account.created, req.body.id, req.body);
            res.send({});
             
        }
        catch (e) { next(e) } 
    }))

    router.get('/process/:id([0-9]*$)', Auth.key2, asyncHandler(async (req, res, next) =>
    {
        let state = await COMPUTE.getProcess(req.params.id);
        res.send(state);
    }))

    router.delete('/process/:id([0-9]*$)', Auth.key2, asyncHandler(async (req, res, next) =>
    {
        let state = await COMPUTE.deleteProcess(req.params.id);
        res.send(state);
    }))


    return router;
}

