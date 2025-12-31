import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result, FigmaScreens, Screenshot, ModelResult } from '../../shared/entity/index.js';
import { StoreModelResultDto } from './dto/model-result.dto.js';

@Injectable()
export class ResultService {
  private readonly logger = new Logger(ResultService.name);

  constructor(
    @Inject('RESULT_REPOSITORY')
    private resultRepository: typeof Result,
    @Inject('FIGMA_SCREENS_REPOSITORY')
    private figmaScreensRepository: typeof FigmaScreens,
    @Inject('SCREENSHOT_REPOSITORY')
    private screenshotRepository: typeof Screenshot,
    @Inject('MODEL_RESULT_REPOSITORY')
    private modelResultRepository: typeof ModelResult,
  ) {}

  async getResults(projectId: string, buildId: string) {
    try {
      this.logger.log(`Fetching results for projectId: ${projectId}, buildId: ${buildId}`);
      const results = await this.resultRepository.findAll({
        where: {
          projectId,
          buildId,
        },
      });

      return results.map((result) => {
        const resultJson = result.toJSON() as any;
        return resultJson;
      });
    } catch (error) {
      this.logger.error('Error fetching results', error);
      throw error;
    }
  }

  async getDetailedResult(projectId: string, buildId: string, screenName: string, projectType?: string) {
     try {
       this.logger.log(`Fetching detailed result for ${projectId}, ${buildId}, ${screenName}`);

       // 1. Fetch Result (Comparison Data)
       const result = await this.resultRepository.findOne({
         where: { projectId, buildId, imageName: screenName }
       });

       // 2. Fetch Actual Screenshot (Build Image)
       const screenshot = await this.screenshotRepository.findOne({
         where: { projectId, buildId, imageName: screenName }
       });
       this.logger.log(`Screenshot found: ${!!screenshot} for ${screenName}`);
       if (!screenshot) {
           const allScreenshots = await this.screenshotRepository.findAll({ where: { projectId, buildId } });
           this.logger.log(`Available Screenshots for build ${buildId}: ${allScreenshots.map(s => s.imageName).join(', ')}`);
       }

       // 3. Fetch Baseline Image (Figma Screen)
       const figmaQuery: any = { projectId, screenName };
       if (projectType) {
         figmaQuery.projectType = projectType; // Ensure casing matches DB
       }
       this.logger.log(`Figma Query: ${JSON.stringify(figmaQuery)}`);
       const figmaScreen = await this.figmaScreensRepository.findOne({
          where: figmaQuery
       });
       this.logger.log(`Figma Screen found: ${!!figmaScreen}`);
       if (!figmaScreen) {
           const allFigma = await this.figmaScreensRepository.findAll({ where: { projectId } });
           this.logger.log(`Available Figma Screens for project ${projectId}: ${allFigma.map(f => `${f.screenName} (${f.projectType})`).join(', ')}`);
       }

       return {
         // Identifiers
         projectId,
         buildId,
         screenName,
         
         // Result Data
         resultStatus: result?.resultStatus ?? 0,
         diffPercent: result?.diffPercent ?? 0,
         diffImageUrl: result?.heapmapResult || null, // Note: field is typo'd in entity as heapmapResult or similar
         coordinates: result?.coordinates || null,
         
         // Images
         baselineImageUrl: figmaScreen?.extractedImage || null,
         actualImageUrl: screenshot?.screenshot || null,
         
         // Other metadata if needed
         createdAt: result?.createdAt || new Date().toISOString()
       };

     } catch (e) { 
        this.logger.error('Error fetching detailed result', e);
        throw e; 
     }
  }

  async getModelResult(projectId: string, buildId: string, imageName: string, projectType: string) {
    try {
      this.logger.log(`Fetching model result for projectId: ${projectId}, buildId: ${buildId}, imageName: ${imageName}`);
      
      const modelResult = await this.modelResultRepository.findOne({
        where: {
          projectId,
          buildId,
          imageName,
          projectType
        }
      });

      return modelResult;
    } catch (error) {
      this.logger.error('Error fetching model result', error);
      throw error;
    }
  }

//   async storeModelResult(storeModelResultDto: StoreModelResultDto) {
//     try {
//       this.logger.log(`Storing model result for projectId: ${storeModelResultDto.projectId}, buildId: ${storeModelResultDto.buildId}`);
      
//       const { projectId, buildId, projectType, data } = storeModelResultDto;
//       const recordsToCreate = data.map(item => ({
//         projectId,
//         buildId,
//         projectType,
//         imageName: item.imageName,
//         coordsVsText: item.analysis,
//       }));

//       await this.modelResultRepository.bulkCreate(recordsToCreate as any);
      
//       return { success: true, message: 'Model results stored successfully' };
//     } catch (error) {
//       this.logger.error('Error storing model results', error);
//       throw error;
//     }
//   }
}
