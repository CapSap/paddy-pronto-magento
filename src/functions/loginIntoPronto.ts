import { generateToken } from "authenticator";
import { Page } from "puppeteer";

export default async function loginIntoPronto(prontoPage: Page) {
  console.log("loginto pronto starting");
  // nav to pronto login screen and enter relevant deets
  await prontoPage.goto("https://pronto.paddypallin.com.au/");
  // sometimes page shows the verification page and the login fails. not sure why
  // below will try to find the login input element and return a rejected promise so that retry can run
  try {
    await prontoPage.waitForSelector("#login-username");
  } catch {
    await prontoPage.click("button#login-button");
    return Promise.reject(
      "could not log into pronto. could not find the login-username input",
    );
  }
  // enter login details
  await prontoPage.type(
    "#login-username",
    process.env.PRONTO_USERNAME as string,
  );
  await prontoPage.type(
    "#login-password",
    process.env.PRONTO_PASSWORD as string,
  );
  const prontoLoginButton = "#login-button";
  await prontoPage.waitForSelector(prontoLoginButton);
  await prontoPage.click(prontoLoginButton);
  // enter 2 factor and login
  const otp = generateToken(process.env.PRONTO_KEY as string);
  await prontoPage.type("input#prompts", otp);
  const prontoLoginButtonFinal = "#login-button";
  await prontoPage.waitForSelector(prontoLoginButtonFinal);
  await prontoPage.click(prontoLoginButtonFinal);

  // return a promise based upon did login succeed and throw if login failed
  try {
    await prontoPage.waitForSelector("button.folder[name='Sales &Orders']");
  } catch (err) {
    console.error(err);
    return Promise.reject("did not login into pronto");
  }
  return Promise.resolve("pronto login successfully");
}
