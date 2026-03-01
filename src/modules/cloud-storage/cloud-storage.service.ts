import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class CloudStorageService {
    private readonly logger = new Logger(CloudStorageService.name);
    private storage: Storage;
    private bucketName: string;
    private folderName: string;

    constructor() {
        this.bucketName = process.env.GCP_BUCKET_NAME || '';
        // Read folder name, remove leading/trailing slashes, and ensure it ends with a slash if not empty
        const envFolder = process.env.GCP_FOLDER_NAME || '';
        this.folderName = envFolder ? envFolder.replace(/^\/+|\/+$/g, '') + '/' : '';

        // Initialize the storage client using credentials from env
        this.storage = new Storage({
            projectId: process.env.GCP_PROJECT_ID,
            credentials: {
                client_email: process.env.GCP_CLIENT_EMAIL,
                // Replace literal \n with actual newlines if present in the env var
                private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
        });
    }

    async uploadImage(imageBuffer: Buffer, filename: string): Promise<string> {
        if (!this.bucketName) {
            throw new Error('GCP_BUCKET_NAME environment variable is not defined.');
        }

        // Prepend the folder name if it exists
        const fullPath = `${this.folderName}${filename}`;

        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(fullPath);

        this.logger.log(`Uploading ${fullPath} to GCS bucket ${this.bucketName}`);

        return new Promise((resolve, reject) => {
            const stream = file.createWriteStream({
                resumable: false,
                contentType: 'image/png', // Defaulting to PNG for heatmaps
            });

            stream.on('error', (err) => {
                this.logger.error(`Failed to upload ${filename} to GCS`, err);
                reject(err);
            });

            stream.on('finish', async () => {
                try {
                    // Generate a signed URL for the newly uploaded file
                    // Valid for 7 days (maximum allowed without a service account with specific roles, usually good enough, or we can use generic 7 days)
                    const [signedUrl] = await file.getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
                    });

                    this.logger.log(`Uploaded successfully. Signed URL generated.`);
                    resolve(signedUrl);
                } catch (urlError) {
                    this.logger.error(`Failed to generate signed URL for ${filename}`, urlError);
                    reject(urlError);
                }
            });

            stream.end(imageBuffer);
        });
    }

    async generateV4UploadSignedUrl(filename: string, contentType: string = 'image/png') {
        if (!this.bucketName) {
            throw new Error('GCP_BUCKET_NAME environment variable is not defined.');
        }

        const fullPath = `${this.folderName}${filename}`;
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(fullPath);

        // Generate a signed URL for uploading
        // Gives frontend 15 minutes to initiate the upload
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType,
        });

        // The public (read) URL that the backend/frontend will use to save/view the image later
        // Note: For this to be publicly viewable directly, bucket must be public or we use read signed URLs.
        // Assuming public bucket read access for now as per previous standard setup.
        const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fullPath}`;

        return {
            uploadUrl,
            publicUrl,
        };
    }
}
