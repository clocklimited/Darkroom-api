# Backend Documentation

## MongoDB

Using the mongo backend requires MongoDB >4. Simply provide the database URL in the config and set the backend to `mongo`.

## S3

You can use any S3-compatible backend - only S3 and R2 have been tested. The backend needs to support metadata - but otherwise any should work!

In the config, set the backend to `S3`, and provide the necessary information.

The permissions your key requires are:
 - ListBucket
 - GetObject
 - DeleteObject
 - PutObject
 - CreateBucket (to automatically create the bucket on start up, or you can create it yourself)

You need to provide to Darkroom:
 - `accessKeyId`
 - `secretAccessKey`
 - `region`
 - `bucket`
 - `endpoint` - if you are not using AWS

### R2

For R2, you must [generate an S3 auth token](https://developers.cloudflare.com/r2/api/s3/tokens/). It will require the `Edit` level of permissions

The endpoint URL will be `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

`region` config option will be ignored - leave undefined.
