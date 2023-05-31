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

`region` config option will be ignored - leave undefined or set to `auto`.

### Handy Commands

Some commands that may help when working with S3/R2:

You may already have the `S3_ENDPOINT` and `S3_BUCKET` environment variables, if not just set them in your terminal.

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

## Migration

There are two migration scripts usable depending on your current backend.

For extremely legacy systems, `./support/migration/fs-to-s3.js` is available to go straight from a filesystem based darkroom to S3. No support is provided to go from FS -> MongoDB.

For newer systems, `./support/migration/mongodb-to-s3.js` is available to migrate from MongoDB to S3.

Both these scripts support "resuming", so if you do a partial migration then you will be able to continue as required.

You need to populate `locations.js` when running the scripts, as they both use this for the right information about data transfer locations etc.
