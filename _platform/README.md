# Platforms

Contains implementations of the interfaces required for data storage and compute infrastructure. Currently only the Google Cloud is fully supported using the Google Cloud _Datstore_, _Storage_ and _Compute Engine_ APIs. 


#### auth.js
Authenticates the applicaiton and connects to data storage, files storage and compute services. 

#### account.js
Manages user accounts and files storage.

#### dataset.js
Provides access to the supported data types, i..e point clouds, maps etc. The web viewer will request a url 

#### meta.js

#### key.js
Manages API keys that define data access rules. Most REST calls that retrieve and manipuilate dataset require API keys.

#### link.js
Manages predefined urls that combine Apps and APP key into a customized view of the data in an account. 

#### process.js
