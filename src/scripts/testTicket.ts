import createZendeskTicket from "../functions/utils/createZenTicket.js";

const body = `test ticket 


with a line break

`;

(async () => {
  console.log(
    await createZendeskTicket(
      "cshotam@gmail.com",
      "billy bob",
      body,
      "test ticket",
      "99",
    ),
  );
})();
