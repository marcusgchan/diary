declare module "heic-convert" {
  interface ConvertOptions {
    buffer: Buffer | ArrayBuffer | ArrayBufferLike;
    format: "JPEG" | "PNG";
    quality?: number;
  }

  function convert(options: ConvertOptions): Promise<ArrayBufferLike>;

  export default convert;
}
