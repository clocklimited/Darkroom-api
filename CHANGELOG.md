# CHANGELOG

## Version 12.1.2

Improve migration scripts (no functional changes).

## Version 12.1.1

Correct release for 12.1.0

## Version 12.1.0

/info/ calls now return metadata: size, lastModified, type.

/info/ calls now support non-image entities.

## Version 12.0.1

Patch release to fix python dependency in Docker images.

## Version 12.0.0

Node 18 - support for any versions except this is no longer supported.

Support for S3-compatible backends! :tada:

Please refer to the [backend documentation](./BACKEND_DOCUMENTATION.md) on how to set this up.

## Version 11.2.0

Passes concurrency options to Darkroom

## Version 11.1.0

Adds/update Dockerfile

## Version 11.0.0

Migrates Resize and Crop to use Sharp (libvips) instead of GraphicsMagick.

## Version 10.1.0

Exposes gravity option for resize.

## Version 10.0.0

Adds /\_version endpoint
Fixes and improves custom response formats

## Version 9.1.0

Adds deletion endpoints for data and cache.

## Version 9.0.0

Blur is now much faster and only offers a gaussian blur

## Version 8.1.1

Fixes wrong dependency reference

## Version 8.1.0

Adds quality querystring parameter to resize
Adds blurring of images

## Version 8.0.0

Almost complete re-write of the project including many improvements to the code, replacement of restify for express, and bugfixes.

Please see [the upgrade PR](https://github.com/clocklimited/Darkroom-api/pull/65) for more information.

One BREAKING change has been implemented so a small change is required to the CMS, which [you can see here](https://github.com/clocklimited/Contagious/commit/7df240458cad8882d6b7067814f84f110bd2fef3)

```diff
diff --git a/components/admin/asset/models/image.js b/components/admin/asset/models/image.js
index 3f703fb06e..fbf5aef78e 100644
--- a/components/admin/asset/models/image.js
+++ b/components/admin/asset/models/image.js
@@ -66,6 +66,7 @@ module.exports = BaseModel.extend({
       type: 'POST',
       url: url,
       data: JSON.stringify(data),
+      headers: { 'x-darkroom-key': config.darkroom.key },
       success: this.cropsReceived,
       context: this,
       error() {
```

## Version 7.5.0

Renames `fill` to `pad` and adds transparency.

## Version 7.4.0

Add `fill` resize mode.

## Version 7.3.0

Add ability to download a remote image for resizing

## Version 7.1.0

Keeps PNGs lossless when being transcoded to WebP.

## Version 7.0.2

Enables WebP support by default.

## Version 7.0.1

This version adds support for optimised animated gifs using the `gifsicle` software package

As a result, both darkroom and darkroom-api now require Gifsicle 1.91 or later for full functionality.

Without it, you will be unable to process any gifs uploaded to darkroom

## Version 6.8.0

Adds a new `/download` endpoint to ensure the correct headers are sent to force a browser to download a file

## Version 6.7.0

Adds a fix for the `/original` endpoint to ensure the correct cache headers are present

## Version 6.6.3

Adds a fix for the `/original` endpoint, where meta headers would be sent _after_ the file has begun sending.

## Version 6.6.2

Adds a fix for a `Not Found` issue on the `/info` endpoint.

## Version 6.6.1

Adds a fix for the `clustered` module ignoring the environment variable `API_PROCESSES`.

## Version 6.6.0

Adds the ability to request different response formats. The file name extension is used as the desired format. The `allowedResponseFormats` configuration property sets what formats are allowed. If the extension does not match one of these formats, then the image will be returned in its uploaded format.

This feature could be used to increase CPU load. This needs to/will be resolved in a future version.

## Version 6.5.0

Now has the ability to white list upload file types. To only allow png and jpg add the following to the config.

```js
{
  upload: {
    allow: ['image/png', 'image/jpeg', 'image/pjpeg']
  }
}
```

Leaving upload/allow empty will allow any filetype to be uploaded.

```js

{ upload: { allow: [] }
// or
{ upload: {} }
```

WARNING: Allowing any filetype to be upload may allow XSS vulnerabilities to be exposed on sites using darkroom.

{ upload: { allow: [ 'image/png', 'image/jpeg', 'image/pjpeg' ] } }

## Version 6.0.0

Major refactor to include a GridFS backend option.

This also drops the { src: 'HASH'} from upload responses. It has always been the same as `id`, so was removed.

If you want to use a mongo backend, set `databaseUri` in `locations.js`, otherwise set it to `false`.

```
'databaseUri': 'mongodb://localhost:27017/darkroom'
```

## Version 5.0.0

Adds circle support

## Version 4.0.0

As of v4.0.0 darkroom and darkroom-api require GraphicsMagick 1.3.20+ to work correctly.

It will still mostly work with GraphicsMagick 1.3.18+ but the resize({ mode: 'fit '}) will not work due to this [#36](https://github.com/clocklimited/Darkroom-api/issues/36)

v4 will not work well with GraphicsMagick pre 1.3.18

## Version 3.0.0

Changes the folder structure and naming of images when uploaded and cropped.

With the previous convention of `data/<hash>/image` on **ext3** you have a maximum limitation of 32k images and crops within `data/`. This is not so much an issue on **ext4** but eventually performance will degrade.

Version 3.0.0 changes the folder structure to `data/<3 char hash>/<hash>` meaning that `data/` will have a maximum of 4096 sub directories.

By using the image hash for the name means that less sub directories need to be created which is an improvement gain on disk usage and memory.

## Upgrading Darkroom on a Site

### From a keyless version to 2.1.0

1.  Add a property for darkroomKey to your properties.js (or config.js)
2.  Add that property to admin-properties.js
3.  Update asset/lib/file-uploader.js `$el.fileupload(` to include an extra property in the options it is passed.

        , beforeSend: function(xhr) {
            xhr.setRequestHeader('x-darkroom-key', properties.darkroomKey);
          }

### From < 2.1.0 to 3.0.0

1. follow the instructions on upgrading **from an older version to 2.1.0**
2. follow the instructions on upgrading **from version 2.1.0 to 3.0.0**

### From version 2.1.0 to 3.0.0

1. Stop darkroom.
2. Run the 2.1 to 3.0 migration script, `support/upgrade-scripts/2.1.0-to-3.0.0.sh`. Please check you have passed all necessary options.

This script will move files from `data/<hash>/image` to `data/<first 3 digits of hash>/<hash>`. E.g `data/ef5c9d3b6a62e566536b439ebca9f952/image` to `data/ef5/ef5c9d3b6a62e566536b439ebca9f952`

Please note: **This step is irreversible once run**

This script should be executed by someone can run sudo to modify the file ownership, as changing file ownership can cause Darkroom to break when it tries to update an existing file. This step will be attempted at the end of the script.

This may take some time to complete due to the volume of disk IO required. The script will automatically `ionice` itself to de-prioritise its operations to permit other system functions to continue normally.

Running without options or with `-h` will show the usage message.

3. Start darkroom.

## Version 2.1.0

Introduces significant changes to how resize works, allowing for modes to be supplied, e.g `fit`, `stretch` or `cover`
