import {gql} from '@apollo/client';

export const GET_ARCHIVE_INFO = gql`
    query ProvisioningGeneratorArchiveInfo {
        provisioningGeneratorIsGenerating
        provisioningGeneratorArchiveInfo {
            createdAt
        }
    }
`;

export const GET_MODULE_LIST = gql`
    query ProvisioningGeneratorListModules {
        provisioningGeneratorListModules {
            symbolicName
            name
            groupId
            version
        }
    }
`;

export const GENERATE_PROVISIONING_ARCHIVE = gql`
    mutation GenerateProvisioningArchive($modules: [String]) {
        provisioningGeneratorGenerate(modules: $modules)
    }
`;

export const DELETE_PROVISIONING_ARCHIVE = gql`
    mutation DeleteProvisioningArchive {
        provisioningGeneratorDelete
    }
`;
