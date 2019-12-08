## Convert Flaky UI Tests to Blazing Fast API Tests

The is a demo of converting the example Selenium test to a Loadmill API test using [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). (Controlled by [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface))

### How to run?
To install the dependencies issue the below commands in project root directory
```javascript
npm install
``` 
To run the tests issue the below command
```javascript
npm test
```

The network recording will be saved to `create-blog-post.har`. Upload it to [Loadmill](loadmill.com) and run it as an API test.