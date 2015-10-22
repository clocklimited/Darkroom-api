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
    brew install gm
    npm install

## Ubuntu
    sudo apt-get install graphicsmagick
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


# Version 6.0.0

Major refactor to include a GridFS backend option.

This also drops the { src: 'HASH'} from upload responses. It has always been the same as `id`, so was removed.

If you want to use a mongo backend add `databaseUri` to `config.js`

```
'databaseUri': 'mongodb://localhost:27017/darkroom'
```

# Version 5.0.0

Adds circle support

# Version 4.0.0

As of v4.0.0 darkroom and darkroom-api require GraphicsMagick 1.3.20+ to work correctly.

It will still mostly work with GraphicsMagick 1.3.18+ but the resize({ mode: 'fit '}) will not work due to this [#36](https://github.com/clocklimited/Darkroom-api/issues/36)

v4 will not work well with GraphicsMagick pre 1.3.18

# Version 3.0.0
Changes the folder structure and naming of images when uploaded and cropped.

With the previous convention of `data/<hash>/image` on **ext3** you have a maximum limitation of 32k images and crops within `data/`. This is not so much an issue on **ext4** but eventually performance will degrade.

Version 3.0.0 changes the folder structure to `data/<3 char hash>/<hash>` meaning that `data/` will have a maximum of 4096 sub directories.

By using the image hash for the name means that less sub directories need to be created which is an improvement gain on disk usage and memory.

# Upgrading Darkroom on a Site
## From a keyless version to 2.1.0

1. Add a property for darkroomKey to your properties.js (or config.js)
2. Add that property to admin-properties.js
3. Update asset/lib/file-uploader.js `$el.fileupload(` to include an extra property in the options it is passed.

        , beforeSend: function(xhr) {
            xhr.setRequestHeader('x-darkroom-key', properties.darkroomKey);
          }

## From < 2.1.0 to 3.0.0
1. follow the instructions on upgrading **from an older version to 2.1.0**
2. follow the instructions on upgrading **from version 2.1.0 to 3.0.0**

## From version 2.1.0 to 3.0.0
1. Stop darkroom.
2. Run the 2.1 to 3.0 migration script, `support/upgrade-scripts/2.1.0-to-3.0.0.sh`. Please check you have passed all necessary options.

  This script will move files from `data/<hash>/image` to `data/<first 3 digits of hash>/<hash>`. E.g `data/ef5c9d3b6a62e566536b439ebca9f952/image` to `data/ef5/ef5c9d3b6a62e566536b439ebca9f952`

   Please note: **This step is irreversible once run**

   This script should be executed by someone can run sudo to modify the file ownership, as changing file ownership can cause Darkroom to break when it tries to update an existing file. This step will be attempted at the end of the script.

  This may take some time to complete due to the volume of disk IO required. The script will automatically `ionice` itself to de-prioritise its operations to permit other system functions to continue normally.

 Running without options or with `-h` will show the usage message.

3. Start darkroom.

# Version 2.1.0
Introduces significant changes to how resize works, allowing for modes to be supplied, e.g `fit`, `stretch` or `cover`

# API

Default response will be either an (301 to an image / JSON object pointing to a resource)

## POST /

Creates an image on Darkroom.

### Body
Should be a multipart file upload.

### Response

     { "src": "1f20d81417d7b267b27d660b59a061d5", "id": "1f20d81417d7b267b27d660b59a061d5" }

## POST /composite

Creates a composite image - mainly used to watermark images

### Body

`baseSrc` - Image ID of the base image.
`topSrc` - Image ID of the image you wish to overlay on     top of the base image.
`opacityPercentage` - Opacity percentage of the overlaid image

    {"baseSrc": "99a597ad07d9fd8ffbea1b92384c2652", "topSrc": "b4f2c51d3397ec70921e4d3961f53a79", "opacityPercentage": "25"}

### Response

    {"compositeSrc":"b4f0923edb9c89c69d1ef5a4ceb2c263"}

### Body

`src` - URL of image to manipulate, or send as multipart form data.

`sizes` - An array of sizes to return, dimensions cannot be larger than the source image.

    { "src": "http://tomg.co/image.png"
    , "sizes":
      [ { w: 200
        , h: 400
        }
      , [100, 200]
      , [50] // keeps aspect ratio
      ]
    }

### Response

    { "200x400": "51aca1f496317c0d2b475768c9303de3"
    , "100x200": "51aca1f496317c0d2b475768c9303de3"
    , "50": "51aca1f496317c0d2b475768c9303de3"
    }

### GET /{width}/{height}/{imageurl}
or
### GET /{width}/{imageurl}

With height being optional. This will return a (301 to an image / link to a CDN hosted version in a JSON structure)

## GET /{imageurl}
or
## GET /optimise/10/{imageurl}
## GET /optimize/10/{imageurl}

This returns with a default optimisation to an image at a specified level from 0-7, 4 being a default and 10 is the most aggressive however more likely to cause artefacts.

Optimisation level (0-10), default of 4.

### Request

    { "src": "http://tomg.co/image.png"
    , "level": 2
    }

### Response

    { "image": "http://darkroom.io/opt/2/100x200_image.png"
    }


## GET /original/{imageurl}

Returns the original image

## GET /info/{imageurl}

Returns the original images meta information.

### Response

    { "width": "1200"
    , "height": "1500"
    }

## POST /crop/{imageurl}

This will preform a manual crop on image using the specified coordinates, for a width and height.

`sizes` - An array of sizes to return, dimensions cannot be larger than the source image.

`sizes.crops` - An object containing the coordinates of the crop to be made. Coordinates are relative to the original image.

### Request

    { "src": "http://tomg.co/image.png"
    , crops: [
          { x1: 10
          , x2: 100
          , y1: 100
          , y2: 100
          , w: 100 // relation to original image
          , h: 200 // ""           ""
          }
        ]
    }

### Response

    { "200x400": "51aca1f496317c0d2b475768c9303de3"
    , "100x200": "51aca1f496317c0aaaa75768c9303f5c"
    }

## GET /

Darkroom.io site.


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
