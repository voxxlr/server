const express = require('express')
const { Auth, Http, asyncHandler } = require('#common');

module.exports = (KEY) =>
{
    const router = express.Router()

    router.get('/:id(*)', Auth.account, asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.params.id);
        if (key && key.account == req.account.i)
        {
            res.send(key)
        }
        else Auth.key_error(res, Http.NOTFOUND, req.params.id);
    }))

    router.put('/:id(*)', Auth.account, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.params.id);
        if (key && key.account == req.account.i)
        {
            if (req.params.id != await KEY.default(req.account.i))
            {
                key = Object.assign(key, req.body)
                KEY.update(key)
                res.end();
            }
            else Auth.key_error(res, Http.NOTALLOWED, req.params.id, "modify default key");
        }
        else Auth.key_error(res, Http.NOTFOUND, req.params.id);
    }))

    router.delete('/:id(*)', Auth.account, express.json(), asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.params.id);
        if (key && key.account == req.account.i)
        {
            if (req.params.id != await KEY.default(req.account.i))
            {
                KEY.delete(key[DS.KEY].name);
                res.end();
            }
            else Auth.key_error(res, Http.NOTALLOWED, req.params.id, "delete default key");
        }
        else Auth.key_error(res, Http.NOTFOUND, req.params.id);
    }))

    router.post('', Auth.account, express.json(), asyncHandler(async (req, res, next) =>
    {
        req.body.account = req.account.i;
        req.body.calls = 0;
        let id = await KEY.create(req.body)
        res.send(id);
    }))

    return router;
}