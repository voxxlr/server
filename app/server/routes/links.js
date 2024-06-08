const express = require('express')
const { Auth, Http, asyncHandler} = require('#common');

module.exports = (LINK) =>
{
	const router = express.Router()

	let cache = {}

	let getLink = async (id) =>
	{
		if (!cache[id])
		{
            cache[id] = await LINK.get(id);
		}
		return cache[id];
	}

	router.get('', Auth.account, asyncHandler(async (req, res, next) =>
    {
        content = {}
        for (var link of await LINK.list(req.account.i))
        {
            content[link] = await LINK.get(link);
        }

		res.send(content);
	}))

	router.post('', Auth.account, express.json(), asyncHandler(async (req, res, next) =>
    {
        let link = req.body;
        link.account = req.account.i;
        link.views = 0;
        let id = await LINK.create(link);
        res.send({ [id]: link });
	}))

	router.put('/:id([0-9]*$)', Auth.account, express.json(), asyncHandler(async (req, res, next) =>
    {
        let id = parseInt(req.params.id);
        await LINK.update(id, req.body);
        res.end();
	}))

	router.delete('/:id([0-9]*$)', Auth.account, asyncHandler(async (req, res, next) =>
    {
        let id = parseInt(req.params.id);
        await LINK.delete(id);
        res.end();
	}))

	return router;
}

