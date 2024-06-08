const { Storage } = require('@google-cloud/storage');
const { Datastore } = require('@google-cloud/datastore');
const { GoogleAuth } = require('google-auth-library');
const Compute = require('@google-cloud/compute').v1

const fs = require('fs');

module.exports = () =>
{
    // use file here until this works
    //AUTH = new GoogleAuth()
    //AUTH.fromJSON(JSON.parse(process.env.GCLOUD_KEY));
    process.env.GCLOUD_PROJECT = JSON.parse(process.env.GCLOUD_KEY)["project_id"];
    fs.writeFileSync('./key.json', process.env.GCLOUD_KEY);
    AUTH = new GoogleAuth({ keyFile: './key.json', scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

    SB = new Storage({ authClient: AUTH });
    DS = new Datastore({ authClient: AUTH });
    CP = new Compute.InstancesClient(AUTH);

    return { CP, DS, SB, AUTH }
}