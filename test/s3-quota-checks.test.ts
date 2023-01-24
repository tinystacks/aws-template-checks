const mockLoggerInfo = jest.fn();
const mockGetCredentials = jest.fn();
const mockListBuckets = jest.fn();
const mockHeadBucket = jest.fn();
const mockS3 = jest.fn();
const mockGetAwsDefaultServiceQuota = jest.fn();
const mockServiceQuotas = jest.fn();

jest.mock('@tinystacks/precloud', () => {
  const original = jest.requireActual('@tinystacks/precloud');
  return {
    logger: {
      info: mockLoggerInfo
    },
    ChangeType: original.ChangeType,
    IacFormat: original.IacFormat,
    ResourceDiffRecord: original.ResourceDiffRecord,
    S3_BUCKET: original.S3_BUCKET,
    getStandardResourceType: original.getStandardResourceType,
    QuotaError: original.QuotaError
  };
});

jest.mock('../src/utils/aws', () => ({
  getCredentials: mockGetCredentials
}));

jest.mock('@aws-sdk/client-s3', () => ({
  __esModule: true,
  S3: mockS3
}));

jest.mock('@aws-sdk/client-service-quotas', () => ({
  __esModule: true,
  ServiceQuotas: mockServiceQuotas
}));

import {
  ChangeType,
  IacFormat,
  ResourceDiffRecord
} from '@tinystacks/precloud';
import {
  checkS3Quota
} from '../src/s3-quota-checks';

describe('s3 smoke tests', () => {
  beforeEach(() => {
    mockS3.mockReturnValue({
      listBuckets: mockListBuckets,
      headBucket: mockHeadBucket
    });
    mockServiceQuotas.mockReturnValue({
      getAWSDefaultServiceQuota: mockGetAwsDefaultServiceQuota
    });
  });

  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });

  describe('checkS3Quota', () => {
    it('does nothing if no resource has a change type of create', async () => {
      const resource = {
        changeType: ChangeType.UPDATE
      } as ResourceDiffRecord;

      await checkS3Quota([resource]);

      expect(mockLoggerInfo).not.toBeCalled();
      expect(mockGetCredentials).not.toBeCalled();
      expect(mockS3).not.toBeCalled();
      expect(mockListBuckets).not.toBeCalled();
    });
    it('validates quota would not be exceeded and bucket name is unique if change type is create', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.awsCdk,
        resourceType: 'AWS::S3::Bucket',
        properties: {
          Name: 'mock-bucket'
        }
      } as unknown as ResourceDiffRecord;

      mockGetAwsDefaultServiceQuota.mockResolvedValueOnce({
        Quota: {
          Value: 100
        }
      });
      mockListBuckets.mockResolvedValueOnce({
        Buckets: Array(98)
      });

      await checkS3Quota([resource, resource]);

      expect(mockLoggerInfo).toBeCalled();
      expect(mockLoggerInfo).toBeCalledWith('Checking S3 bucket service quota...');
      expect(mockGetCredentials).toBeCalled();
      expect(mockGetAwsDefaultServiceQuota).toBeCalled();
      expect(mockListBuckets).toBeCalled();
    });
    it('throws a QuotaError if new bucket would exceed quota limit', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.tf,
        resourceType: 'aws_s3_bucket',
        properties: {
          Name: 'mock-bucket'
        }
      } as unknown as ResourceDiffRecord;
      
      mockGetAwsDefaultServiceQuota.mockResolvedValueOnce({
        Quota: {
          Value: 100
        }
      });
      mockListBuckets.mockResolvedValueOnce({
        Buckets: Array(100)
      });

      let thrownError;
      try {
        await checkS3Quota([resource]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalledTimes(1);
        expect(mockLoggerInfo).toBeCalledWith('Checking S3 bucket service quota...');
        expect(mockGetCredentials).toBeCalled();
        expect(mockGetAwsDefaultServiceQuota).toBeCalled();
        expect(mockListBuckets).toBeCalled();

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Quota Limit Reached!');
        expect(thrownError).toHaveProperty('reason', 'This stack needs to create 1 S3 bucket(s), but only 0 more can be created with the current quota limit!  Request a quota increase to continue.');
      }
    });
  });
});