
const fs = require('fs');

module.exports = () =>
{
    /*
    process.env.ROOT_DIR = 
    let processPy = fs.readFileSync(`${process.env.ROOT_DIR}/process.py`, 'utf8');

    process.env.GCLOUD_PROJECT = JSON.parse(process.env.GCLOUD_KEY)["project_id"];
    fs.writeFileSync('./key.json', process.env.GCLOUD_KEY);
    AUTH = new GoogleAuth({ keyFile: './key.json', scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

    SB = new Storage({ authClient: AUTH });
    DS = new Datastore({ authClient: AUTH });
    CP = new Compute.InstancesClient(AUTH);

    return { CP, DS, SB, AUTH }
    */
    return {  }
}