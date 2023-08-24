import { register, logIn, logOut, openRealm } from "./realm-auth";
import { addDummyData, updateDummyData, deleteDummyData, getStore } from "./realm-query";

const exampleEmail = "john@doe.com";
const examplePassword = "123456";

async function main(): Promise<void> {
  let success = await register(exampleEmail, examplePassword);
  if (!success) {
    return;
  }

  success = await logIn(exampleEmail, examplePassword);
  if (!success) {
    return;
  }

  await openRealm();

  // Cleaning the DB before continuing.
  deleteDummyData();
  addDummyData();
  updateDummyData();

  // Print a kiosk and its products.
  const store = getStore();
  const firstKiosk = store?.kiosks[0];
  if (firstKiosk) {
    console.log(JSON.stringify(firstKiosk, null, 2));
  }
}

main();
