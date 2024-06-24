import puppeteer from 'puppeteer';
// import vite from "vite";
// import { Server as MochaRemoteServer } from "mocha-remote-server";

const DEV_TOOLS = process.env.DEV_TOOLS === "true" || process.env.DEV_TOOLS === "1";

const browser = await puppeteer.launch({ devtools: DEV_TOOLS });
const page = await browser.newPage();

page.on('console', msg => {
    const type = msg.type() as string;
    if (type === "error" || type === "warn" || type === "debug") {
        console[type]('[browser]', msg.text());
    } else {
        console.log('[browser]', msg.text());
    }
});

await new Promise(resolve => setTimeout(resolve, 1000));
await page.goto("http://localhost:5173/");

// Keeping the process alive for the tests to complete
setInterval(() => {
    console.log("Waiting for tests to complete");
}, 1000 * 60 * 60);
