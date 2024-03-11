import { Page } from "puppeteer";
import { pressEnterManyTimes } from "./utils/pressEnterManyTimes.js";

export default async function navigateToSellScreen(prontoPage: Page) {
  console.log("nav to sell screen fun running");
  await prontoPage.bringToFront();
  //Go to status 30 screen
  const salesOrder = "button.folder[name='Sales &Orders']";
  await prontoPage.waitForSelector(salesOrder);
  await prontoPage.click(salesOrder);

  await prontoPage.waitForSelector(
    "button.folder[name='&Enquire on Sales Orders']",
  );
  const orderEditMaintenance =
    "button.folder[name='&Order Edit / Maintenance']";
  await prontoPage.waitForSelector(orderEditMaintenance);
  await prontoPage.click(orderEditMaintenance);

  const salesOrderManagement = "button[name='&Sales Order Management']";
  await prontoPage.waitForSelector(salesOrderManagement);
  await prontoPage.click(salesOrderManagement);

  // press enter many times
  const firstInput = "input[title='Enter the customer you wish to enquire on']";
  await prontoPage.waitForSelector(firstInput);
  await pressEnterManyTimes(prontoPage, 4);
  await prontoPage.keyboard.type("208");

  await pressEnterManyTimes(prontoPage, 4);
  await prontoPage.keyboard.type("30");
  await pressEnterManyTimes(prontoPage, 8);
  await prontoPage.waitForSelector("td.data-tbody");
}
