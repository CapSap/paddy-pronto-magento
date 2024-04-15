export default async function createZendeskTicket(
  requesterEmail: string,
  requesterName: string,
  body: string,
  subject: string,
  magentoOrderNo: string,
) {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const base64Encoded = btoa(
    `${process.env.ZEN_USER}/token:${process.env.ZEN_TOKEN}`,
  );

  myHeaders.append("Authorization", `Basic ${base64Encoded}`);

  const ticketPayload = {
    assignee_email: "customerservice@paddypallin.com.au",
    comment: {
      body: body,
    },
    subject: subject,
    tags: ["of_todo"],
    requester: { name: requesterName, email: requesterEmail },
    custom_fields: [{ id: "5986546802191", value: magentoOrderNo }],
  };

  const raw = JSON.stringify({ tickets: ticketPayload });

  console.log("tcket payload", ticketPayload);

  const requestOptions: RequestInit = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  try {
    return await fetch(
      "https://paddypallin.zendesk.com/api/v2/tickets/create_many",
      requestOptions,
    ).then((result) => {
      return JSON.stringify({
        message: "request sent to zendesk",
        body: result,
      });
    });
  } catch (error) {
    console.error("error with making post request to zendesk", error);
    return JSON.stringify({
      message: "there was an error making post request to zendesk",
      body: error,
    });
  }
}
