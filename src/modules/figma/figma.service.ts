import { Injectable, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FigmaScreens, Projects } from '../../shared/entity/index.js';
import { CreateFigmaScreensDto } from './dto/figma-screen.dto.js';

@Injectable()
export class FigmaService {
  constructor(
    @Inject('FIGMA_SCREENS_REPOSITORY')
    private figmaScreensRepository: typeof FigmaScreens,
    @Inject('PROJECTS_REPOSITORY')
    private projectsRepository: typeof Projects,
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

        const buffer = await this.fetchImageFromFigmaUrl(screen.screen_figma_url);
        if (!buffer) continue;

        const newScreen = await this.figmaScreensRepository.create<FigmaScreens>({
          projectId: dto.project_id,
          nodeId: screen.node_id, 
          screenName: screen.Screen_name,
          figmaUrl: screen.screen_figma_url,
          extractedImage: buffer,
          projectType: project.dataValues.projectType, // Use projectType from project entity
        } as any);

        results.push(newScreen);
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

      const buffer = await this.fetchImageFromFigmaUrl(screen.figmaUrl);
      if (!buffer) {
          console.error(`Failed to fetch image from URL: ${screen.figmaUrl}`);
          throw new InternalServerErrorException(`Failed to fetch image for screen ${screenName}`);
      }

      // Use direct update to ensure DB persistence
      const [affectedRows] = await this.figmaScreensRepository.update(
          { extractedImage: buffer },
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
              const buffer = await this.fetchImageFromFigmaUrl(screen.figmaUrl);
              if (buffer) {
                  await this.figmaScreensRepository.update(
                      { extractedImage: buffer },
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

  async uploadManualScreen(projectId: string, projectType: string, screenName: string, imageBuffer: Buffer): Promise<FigmaScreens> {
      // Check if screen exists to update or create new
      const existingScreen = await this.figmaScreensRepository.findOne({
          where: {
              projectId,
              projectType,
              screenName
          }
      });

      if (existingScreen) {
          await existingScreen.update({
              extractedImage: imageBuffer,
              // Keep existing nodeId/url if they exist, or use defaults for manual overrides
          });
          return existingScreen;
      } else {
          return this.figmaScreensRepository.create<FigmaScreens>({
              projectId,
              projectType,
              screenName,
              extractedImage: imageBuffer,
              nodeId: `manual-${Date.now()}`,
              figmaUrl: 'manual-upload'
          } as any);
      }
  }

  private async fetchImageFromFigmaUrl(url: string): Promise<Buffer | null> {
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

        const response = await fetch(imageUrl);
        if (!response.ok) {
           console.error(`Failed to fetch image content: ${response.statusText}`);
           return null; 
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
          console.error(`Error extracting image from URL ${url}:`, error);
          return null;
      }
  }
}
