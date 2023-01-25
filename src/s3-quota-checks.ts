import { S3 } from '@aws-sdk/client-s3';
import { ServiceQuotas } from '@aws-sdk/client-service-quotas';
import {
  ChangeType,
  ResourceDiffRecord,
  logger,
  QuotaError,
  S3_BUCKET,
  getStandardResourceType
} from '@tinystacks/precloud';
import { getCredentials } from './utils/aws';

async function checkS3Quota (resources: ResourceDiffRecord[]) {
  const newBucketCount = resources.filter(resource =>
    getStandardResourceType(resource.resourceType) === S3_BUCKET &&
    resource.changeType === ChangeType.CREATE
  ).length;

  if (newBucketCount === 0) return;
  
  logger.info('Checking S3 bucket service quota...');
  const DEFAULT_BUCKET_QUOTA = 100;
  const DEFAULT_NUMBER_OF_BUCKETS = 1;

  const config = { credentials: await getCredentials() };

  const quotaClient = new ServiceQuotas(config);
  const quotaResponse = await quotaClient.getServiceQuota({
    ServiceCode: 's3',
    QuotaCode: 'L-DC2B2D3D'
  });

  const { Quota: {
    Value: s3Quota = DEFAULT_BUCKET_QUOTA
  } = {} } = quotaResponse || {};

  const s3Client = new S3(config);
  const s3Response = await s3Client.listBuckets({});
  
  const currentNumberOfBuckets = s3Response?.Buckets?.length || DEFAULT_NUMBER_OF_BUCKETS;
  const remainingNumberOfBuckets = s3Quota - currentNumberOfBuckets;
  const proposedNumberOfBuckets = currentNumberOfBuckets + newBucketCount;
  if (s3Quota < proposedNumberOfBuckets) {
    throw new QuotaError(`This stack needs to create ${newBucketCount} S3 bucket(s), but only ${remainingNumberOfBuckets} more can be created with the current quota limit!  Request a quota increase to continue.`);
  } 
}


export {
  checkS3Quota
};