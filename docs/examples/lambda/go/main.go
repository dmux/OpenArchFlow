package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
)

// Event is the input payload. Any JSON structure works.
type Event struct {
	Key     string                 `json:"key"`
	Method  string                 `json:"httpMethod"`
	Path    string                 `json:"path"`
	Body    string                 `json:"body"`
	Headers map[string]string      `json:"headers"`
	Extra   map[string]interface{} `json:"extra"`
}

// Response follows the API Gateway proxy integration shape.
type Response struct {
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

func handler(ctx context.Context, event Event) (Response, error) {
	fmt.Printf("Event: %+v\n", event)

	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1"
	}

	payload := map[string]interface{}{
		"message": "Hello from Go Lambda on MiniStack",
		"region":  region,
		"event":   event,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return Response{StatusCode: 500, Body: err.Error()}, nil
	}

	return Response{
		StatusCode: 200,
		Headers:    map[string]string{"Content-Type": "application/json"},
		Body:       string(body),
	}, nil
}

func main() {
	lambda.Start(handler)
}
