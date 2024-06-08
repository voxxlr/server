# Running in the Google Cloud

In order to run Voxxlr in the cloud, registered domain names and compute instances are required. Each instance must have docker installed

```
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh
sudo usermod -aG docker $USER
```

## Setting up the vx-server

### Step1
Add A records for 

- DOMAIN.com 
- doc.DOMAIN.com 
- app.DOMAIN.com 
- www.DOMAIN.com

### Step2
Start a compute instance and copy the files 

- docker-compose.yaml  
- nginx.conf 

from _deploy/gce as well as the 
- __.env__ 

file into the users home directory.

### Step3

Get ssh cetificates for the first time

```
docker compose run certbot certonly  --manual --preferred-challenges dns -d DOMAIN.com -d www.DOMAIN.com -d app.DOMAIN.com -d doc.DOMAIN.com
chmod -R 777 ./certbot
```

Renew ssh certificates every 3 months

```
docker compose run --rm certbot renew
```

### Step 4

Start the doc, app and www web services

```
docker compose up
```

The home page can now be reached at http://DOMAIN.com. 

## Setting up the vx-processor

### Step1
Start a Compute instance with docker installed and pull the server image from gitbub


```
//echo {GITHUBKEY} | docker login ghcr.io -u {GITHUBUSER} --password-stdin
docker pull ghcr.io/voxxlr/vx-processor:main
```

### Step2

Install python

```
sudo apt update
sudo apt install python3-pip
sudo apt install python3.11-venv

sudo python3 -m venv process
sudo chmod -R 0777 process

source process/bin/activate

pip install pycurl
pip install --upgrade google-cloud-storage
pip install --upgrade google-cloud-datastore
pip install --upgrade google-cloud-compute
```

### Step3

Create a snap short called _vx-processor_. The same same name will be used in source file __platform/gce/process.js_ to instantiate a processor for a specific dataset.

