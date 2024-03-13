async function createZendeskTicket(order) {
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  const base64Encoded = btoa(
    `${process.env.ZEN_USER}/token:${process.env.ZEN_TOKEN}`,
  );

  myHeaders.append("Authorization", `Basic ${base64Encoded}`);

  const data = JSON.stringify({
    ticket: {
      comment: {
        body: "Hi team cs, the following order was sold but we discoverd that we've got an CWS not found error. Could you please follow up with customer? Cheers",
      },
      priority: "urgent",
      subject: "E-Gift card error - CWS not found",
      tags: ["CWS_not_found"],
    },
  });
  const config = {
    method: "POST",
    url: "https://example.zendesk.com/api/v2/tickets",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic <auth-value>",
      // Base64 encoded "username:password"
    },
    data: data,
  };
  const requestOptions: RequestInit = {
    method: "POST",
    headers: myHeaders,
    body: data,
    redirect: "follow",
  };

  // try fetch here
  try {
    return await fetch(
      "https://paddypallin.zendesk.com/api/v2/tickets/",
      requestOptions,
    ).then((res) => res.text().then((result) => console.log(result)));
  } catch (err) {
    console.error("Error making post req to zen", err);
  }
}

export default createZendeskTicket;
