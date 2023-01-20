import {
  ResourceDiffRecord,
  SmokeTestOptions,
  TemplateChecks,
  S3_BUCKET,
  getStandardResourceType,
  VPC,
  EIP,
  logger
} from '@tinystacks/predeploy-infra';
import {
  checkEipQuota
} from './eip-quota-checks';
import {
  checkS3Quota
} from './s3-quota-checks';
import {
  checkVpcQuota
} from './vpc-quota-checks';

interface ResourceGroup {
  [key: string]: ResourceDiffRecord[]
}

class TinyStacksAwsTemplateChecks extends TemplateChecks {
  
  quotaChecks: { [key: string]: (resources: ResourceDiffRecord[]) => Promise<void> };
  constructor () {
    super();
    this.quotaChecks = {
      [S3_BUCKET]: checkS3Quota,
      [VPC]: checkVpcQuota,
      [EIP]: checkEipQuota
    };
  }

  async checkQuotas (allResources: ResourceDiffRecord[]): Promise<Error[]> {
    const groupedByType: ResourceGroup = allResources.reduce<ResourceGroup>((acc: ResourceGroup, resource: ResourceDiffRecord) => {
      const resourceType = getStandardResourceType(resource.resourceType);
      acc[resourceType] = acc[resourceType] || [];
      acc[resourceType].push(resource);
      return acc;
    }, {});
    const resourceGroups = Object.entries(groupedByType);
    const quotaCheckErrors: Error[] = [];
    for (const [resourceType, resources] of resourceGroups) {
      const standardResourceType = getStandardResourceType(resourceType);
      const quotaCheck = this.quotaChecks[standardResourceType];
      if (quotaCheck) await quotaCheck(resources).catch(error => quotaCheckErrors.push(error));
    }
    return quotaCheckErrors;
  }
  
  async checkTemplate (resources: ResourceDiffRecord[], _config: SmokeTestOptions) {
    const quotaErrors = await this.checkQuotas(resources);
    quotaErrors.forEach(logger.cliError, logger);
  }
}


export {
  TinyStacksAwsTemplateChecks
};
export default TinyStacksAwsTemplateChecks;