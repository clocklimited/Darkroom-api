# Backend Documentation

## MongoDB

Using the mongo backend requires MongoDB >4. Simply provide the database url in the config and set the backend to `mongo`.

## S3

You can use an S3-compatible backend.

In the config, set the backend to S3, and provide the necessary information.

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
