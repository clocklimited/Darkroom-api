# API

Note, when running examples for image manipulation, make sure you've uploaded the test files so you've got something to play with.

## GET /

  Used to retrieve coffee from the server. Use at own peril.

* **URL**

  `/`

* **Method:**

  `GET`

*  **URL Params**

   None

* **Header Params**

   None

* **Data Params**

   None

* **Success Response:**

  * **Code:** 418 <br />
    **Content:** `text/plain` (may also be short and stout)
      ```
      I'm a teapot
      ```

* **Error Response:**

  Does not error. The server has no doubt about its status as a teapot.

* **Sample Call:**

  `curl -v localhost:17999/`

## Upload (multiple)

  Creates a number of images on Darkroom. If the image(s) already exist in the backend store, they will not be stored again.

  If you send a single file, you will receive a JSON object with your file's metadata.

  If you send multiple files, you will receive a JSON array with an object per-file containing its metadata.

* **URL**

  `/`

* **Method:**

  `POST`

*  **URL Params**

   None

* **Header Params**

  `x-darkroom-key`, unless configured with `process.env.NO_KEY`.

* **Data Params**

  Content Type should be `multipart/formdata` with appropriate boundary value.
  Form data should include `name=files[]` and `filename=example.jpg`.

* **Success Response:**

  * Single file uploads
    **Code:** 200 <br />
    **Content:** `application/json`
      ```json
      {
        "id": "1cfdd3bf942749472093f3b0ed6d4f89",
        "type": "image/jpeg; charset=binary",
        "size": 104680
      }
      ```

  * Multi file uploads
    **Code:** 200 <br />
    **Content:** `application/json`
      ```json
      [
        {
          "id": "1cfdd3bf942749472093f3b0ed6d4f89",
          "type": "image/jpeg; charset=binary",
          "size": 104680
        },
        {
          "id": "b055a237334923b3b33e9999cee2bcec",
          "type": "image/png; charset=binary",
          "size": 147532
        }
      ]
      ```

* **Error Response:**

  * **Code:** 403 FORBIDDEN <br />
    **Content:** None <br />
    **Reason:** You did not supply the authentication key `x-darkroom-key`

  OR

  * **Code:** 403 FORBIDDEN <br />
    **Content:** `application/json`
      ```json
      {
        "code": "NotAuthorized",
        "message": "Forbidden type detected: image/jpeg; charset=binary"
      }
      ```
    **Reason:**
      You tried to upload a file type not in your `config.upload.allow` list. <br />
      This will occur with multiple files as well.

* **Sample Call:**

  Single file:
  `curl -v -H "x-darkroom-key: YOUR_KEY" -F upload=@./test/fixtures/jpeg.jpeg localhost:17999/`

  Multi files:
  `curl -v -H "x-darkroom-key: YOUR_KEY" -F upload=@./test/fixtures/jpeg.jpeg -F upload=@./test/fixtures/png.png localhost:17999/`


## Upload (single)

  Creates a single image on Darkroom.

  If successful, you will receive a JSON object with your file's metadata.

* **URL**

  `/`

* **Method:**

  `PUT`

*  **URL Params**

   None

* **Header Params**

  `x-darkroom-key`, unless configured with `process.env.NO_KEY`.

* **Data Params**

  Content Type should be `multipart/formdata` with appropriate boundary value.
  Form data should include `name=files[]` and `filename=example.jpg`.

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `application/json`
      ```json
      {
        "id": "1cfdd3bf942749472093f3b0ed6d4f89",
        "type": "image/jpeg; charset=binary",
        "size": 104680
      }
      ```

* **Error Response:**

  * **Code:** 403 FORBIDDEN <br />
    **Content:** None <br />
    **Reason:** You did not supply the authentication key `x-darkroom-key`

  OR

  * **Code:** 403 FORBIDDEN <br />
    **Content:** `application/json`
      ```json
      {
        "code": "NotAuthorized",
        "message": "Forbidden type detected: image/jpeg; charset=binary"
      }
      ```
    **Reason:** You tried to upload a file type not in your `config.upload.allow` list.

* **Sample Call:**

  `curl -v -X PUT -H "x-darkroom-key: YOUR_KEY" --data-binary "@/path/to/file.png" localhost:17999/`

