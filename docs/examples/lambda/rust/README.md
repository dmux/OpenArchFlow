# Rust Lambda — MiniStack Example

Runtime: **`provided.al2023`**

## Prerequisites

```bash
# Install Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add musl target for fully static binaries (recommended for Lambda)
rustup target add x86_64-unknown-linux-musl

# macOS: install musl cross-compiler
brew install filosottile/musl-cross/musl-cross
# or: cargo install cross --git https://github.com/cross-rs/cross
```

## Build & package

### Option A — cross (easiest, works on any OS)

```bash
cargo install cross --git https://github.com/cross-rs/cross
cross build --release --target x86_64-unknown-linux-musl
cp target/x86_64-unknown-linux-musl/release/bootstrap .
zip function.zip bootstrap
```

### Option B — native Linux

```bash
cargo build --release --target x86_64-unknown-linux-musl
cp target/x86_64-unknown-linux-musl/release/bootstrap .
zip function.zip bootstrap
```

### Option C — ARM64 (Graviton)

```bash
rustup target add aarch64-unknown-linux-musl
cross build --release --target aarch64-unknown-linux-musl
cp target/aarch64-unknown-linux-musl/release/bootstrap .
zip function.zip bootstrap
```

## Deploy to MiniStack

1. Open the Lambda node console in OpenArchFlow
2. **Overview** tab → set runtime to **Custom (provided.al2023)**
3. **Code** tab → upload `function.zip`
4. **Overview** tab → **Invoke** with any JSON payload

## Writing to S3 from this Lambda

Add to `Cargo.toml`:
```toml
[dependencies]
aws-config = { version = "1", features = ["behavior-version-latest"] }
aws-sdk-s3 = "1"
```

```rust
use aws_config::BehaviorVersion;
use aws_sdk_s3::Client;

let config = aws_config::defaults(BehaviorVersion::latest())
    .endpoint_url(std::env::var("AWS_ENDPOINT_URL").unwrap_or_default())
    .load()
    .await;

let s3 = Client::new(&config);
s3.put_object()
    .bucket("my-bucket")
    .key("output.json")
    .body(r#"{"ok":true}"#.as_bytes().to_owned().into())
    .send()
    .await?;
```
