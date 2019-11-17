import { assert } from 'chai';
import { Builder, By, Key, until } from "selenium-webdriver";
const chrome = require('selenium-webdriver/chrome');
const server = 'https://loadmill-test-blog.herokuapp.com'


describe('Loadmill selenium demo', function () {
    let driver;
    this.timeout(50000);

    before(async () => {
        let chrome_options = new chrome.Options()
            .addArguments("--auto-open-devtools-for-tabs")
            .windowSize( {height: 900, width: 1400} );


        driver = new Builder()
            .setChromeOptions(chrome_options)
            .forBrowser('chrome')
            .build();
        // driver.sendDevToolsCommand('Network.enable')
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

    after(async () => driver.quit());
});

