# Voxxlr Server
This repository contains the cloud application hosted at https://www.voxxlr.com. Follow the instructions below to run the application locally or deploy it in the cloud. At this time, a Google Cloud project it still required either way in order to provide the necessary Datastore, Cloud Storage and Compute Engine resources. Support for different cloud platforms as well as an entirely standalone version are under development. 

Note that the Voxxlr server provides infrastructure to maintian datasets and serve Apps. The Voxxlr __processor__ is required to convert datasets into the neccessary native streaming format. 

## Getting started
After cloning this repo, create a .env file containing the necessary domain names as well as Google Cloud access keys. Rename the .env.example to .env and replace the missing values. 

#### GCLOUD_KEY
A _service account_  key for a Google Cloud project where the to store persistent data and process data sets. Copy the content of the keyfile obtained via the google cloud console into the appropriate fields. Note that the service account requires permission to access the Datastore, Cloud Storage and Compute Engine Apis.

#### ACCOUNT_EMAIL
Provide a user id for an unauthenticated login. If the user does not exist, a new account is automatically created. Note that this not a secure login. The .env file also contains an example on how to configure an authenticated "Google Signin" which requires a client id, secrect and redirect url for a Google App ID.

## Running the web services via a vscode

The project is configured for development in vscode via a dev container. Simply open the root in vscode as a dev container and "Launch All" under the run configurations. The home page can then be reached at

http://127.0.0.1/


## Overview of this repo

#### /doc, /app, /www
The [__doc__](./doc/README.md), 
[__app__](./app/README.md) and  [__www__](./www/README.md) directories contain separate web services running individual nodejs/express web servers each with their own domain names or port. Each directory contains a corresponding Dockerfile.

#### /_deploy
Contains docker-compose and nginx files for different deployments. Currently supported are

- [Local Machine](./_deploy_/local/README.md)
- [Google cloud](./_deploy_/gce/README.md)


#### /_platform

Contains implementations of the interfaces required for data storage and compute infrastructure. Currently only the Google Cloud is fully supported. A local deployment platform which will run entirely offline is under development.

## License
The Voxxlr App SDK is licensed under the Affero GPL V3 license.