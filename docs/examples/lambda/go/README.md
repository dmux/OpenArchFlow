# Go Lambda — MiniStack Example

Runtime: **`go1.x`** (or `provided.al2023` with the same binary)

## Build & package

```bash
# Install dependencies
go mod tidy

# Compile for Linux x86_64 (required by MiniStack/Lambda)
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bootstrap .

# Package
zip function.zip bootstrap
```

For ARM64 (Graviton):
```bash
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o bootstrap .
zip function.zip bootstrap
```

## Deploy to MiniStack

1. Open the Lambda node console in OpenArchFlow
2. **Overview** tab → set runtime to **Go 1.x** (`go1.x`)
3. **Code** tab → upload `function.zip`
4. **Overview** tab → **Invoke** with any JSON payload

## Test locally (without MiniStack)

```bash
go run main.go
# Invoke via the Lambda Runtime Interface Emulator (RIE):
# docker run --rm -v $(pwd):/var/task public.ecr.aws/lambda/go:1 bootstrap
```

## Writing to S3 from this Lambda

```go
import (
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

cfg, _ := config.LoadDefaultConfig(ctx,
    config.WithBaseEndpoint(os.Getenv("AWS_ENDPOINT_URL")),
)
client := s3.NewFromConfig(cfg, func(o *s3.Options) {
    o.UsePathStyle = true
})
client.PutObject(ctx, &s3.PutObjectInput{
    Bucket: aws.String("my-bucket"),
    Key:    aws.String("output.json"),
    Body:   strings.NewReader(`{"ok":true}`),
})
```

Add to `go.mod`:
```
require (
    github.com/aws/aws-sdk-go-v2 v1.30.0
    github.com/aws/aws-sdk-go-v2/config v1.27.0
    github.com/aws/aws-sdk-go-v2/service/s3 v1.55.0
)
```
