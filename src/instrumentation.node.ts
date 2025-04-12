// "use strict";
// import process from "process";
// import { NodeSDK } from "@opentelemetry/sdk-node";
// import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
// import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
// import { Resource } from "@opentelemetry/resources";
// import {
//   ATTR_SERVICE_NAME,
//   ATTR_SERVICE_VERSION,
// } from "@opentelemetry/semantic-conventions";
// import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
// import {
//   PeriodicExportingMetricReader,
//   ConsoleMetricExporter,
// } from "@opentelemetry/sdk-metrics";
//
// // Add otel logging
// import {
//   type Attributes,
//   diag,
//   DiagConsoleLogger,
//   DiagLogLevel,
// } from "@opentelemetry/api";
// import { env } from "./env.mjs";
// diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR); // set diaglog level to DEBUG when debugging
//
// const exporterOptions = {
//   url: "https://otel.highlight.io:4318/v1/traces", // use your own data region
// };
//
// const attributes: Attributes = {
//   "highlight.project_id": env.NEXT_PUBLIC_HIGHLIGHT_ID,
// };
//
// const prod = new NodeSDK({
//   traceExporter: new OTLPTraceExporter(exporterOptions),
//   instrumentations: [getNodeAutoInstrumentations()],
//   resource: new Resource(attributes),
// });
//
// // const dev = new NodeSDK({
// //   traceExporter: new ConsoleSpanExporter(),
// //   resource: new Resource({
// //     [ATTR_SERVICE_NAME]: "yourServiceName",
// //     [ATTR_SERVICE_VERSION]: "1.0",
// //   }),
// //   metricReader: new PeriodicExportingMetricReader({
// //     exporter: new ConsoleMetricExporter(),
// //   }),
// //   // instrumentations: [getNodeAutoInstrumentations()],
// // });
//
// // const sdk = env.NODE_ENV === "production" ? prod : dev;
// const sdk = prod;
// // initialize the SDK and register with the OpenTelemetry API
// // this enables the API to record telemetry
// sdk.start();
//
// // gracefully shut down the SDK on process exit
// process.on("SIGTERM", () => {
//   sdk
//     .shutdown()
//     .then(() => console.log("Tracing terminated"))
//     .catch((error) => console.log("Error terminating tracing", error))
//     .finally(() => process.exit(0));
// });

// import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
// import { Resource } from "@opentelemetry/resources";
// import { NodeSDK } from "@opentelemetry/sdk-node";
// import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
// import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
//
// const sdk = new NodeSDK({
//   resource: new Resource({
//     [ATTR_SERVICE_NAME]: "next-app",
//   }),
//   spanProcessor: new SimpleSpanProcessor(new OTLPTraceExporter()),
// });
// sdk.start();
//
//

/*instrumentation.ts*/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
