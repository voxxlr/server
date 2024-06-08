const mustache = require("mustache");
const express = require('express')
const fs = require('fs');
const jwt = require('jsonwebtoken')
const { Auth, asyncHandler} = require('#common');

module.exports = (ACCOUNT, META, KEY, LINK, DATA) =>
{
    const router = express.Router()


    router.get(['/', '/index.html'], async (req, res, next) =>
    {
        //let params = Object.assign({}, req.app.locals.domains);

        let params =
        {
            doc_domain: process.env.doc_domain,
            app_domain: process.env.app_domain,
            www_domain: process.env.www_domain,
        }
        
        // editor
        params["demo1_image"] = await DATA.imageUrl(1506608110360, 1619459075741);
        params["demo1_url"] = `${process.env.app_domain}/1715102025961`;
        // bim
        params["demo3_image"] = await DATA.imageUrl(1506608110360, 1586213009781);
        params["demo3_url"] = `${process.env.app_domain}/1718629661645`;
        // volumetric 
        params["demo4_image"] = await DATA.imageUrl(1506608110360, 1563996592965);
        params["demo4_url"] = `${process.env.app_domain}/1718629908905`;
        // inspector
        params["demo2_image"] = await DATA.imageUrl(1506608110360, 1586179279434);
        params["demo2_url"] = `${process.env.app_domain}/1601129397532`;

        params["oauth2"] = process.env.login;

        // TODO cache until images expire
        let INDEX = mustache.render(fs.readFileSync(`../client/index.html`, 'utf8'), params);

        res.type('html')
        res.send(INDEX);
    })

    // delete account
    router.delete('/', Auth.account, asyncHandler(async (req, res, next) => {

        // safety check... remove
        if (req.account.i != "jochen.stier@gmail.com" && req.account.i != "jochen.stier@voxxlr.com") 
        {
            let account = await ACCOUNT.get(req.account.i);
            if (account)
            {
                /*
                for (var dataset of await DATA.list({}))
                {
                    console.log(dataset);
                    await DATA.delete(dataset);
                    await META.delete(dataset);
                }
                */
                
               // delete datasets
                let query = DS.createQuery('cloud');
                query.select('__key__');
                query.filter('account', '=', req.account.i);
                query.end();
                let result = await DS.runQuery(query);
                result[0].forEach(async entry => {
                    await DS.delete(entry[DS.KEY]);
                    await META.delete(parseInt(entry[DS.KEY].id));
                })
                
                // delete links
                for (var link of await LINK.list(req.account.i))
                {
                    await LINK.delete(link);
                }

                // delete keys
                for (var key of await KEY.list(req.account.i))
                {
                    await KEY.delete(key);
                }

                ACCOUNT.delete(account);

                // delete keys
                res.end();
            }
            else Auth.account_error(res, Http.NOTFOUND);
        }
        else Auth.account_error(res, Http.UNAUTHORIZED);;
    }))

    router.get('/main.html', asyncHandler(async (req, res, next) =>
    {
        let account = jwt.verify(decodeURIComponent(req.query.account), process.env.secret);
        if (account)
        {
            let params =
            {
                doc_domain: process.env.doc_domain,
                app_domain: process.env.app_domain,
                www_domain: process.env.www_domain,
            }
            params.account = req.query.account;
            params.key = await KEY.default(account.i);

            let MAIN = mustache.render(fs.readFileSync(`../client/main.html`, 'utf8'), params);
            res.type('html')
            res.send(MAIN);
        }
        else Auth.account_error(res, Http.UNAUTHORIZED);;
    }))

    router.get('/login.html', asyncHandler(async (req, res, next) =>
    {
        let params =
        {
            doc_domain: process.env.doc_domain,
            app_domain: process.env.app_domain,
            www_domain: process.env.www_domain,
        }
        params["oauth2"] = process.env.login;
        switch (req.query.target)
        {
            case "launchpad":
                params["forward"] = `${process.env.app_domain}/launchpad.html`;
                break;
            default:
                break;
        }
       
        res.type('html')
        res.send(mustache.render(fs.readFileSync(`../client/login.html`, 'utf8'), params));
    }))

    return router;
}