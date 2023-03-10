const mockLoggerInfo = jest.fn();
const mockGetCredentials = jest.fn();
const mockDescribeAddresses = jest.fn();
const mockEc2 = jest.fn();
const mockGetServiceQuota = jest.fn();
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
    EIP: original.EIP,
    getStandardResourceType: original.getStandardResourceType,
    QuotaError: original.QuotaError
  };
});

jest.mock('../src/utils/aws', () => ({
  getCredentials: mockGetCredentials
}));

jest.mock('@aws-sdk/client-ec2', () => ({
  __esModule: true,
  EC2: mockEc2
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
  checkEipQuota
} from '../src/eip-quota-checks';

describe('eip smoke tests', () => {
  beforeEach(() => {
    mockEc2.mockReturnValue({
      describeAddresses: mockDescribeAddresses
    });
    mockServiceQuotas.mockReturnValue({
      getServiceQuota: mockGetServiceQuota
    });
  });

  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });

  describe('checkEipQuota', () => {
    it('does nothing if no resource has a change type of create', async () => {
      const resource = {
        changeType: ChangeType.UPDATE
      } as ResourceDiffRecord;

      await checkEipQuota([resource]);

      expect(mockLoggerInfo).not.toBeCalled();
      expect(mockGetCredentials).not.toBeCalled();
      expect(mockServiceQuotas).not.toBeCalled();
      expect(mockGetServiceQuota).not.toBeCalled();
      expect(mockEc2).not.toBeCalled();
      expect(mockDescribeAddresses).not.toBeCalled();
    });
    it('validates quota would not be exceeded if change type is create', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.awsCdk,
        resourceType: 'AWS::EC2::EIP',
        properties: {}
      } as unknown as ResourceDiffRecord;

      mockGetServiceQuota.mockResolvedValueOnce({
        Quota: {
          Value: 5
        }
      });
      mockDescribeAddresses.mockResolvedValueOnce({
        Addresses: Array(2)
      });
      

      await checkEipQuota([resource, resource]);

      expect(mockLoggerInfo).toBeCalled();
      expect(mockLoggerInfo).toBeCalledWith('Checking Elastic IP service quota...');
      expect(mockGetCredentials).toBeCalled();
      expect(mockGetServiceQuota).toBeCalled();
      expect(mockDescribeAddresses).toBeCalled();
    });
    it('throws a QuotaError if new eip would exceed quota limit', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.tf,
        resourceType: 'aws_eip',
        properties: {}
      } as unknown as ResourceDiffRecord;
      
      mockGetServiceQuota.mockResolvedValueOnce({
        Quota: {
          Value: 5
        }
      });
      mockDescribeAddresses.mockResolvedValueOnce({
        Addresses: Array(5)
      });

      let thrownError;
      try {
        await checkEipQuota([resource]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Checking Elastic IP service quota...');
        expect(mockGetCredentials).toBeCalled();
        expect(mockGetServiceQuota).toBeCalled();
        expect(mockDescribeAddresses).toBeCalled();

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Quota Limit Reached!');
        expect(thrownError).toHaveProperty('reason', 'This stack needs to create 1 elastic IP address(es), but only 0 more can be created within this region with the current quota limit! Release any unassociated EIPs, request a quota increase, or choose another region to continue.');
      }
    });
  });
});