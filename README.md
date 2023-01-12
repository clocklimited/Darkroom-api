Darkroom API
============

An image manipulation service.

Authentication between services and client will be achieved by using Oauth. This will allow each request to be tied to a specific user account allowing per client granularity.

# Installation
## Mac OS X 10.8
    # Install X11 from here: http://xquartz.macosforge.org/
    git clone git@github.com:clocklimited/Darkroom-api.git
    cd Darkroom-api
    nave usemain 0.10.40
    brew install gm gifsicle
    npm install

## Ubuntu
    sudo apt-get install graphicsmagick gifsicle
    git clone git@github.com:clocklimited/Darkroom-api.git
    cd Darkroom-api
    npm install

### The following needs to be ran before darkroom is started each time.

    export PKG_CONFIG_PATH='/usr/local/lib/pkgconfig'
    export LD_LIBRARY_PATH='/usr/local/lib':$LD_LIBRARY_PATH

# Development machine setup
You need to create a `locations.js` file using `locations.js.tpl` as a template.
Replace the placeholders with sensible values e.g.:

```
module.exports =
{ data: './data'
, cache: './cache'
, salt: 'salt'
, key: 'key'
, databaseUri: 'mongodb://localhost:27017/darkroom'
}
```

Make sure you have those directories created: `mkdir ./{data,cache}`
Start the application: `npm start | bunyan`

Update the properties in the application you're working on to talk to your local darkroom:

```
, darkroomApiUrl: 'http://0.0.0.0:17999'
, adminDarkroomApiUrl: 'http://0.0.0.0:17999'
, darkroomSalt: 'salt'
, darkroomKey: 'key'
```

# CLI Tool

You can generate a hashed URL from the CLI using

```
./support/authed-cli /info/345e73295450e3aaf7d2b7a17258649c
```

Check usage information for further customisation:

```
./support/authed-cli --help
```

# Usage

Please refer to the [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
