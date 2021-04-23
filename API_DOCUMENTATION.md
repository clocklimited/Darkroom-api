# API

## **POST /**

  Creates a number of images on Darkroom. If the image(s) already exist in the backend store, they will not be stored again.

  If you send a single file, you will receive a JSON object with your file's metadata.

  If you send multiple files, you will receive a JSON array with an object per-file containing its metadata.

* **URL**

  `/`

* **Method:**

  `POST`

*  **URL Params**

   **Required:**

   None

   **Optional:**

   None

* **Header Params**

  `x-darkroom-key`, unless configured with `process.env.NO_KEY`.

* **Data Params**

  Content Type should be `multipart/formdata` with appropriate boundary value.
  Form data should include `name=files[]` and `filename=example.jpg`.

* **Success Response:**

  * Single file uploads
    **Code:** 200 <br />
    **Content:**
      ```json
      {
        "id": "1cfdd3bf942749472093f3b0ed6d4f89",
        "type": "image/jpeg; charset=binary",
        "size": 104680
      }
      ```

  * Multi file uploads
    **Code:** 200 <br />
    **Content:**
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
    **Content:**
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


## **PUT /**

  Creates a single image on Darkroom.

* **URL**

  `/`

* **Method:**

  `PUT`

*  **URL Params**

   **Required:**

   None

   **Optional:**

   None

* **Header Params**

  `x-darkroom-key`, unless configured with `process.env.NO_KEY`.

* **Data Params**

  Content Type should be `multipart/formdata` with appropriate boundary value.
  Form data should include `name=files[]` and `filename=example.jpg`.

* **Success Response:**

  * **Code:** 200 <br />
    **Content:**
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
    **Content:**
      ```json
        {
          "code": "NotAuthorized",
          "message": "Forbidden type detected: image/jpeg; charset=binary"
        }
      ```
    **Reason:** You tried to upload a file type not in your `config.upload.allow` list.

* **Sample Call:**

  `curl -v -X PUT -H "x-darkroom-key: YOUR_KEY" -F upload=@./test/fixtures/jpeg.jpeg localhost:17999/`


## GET /_health

  Checks the health of the backend.

* **URL**

  `/_health`

* **Method:**

  <_The request type_>

  `GET`

*  **URL Params**

   **Required:**

   None

   **Optional:**

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
