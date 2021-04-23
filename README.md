Darkroom
========

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

Or you can pass a given salt

```
./support/authed-cli /info/345e73295450e3aaf7d2b7a17258649c salty-salt
```

# Usage

Please refer to the [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

# Deployment

River:

    SALT="{}darkroom-superfantastic-salt{}" NPMOPTS='--production' NODE_ENV=testing PORT=8791 nave use 0.10 support/install.sh testing.darkroom.neverunderdressed.com

    SALT="{}darkroom-superfantastic-salt{}" NPMOPTS='--production' NODE_ENV=staging PORT=7004 nave use 0.10 support/install.sh darkroom.staging.neverunderdressed.com

Sunday World

    SALT="daakwomb-zuperphantaztic-zalt(.)(.)" NPMOPTS='--production' NODE_ENV=testing PORT=8792 nave use 0.10 support/install.sh testing.darkroom.sundayworld.clockhosting.com

    SALT="daakwomb-zuperphantaztic-zalt(.)(.)" NPMOPTS='--production' NODE_ENV=staging PORT=7004 nave use 0.10 support/install.sh darkroom.staging.sundayworld.clockhosting.com

Esquire

    SALT="m00sefacedawg" NPMOPTS='--production' NODE_ENV=testing PORT=8793 nave use 0.10 support/install.sh testing.darkroom.esquireloyalty.clockhosting.com

FIM

    SALT="{}floptastic-beastmother{}" NPMOPTS='--production' NODE_ENV=testing PORT=8794 nave use 0.10 support/install.sh testing.darkroom.fim.clockhosting.com

SunPerks

    SALT="thisIsARand0mNaCl" NPMOPTS='--production' NODE_ENV=testing PORT=8795 nave use 0.10 support/install.sh darkroom.testing.sunperks.clockhosting.com

Dream Team

    SALT="[]dream-periodically-until[]" NPMOPTS='--production' NODE_ENV=testing PORT=8796 nave use 0.10 support/install.sh darkroom.testing.dreamteam.clockhosting.com

Neilsen - Thought Leadership

    SALT="{}darkroom-miles-mile-club{}" NPMOPTS='--production' NODE_ENV=testing PORT=8797 nave use 0.10 support/install.sh darkroom.testing.thoughtleadership.clockhosting.com

NI NewsRetail

    SALT='!_+(^-^)+_!-try-this-in-bash' NPMOPTS='--production' NODE_ENV=staging PORT=7005 nave use 0.10.15 support/install.sh darkroom.staging.newsretail.clockhosting.com
