import { Injectable, Inject, Logger } from '@nestjs/common';
import { FigmaScreens, Result, Build, Screenshot, ModelResult, ResultStatus } from '../../shared/entity/index';
import { CompareScreenshotDto } from './dto/compare-screenshot.dto';
// import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { Buffer } from 'node:buffer';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

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
    @Inject('MODEL_RESULT_REPOSITORY')
    private modelResultRepository: typeof ModelResult,
    private readonly httpService: HttpService,
  ) { }

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
    // 4. Compare logic
    // Fetch ALL Figma screens for the project first
    const figmaScreens = await this.figmaScreensRepository.findAll({
      where: { projectId, projectType }
    });

    // Create a Set of all unique names (from Figma and Screenshots)
    const uniqueNames = new Set<string>();

    // Convert screenshots array to a Map for easy lookup
    const screenshotMap = new Map<string, any>();
    for (const s of screenshots) {
      // Strip extension to get clean name
      const cleanName = s.imageName.replace(/\.[^/.]+$/, "");
      uniqueNames.add(cleanName);
      screenshotMap.set(cleanName, s);
    }

    // Add all Figma screen names to the Set and Map for lookup
    const figmaMap = new Map<string, any>();
    for (const f of figmaScreens) {
      uniqueNames.add(f.screenName);
      figmaMap.set(f.screenName, f);
    }

    for (const imageName of uniqueNames) {
      try {
        const screenshot = screenshotMap.get(imageName);
        const matchingScreen = figmaMap.get(imageName);

        // Find existing result record
        let resultRecord = await this.resultRepository.findOne({
          where: { projectId, buildId, imageName }
        });

        // CASE 1: Screenshot exists
        if (screenshot) {
          // If matching Figma screen missing -> ERROR
          if (!matchingScreen || !matchingScreen.extractedImage) {
            this.logger.warn(`No matching Figma screen found for ${imageName}`);

            const resultData = {
              projectId,
              buildId,
              imageName,
              resultStatus: ResultStatus.ERROR, // Mark as ERROR
              diffPercent: 0,
              heapmapResult: null,
              coordinates: null
            };

            if (resultRecord) {
              await resultRecord.update(resultData as any);
            } else {
              await this.resultRepository.create(resultData as any);
            }

            continue; // Skip comparison
          }

          // If Figma screen exists -> Proceed with comparison

          // Set IN_PROGRESS
          if (resultRecord) {
            await resultRecord.update({ resultStatus: ResultStatus.IN_PROGRESS });
          } else {
            resultRecord = await this.resultRepository.create({
              projectId,
              buildId,
              imageName,
              resultStatus: ResultStatus.IN_PROGRESS
            } as any);
          }

          // REFACTOR: Screenshot is now a URL. Download it.
          const screenshotUrl = screenshot.image;
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
            heatmapUrl = null;
          }

          // Calculate Result Status based on minScore or default threshold
          let resultStatus = ResultStatus.FAIL;
          if (minScore !== undefined && minScore !== null) {
            const allowedDiff = (100 - minScore) / 100;
            resultStatus = comparisonResult.diffScore <= allowedDiff ? ResultStatus.PASS : ResultStatus.FAIL;
          } else {
            // Default logic: < 0.07 (7%) is PASS
            resultStatus = comparisonResult.diffScore < 0.07 ? ResultStatus.PASS : ResultStatus.FAIL;
          }

          // Save result to DB using the existing record
          const resultData = {
            projectId,
            buildId,
            imageName,
            diffPercent: Math.round(comparisonResult.diffScore * 100),
            resultStatus: resultStatus,
            heapmapResult: heatmapUrl,
            coordinates: {
              boxes: comparisonResult.boxes,
              counts: comparisonResult.counts,
              dimensions: comparisonResult.dimensions
            },
            timestamp: new Date(),
          };

          if (resultRecord) {
            await resultRecord.update(resultData as any);
          } else {
            await this.resultRepository.create(resultData as any);
          }

          const { diffImageBuffer, ...restResult } = comparisonResult;
          results.push({
            imageName: imageName,
            ...restResult,
            heatmapUrl,
            screenshotUrl,
            figmaUrl,
          });

        } else {
          // CASE 2: Screenshot MISSING (only in Figma)
          // Ensure a result row exists, likely ON_HOLD or similar if not found
          if (!resultRecord) {
            await this.resultRepository.create({
              projectId,
              buildId,
              imageName,
              resultStatus: ResultStatus.ON_HOLD // Or keep null/default
            } as any);
          }
          // If record exists, we leave it be (it might be On Hold from previous steps)
        }

      } catch (error) {
        this.logger.error(`Error comparing screen ${imageName}`, error);
        results.push({
          imageName: imageName,
          error: error.message,
        });
      }
    }

    // Trigger N8N Webhook with gathered results
    if (results.length > 0) {
      this.triggerN8nWebhook(results, projectId, buildId, projectType).catch(err => {
        this.logger.error('Failed to trigger background N8N webhook', err);
      });
    }

    return results;
  }

  private async triggerN8nWebhook(results: any[], projectId: string, buildId: string, projectType: string) {
    let webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.warn('N8N_WEBHOOK_URL not set, skipping webhook trigger');
      return;
    }

    // Append query parameters
    const separator = webhookUrl.includes('?') ? '&' : '?';
    webhookUrl = `${webhookUrl}${separator}projectId=${projectId}&buildId=${buildId}&projectType=${projectType}`;

    const imagesToanalyze = results.filter(r => !r.error).map(result => ({
      imageName: result.imageName,
      mismatchPercent: result.diffScore !== undefined ? (result.diffScore * 100).toFixed(2) : '0',
      originalImageUrl: result.figmaUrl || '',
      screenshot: result.screenshotUrl || '',
      differenceImageUrl: result.heatmapUrl,
      boxed_coordinats: {
        boxes: result.boxes,
        counts: result.counts,
        dimensions: result.dimensions
      },
    }));

    if (imagesToanalyze.length === 0) return;

    this.logger.log(`Triggering n8n webhook for ${imagesToanalyze.length} images`);

    try {
      this.logger.log(`Sending request to N8N... (Timeout: 600000ms)`);
      const response = await lastValueFrom(this.httpService.post(webhookUrl, { imagesToanalyze }, {
        timeout: 600000 // 10 minutes timeout
      }));
      this.logger.log('n8n webhook triggered successfully');

      // Process and store the response
      this.logger.log(`N8N Response Status: ${response.status}`);
      this.logger.log(`N8N Response Data: ${JSON.stringify(response.data)}`);

      // Process and store the response
      this.logger.log(`N8N Response Status: ${response.status}`);
      this.logger.log(`N8N Response Data: ${JSON.stringify(response.data)}`);

      let webhookData: any[] = [];
      if (response.data && Array.isArray(response.data.data)) {
        webhookData = response.data.data;
      } else if (Array.isArray(response.data)) {
        webhookData = response.data;
      }

      if (webhookData.length > 0) {
        this.logger.log(`Received ${webhookData.length} analysis results from webhook`);

        const recordsToCreate = webhookData.map((item: any) => {
          let mergedAnalysis: any[] = [];
          if (Array.isArray(item.analysis)) {
            const grouped = new Map<string, any[]>();
            item.analysis.forEach((aItem: any) => {
              const id = aItem.id || 'unknown';
              if (!grouped.has(id)) {
                grouped.set(id, []);
              }
              grouped.get(id)!.push(aItem);
            });

            mergedAnalysis = Array.from(grouped.entries()).map(([id, items]) => {
              if (items.length === 1) return items[0];

              const mergedItem = { ...items[0] };
              const keys = Object.keys(mergedItem);

              keys.forEach(key => {
                if (key === 'id') return; // ID is already the grouping key

                // Check if all items have this key and if it's a string
                const isStringField = items.every(i => typeof i[key] === 'string' || i[key] === null || i[key] === undefined);

                if (isStringField) {
                  const uniqueValues = Array.from(new Set(items.map(i => i[key]))).filter(val => val !== null && val !== undefined && val !== '');
                  if (uniqueValues.length > 0) {
                    mergedItem[key] = uniqueValues.join(', ');
                  }
                }
                // For non-string fields (like numbers), we stick to the first item's value (mergedItem),
                // assuming geometry shouldn't vary significantly for the same ID.
              });

              return mergedItem;
            });
          }

          return {
            projectId,
            buildId,
            projectType,
            imageName: item.imageName,
            summary: item.Summary || item.summary,
            coordsVsText: mergedAnalysis,
          };
        });

        // Replace bulkCreate with upsert logic
        for (const record of recordsToCreate) {
          try {
            const existingModelResult = await this.modelResultRepository.findOne({
              where: {
                projectId: record.projectId,
                buildId: record.buildId,
                imageName: record.imageName,
                projectType: record.projectType
              }
            });

            if (existingModelResult) {
              await existingModelResult.update({
                coordsVsText: record.coordsVsText,
                summary: record.summary
              } as any);
            } else {
              await this.modelResultRepository.create(record as any);
            }
          } catch (err) {
            this.logger.error(`Error saving model result for ${record.imageName}`, err);
          }
        }

        this.logger.log('Model results stored successfully from webhook response');
      } else {
        this.logger.warn('N8N response did not contain a valid data array (checked response.data and response.data.data)');
      }

    } catch (error) {
      this.logger.error('Error triggering n8n webhook or storing results', error);
      // Don't throw logic error here to avoid failing the main comparison if webhook/storage fails, 
      // but log it strictly.
    }
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

    // Analyze diff for boxes
    const analysis = this.analyzeDiff(diffPng);

    // Calculate Perceptual Score (Area based)
    // Sum the area of all detected boxes to get the "Visually Affected Area"
    const totalAffectedArea = analysis.boxes.reduce((sum, box) => sum + (box.width * box.height), 0);
    const perceptualScore = totalAffectedArea / (width * height);

    // Use the HIGHER of the two scores to ensure we capture structural issues (perceptual) 
    // while correctly flagging high-noise variance (pixel) if that's dominant.
    // Ensure we don't exceed 100% (1.0)
    const finalDiffScore = Math.min(Math.max(diffScore, perceptualScore), 1.0);

    return {
      diffScore: finalDiffScore,
      diffImageBuffer,
      matched: finalDiffScore === 0,
      ...analysis // Include boxes, counts, dimensions
    };
  }

  private analyzeDiff(diffPng: PNG) {
    const { width, height, data } = diffPng;

    // Grid configuration
    const GRID_SIZE = 20; // 20x20 pixels blocks
    const rows = Math.ceil(height / GRID_SIZE);
    const cols = Math.ceil(width / GRID_SIZE);

    // 2D array to track active blocks
    const grid = Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => ({ active: false, pixelCount: 0 }))
    );

    // 1. Scan pixels and populate grid
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Detect Red diff pixels (Pixelmatch default: 255, 0, 0)
        // We use a threshold to be safe
        const isDiff = r > 150 && g < 100 && b < 100;

        if (isDiff) {
          const gy = Math.floor(y / GRID_SIZE);
          const gx = Math.floor(x / GRID_SIZE);
          // Boundary check
          if (gy < rows && gx < cols) {
            grid[gy][gx].pixelCount++;
          }
        }
      }
    }

    // 2. Mark blocks as active if they have enough diff pixels
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // If density in block > 2% roughly (20*20*0.02 = 8 pixels)
        if (grid[r][c].pixelCount > 5) {
          grid[r][c].active = true;
        }
      }
    }

    // 3. Simple Connected Components on Grid
    const visited = Array(rows).fill(false).map(() => Array(cols).fill(false));
    const foundBoxes: any[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].active && !visited[r][c]) {
          // Start BFS for a new component
          const queue = [{ r, c }];
          visited[r][c] = true;

          let minR = r, maxR = r;
          let minC = c, maxC = c;
          let totalPixels = 0;

          while (queue.length > 0) {
            const { r: cr, c: cc } = queue.shift()!;

            minR = Math.min(minR, cr);
            maxR = Math.max(maxR, cr);
            minC = Math.min(minC, cc);
            maxC = Math.max(maxC, cc);
            totalPixels += grid[cr][cc].pixelCount;

            // Check 4 neighbors
            const neighbors = [
              { nr: cr - 1, nc: cc },
              { nr: cr + 1, nc: cc },
              { nr: cr, nc: cc - 1 },
              { nr: cr, nc: cc + 1 },
              // Diagonals
              { nr: cr - 1, nc: cc - 1 },
              { nr: cr - 1, nc: cc + 1 },
              { nr: cr + 1, nc: cc - 1 },
              { nr: cr + 1, nc: cc + 1 },
            ];

            for (const { nr, nc } of neighbors) {
              if (
                nr >= 0 && nr < rows &&
                nc >= 0 && nc < cols &&
                !visited[nr][nc] &&
                grid[nr][nc].active
              ) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              }
            }
          }

          // Create Box
          const bx = minC * GRID_SIZE;
          const by = minR * GRID_SIZE;
          const bw = (maxC - minC + 1) * GRID_SIZE;
          const bh = (maxR - minR + 1) * GRID_SIZE;

          const area = bw * bh;
          const density = totalPixels / area;

          let severity = 'Low';
          if (density > 0.3) severity = 'Major'; // >30% red pixels
          else if (density > 0.05) severity = 'Medium';

          // Only add significant regions
          if (bw > 10 && bh > 10) {
            foundBoxes.push({
              id: `${bx}-${by}`,
              x: bx,
              y: by,
              width: bw,
              height: bh,
              density,
              severity,
              pixelCount: totalPixels
            });
          }
        }
      }
    }

    const counts = {
      Major: foundBoxes.filter(b => b.severity === 'Major').length,
      Medium: foundBoxes.filter(b => b.severity === 'Medium').length,
      Low: foundBoxes.filter(b => b.severity === 'Low').length,
    };

    return {
      boxes: foundBoxes,
      counts,
      dimensions: { width, height }
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
