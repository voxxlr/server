import json
import pycurl
import sys
import os
from pathlib import Path
from io import BytesIO
from google.cloud import datastore
from google.cloud import compute_v1


def sendEmail(email, message, key):

    message = json.dumps({
        "from": { "email":"info@voxxlr.com"},
        "subject":"Upload to Voxxlr",
        "content":[{
            "type":"text/plain",
            "value":message
            }],
        "personalizations":[{
            "to":[{
                "email":email
                }]
            }]
        })

    crl = pycurl.Curl()
    crl.setopt(crl.URL, 'https://api.sendgrid.com/v3/mail/send')
    crl.setopt(pycurl.POST, 1)
    crl.setopt(pycurl.HTTPHEADER, [
        f'Authorization: Bearer {key}',
        'Content-Type: application/json',
        'Content-Length: ' + str(len(message))
        ])
    crl.setopt(pycurl.POSTFIELDS, message)
    crl.perform()
    crl.close()


config = json.loads(sys.argv[1])
#sendEmail("jochen.stier@gmail.com", config["account"], config["notify"])

type = { 
    "cloud": 1,
    "map": 2,
    "panorama": 3,
    "model": 4,
    }

client = datastore.Client()

for datasetId in config["id"]:

    document = datastore.Entity(key=client.key("cloud", -datasetId), exclude_from_indexes=(['root']))
    document["tags"] = config["tags"]
    document["type"] = type[config["type"]]
    document["account"] = config["account"]
    document["bucket"] = config["bucket"]
    document["root"] = open(f'{Path(__file__).parent.absolute()}/{datasetId}/root.json', 'r').read()
    client.put(document)
        
    #create metadata table entry
    meta = datastore.Entity(key=client.key("meta", -datasetId, exclude_from_indexes=(['content'])))
    meta["content"] = json.dumps({ "name": config["name"] })
    client.put(meta)

    
#message = "Hello, your recent upload to Voxxlr has completed processing, and the data set is now accessible in your account. Please let us know about any problems by replying to this email... The Voxxlr Devs"
#sendEmail(config["account"], message, config["notify"])
