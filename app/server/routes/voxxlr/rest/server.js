const express = require('express')
const fs = require('fs')
const mustache = require("mustache");
const { Auth, asyncHandler } = require('#common');
const jwt = require('jsonwebtoken')

module.exports = (KEY) =>
{
    const router = express.Router()

    router.get('/doc.yaml',  [Auth.key2, Auth.doc] , asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let html = fs.readFileSync(`${__dirname}/doc.yaml`, 'utf8');
        res.type('yaml')
        res.send(mustache.render(html, {  doc_domain: process.env.doc_domain, 
                                          account: jwt.sign({ p: "W", t: Date.now(), i: key.account }, process.env.secret), 
                                          key: req.key, 
                                          dataset: req.headers['x-doc-token'], 
                                          id: req.doc.i }));        
    }))

    router.get('/app.yaml', [Auth.key2, Auth.doc], asyncHandler(async (req, res, next) =>
    {
        let key = await KEY.get(req.key);
        let html = fs.readFileSync(`${__dirname}/app.yaml`, 'utf8');
        res.type('yaml')
        res.send(mustache.render(html, {  app_domain: process.env.app_domain, 
                                          account: jwt.sign({ p: "W", t: Date.now(), i: key.account }, process.env.secret),
                                          key: req.key, 
                                          dataset: req.headers['x-doc-token'], 
                                          id: req.doc.i  }));        
    }))


    return router;
}

