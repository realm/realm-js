import { program } from "@commander-js/extra-typings";
import dotenv from "dotenv";

import { stress } from "./stress";

dotenv.config();

const {
  BASE_URL: DEFAULT_BASE_URL = "https://realm-qa.mongodb.com",
  PUBLIC_API_KEY: DEFAULT_PUBLIC_API_KEY,
  PRIVATE_API_KEY: DEFAULT_PRIVATE_API_KEY,
} = process.env;

program
  .command("stress")
  .requiredOption("--cluster <cluster>", "The name of the cluster to use as data source")
  .option("--base-url <base-url>", "Base URL of the BaaS server to stress", DEFAULT_BASE_URL)
  .option("--public-api-key <public-key>", "Public API key to use when authenticating towards the server", DEFAULT_PUBLIC_API_KEY)
  .option("--private-api-key <private-key>", "Private API key to use when authenticating towards the server", DEFAULT_PRIVATE_API_KEY)
  .option("-c,--cycles <cycles>", "Number of import, roundtrip cycles", (value) => parseInt(value, 10), 1)
  .action(stress);

program.parse(process.argv);
