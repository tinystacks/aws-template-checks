const mockCheckS3Quota = jest.fn();
const mockCheckVpcQuota = jest.fn();
const mockCheckEipQuota = jest.fn();

jest.mock('../src/s3-quota-checks.ts', () => ({
  checkS3Quota: mockCheckS3Quota  
}));
jest.mock('../src/vpc-quota-checks.ts', () => ({
  checkVpcQuota: mockCheckVpcQuota
}));
jest.mock('../src/eip-quota-checks.ts', () => ({
  checkEipQuota: mockCheckEipQuota
}));

import { TinyStacksAwsQuotaChecker } from '../src';
import {
  CloudformationTypes,
  TerraformTypes,
  ResourceDiffRecord
} from '@tinystacks/predeploy-infra';

const {
  CFN_S3_BUCKET,
  CFN_EIP
} = CloudformationTypes;
const {
  TF_VPC,
  TF_INTERNET_GATEWAY
} = TerraformTypes;

describe('TinyStacksAwsQuotaChecker', () => {
  const quotaChecker = new TinyStacksAwsQuotaChecker();
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('does nothing if resource is not supported', async () => {
    const mockResource = {
      resourceType: TF_INTERNET_GATEWAY
    } as ResourceDiffRecord;

    await quotaChecker.checkQuota(TF_INTERNET_GATEWAY, [mockResource], {});

    expect(mockCheckS3Quota).not.toBeCalled();
    expect(mockCheckEipQuota).not.toBeCalled();
    expect(mockCheckVpcQuota).not.toBeCalled();
  });
  it('checks s3 bucket quota', async () => {
    const mockResource = {
      resourceType: CFN_S3_BUCKET
    } as ResourceDiffRecord;

    await quotaChecker.checkQuota(CFN_S3_BUCKET, [mockResource], {});

    expect(mockCheckS3Quota).toBeCalled();
    expect(mockCheckS3Quota).toBeCalledWith([mockResource]);
    expect(mockCheckEipQuota).not.toBeCalled();
    expect(mockCheckVpcQuota).not.toBeCalled();
  });
  it('checks eip quota', async () => {
    const mockResource = {
      resourceType: CFN_EIP
    } as ResourceDiffRecord;

    await quotaChecker.checkQuota(CFN_EIP, [mockResource], {});

    expect(mockCheckS3Quota).not.toBeCalled();
    expect(mockCheckEipQuota).toBeCalled();
    expect(mockCheckEipQuota).toBeCalledWith([mockResource]);
    expect(mockCheckVpcQuota).not.toBeCalled();
  });
  it('checks vpc quota', async () => {
    const mockResource = {
      resourceType: TF_VPC
    } as ResourceDiffRecord;

    await quotaChecker.checkQuota(TF_VPC, [mockResource], {});

    expect(mockCheckS3Quota).not.toBeCalled();
    expect(mockCheckEipQuota).not.toBeCalled();
    expect(mockCheckVpcQuota).toBeCalled();
    expect(mockCheckVpcQuota).toBeCalledWith([mockResource]);
  });
});