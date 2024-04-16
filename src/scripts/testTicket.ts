import createZendeskTicket from "../functions/utils/createZenTicket.js";

const body = `test ticket 


with a line break

`;

(async () => {
  console.log(
    await createZendeskTicket({
      // requesterEmail: undefined,
      // requesterEmail: "cshotam@gmail.com",
      requesterName: "billy bob",
      body: body,
      subject: "test ticket",
      magentoOrderNo: "99",
    }),
  );
})();
