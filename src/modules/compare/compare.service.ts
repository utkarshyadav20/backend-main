import { Injectable, Inject, Logger } from '@nestjs/common';
import { FigmaScreens, Result, Build, Screenshot } from '../../shared/entity/index';
import { CompareScreenshotDto } from './dto/compare-screenshot.dto';
import pixelmatch from 'pixelmatch';
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

  async compareScreens(projectId: string, projectType: string, screenshots: CompareScreenshotDto[], buildIdParam?: string, sensitivity?: number) {
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

        const cleanBase64 = screenshot.image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(cleanBase64, 'base64');

        if (existingScreenshot) {
           await existingScreenshot.update({
             screenshot: imageBuffer,
             projectId,
           } as any);
        } else {
          await this.screenshotRepository.create({
            projectId,
            buildId, // Link to the determined buildId
            imageName: imageName,
            screenshot: imageBuffer,
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

        const comparisonResult = await this.performComparison(
          matchingScreen.extractedImage,
          screenshot.image,
          sensitivity,
        );

        // Save result to DB
        await this.resultRepository.create({
          projectId,
          buildId, // Link to Build
          imageName: imageName,
          // ssImage removed per request
          diffPercent: Math.round(comparisonResult.diffScore * 100),
          resultStatus: comparisonResult.diffScore === 0 ? 1 : 0,
          heapmapResult: comparisonResult.diffImageBuffer,
        } as any);

        results.push({
          imageName: imageName,
          ...comparisonResult,
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

  private async performComparison(figmaImageBuffer: Buffer, screenshotBase64: string, sensitivity = 3) {
    // Decode user screenshot (Handle Base64 + Type)
    const cleanBase64 = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
    const screenshotBuffer = Buffer.from(cleanBase64, 'base64');
    
    let screenshotPng: PNG;
    // Check for JPEG signature
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
