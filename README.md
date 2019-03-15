# realm
The game server for NamelessMMO

## Developing

### Requirements

* Golang 1.12+
* npm 6.4.1+
* A modern browser

### Install Dependencies

1. Run `go mod download`
1. Run `npm install`

### Run

1. To run the game server use `make run-realm`
1. To build the webclient run `make build-webclient`
1. Navigate in your browser to `http://localhost:8080`


## TODO

- [ ] Player Login
    * Need a player login method at least just a player name to start out with
- [ ] Create a tilesheet
    * Current tilesheet is from https://opengameart.org/content/browserquest-sprites-and-tiles
- [ ] Character sprites
    * Currently all characters are just green blobs
- [ ] Interface
    * There are no interfaces currently
- [ ] Tons of other stuff
    * Everything else we are missing