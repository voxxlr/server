const express = require('express')
const { Auth, Http, asyncHandler} = require('#common');

function body(req, res, next)
{
    req.body = '';
    req.on('data', function (chunk)
    {
        req.body += chunk;
    });
    req.on('end', function ()
    {
        next();
    });
}

module.exports = (FILE, DATA) =>
{
    const router = express.Router()
    
    router.get(/.*/, Auth.doc, asyncHandler(async (req, res, next) =>
    {
        let entity = await DATA.get(req.doc.i);
        if (entity)
        {
            let list = await FILE.list(req.doc.b, req.doc.i, req.path.substring(1));
            res.json(list)
        }
        else Auth.doc_error(res, Http.NOTFOUND, req.doc.i);
    }))

    router.delete(/.*/, Auth.doc,  asyncHandler(async (req, res, next) =>
    {
        if (req.doc.p == 'W')
        {
            let entity = await DATA.get(req.doc.i);
            if (entity)
            {
                await FILE.delete(req.doc.b, req.doc.i, req.path.substring(1));
                res.end();
            }
            else Auth.doc_error(res, Http.NOTFOUND, req.doc.i);
        }
        else Auth.doc_error(res, Http.FORBIDDEN, req.doc.i, 'read only token');
    }))

    router.put('/*', Auth.doc, body,  asyncHandler(async (req, res, next) =>
    {
        if (req.doc.p == 'W')
        {
            let entity = await DATA.get(req.doc.i);
            if (entity)
            {
                var match = req.body.match(/^data:image\/([\w+]+);base64,([\s\S]+)/);
                await FILE.save(req.doc.b, req.doc.i, req.path.substring(1), match[2])
                res.end()
            }
            else Auth.doc_error(res, Http.NOTFOUND, req.doc.i);
        }
        else Auth.doc_error(res, Http.FORBIDDEN, req.doc.i, 'read only token');
    }))

    router.post('/*', Auth.doc,  asyncHandler(async (req, res, next) =>
    {
        if (req.doc.p == 'W')
        {
            let entity = await DATA.get(req.doc.i);
            if (entity)
            {
                let url = await FILE.upload(req.doc.b, req.doc.i, req.path.substring(1))
                res.send(url)
            }
        }
        else next();
    }))

    return router;
}