# API

Note, when running examples for image manipulation, make sure you've uploaded the test files so you've got something to play with.

## **POST /**

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


## **PUT /**

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

  `curl -v -X PUT -H "x-darkroom-key: YOUR_KEY" -F upload=@./test/fixtures/jpeg.jpeg localhost:17999/`


## GET /_health

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


## GET /circle

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


## **GET /info**

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

