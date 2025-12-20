import { Injectable, Inject, Logger } from '@nestjs/common';
import { Result } from '../../shared/entity/index.js';

@Injectable()
export class ResultService {
  private readonly logger = new Logger(ResultService.name);

  constructor(
    @Inject('RESULT_REPOSITORY')
    private resultRepository: typeof Result,
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
        if (resultJson.heapmapResult) {
            resultJson.heapmapResult = `data:image/png;base64,${Buffer.from(resultJson.heapmapResult).toString('base64')}`;
        }
        return resultJson;
      });
    } catch (error) {
      this.logger.error('Error fetching results', error);
      throw error;
    }
  }
}
