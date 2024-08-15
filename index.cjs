const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

// Create an S3 bucket
const bucket = new aws.s3.Bucket("diaryBucket", {
  corsRules: [
    {
      allowedHeaders: ["*"],
      allowedMethods: ["GET", "POST", "DELETE", "PUT", "HEAD"],
      allowedOrigins: ["https://explorer-diary.vercel.app/*"],
      maxAgeSeconds: 3000,
    },
  ],
});

// Create an EventBridge Event Bus
const eventBus = new aws.cloudwatch.EventBus("myEventBus");

// Create an EventBridge rule to capture S3 Object Created events
const rule = new aws.cloudwatch.EventRule("s3ObjectCreatedRule", {
  eventBusName: eventBus.name,
  eventPattern: JSON.stringify({
    source: ["aws.s3"],
    "detail-type": ["AWS API Call via CloudTrail"],
    detail: {
      eventSource: ["s3.amazonaws.com"],
      eventName: ["PutObject", "CompleteMultipartUpload"],
      requestParameters: {
        bucketName: [bucket.bucket],
      },
    },
  }),
});

// Create an EventBridge API destination
const connection = new aws.cloudwatch.EventConnection("myConnection", {
  authorizationType: "API_KEY",
  authParameters: {
    apiKey: {
      key: "x-signature",
      value: "1234",
    },
  },
  description: "My API Connection",
  name: "myApiConnection",
});

const apiDestination = new aws.cloudwatch.EventApiDestination(
  "myApiDestination",
  {
    connectionArn: connection.arn,
    httpMethod: "POST",
    invocationEndpoint: "https://explorer-diary.vercel.app/api/upload-callback", // Change as required
    name: "myApiDestination",
  },
);

const targetRole = new aws.iam.Role("eventBridgeTargetRole", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "events.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  }),
});

// Create an EventBridge Target to route the events to the API destination
const target = new aws.cloudwatch.EventTarget("eventBusTarget", {
  rule: rule.name,
  roleArn: targetRole.arn,
  eventBusName: eventBus.name,
  arn: apiDestination.arn,
  input: JSON.stringify({
    token: "myCustomToken",
    event: ".", // using '.' to pass the whole event as-is
  }),
});

// Grant EventBridge permission to access the S3 bucket
const bucketPolicy = new aws.s3.BucketPolicy("diaryBucketPolicy", {
  bucket: bucket.id,
  policy: pulumi
    .all([bucket.arn, eventBus.arn])
    .apply(([bucketArn, eventBusArn]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "events.amazonaws.com" },
            Action: "s3:PutObject",
            Resource: [bucketArn, `${bucketArn}/*`],
            Condition: {
              StringEquals: {
                "aws:SourceArn": eventBusArn,
              },
            },
          },
          {
            Effect: "Allow",
            Principal: { Service: "events.amazonaws.com" },
            Action: "s3:GetObject",
            Resource: [bucketArn, `${bucketArn}/*`],
          },
        ],
      }),
    ),
});

exports.bucketName = bucket.id;
exports.eventBusName = eventBus.id;
exports.ruleName = rule.name;
exports.targetArn = target.arn;
