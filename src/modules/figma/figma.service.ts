import { Injectable, Inject, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FigmaScreens, Projects, Result, ResultStatus } from '../../shared/entity/index.js';
import { CreateFigmaScreensDto } from './dto/figma-screen.dto.js';

@Injectable()
export class FigmaService {
  constructor(
    @Inject('FIGMA_SCREENS_REPOSITORY')
    private figmaScreensRepository: typeof FigmaScreens,
    @Inject('PROJECTS_REPOSITORY')
    private projectsRepository: typeof Projects,
    @Inject('RESULT_REPOSITORY')
    private resultRepository: typeof Result,
  ) {}

  async processScreens(dto: CreateFigmaScreensDto): Promise<any> {
    const project = await this.projectsRepository.findOne({ where: { projectId: dto.project_id } });
    if (!project) {
        throw new NotFoundException(`Project with ID ${dto.project_id} not found`);
    }
    console.log(project.dataValues.projectType);
    const results: FigmaScreens[] = [];
    
    for (const screen of dto.figma_data) {
      try {
        // Check for uniqueness: Project + projectType + ScreenName
        const existingScreen = await this.figmaScreensRepository.findOne({
            where: {
                projectId: dto.project_id,
                projectType: project.dataValues.projectType,
                screenName: screen.Screen_name,
            }
        });

        if (existingScreen) {
            console.warn(`Skipping duplicate screen: Project ${dto.project_id}, Type ${project.projectType}, Name ${screen.Screen_name}`);
            continue;
        }

        // const buffer = await this.fetchImageFromFigmaUrl(screen.screen_figma_url);
        // if (!buffer) continue;
        
        // REFACTOR: Fetch URL and save URL directly
        const imageUrl = await this.fetchImageFromFigmaUrl(screen.screen_figma_url);
        if (!imageUrl) continue;


        const newScreen = await this.figmaScreensRepository.create<FigmaScreens>({
          projectId: dto.project_id,
          nodeId: screen.node_id, 
          screenName: screen.Screen_name,
          figmaUrl: screen.screen_figma_url,
          extractedImage: imageUrl, // Save URL string
          projectType: project.dataValues.projectType, 
        } as any);

        results.push(newScreen);

        // CREATE RESULT IF BUILD ID PRESENT
        if (dto.build_id) {
            await this.resultRepository.create<Result>({
                projectId: dto.project_id,
                buildId: dto.build_id,
                imageName: screen.Screen_name,
                resultStatus: ResultStatus.ON_HOLD,
                // diff_percent: null, 
                // heapmap_result: null,
            } as any);
        }
      } catch (error) {
        console.error(`Error processing screen ${screen.Screen_name}:`, error);
      }
    }
    
    return { success: true, processed: results.length };
  }

  async getScreens(projectId: string, projectType: string): Promise<FigmaScreens[]> {
      return this.figmaScreensRepository.findAll({
          where: {
              projectId,
              projectType: projectType, // Map argument screenType to entity property projectType
          },
          attributes: ['id', 'projectId', 'screenName', 'projectType', 'extractedImage']
      });
  }

  // This method updates the image and returns the screen
  async updateScreenImage(projectId: string, projectType: string, screenName: string): Promise<FigmaScreens> {      
      const screen = await this.figmaScreensRepository.findOne({
          where: {
              projectId,
              projectType: projectType, // Map argument to entity property
              screenName,
          }
      });

      if (!screen) {
          console.error(`Screen not found for update: ${projectId}, ${projectType}, ${screenName}`);
          throw new NotFoundException(`Screen not found: Project ${projectId}, Type ${projectType}, Name ${screenName}`);
      }

      const imageUrl = await this.fetchImageFromFigmaUrl(screen.figmaUrl);
      if (!imageUrl) {
          console.error(`Failed to fetch image from URL: ${screen.figmaUrl}`);
          throw new InternalServerErrorException(`Failed to fetch image for screen ${screenName}`);
      }

      // Use direct update to ensure DB persistence
      const [affectedRows] = await this.figmaScreensRepository.update(
          { extractedImage: imageUrl },
          { where: { id: screen.id } }
      );

      // Refetch to return the updated object
      const updatedScreen = await this.figmaScreensRepository.findByPk(screen.id);
      
      if (!updatedScreen) {
        throw new InternalServerErrorException(`Unexpected error: Could not retrieve updated screen ${screen.id}`);
      }

      return updatedScreen;
  }

  async updateAllProjectScreens(projectId: string, projectType: string): Promise<FigmaScreens[]> {
      const screens = await this.figmaScreensRepository.findAll({
          where: { projectId, projectType }
      });

      for (const screen of screens) {
          try {
              const imageUrl = await this.fetchImageFromFigmaUrl(screen.figmaUrl);
              if (imageUrl) {
                  await this.figmaScreensRepository.update(
                      { extractedImage: imageUrl },
                      { where: { id: screen.id } }
                  );
              }
          } catch (error) {
              console.error(`Error updating screen ${screen.screenName}:`, error);
          }
      }

      return this.getScreens(projectId, projectType);
  }

