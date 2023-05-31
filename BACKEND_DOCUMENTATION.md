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

### Handy Commands

Some commands that may help when working with S3/R2:

You should already have the `S3_ENDPOINT` and `S3_BUCKET` env vars, or just set them in your terminal.

Count number of objects:
```
aws s3 ls "s3://$S3_BUCKET" --endpoint-url $S3_ENDPOINT --recursive | wc -l
```

Delete objects in the bucket (DANGER ZONE):
```
#aws s3 rm "s3://$S3_BUCKET" --endpoint-url $S3_ENDPOINT --recursive
```

List multipart uploads:

```
aws s3api list-multipart-uploads --bucket $S3_BUCKET --endpoint-url $S3_ENDPOINT
```

Abort multipart uploads (needs `jq`):

```
aws s3api list-multipart-uploads --bucket $S3_BUCKET --endpoint-url $S3_ENDPOINT \
| jq -r '.Uploads[] | "--key \"\(.Key)\" --upload-id \(.UploadId)"' \
| while read -r line; do
    eval "aws s3api abort-multipart-upload --bucket $S3_BUCKET --endpoint-url $S3_ENDPOINT $line";
done
```