## Crop

  Create one or many crops for a particular image. Will return an object with keys representing crops containing new image IDs.

* **URL**

  `/crop`

* **Method:**

  `POST`

*  **URL Params**

   None

* **Header Params**

  None

* **Data Params**

  Requires an image ID in `src` and either an array of `crops` or a single object defining one crop.

  ```json
  {
    "crops": [
      {
        "h": 120,
        "w": 300,
        "x1": 0,
        "x2": 300,
        "y1": 85,
        "y2": 205
      },
      {
        "h": 168,
        "w": 300,
        "x1": 0,
        "x2": 300,
        "y1": 0,
        "y2": 168
      }
    ],
    "src": "1cfdd3bf942749472093f3b0ed6d4f89"
  }
  ```

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `application/json`
      ```json
      {
        '0:300:85:205:300:120:1cfdd3bf942749472093f3b0ed6d4f89':
          '8ef22819f51c38d6b5c077bf5d812358',
        '0:300:0:168:300:168:1cfdd3bf942749472093f3b0ed6d4f89':
          '5c1e108fe3561188e67b8c0d77e15bc9'
      }
      ```

* **Error Response:**

  * **Code:** 403 FORBIDDEN <br />
    **Content:** None <br />
    **Reason:** You did not supply the authentication key `x-darkroom-key`

  OR

  * **Code:** 404 NOT FOUND <br />
    **Content:** `application/json`
      ```json
      {
        "code": "ResourceNotFound",
        "message": "Not Found"
      }
      ```
    **Reason:** The image ID provided was not found

  OR

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `application/json`
      ```json
      {
        "code": "BadDigest",
        "message": "<variable message dependant on error location>"
      }
      ```
    **Reason:** The reason for the error will be in the response message

* **Sample Call:**

  `curl -v localhost:17999/crop --data-raw '{"src":"1cfdd3bf942749472093f3b0ed6d4f89","crops":[{"x1":0,"x2":300,"y1":85,"y2":205,"w":300,"h":120},{"x1":0,"x2":300,"y1":0,"y2":168,"w":300,"h":168}]}'`

## Health Check

  Checks the health of the backend.

* **URL**

  `/_health`

* **Method:**

  `GET`

*  **URL Params**

   None

* **Header Params**

  None

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 OK <br />
    **Content:** `"OK"`

* **Error Response:**

  * **Code:** 500 INTERNAL SERVER ERROR <br />
    **Content:** `"ERROR"` <br />
    **Reason:** Backend health check failed

* **Sample Call:**

  `curl -v localhost:17999/_health`

* **Notes:**

  There should definitely be alerting setup using this endpoint.


## Circle

  This endpoint provides images cropped in a circular fashion.

* **URL**

  `/circle/imageId:hash`

* **Method:**

  `GET`

*  **URL Params**

  If no circle params (x0, y0, x1, y1) are provided, the underlying library @clocklimited/darkroom will set default values.

   | Param | Required | Usage |
   |-------|----------|-------|
   | `x0` | No | Forms the X component of the centre of the circle |
   | `y0` | No | Forms the Y component of the centre of the circle |
   | `x1` | No | Forms the X component of the outer edge of the circle |
   | `y1` | No | Forms the Y component of the outer edge of the circle |
   | `width` | No | If set with `height`, will crop the image to this dimension after applying circular mask |
   | `height` | No | If set with `width`, will crop the image to this dimension after applying circular mask |
   | `mode` | No | If set with `width` and `height`, will crop the image using this fill mode |
   | `colour` | No | Sets the colour of the mask, defaults to white. Use hex colour codes, i.e. #9966FF |

* **Header Params**

  None

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `<image data of type specified in Content-Type header>`

* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:** `application/json`
      ```json
      {
        "code": "ResourceNotFound",
        "message": "Not Found"
      }
      ```
    **Reason:** The image ID provided was not found

  OR

  * **Code:** 403 FORBIDDEN <br />
    **Content:** `application/json`
      ```json
      {
        "code": "NotAuthorized",
        "message": "Checksum does not match for action: /circle/"
      }
      ```
    **Reason:** The hash did not match correctly

  OR

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `application/json`
      ```json
      {
        "code": "BadDigest",
        "message": "<variable message dependant on error location>"
      }
      ```
    **Reason:** The reason for the error will be in the response message

