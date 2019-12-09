const fs = require('fs');
const CDP = require('chrome-remote-interface');

function HarCapture() {
    const entries = [];

    const startRecording = async (chromeOptions) => {
        const { Fetch } = await CDP(chromeOptions);

        Fetch.requestPaused(async (event) => {

            // create HAR entry from paused request
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

            // get request body if present
            if (event.request.postData) {
                entry.request.postData = {
                    text: event.request.postData,
                    size: event.request.postData.length,
                    mimeType: event.request.headers["Content-Type"] || event.request.headers["content-type"]
                }
            }

            // get response body
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
    }

    const endRecording = (filename) => {
        const har = {
            log: {
                version: "1.2",
                creator: {
                    name: "Loadmill-Selenuim-Converter",
                    version: "0.1"
                },
                pages: [], // todo
                entries: entries
            }
        }

        fs.writeFileSync(filename, JSON.stringify(har, null, 4), 'utf8', (error) => {
            if (error) console.log(error);
        });
    }

    return { startRecording, endRecording };
}

const convertHeaders = (cdpHeaders) => {
    if (cdpHeaders) {
        return Object.entries(cdpHeaders).map(header => ({ name: header[0], value: header[1] }))
    } else {
        return null;
    }
}

module.exports = HarCapture;
