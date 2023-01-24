import { EC2 } from '@aws-sdk/client-ec2';
import { ServiceQuotas } from '@aws-sdk/client-service-quotas';
import {
  ChangeType,
  ResourceDiffRecord,
  logger,
  QuotaError,
  VPC,
  getStandardResourceType
} from '@tinystacks/precloud';
import { getCredentials } from './utils/aws';

async function checkVpcQuota (resources: ResourceDiffRecord[]) {
  const newVpcCount = resources.filter(resource =>
    getStandardResourceType(resource.resourceType) === VPC &&
    resource.changeType === ChangeType.CREATE
  ).length;

  if (newVpcCount === 0) return;

  logger.info('Checking VPC service quota...');
  const DEFAULT_VPC_QUOTA = 5;
  const DEFAULT_NUMBER_OF_VPCS = 1;

  const config = { credentials: await getCredentials() };

  const quotaClient = new ServiceQuotas(config);
  const quotaResponse = await quotaClient.getAWSDefaultServiceQuota({
    ServiceCode: 'vpc',
    QuotaCode: 'L-F678F1CE'
  });

  const vpcQuota = quotaResponse?.Quota?.Value || DEFAULT_VPC_QUOTA;

  const ec2Client = new EC2(config);
  const vpcResponse = await ec2Client.describeVpcs({});
  
  const currentNumberOfVpcs = vpcResponse?.Vpcs?.length || DEFAULT_NUMBER_OF_VPCS;
  const remainingNumberOfVpcs = vpcQuota - currentNumberOfVpcs;
  const proposedNumberOfVpcs = currentNumberOfVpcs + newVpcCount;
  if (vpcQuota < proposedNumberOfVpcs) {
    throw new QuotaError(`This stack needs to create ${newVpcCount} VPC(s), but only ${remainingNumberOfVpcs} more can be created with the current quota limit! Request a quota increase or choose another region to continue.`);
  }
}

export {
  checkVpcQuota
};