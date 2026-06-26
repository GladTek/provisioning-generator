import {DocumentNode} from 'graphql';

describe('Provisioning Generator', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const generateArchive: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/generateArchive.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const deleteArchive: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/deleteArchive.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getArchiveInfo: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/query/getArchiveInfo.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const listModules: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/query/listModules.graphql');

    const graphqlRequestOptions = {
        method: 'POST' as const,
        url: '/modules/graphql',
        headers: {'Content-Type': 'application/json', Origin: Cypress.config('baseUrl')},
        auth: {
            username: Cypress.env('SUPER_USER_LOGIN') || 'root',
            password: Cypress.env('SUPER_USER_PASSWORD')
        },
        failOnStatusCode: false
    };

    before(() => {
        cy.login();
        // Best-effort cleanup of any archive left over from a previous run
        cy.request({
            ...graphqlRequestOptions,
            body: {query: 'mutation { provisioningGeneratorDelete }'}
        });
    });

    after(() => {
        // Clean up the archive created during the test run
        cy.request({
            ...graphqlRequestOptions,
            body: {query: 'mutation { provisioningGeneratorDelete }'}
        });
    });

    it('provisioning API is available and accepts karaf commands', () => {
        cy.request({
            method: 'POST',
            url: '/modules/api/provisioning',
            headers: {'Content-Type': 'application/yaml'},
            auth: {
                username: Cypress.env('SUPER_USER_LOGIN') || 'root',
                password: Cypress.env('SUPER_USER_PASSWORD')
            },
            body: '- karafCommand: "log:log \'provisioning-generator cypress test\'"'
        }).its('status').should('eq', 200);
    });

    it('archive info returns null when no archive exists', () => {
        cy.apollo({query: getArchiveInfo})
            .its('data.provisioningGeneratorArchiveInfo')
            .should('be.null');
    });

    it('isGenerating returns false when idle', () => {
        cy.request({
            ...graphqlRequestOptions,
            body: {query: 'query { provisioningGeneratorIsGenerating }'}
        }).its('body.data.provisioningGeneratorIsGenerating').should('eq', false);
    });

    it('listModules returns at least one active module with required fields', () => {
        cy.apollo({query: listModules})
            .its('data.provisioningGeneratorListModules')
            .should('be.an', 'array')
            .and('have.length.greaterThan', 0)
            .then((mods: Array<{symbolicName: string; name: string; groupId: string; version: string}>) => {
                const first = mods[0];
                expect(first).to.have.property('symbolicName').that.is.a('string').and.is.not.empty;
                expect(first).to.have.property('name').that.is.a('string').and.is.not.empty;
                expect(first).to.have.property('groupId').that.is.a('string').and.is.not.empty;
                expect(first).to.have.property('version').that.is.a('string').and.is.not.empty;
            });
    });

    it('generate with a specific module list produces an archive', () => {
        // First get a real symbolic name to use as filter
        cy.apollo({query: listModules})
            .its('data.provisioningGeneratorListModules')
            .then((mods: Array<{symbolicName: string}>) => {
                const symbolicName = mods[0].symbolicName;
                cy.apollo({
                    mutation: generateArchive,
                    variables: {modules: [symbolicName]}
                })
                    .its('data.provisioningGeneratorGenerate')
                    .should('eq', true);

                cy.apollo({query: getArchiveInfo})
                    .its('data.provisioningGeneratorArchiveInfo.createdAt')
                    .should('be.a', 'string');
            });
    });

    it('generates a provisioning archive and exposes a creation date', () => {
        cy.apollo({mutation: generateArchive})
            .its('data.provisioningGeneratorGenerate')
            .should('eq', true);

        cy.apollo({query: getArchiveInfo})
            .its('data.provisioningGeneratorArchiveInfo.createdAt')
            .should('be.a', 'string')
            .and('match', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('generate command can be run multiple times without errors', () => {
        cy.apollo({mutation: generateArchive})
            .its('data.provisioningGeneratorGenerate')
            .should('eq', true);

        cy.apollo({mutation: generateArchive})
            .its('data.provisioningGeneratorGenerate')
            .should('eq', true);
    });

    it('deletes the provisioning archive', () => {
        cy.apollo({mutation: deleteArchive})
            .its('data.provisioningGeneratorDelete')
            .should('eq', true);

        cy.apollo({query: getArchiveInfo})
            .its('data.provisioningGeneratorArchiveInfo')
            .should('be.null');
    });
});
