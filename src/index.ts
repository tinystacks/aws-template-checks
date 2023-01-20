import {
  ResourceDiffRecord,
  SmokeTestOptions,
  QuotaChecker,
  S3_BUCKET,
  getStandardResourceType,
  VPC,
  EIP
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

class TinyStacksAwsQuotaChecker extends QuotaChecker {
  
  quotaChecks: {
    [key: string]: (resources: ResourceDiffRecord[]) => Promise<void>
  } = {
      [S3_BUCKET]: checkS3Quota,
      [VPC]: checkVpcQuota,
      [EIP]: checkEipQuota
    };
  
  async checkQuota (resourceType: string, resources: ResourceDiffRecord[], _config: SmokeTestOptions) {
    const standardResourceType = getStandardResourceType(resourceType);
    const quotaCheck = this.quotaChecks[standardResourceType];
    if (quotaCheck) return quotaCheck(resources);
  }
}


export {
  TinyStacksAwsQuotaChecker
};
export default TinyStacksAwsQuotaChecker;