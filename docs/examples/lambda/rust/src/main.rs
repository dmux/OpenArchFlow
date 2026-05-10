use lambda_runtime::{run, service_fn, tracing, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
struct Event {
    key: Option<String>,
    #[serde(rename = "httpMethod")]
    http_method: Option<String>,
    path: Option<String>,
    body: Option<String>,
    headers: Option<HashMap<String, String>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Response {
    status_code: u16,
    headers: HashMap<String, String>,
    body: String,
}

async fn function_handler(event: LambdaEvent<Event>) -> Result<Response, Error> {
    tracing::info!("Event: {:?}", event.payload);

    let region = std::env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string());

    let payload = json!({
        "message": "Hello from Rust Lambda on MiniStack",
        "region": region,
        "key": event.payload.key,
        "method": event.payload.http_method,
        "path": event.payload.path,
    });

    let mut headers = HashMap::new();
    headers.insert("Content-Type".to_string(), "application/json".to_string());

    Ok(Response {
        status_code: 200,
        headers,
        body: payload.to_string(),
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::init_default_subscriber();
    run(service_fn(function_handler)).await
}
