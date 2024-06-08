const express = require('express')
const jsonpatch = require('fast-json-patch')
const { Auth, asyncHandler} = require('#common');

module.exports = (META) =>
{
    const router = express.Router()

    router.get(':path(*)', Auth.doc, express.json(), asyncHandler(async (req, res, next) =>
    {
        const meta = await META.get(req.doc.i);
        if (meta)
        {
            let recurse = (meta, path) =>
            {
                if (path.length == 0)
                {
                    return meta;
                }
                else
                {
                    let name = path[0];
                    if (meta[name])
                    {
                        return recurse(meta[name], path.slice(1))
                    }
                    else
                    {
                        return {};
                    }
                }
            }
            let path = req.params.path.split("/").slice(1);
            if (!path.length || path[0] == '')
            {
                res.send(meta);
            }
            else
            {
                res.send(recurse(meta, path))
            }
        }
        else Auth.doc_error(res, Http.NOTFOUND, req.doc.i);
    }))

    router.patch('', Auth.doc, express.json(), asyncHandler(async (req, res, next) =>
    {
        const meta = await META.get(req.doc.i);
        if (meta)
        {
            if (req.doc.p == 'W')
            {
                try
                {
                    let update = jsonpatch.applyPatch(meta, req.body);
                    META.set(req.doc.i, update.newDocument)
                    res.end()
                }
                catch (error)
                {
                    Auth.doc_error(res, Http.NOTFOUND, req.doc.i, "json patch format");
                }
            }
            else Auth.doc_error(res, Http.NOTALLOWED, req.doc.i, "writing meta data");
        }
        else Auth.doc_error(res, Http.NOTFOUND, req.doc.i);
    }))


    return router;
}