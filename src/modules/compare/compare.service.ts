import { Injectable, Inject, Logger } from '@nestjs/common';
import { FigmaScreens, Result, Build, Screenshot } from '../../shared/entity/index';
import { CompareScreenshotDto } from './dto/compare-screenshot.dto';
// import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { Buffer } from 'node:buffer';

@Injectable()
export class CompareService {
  private readonly logger = new Logger(CompareService.name);

  constructor(
    @Inject('FIGMA_SCREENS_REPOSITORY')
    private figmaScreensRepository: typeof FigmaScreens,
    @Inject('RESULT_REPOSITORY')
    private resultRepository: typeof Result,
    @Inject('BUILD_REPOSITORY')
    private buildRepository: typeof Build,
    @Inject('SCREENSHOT_REPOSITORY')
    private screenshotRepository: typeof Screenshot,
  ) {}

  async compareScreens(projectId: string, projectType: string, screenshots: CompareScreenshotDto[], buildIdParam?: string, sensitivity?: number, minScore?: number) {
    const results: any[] = [];
    
    // 1. Handle Build ID (use passed one OR generate new one)
    let buildId = buildIdParam;
    let buildName = buildIdParam; // As per request: "giving it the same name as the buuild id" if created
    
    if (!buildId) {
       buildId = `${Date.now()}build`;
       buildName = buildId;
    }

    // 2. Check/Create Build
    // User request: "if it is not passed create it". If passed, check if exists? 
    // Safest approach: Try create, if exists ignore (or use findOrCreate logic if supported, but here simplified check)
    let build = await this.buildRepository.findOne({ where: { buildId } });
    if (!build) {
      this.logger.log(`Creating new build: ${buildId}`);
      build = await this.buildRepository.create({
        buildId,
        projectId,
        buildName
      } as any);
    }

    // 3. Save uploaded screenshots first
    for (const screenshot of screenshots) {
      const imageName = screenshot.imageName.replace(/\.[^/.]+$/, "");
      try {
      const existingScreenshot = await this.screenshotRepository.findOne({
          where: {
            buildId: buildId,
            imageName: imageName,
          }
        });

        this.logger.log(`Checking for existing screenshot: BuildId=${buildId}, ImageName=${imageName}, Found=${!!existingScreenshot}`);

        // const cleanBase64 = screenshot.image.replace(/^data:image\/\w+;base64,/, '');
        // const imageBuffer = Buffer.from(cleanBase64, 'base64');
        
        // REFACTOR: Save URL directly
        const imageUrl = screenshot.image; 

        if (existingScreenshot) {
           await existingScreenshot.update({
             screenshot: imageUrl,
             projectId,
           } as any);
        } else {
          await this.screenshotRepository.create({
            projectId,
            buildId, 
            imageName: imageName,
            screenshot: imageUrl,
          } as any);
        }
      } catch (error) {
        this.logger.error(`Error saving screenshot ${imageName}`, error);
      }
    }

    // 4. Compare logic
    for (const screenshot of screenshots) {
      const imageName = screenshot.imageName.replace(/\.[^/.]+$/, "");
      try {
        console.log(projectId, projectType, imageName);
        const matchingScreen = await this.figmaScreensRepository.findOne({
          where: {
            projectId, // Note: FigmaScreens entity likely needs string projectId too if not updated, assuming it handles it
            projectType,
            screenName: imageName,
          },
        });

        if (!matchingScreen || !matchingScreen.extractedImage) {
          this.logger.warn(`No matching Figma screen found for ${imageName}`);
          continue;
        }

        // REFACTOR: Screenshot is now a URL. Download it.
        const screenshotUrl = screenshot.image; // Assuming DTO validation passes URLstring
        const screenshotResponse = await fetch(screenshotUrl);
        if (!screenshotResponse.ok) throw new Error(`Failed to fetch screenshot from ${screenshotUrl}`);
        const screenshotBuffer = Buffer.from(await screenshotResponse.arrayBuffer());
        
        // REFACTOR: Figma image is now a URL. Download it.
        const figmaUrl = matchingScreen.extractedImage;
        const figmaResponse = await fetch(figmaUrl);
        if (!figmaResponse.ok) throw new Error(`Failed to fetch figma image from ${figmaUrl}`);
        const figmaBuffer = Buffer.from(await figmaResponse.arrayBuffer());

        const comparisonResult = await this.performComparison(
          figmaBuffer,
          screenshotBuffer,
          sensitivity,
        );

        // Upload Heatmap to Cloudinary
        let heatmapUrl: string | null = '';
        try {
            heatmapUrl = await this.uploadToCloudinary(comparisonResult.diffImageBuffer);
        } catch (uploadError) {
            this.logger.error(`Failed to upload heatmap for ${imageName}`, uploadError);
            heatmapUrl = null; // Set to null instead of Base64 to avoid DB validation errors
        }

        // Calculate Result Status based on minScore or default threshold
        // minScore is percentage (1-100). If minScore is 95, approved diff is 5% (0.05).
        // If diffScore <= allowedDiff, then PASS (1). Else FAIL (0).
        let resultStatus = 0;
        if (minScore !== undefined && minScore !== null) {
            const allowedDiff = (100 - minScore) / 100;
            resultStatus = comparisonResult.diffScore <= allowedDiff ? 1 : 0;
        } else {
             // Default logic: < 0.07 (7%) is PASS
            resultStatus = comparisonResult.diffScore < 0.07 ? 1 : 0;
        }

        // Save result to DB
        await this.resultRepository.create({
          projectId,
          buildId, // Link to Build
          imageName: imageName,
          // ssImage removed per request
          diffPercent: Math.round(comparisonResult.diffScore * 100),
          resultStatus: resultStatus,
          heapmapResult: heatmapUrl, // Save URL (or null)
        } as any);

        const { diffImageBuffer, ...restResult } = comparisonResult;
        results.push({
          imageName: imageName,
          ...restResult,
          heatmapUrl, // Return this too
        });

      } catch (error) {
        this.logger.error(`Error comparing screen ${imageName}`, error);
        results.push({
          imageName: imageName,
          error: error.message,
        });
      }
    }

    return results;
  }