* **Sample Call:**

  `curl -v $(./support/authed-cli /circle/1cfdd3bf942749472093f3b0ed6d4f89 -q x0=100 -n)`


## Info

  Retrieves image metadata for provided image ID.

* **URL**

  `/info/imageId:hash`

* **Method:**

  `GET`

*  **URL Params**

  None

* **Header Params**

  None

* **Data Params**

  None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:**
    ```json
    {
      "type": "image/jpeg; charset=binary",
      "size": 104680,
      "lastModified": "2023-05-18T18:05:05.391Z",
      "width": 500,
      "height": 375
    }
    ```

* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:**
      ```json
      {
        "code": "ResourceNotFound",
        "message": "Not Found"
      }
      ```
    **Reason:** The image ID provided was not found

  OR

  * **Code:** 403 FORBIDDEN <br />
    **Content:**
      ```json
      {
        "code": "NotAuthorized",
        "message": "Checksum does not match for action: /info/"
      }
      ```
    **Reason:** The hash did not match correctly

* **Sample Call:**

  `curl -v $(./support/authed-cli /info/1cfdd3bf942749472093f3b0ed6d4f89 -n)`

## Resize

  Resize an image to a specified width and height, with an optional fill mode.

* **Fill Modes**

   | Mode | Effect |
   |------|--------|
   | `fit` | Attempts to resize the image to the provided dimensions according to aspect ratio. The default fill mode. |
   | `stretch` | Stretches image to match provided dimensions, ignoring aspect ratio. You must provide both `width` and `height` if using this mode. |
   | `cover` | Produces an image matching the dimensions, zooming into the image to prevent distortion. |
   | `pad` | Resizes the image to the provided dimensions and adds white padding where necessary. |

* **URL**

  `/width/imageId:hash`
  `/width/height/imageId:hash`
  `/width/height/mode/imageId:hash`

* **Method:**

  `GET`

*  **URL Params**

   | Param | Required | Usage |
   |-------|----------|-------|
   | `width` | Yes | Specifies width of the new image. You can set this to 0 to maintain aspect ratio for a height-only request. |
   | `height` | No | Specifies height of the new image. |
   | `mode` | No | One of `fit`, `stretch`, `cover`, `pad`. |

