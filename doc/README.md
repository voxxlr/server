# Document Server

The __doc__ service provides access to datasets, meta data, tokens and keys. 

## Api Keys and Document Tokens

Most of the REST calls to the _doc_ server require an API_KEY, which define the user account and scope of datasets that can be accessed. Document
specific REST calls require a DOCUMENT_TOKEN which identifies a specific dataset. 

## Inlined or external source. 

The repository contains three index.html files
```
client/1d/index.html
client/2d/index.html
client/3d/index.html
```

which contain the viewers for different datatypes. Each _index.html_ files references external scripts which are inlined and minimized using the _build script_.

```
cd client/_build
npm install
node build.js
```

The build script generates additional _*.min.html_ files where external scrips are inlined and minimized.  

```
client/1d/index.min.html
client/2d/index.min.html
client/3d/index.min.html
```

Starting the _doc_ server with __inline__ or __external__ determines which version of the files is used. Search the docker-compose.yaml for line

```
command: inline
```

## License
The Voxxlr _doc_ SDK is licensed under the Affero GPL V3 license.

