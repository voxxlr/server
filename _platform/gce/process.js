const fs = require('fs')
const path = require("path");
const yaml = require('js-yaml');

module.exports = (gce) =>
{
    let SB = gce.SB;
    let CP = gce.CP;
    let AUTH = gce.AUTH;

    let processPy = fs.readFileSync(`${__dirname}/process.py`, 'utf8');

    // TODO terminate instances once processing is done

    return {

        listDataset: async (bucket, id) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);

            const [files] = await sb.getFiles({ prefix: "datasets" });
            let list = (files || []).filter(file =>
            {
                return file.name.endsWith("process.yaml")
            })

            list = list.map(file =>
            {
                let path = file.name.split('/');
                return { id: path[1], name: file.metadata.metadata["name"], type: file.metadata.metadata["type"], tags: file.metadata.metadata["tags"] };
            })

            return list;
        },

        createDataset: async (bucket, name, type, tags) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);

            let id = Date.now();

            let file = await sb.file(`datasets/${id}/process.yaml`);
            file.save("dasdasdasd",
                {
                    contentType: "application/yaml",
                    metadata: { metadata: { name: name, type:type, tags } }
                }, (err) => {
                if (err) {
                    console.log("error");
                }
            })

            file = await sb.file(`datasets/${id}/process.py`);
            file.save(processPy, { contentType: "application/text" })

            return id;
        },

        updateDataset: async (bucket, id, metadata) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            let file = await sb.file(`datasets/${id}/process.yaml`);
            file.setMetadata({ metadata });
        },

        deleteDataset: async (bucket, id, name) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            await sb.deleteFiles({ prefix: `datasets/${id}/` });
        },

        listFiles: async (bucket, id) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            const [files] = await sb.getFiles({ prefix: `datasets/${id}` });

            let index = `datasets/${id}/`.length;

            let list = (files || []).map(file => {
               return { path: file.name.substring(index), meta: file.metadata.metadata };
            })

            return list;
        },

        uploadFile: async(bucket, dataset, path) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            let file = sb.file(`datasets/${dataset}/${path}`);

            let url = await file.getSignedUrl({
                version: 'v4',
                action: 'write',
                expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                action: 'resumable',
                contentType: 'application/octet-stream',
            })
            return url[0];
        },

        updateFile: async (bucket, dataset, path, metadata) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            let file = await sb.file(`datasets/${dataset}/${path}`);
            file.setMetadata(metadata);
        }, 

        deleteFile: async (bucket, dataset, path) =>
        {
            let sb = SB.bucket(`voxxlr-${bucket}`);
            await sb.file(`datasets/${dataset}/${path}`).delete();
        },


        startProcess: async (account, bucket, dataset, params) => {

            let sb = SB.bucket(`voxxlr-${bucket}`);
            let config = await sb.file(`datasets/${dataset}/process.yaml`);
            let metadata = (await config.getMetadata())[0];

            [files] = await sb.getFiles({ prefix: `datasets/${dataset}` });
            files = files.filter(file => !file.name.endsWith("process.yaml") && !file.name.endsWith("process.py"))

            // generate process.yaml
            let documents =[]
            let timestamp = Date.now()
            switch(metadata.metadata.type)
            {
                case "cloud":
                    files.forEach(file => {
                        documents.push({
                            type: "cloud",
                            input: {
                                file: [path.basename(file.name)],
                                coords: params.coords,
                                transform: params.transform
                            },
                            process: {
                                resolution: params.resolution,
                                filter: {
                                    voxel: true,
                                    density: params.density,
                                }
                            },
                            output: {
                                directory: timestamp++
                            }
                        })
                    })
                break;
                case "map":
                    entry = {
                        type: "map",
                        input: {},
                        output:
                        {
                            directory: timestamp++
                        }
                    }
                    files.forEach(file => {
                        entry["input"][file.metadata.metadata["type"]] = path.basename(file.name)
                    });
                    documents.push(entry);
                break;
                case "model":
                    files.forEach(file => {
                        if (file.name.endsWith("gltf") || file.name.endsWith("ifc")) {
                            documents.push({
                                type: "model",
                                input: {
                                    file: path.basename(file.name),
                                    coords: params.coords,
                                },
                                output: {
                                    directory: timestamp++
                                }
                            })
                        }
                    })
                break;
                case "panorama":
                    files.forEach(file => {
                        documents.push({
                            type: "panorama",
                            input: {
                                file: path.basename(file.name)
                            },
                            output: {
                                directory: timestamp++
                            }
                        })
                    })
                break;
            }

            // save process.yaml
            let serialized = documents.map(doc => yaml.dump(doc)).join('---\n')
            //console.log(serialized);

            config.save(serialized,
            {
                contentType: "application/yaml",
                metadata: { metadata: metadata.metadata }
            })


            // configue processing script
            let json = {
                "id": documents.map(entry => entry.output.directory),
                "account": account,
                "bucket": bucket,
                "name": metadata.metadata.name,
                "type": metadata.metadata.type,
                "tags": metadata.metadata.tags.split(","),
                "notify": process.env.sendgrid
            }

            // generate startup script
            let script0 =
                `#! /bin/bash
                        curl --request POST --url https://api.sendgrid.com/v3/mail/send --header 'Authorization: Bearer ${process.env.sendgrid}' --header 'Content-Type: application/json' --data '{"personalizations": [{"to": [{"email": "jochen.stier@gmail.com"}]}],"from": {"email": "info@voxxlr.com"},"subject": "${account}","content": [{"type": "text/plain", "value": "Voxxlr - processing started!"}]}'
                        gsutil -m cp -r gs://voxxlr-${bucket}/datasets/${dataset}/ /home/jochen_stier/
                        docker run --name vx-processor -v /home/jochen_stier/${dataset}:/root/processor/data ghcr.io/voxxlr/vx-processor:main
                        source /home/jochen_stier/process/bin/activate
                        python3 /home/jochen_stier/${dataset}/process.py '${JSON.stringify(json)}'
                        `

            documents.forEach(entry => {
                script0 = script0.concat(`gsutil -m -h "Cache-Control:public max-age=3600" -q cp -r -Z /home/jochen_stier/${dataset}/${entry.output.directory}/root gs://voxxlr-${bucket}/${entry.output.directory}/ \n`)
            })

            script0 = script0.concat(`curl --request POST --url https://api.sendgrid.com/v3/mail/send --header 'Authorization: Bearer ${process.env.sendgrid}' --header 'Content-Type: application/json' --data '{"personalizations": [{"to": [{"email": "${account}"}]}],"from": {"email": "info@voxxlr.com"},"subject": "Voxxlr - processing complete","content": [{"type": "text/plain", "value": "${metadata.metadata.name}"}]}' \n`)
            script0 = script0.concat(`shutdown - h now \n`);
            script0 = script0.replace(/  +/g, '');

            let email = await(AUTH.getCredentials()).client_email;
            await CP.insert({
                instanceResource: {
                    name: `vx-${dataset}`,
                    disks: [ {
                            initializeParams: {
                                diskSizeGb: '50',
                                sourceSnapshot: "https://compute.googleapis.com/compute/v1/projects/voxxlr/global/snapshots/vx-processor-new",
                            },
                            autoDelete: true,
                            boot: true,
                            type: 'PERSISTENT',
                        } ],
                    machineType: `zones/us-central1-a/machineTypes/n1-standard-1`,
                    labels: { "bucket": bucket },
                    metadata: {
                        items: [ {
                                key: "startup-script",
                                value: script0
                            }]
                    },
                    serviceAccounts: [ {
                                email,
                                scopes: ["https://www.googleapis.com/auth/cloud-platform"]
                            }],
                    networkInterfaces: [ {
                            accessConfigs: [ {
                                    name: "External NAT",
                                    networkTier: "PREMIUM"
                                }
                            ],
                            network: "projects/voxxlr/global/networks/default",
                            stackType: "IPV4_ONLY"
                        }]
                },
                project: process.env.GCLOUD_PROJECT,
                zone: "us-central1-a"
            })
        },

        getProcess: async (dataset) => {

            let state = { state: "idle" };
            try
            {
                await CP.get({
                    instance: `vx-${dataset}`,
                    project: process.env.GCLOUD_PROJECT,
                    zone: "us-central1-a",
                }).then(response => {
                    state = {
                        created: response[0].creationTimestamp,
                        state: response[0].status
                    };
                })
                .catch(e => {});
            }
            catch (e) {};

            return state;
        },


        deleteProcess: async (dataset) => {

            let state = { state: "undefined" };

            await CP.delete({
                instance: `vx-${dataset}`,
                project: process.env.GCLOUD_PROJECT,
                zone: "us-central1-a",
            }).then(response => {
                state  = {
                    created: response[0].creationTimestamp,
                    state: "deleting"
                };
            })
            .catch(e => {});

            return state;
        }
    }
}