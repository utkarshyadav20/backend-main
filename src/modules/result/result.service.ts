import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result, FigmaScreens, Screenshot, ModelResult, Projects, Build } from '../../shared/entity/index.js';

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
    @Inject('PROJECT_REPOSITORY')
    private projectRepository: typeof Projects,
    @Inject('BUILD_REPOSITORY')
    private buildRepository: typeof Build,
  ) { }

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

  async getBuildReport(projectId: string, buildId: string) {
    try {

      // 1. Fetch Metadata
      const [project, build] = await Promise.all([
        this.projectRepository.findOne({ where: { projectId } }),
        this.buildRepository.findOne({ where: { buildId } })
      ]);
      console.log(project, build);
      // 2. Fetch all results for this build
      const results = await this.resultRepository.findAll({
        where: { projectId, buildId }
      });

      // 3. Aggregate data for each result
      const rows = await Promise.all(results.map(async (result) => {
        const screenName = result.imageName; // Assuming imageName corresponds to screenName

        // Parallel fetch for details
        const [figmaScreen, screenshot, modelResult] = await Promise.all([
          this.figmaScreensRepository.findOne({ where: { projectId, screenName } }),
          this.screenshotRepository.findOne({ where: { projectId, buildId, imageName: result.imageName } }),
          this.modelResultRepository.findOne({
            where: { projectId, buildId, imageName: result.imageName }
          })
        ]);

        // Construct Row Data
        // Merge visual result data
        const rowData = {
          // Identity
          projectId: result.projectId,
          buildId: result.buildId,
          screenName: result.imageName,

          // Status & Stats
          resultStatus: result.resultStatus,
          diffPercent: result.diffPercent,

          // Images
          diffImageUrl: result.heapmapResult,
          baselineImageUrl: figmaScreen?.extractedImage || null,
          actualImageUrl: screenshot?.screenshot || null,

          // Coordinates & Analysis
          coordinates: result.coordinates,

          // AI Analysis (flat merge if requested, or nested)
          // The user requested "join of common properties", specifically asking for "coordsVsText" data.
          // We will attach the full model result data or merge its analysis
          modelAnalysis: modelResult ? {
            id: modelResult.id,
            coordsVsText: modelResult.coordsVsText
          } : null,

          createdAt: result.createdAt
        };

        return rowData;
      }));

      return {
        details: {
          projectId,
          projectName: project?.dataValues?.projectName || 'Unknown Project',
          projectType: project?.dataValues?.projectType || 'Unknown Type',
          buildId,
          buildName: build?.dataValues?.buildName || buildId,
          timestamp: new Date().toISOString()
        },
        rows
      };

    } catch (error) {
      this.logger.error('Error generating build report', error);
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
