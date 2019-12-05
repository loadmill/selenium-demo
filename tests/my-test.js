import { assert } from 'chai';
import { Builder, By, Key, until } from "selenium-webdriver";
// import { request } from 'http';
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

        const { Network } = await CDP();

        Network.requestWillBeSent((event) => {
            const entry = {
                requestId: event.requestId,
                startedDateTime: new Date().toISOString(),
                time: event.timestamp,
                request: {
                    method: event.request.method,
                    url: event.request.url,
                    headers: convertHeaders(event.request.headers)
                }
            };
            if (event.request.postData) {
                entry.request.postData = {
                    mimeType: event.request.headers["Content-Type"],
                    text: event.request.postData
                }
            }
            entries.push(entry);

        });

        Network.responseReceived(async (event) => {
            const entry = entries.find(({ requestId }) => requestId === event.requestId);
            const response = event.response;
            entry.response = {
                status: response.status,
                statusText: response.statusText,
                headers: convertHeaders(response.headers),
            };

            if (event.response.mimeType) {
                const responseBody = await Network.getResponseBody({ requestId: event.requestId });
                const text = responseBody.base64Encoded ?
                    Buffer.from(responseBody.body, 'base64').toString() :
                    responseBody.body;
                entry.response.content = {
                    size: 100,
                    mimeType: event.response.mimeType,
                    text
                }
            }
            // request.response.body = await Network.getResponseBody({ requestId: params.requestId });
            // console.log(JSON.stringify(request.response.body));
        });
        await Network.enable();

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
        fs.writeFile('test.har', JSON.stringify(entries, null, 4), 'utf8', console.log);
        driver.quit();
    });
});

