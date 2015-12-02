# Node-ICE

An attempt (current WIP) to create an RFC 5245 Interactive Connectivity
Establishment (ICE) client for Node.js.

## Status

the current progress involes setting up an http server for index.html, then
the websocket server (server.js), then opening localhost:8000 in Firefox,
then running `node false_client.js`, checking Firefox's `about:webrtc` logs,
reload Firefox tab, and iterating.

