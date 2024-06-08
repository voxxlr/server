const express = require('express')
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken')

module.exports =  (ACCOUNT) =>
{
	let authorize = async (email) =>
	{
		const LOGIN_CALLBACK = "<!DOCTYPE><html lang='en'><head><script>window.onload = function(e) { window.opener.postMessage(JSON, '*'); window.close(); }</script></head><body></body></html>";

		return LOGIN_CALLBACK.replace("JSON", JSON.stringify({
			"action": "login",
			"token": jwt.sign({ p: "W", t: Date.now(), i: email }, process.env.secret)
		}))
    }

	const router = express.Router()

	router.get('/google', async (req, res, next) =>
    {
        let auth = JSON.parse(process.env.login)["google"];
        
        const oauth2 = new OAuth2Client(auth.client_id, auth.client_secret, auth.redirect_uri);
		let email = null;

		let idToken;
		if (req.query.code)
		{
			idToken = await oauth2.getToken(req.query.code)
		}
		else
		{
			idToken = req.params.token;
		}

		if (idToken)
		{
			let ticket = await oauth2.verifyIdToken({ idToken: idToken.tokens.id_token });
			if (ticket)
			{
				const payload = ticket.getPayload();
				email = payload['email'];

                let account = await ACCOUNT.get(email);
				if (account)
				{
					res.send(await authorize(email))
				}
				else next();
			}
			else next();
		}
		else next();
	});

    router.get('/noauth', async (req, res, next) => {

        let auth = JSON.parse(process.env.login);

        if (auth.hasOwnProperty("noauth") && req.query.client_id == auth.noauth.client_id)
        {
            let account = await ACCOUNT.get(req.query.client_id);
            if (account)
            {
                res.send(await authorize(req.query.client_id))
            }
            else
            {
                await ACCOUNT.create(req.query.client_id)
                res.send(await authorize(req.query.client_id))
            }
        }
        else next();
    });


	return router;
}