# Back

## Docker-Compose

`docker-compose up`

## Docker

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
$ docker run -d -p 8545:8545 --name ganache-cli trufflesuite/ganache-cli:latest --accounts 2 --secure --port 8545 --gasPrice 0 --gasLimit 9999999999999999 --hardfork byzantium
# Stop container
$ docker stop ganache-cli
# Start container
$ docker start ganache-cli
```

## Connection Variables

### Alastria (websockets)

```bash
WEB3_PROTOCOL = "WS"
WEB3_IP = ""
WEB3_PORT = "8546"
WEB3_ROUTE = ""
```

### Ganache (websockets)

```bash
WEB3_PROTOCOL = "WS"
WEB3_IP = "localhost"
WEB3_PORT = "8545"
WEB3_ROUTE = ""
```