  private async uploadToCloudinary(imageBuffer: Buffer): Promise<string> {
    const CLOUD_NAME = 'compareui';
    const UPLOAD_PRESET = 'Compare_ui';
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    const formData = new FormData();
    // Create a Blob from buffer for FormData
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('file', blob, 'heatmap.png');
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.secure_url;
  }

  private async performComparison(figmaImageBuffer: Buffer, screenshotBuffer: Buffer, sensitivity = 3) {
    // REFACTOR: Input is now a buffer (downloaded in caller)
    // const cleanBase64 = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
    // const screenshotBuffer = Buffer.from(cleanBase64, 'base64');
    
    let screenshotPng: PNG;
    // Check for JPEG signature (FF D8)
    if (screenshotBuffer.length > 0 && screenshotBuffer[0] === 0xFF && screenshotBuffer[1] === 0xD8) {
        const rawJpeg = jpeg.decode(screenshotBuffer, { useTArray: true });
        screenshotPng = {
            width: rawJpeg.width,
            height: rawJpeg.height,
            data: rawJpeg.data
        } as PNG;
    } else {
        screenshotPng = PNG.sync.read(screenshotBuffer);
    }

    // Decode Figma Image
    const figmaPng = PNG.sync.read(figmaImageBuffer);

    // Match Dimensions (Use smallest common dimensions)
    const width = Math.min(screenshotPng.width, figmaPng.width);
    const height = Math.min(screenshotPng.height, figmaPng.height);
    
    const resizedScreenshot = this.resizeImage(screenshotPng, width, height);
    const resizedFigma = this.resizeImage(figmaPng, width, height);

    // Pixelmatch Configuration
    const pixelmatchThreshold = {
        1: 0.9,
        2: 0.7,
        3: 0.5,
        4: 0.3,
        5: 0.1 
    }[sensitivity] || 0.5;

    const diffPng = new PNG({ width, height });
    const { default: pixelmatch } = await import('pixelmatch');
    const diffPixels = pixelmatch(
        resizedScreenshot.data,
        resizedFigma.data,
        diffPng.data,
        width,
        height,
        { threshold: pixelmatchThreshold }
    );

    const diffScore = diffPixels / (width * height);
    const diffImageBuffer = PNG.sync.write(diffPng);

    return {
        diffScore,
        diffImageBuffer,
        matched: diffPixels === 0
    };
  }

  private resizeImage(png: PNG, targetWidth: number, targetHeight: number): PNG {
    if (png.width === targetWidth && png.height === targetHeight) return png;

    const resized = new PNG({ width: targetWidth, height: targetHeight });
    const scaleX = png.width / targetWidth;
    const scaleY = png.height / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const srcIdx = (srcY * png.width + srcX) * 4;
        const dstIdx = (y * targetWidth + x) * 4;

        resized.data[dstIdx] = png.data[srcIdx];
        resized.data[dstIdx + 1] = png.data[srcIdx + 1];
        resized.data[dstIdx + 2] = png.data[srcIdx + 2];
        resized.data[dstIdx + 3] = png.data[srcIdx + 3];
      }
    }
    return resized;
  }
}
