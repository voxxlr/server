const jwt = require('jsonwebtoken')
const clc = require("cli-color");

class Http
{
    static UNAUTHORIZED = 401;
    static NOTFOUND = 404;
    static FORBIDDEN = 403;
    static NOTALLOWED = 405;
    static NOTACCEPTABLE = 406;
}

class Auth
{
    static key(req, res, next)
    {
        if (req.headers['x-api-key'])
        {
            req.key = req.headers['x-api-key']
            next();
        }
        else
        {
            Auth.key_error(res, Http.UNAUTHORIZED);
        }
    }

    static key_error(res, type, key, message)
    {
        switch (type)
        {
            case Http.NOTFOUND:
                res.status(type).json({ error: `Api key ${key} not found` });
                break;
            case Http.FORBIDDEN:
                res.status(type).json({ error: `Api key ${key} does not allow ${message}` });
                break;
            case Http.UNAUTHORIZED:
                res.status(type).json({ error: `Missing x-api-key` });
                break;
            case Http.NOTALLOWED:
                res.status(type).json({ error: `Operation not allowed: ${message}` });
                break;
           }
    }

    static doc(req, res, next)
    {
        if (req.headers['x-doc-token'])
        {
            req.doc = jwt.verify(decodeURIComponent(req.headers['x-doc-token']), process.env.secret)
            next();
        }
        else
        {
            Auth.doc_error(res, Http.UNAUTHORIZED);
        }
    }

    static doc_error(res, type, id, message)
    {
        switch (type)
        {
            case Http.NOTFOUND:
                res.status(type).json({ error: `Dataset ${id} not found ${message ? message: ''}` });
                break;
            case Http.UNAUTHORIZED:
                res.status(type).json({ error: `Missing x-doc-token` });
                break;
            case Http.NOTALLOWED:
                res.status(type).json({ error: `Operation not allowed: ${message}` });
                break;
            case Http.NOTACCEPTABLE:
                res.status(type).json({ error: `Invalid data: ${message}` });
                break;
        }
    }

    static account(req, res, next)
    {
        if (req.headers['x-account-token'])
        {
            req.account = jwt.verify(decodeURIComponent(req.headers['x-account-token']), process.env.secret)
            next();
        }
        else
        {
            Auth.account_error(res, Http.UNAUTHORIZED);
        }
    }

    static account_error(res, type, id, message)
    {
        switch (type)
        {
            case Http.NOTFOUND:
                res.status(type).json({ error: `User ${id} not found ${message ? message: ''}` });
                break;
            case Http.UNAUTHORIZED:
                res.status(type).json({ error: `Missing x-account-token` });
                break;
            case Http.NOTALLOWED:
                res.status(type).json({ error: `Operation not allowed: ${message}` });
                break;
        }
    }
}

module.exports = 
{ 
    // Error handler middleware for async controller
    asyncHandler : fn => (req, res, next) => {
        return Promise
            .resolve(fn(req, res, next))
            .catch(next);
    },

   logger: (req, res, next) => {

        req._startTime = (new Date);
        var end = res.end;
        res.end = function (chunk, encoding) {
            let responseTime = (new Date) - req._startTime;
    
            res.end = end;
            res.end(chunk, encoding);
            let message = clc.green(`${req.method}`) + ` ${req.url}`;
            if (req.headers['authorization'])
            {
                message += clc.yellow('\nauthorization=')+`${req.headers['authorization']}`;
            }
            if (req.headers['x-user-token'])
            {
                message += clc.yellow('\nx-user-token=')+`${req.headers['x-user-token']}`;
            }
            if (req.headers['x-api-key'])
            {
                message += clc.yellow('\nx-api-key=')+`${req.headers['x-api-key']}`;
            }
            if (req.headers['x-doc-token'])
            {
                message += clc.yellow('\nx-doc-token=')+`${req.headers['x-doc-token']}`;
            }
            switch (Math.floor(res.statusCode / 100))
            {
                case 1: 
                case 2: 
                case 3: 
                    message += clc.green(`\n${res.statusCode}`);
                    break;
                case 4: 
                    message += clc.red(`\n${res.statusCode}`);
                    break;
            }
            message += ` - ${responseTime}ms`;
            console.log(message); 
        }
    
        next();
    },
    Auth: Auth,
    Http: Http
    
}