* **Query Params**

   | Param | Required | Usage |
   |-------|----------|-------|
   | `quality` | No | Specifies quality of the new image (excluded for PNGs). See [here](http://www.graphicsmagick.org/GraphicsMagick.html#details-quality)
   | `gravity` | No | Specifies the direction that the image gravitates, when using some fill modes. See [here](http://www.graphicsmagick.org/GraphicsMagick.html#details-gravity)

* **Header Params**

    None

* **Data Params**

    None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `<image data of type specified in Content-Type header>`

* **Error Response:**
  * **Code:** 404 NOT FOUND <br />
    **Content:** `application/json`
      ```json
      {
        "code": "ResourceNotFound",
        "message": "Not Found"
      }
      ```
    **Reason:** The image ID provided was not found

  OR

  * **Code:** 403 FORBIDDEN <br />
    **Content:** `application/json`
      ```json
      {
        "code": "NotAuthorized",
        "message": "Checksum does not match for action: /circle/"
      }
      ```
    **Reason:** The hash did not match correctly

  OR

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `application/json`
      ```json
      {
        "code": "BadDigest",
        "message": "<variable message dependant on error location>"
      }
      ```
    **Reason:** The reason for the error will be in the response message

* **Sample Call:**

  `curl -v $(./support/authed-cli /100/1cfdd3bf942749472093f3b0ed6d4f89 -n)`
  `curl -v $(./support/authed-cli /100/100/1cfdd3bf942749472093f3b0ed6d4f89 -n)`
  `curl -v $(./support/authed-cli /100/100/fit/1cfdd3bf942749472093f3b0ed6d4f89 -n)`
  `curl -v $(./support/authed-cli /100/800/stretch/1cfdd3bf942749472093f3b0ed6d4f89 -n)`
  `curl -v $(./support/authed-cli /100/800/cover/1cfdd3bf942749472093f3b0ed6d4f89 -n)`
  `curl -v $(./support/authed-cli /100/800/pad/1cfdd3bf942749472093f3b0ed6d4f89 -n)`

## Original / Download

  Get the original image. Optionally, a header can be set to cause a browser to download the file as an attachment.

* **URL**

  `/original/imageId:hash`
  `/download/imageId:hash`
  `/download/imageId:hash/filename`

* **Method:**

  `GET`

*  **URL Params**

    If downloading the image, a filename can be provided. This does not need to be hashed in the URL.

* **Header Params**

    None

* **Data Params**

    None

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `<image data of type specified in Content-Type header>`

* **Error Response:**
  * **Code:** 404 NOT FOUND <br />
    **Content:** `application/json`
      ```json
      {
        "code": "ResourceNotFound",
        "message": "Not Found"
      }
      ```
    **Reason:** The image ID provided was not found

  OR

  * **Code:** 403 FORBIDDEN <br />
    **Content:** `application/json`
      ```json
      {
        "code": "NotAuthorized",
        "message": "Checksum does not match for action: /circle/"
      }
      ```
    **Reason:** The hash did not match correctly

  OR

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `application/json`
      ```json
      {
        "code": "BadDigest",
        "message": "<variable message dependant on error location>"
      }
      ```
    **Reason:** The reason for the error will be in the response message

* **Sample Call:**

  `curl -v $(./support/authed-cli /original/1cfdd3bf942749472093f3b0ed6d4f89 -n)`
  `curl -v $(./support/authed-cli /download/1cfdd3bf942749472093f3b0ed6d4f89 -n)`
  `curl -v "$(./support/authed-cli /download/1cfdd3bf942749472093f3b0ed6d4f89 -n)/foobar"`

## Delete Data

  Delete data stored in the storage backend.

* **URL**

  `/data/:id`

* **Method:**

  `DELETE`

* **URL Params**

   | Param | Required | Usage |
   |-------|----------|-------|
   | `id` | Yes | Specifies the  MD5 of the asset to delete. |

* **Success Response:**

  * **Code:** 204 <br />

* **Sample Call:**

  `curl -IXDELETE localhost:17999/data/544fcb446671c3e1e980ccecd4579b37 -H "x-darkroom-key: key"`

## Delete Cache

  Delete cache stored in the storage backend.

* **URL**

  `/cache/:id`

* **Method:**

  `DELETE`

* **URL Params**

   | Param | Required | Usage |
   |-------|----------|-------|
   | `id` | Yes | Specifies the MD5 of the file whose cache to delete. |

* **Success Response:**

  * **Code:** 204 <br />

* **Sample Call:**

  `curl -IXDELETE localhost:17999/data/544fcb446671c3e1e980ccecd4579b37 -H "x-darkroom-key: key"`

## Blur

  Take a single image and, given a set of masks, blur the image in those areas and return a new asset

* **URL**

  `/blur`

* **Method:**

  `POST`

* **URL Params**

   None

* **Header Params**

  None

* **Data Params**

  Requires an image ID in `src`. Also accepts an array of masks, which if not provided will blur the
  whole image

  To control the amount of blur, add in an extra `blurAmount: 10`

  ```json
  {
    "masks": [
      [
        [0, 100],
        [100, 100],
        [100, 0]
      ]
    ],
    "src": "1cfdd3bf942749472093f3b0ed6d4f89"
  }
  ```

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `application/json`
      ```json
      {
        "src": "1cfdd3bf942749472093f3b0ed6d4f89", // the original src
        "id": "8ef22819f51c38d6b5c077bf5d812358" // the resulting image
      }
      ```

* **Error Response:**

  * **Code:** 403 FORBIDDEN <br />
    **Content:** None <br />
    **Reason:** You did not supply the authentication key `x-darkroom-key`

  OR

  * **Code:** 404 NOT FOUND <br />
    **Content:** `application/json`
      ```json
      {
        "code": "ResourceNotFound",
        "message": "Not Found"
      }
      ```
    **Reason:** The image ID provided was not found

  OR

  * **Code:** 400 BAD REQUEST <br />
    **Content:** `application/json`
      ```json
      {
        "code": "BadDigest",
        "message": "<variable message dependant on error location>"
      }
      ```
    **Reason:** The reason for the error will be in the response message

* **Sample Call:**

  `curl -v localhost:17999/blur --data-raw '{"src":"1cfdd3bf942749472093f3b0ed6d4f89","masks":[[[0, 100],[100, 100],[100, 0]]]}'`
