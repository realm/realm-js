import puppeteer from 'puppeteer';

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

await page.goto("http://localhost:5173/");
