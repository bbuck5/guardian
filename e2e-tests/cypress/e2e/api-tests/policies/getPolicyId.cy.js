/// <reference types="cypress" />

import { policyId } from "../../../fixtures/policy.json";

context('Policies', () => {
    const authorization = Cypress.env('authorization');

    it('check returns of the policy', () => {
      const urlPoliciesId = {
        method: 'GET',
        url: Cypress.env('api_server') + 'policies/' + policyId,
        headers: {
          authorization,
        }};
      cy.request(urlPoliciesId)
          .should((response) => {
          expect(response.status).to.eq(200)
          expect(response.body).to.not.be.oneOf([null, ""])
          expect(response.body.id).to.equal(policyId)
          
          let children = response.body.config.children
          
          cy.writeFile('cypress/fixtures/policyTags.json', 
              { id: children[0].id,
                tag: children[0].tag,
                blockType: children[0].blockType,
          });
        })
    })
})