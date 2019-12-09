## Convert Flaky UI Tests to Blazing Fast API Tests

The is a short demo of converting a Selenium test to a Loadmill API test using the [har-recorder](https://github.com/loadmill/har-recorder) package.

The har-recorder npm module is using the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). (Controlled by [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)) to capture Fatch events from Chrome.

## The converted test

The [example test](tests/my-test.js) for converstion, is a small but flaky test which creates a random post on our demo Ghost blog.

![](https://user-images.githubusercontent.com/5776439/70455103-5a524d00-1ab4-11ea-8182-695d50662e0a.gif)

## How to run this?

 - clone this repository with `git clone https://github.com/loadmill/selenium-demo.git`
 - Install its dependencies by running `npm install`
 - To run the example test by running `npm test`
 - The network recording will be saved to `create-blog-post.har` in the root folder of the project. 
 - Login to [Loadmill](https://www.loadmill.com/), and create a new API test suite.
 - Upload the recording and run it as an API test.
