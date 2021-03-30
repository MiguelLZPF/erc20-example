# Back

I will go straight to the tests

## Test

```bash
# open terminal
cd erc20-example/back
# install node dependencies
npm install
```

### Database and blockchain

```bash
## up mongo and ganache without permanent storage 
docker-compose -f docker-compose-test.yaml up -d
```

### Backend

```bash
npm run start:trace
# wait until contracts are deployed etc
```

### Run Tests

```bash
# on another terminal
npm run test

## to run tests again its needed to remove data on the database
docker-compose -f docker-compose-test.yaml down
docker-compose -f docker-compose-test.yaml up -d
```

## Docker-Compose

`docker-compose up`

## Docker useful commands

### Database MongoDB

```bash
# Download image
$ docker pull mongo
# Run container
$ docker run -d -p 27017:27017 --name mongodb
# Stop container
$ docker stop mongodb
# Start container
$ docker start mongodb
```

### Ganache CLI

```bash
# Run container
$ docker run -d -p 8545:8545 --name ganache-cli trufflesuite/ganache-cli:latest --accounts 2 --secure --port 8545 --gasPrice 0 --gasLimit 9999999999999999
# Stop container
$ docker stop ganache-cli
# Start container
$ docker start ganache-cli
```

## Connection Variables

### Ganache (websockets)

```bash
WEB3_PROTOCOL = "WS"
WEB3_IP = "localhost"
WEB3_PORT = "8545"
WEB3_ROUTE = ""
```
