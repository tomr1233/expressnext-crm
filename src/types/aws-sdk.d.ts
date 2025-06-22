declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: {
      region: string;
      credentials: {
        accessKeyId: string;
        secretAccessKey: string;
      };
    });
  }
}
