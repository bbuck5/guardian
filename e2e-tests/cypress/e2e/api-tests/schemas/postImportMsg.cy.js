import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Schemas", () => {
    const authorization = Cypress.env("authorization");

    it("import the message", () => {
        cy.sendRequest(METHOD.GET, API.Schemas, { authorization }).then(
            (resp) => {
                const topicUid = resp.body[0].topicId;
                        cy.request({
                            method: METHOD.POST,
                            url: API.Schemas + topicUid + "/import/message",
                            headers: {
                                authorization,
                            },
                            body: {
                                messageId: "1663856382.530222947",
                            },
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.SUCCESS);
                            expect(response.body).to.not.be.oneOf([null, ""])
                        });
                    });
            }
        );
    });
