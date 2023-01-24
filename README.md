# @tinystacks/aws-template-checks
A set of pre-deployment template checks intended as a plugin for [@tinystacks/precloud](https://www.npmjs.com/package/@tinystacks/precloud).

## How To Use
By default, this plugin is included as a peer dependency of the [precloud cli](https://github.com/tinystacks/precloud) and is therefore always available.

## Supported Template Checks
This plugin performs the following checks when `precloud check` is run:
1. Verifies new EIPs would not exceed the service quota for the configured region.
1. Verifies new VPCs would not exceed the service quota for the configured region.
1. Verifies new S3 buckets would not exceed the service quota for the configured region.