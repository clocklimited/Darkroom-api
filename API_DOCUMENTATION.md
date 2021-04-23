# API

Default response will be either an (301 to an image / JSON object pointing to a resource)

## **POST /**

  Creates a single image on Darkroom.

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

  `curl -v -H "x-darkroom-key: YOUR_KEY" -F upload=@./test/fixtures/jpeg.jpeg localhost:17999`

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
