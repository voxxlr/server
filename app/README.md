# App Server

The __App__ server hosts different Apps and provides a customizable launchpad. When all of the web services are running the launchpad is the first page that appears when logging in via http://127.0.0.1/index.html.

## Accessing the launchpad
Once the __doc__, __app__ and __www__ servers are running the launchpad is also accessible at

http://127.0.0.1:3022/launchpad.html?account={ACCOUNT_TOKEN}&dataset={DATASET_TOKEN}

where

- The optional __ACCOUNT_TOKEN__ identifies the current account. The default api key for that account will be used to access the different Apps in the lauchpad. If no account token is specified then access to the lauchpad will first require a login via the __www__ server.

- The optional __DATASET_TOKEN__ determines a specific dataset. Any App opened via the lauchpad will use the given dataset if it is of the proper datatype. If no document token is specified then most sample Apps will open the document inventory to display all datasets accessible via the given API_KEY. 


## Installing a new App
The following steps are required to create a new App and list it in the launchpad. 

1 define the Frontend in /client/MYAPP/index.thml

2 define the Backendin (optional) /server/routes/MYAPP/server.js

3 register the App in /server/manifest.json

```
"MYAPP": {
	"category": "management",
	"title": "My App",
	"icon": "fa-upload",
	"document": false,
	"tags": true,
	"data": { "tags": [] },
	"tooltip": "<p>Tooltip</p>"
},
```

## Developing a new App
There are several samples Apps under /voxxlr. All are based on a custom library of simple ui componets shown here as well as a set of voxxlr specific componets starting as well as a REST api. 

# Links

Voxxlr provides intfrastrcture to share apps via links which pair an App and Api Key into a single url.