  async deleteScreen(projectId: string, projectType: string, screenName: string): Promise<any> {
      const deletedCount = await this.figmaScreensRepository.destroy({
          where: {
              projectId,
              projectType,
              screenName
          }
      });

      if (deletedCount === 0) {
          throw new NotFoundException(`Screen not found: Project ${projectId}, Type ${projectType}, Name ${screenName}`);
      }

      return { success: true, message: `Screen ${screenName} deleted successfully` };
  }

  async deleteAllProjectScreens(projectId: string, projectType: string): Promise<any> {
      const deletedCount = await this.figmaScreensRepository.destroy({
          where: {
              projectId,
              projectType
          }
      });

      return { success: true, message: `Deleted ${deletedCount} screens for project ${projectId} type ${projectType}` };
  }

  async uploadManualScreen(projectId: string, projectType: string, screenName: string, imageUrl: string, buildId?: string): Promise<FigmaScreens> {
      // Sanitize screenName: remove extension if present (e.g. "image.png" -> "image")
      const sanitizedScreenName = screenName.replace(/\.[^/.]+$/, "");

      // Check if screen exists to update or create new
      let screen = await this.figmaScreensRepository.findOne({
          where: {
              projectId,
              projectType,
              screenName: sanitizedScreenName
          }
      });

      if (screen) {
          await screen.update({
              extractedImage: imageUrl,
              // Keep existing nodeId/url if they exist, or use defaults for manual overrides
          });
      } else {
          screen = await this.figmaScreensRepository.create<FigmaScreens>({
              projectId,
              projectType,
              screenName: sanitizedScreenName,
              extractedImage: imageUrl,
              nodeId: `manual-${Date.now()}`,
              figmaUrl: 'manual-upload'
          } as any);
      }

      // CREATE RESULT IF BUILD ID PRESENT
      if (buildId) {
           await this.resultRepository.create<Result>({
                projectId,
                buildId,
                imageName: sanitizedScreenName,
                resultStatus: ResultStatus.ON_HOLD,
            } as any);
      }
      
      if (!screen) {
          throw new InternalServerErrorException("Failed to process screen");
      }

      return screen;
  }

  async extractImageFromUrl(url: string): Promise<string> {
      const imageUrl = await this.fetchImageFromFigmaUrl(url);
      if (!imageUrl) {
          throw new BadRequestException('Could not extract image from Figma URL. Make sure it points to a specific frame (node-id).');
      }
      return imageUrl;
  }

  private async fetchImageFromFigmaUrl(url: string): Promise<string | null> {
      try {
        const urlObj = new URL(url);
        const fileKeyRegex = /\/design\/([^\/]+)\//;
        const fileKeyMatch = urlObj.pathname.match(fileKeyRegex);
        
        let fileKey = fileKeyMatch ? fileKeyMatch[1] : null;
        if (!fileKey) {
             const fileRegex = /\/file\/([^\/]+)\//;
             const fileMatch = urlObj.pathname.match(fileRegex);
             fileKey = fileMatch ? fileMatch[1] : null;
        }

        let nodeId = urlObj.searchParams.get('node-id');
        if (nodeId) {
            nodeId = decodeURIComponent(nodeId).replace(/-/g, ':');
        }

        if (!fileKey || !nodeId) {
            console.error(`Could not parse fileKey or nodeId from URL: ${url}`);
            return null;
        }

        const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
        if (!figmaToken) {
            console.error('FIGMA_ACCESS_TOKEN is not configured');
            throw new Error('FIGMA_ACCESS_TOKEN missing');
        }
        
        console.log(`Fetching Figma Image: Key=${fileKey}, Node=${nodeId}`);

        const imageUrlResponse = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png`, {
            headers: {
                'X-Figma-Token': figmaToken,
            }
        });

        if (!imageUrlResponse.ok) {
            console.error(`Figma API error: ${imageUrlResponse.statusText}`);
            return null;
        }

        const imageData = await imageUrlResponse.json();
        console.log('Figma API Response:', JSON.stringify(imageData, null, 2));
        const imageUrl = imageData.images[nodeId];

        if (!imageUrl) {
            console.error(`No image found for node ${nodeId}`);
            return null;
        }

        // REFACTOR: Return URL directly
        return imageUrl;
        
        /* 
        const response = await fetch(imageUrl);
        if (!response.ok) {
           console.error(`Failed to fetch image content: ${response.statusText}`);
           return null; 
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
        */
      } catch (error) {
          console.error(`Error extracting image from URL ${url}:`, error);
          return null;
      }
  }
}
