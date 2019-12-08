import { assert } from 'chai';
import { Builder, By, Key, until } from "selenium-webdriver";
const chrome = require('selenium-webdriver/chrome');
const CDP = require('chrome-remote-interface');
const fs = require('fs');

const server = 'https://loadmill-test-blog.herokuapp.com'

const entries = [];

const convertHeaders = (cdpHeaders) => {
    if (cdpHeaders) {
        return Object.entries(cdpHeaders).map(header => ({ name: header[0], value: header[1] }))
    } else {
        return null;
    }
}

describe('Loadmill selenium demo', function () {
    let driver;
    this.timeout(50000);

    before(async () => {
        let chrome_options = new chrome.Options()
            .addArguments("--remote-debugging-port=9222");

        driver = await new Builder()
            .setChromeOptions(chrome_options)
            .forBrowser('chrome')
            .build();

        const { Fetch } = await CDP();

        Fetch.requestPaused(async (event) => {

            const entry = {
                startedDateTime: new Date().toISOString(),
                time: event.timestamp,
                request: {
                    method: event.request.method,
                    url: event.request.url,
                    headers: convertHeaders(event.request.headers)
                },
                response: {
                    status: event.responseStatusCode,
                    headers: event.responseHeaders,
                }
            };

            if (event.request.postData) {
                entry.request.postData = {
                    text: event.request.postData,
                    size: event.request.postData.length,
                    mimeType: event.request.headers["Content-Type"] || event.request.headers["content-type"]
                }
            }

            const responseBody = await Fetch.getResponseBody({ requestId: event.requestId })
            const bodyString = responseBody.base64Encoded ?
                Buffer.from(responseBody.body, 'base64').toString() :
                responseBody.body;

            entry.response.content = {
                text: bodyString,
                size: bodyString.length,
                mimeType: event.responseHeaders.find(header => header.name === 'content-type' || header.name === 'Content-Type').value,
            }

            entries.push(entry);

            Fetch.continueRequest({ requestId: event.requestId });
        });

        await Fetch.enable({ patterns: [{ requestStage: 'Response' }] });

    });

    it('Publish a blog post', async function () {
        const randomPostTitle = 'Test post title ' + Math.floor(Math.random() * 1000000);

        await driver.navigate().to(server + '/ghost/signin/');
        await driver.wait(until.elementLocated(By.name('identification')));

        // login to blog
        await driver.findElement(By.name('identification')).sendKeys('a@b.com');
        await driver.findElement(By.name('password')).sendKeys('Test1234' + Key.RETURN);

        // Create blog post
        await driver.wait(until.elementLocated(By.xpath('//a[@href="/ghost/editor/"]')));
        await driver.findElement(By.xpath('//a[@href="/ghost/editor/"]')).click();

        // Set post title and text
        await driver.wait(until.elementLocated(By.id('entry-title')));
        await driver.findElement(By.id('entry-title')).sendKeys(randomPostTitle);
        await driver.findElement(By.xpath('//section[@id="entry-markdown-content"]//textarea')).sendKeys('Test post text');

        await driver.wait(until.elementLocated(By.xpath("//button[text()='Save Draft']"))); // wait for autosave
        await driver.findElement(By.xpath("//button[text()='Save Draft']")).click(); // save post draft 
        await driver.wait(until.elementLocated(By.xpath("//button[text()='Save Draft']"))); // wait save to finish

        // Publish post
        await driver.findElement(By.xpath("//button[.//*[text()='Toggle Settings Menu']]")).click(); // open publish menu

        await driver.wait(until.elementLocated(By.xpath("//a[text()='Publish Now']")));
        await driver.findElement(By.xpath("//a[text()='Publish Now']")).click(); // click publish

        await driver.wait(until.elementLocated(By.xpath("//button[text()='Publish Now']")));
        await driver.findElement(By.xpath("//button[text()='Publish Now']")).click(); // confirm  publish
        await driver.wait(until.elementLocated(By.xpath("//button[text()='Update Post']"))); // wait save to finish

        // validate post is published
        await driver.navigate().to(server);
        await driver.wait(until.elementLocated(By.xpath("/html/body/div[2]/header/div/div/h1")));
        let topBlogPost = driver.findElement(By.xpath(`//*[@id='content']/article[1]/header/h2/a[text()='${randomPostTitle}']`));
        assert.isTrue(await topBlogPost.isDisplayed(), 'Post title match');
    });

    after(async () => {
        const har = {
            log: {
                version: "1.2",
                creator: {
                    name: "Loadmill-Selenuim-Converter",
                    version: "0.1"
                },
                pages: [],
                entries: entries
            }
        }
        fs.writeFile('test.har', JSON.stringify(har, null, 4), 'utf8', console.log);
        driver.quit();
    });
});

