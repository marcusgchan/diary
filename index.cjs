const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const { env } = require("./src/env.mjs");

// Create an S3 bucket
const bucket = new aws.s3.Bucket("diaryBucket", {
  corsRules: [
    {
      allowedHeaders: ["*"],
      allowedMethods: ["GET", "POST", "DELETE", "PUT", "HEAD"],
      allowedOrigins: ["*"],
      maxAgeSeconds: 3000,
    },
  ],
});

const bucketNotification = new aws.s3.BucketNotification("bucketNotification", {
  bucket: bucket.bucket,
  eventbridge: true,
});

// Create an EventBridge Event Bus
// const eventBus = new aws.cloudwatch.EventBus("myEventBus");

const eventPattern = bucket.bucket.apply((bucketName) =>
  JSON.stringify({
    source: ["aws.s3"],
    "detail-type": ["Object Created"],
  }),
);

// Has bus and pattern to filter events
const rule = new aws.cloudwatch.EventRule("s3ObjectCreatedRule", {
  eventPattern: eventPattern,
});

// Connection for apiDestination
const connection = new aws.cloudwatch.EventConnection("myConnection", {
  authorizationType: "API_KEY",
  authParameters: {
    apiKey: {
      key: "authorization",
      value: env.BUCKET_WEBHOOK_TOKEN,
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
    invocationEndpoint:
      "https://webhook.site/9c9e5bf2-2c04-4436-8b6e-65b9372ffd5d", // Change as required
    name: "myApiDestination",
  },
);

const targetRole = new aws.iam.Role("eventBridgeTargetRole", {
  inlinePolicies: [
    {
      policy: pulumi.all([apiDestination.arn]).apply(([apiDestinationArn]) =>
        JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: "events:InvokeApiDestination",
              Resource: `${apiDestinationArn}`,
            },
          ],
        }),
      ),
    },
  ],
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
// TODO: dead letter config
const target = new aws.cloudwatch.EventTarget("eventBusTarget", {
  rule: rule.name, // Ensure this matches the created rule name
  roleArn: targetRole.arn, // Role that EventBridge assumes
  arn: apiDestination.arn, // Target apiDestination
  httpTarget: {
    headerParameters: {
      test: "test-header",
    },
  },
});

exports.bucketName = bucket.id;
exports.ruleName = rule.name;
exports.targetArn = target.arn;