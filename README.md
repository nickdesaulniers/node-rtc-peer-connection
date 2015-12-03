# Node-ICE

An attempt (current WIP) to create an RFC 5245 Interactive Connectivity
Establishment (ICE) client for Node.js.

## Status

the current progress involes setting up an http server for index.html, then
the websocket server (server.js), then opening localhost:8000 in Firefox,
then running `node false_client.js`, checking Firefox's `about:webrtc` logs,
reload Firefox tab, and iterating.

## RFC list

* [RFC 4566 - SDP (Session Description Protocol)](https://tools.ietf.org/html/rfc4566)
* [RFC 5245 - ICE (Interactive Connectivity Establishment)](https://tools.ietf.org/html/rfc5245)
* [RFC 5389 - STUN (Session Traversal Utilities for NAT)](https://tools.ietf.org/html/rfc5389)
* [RFC 5766 - TURN (Traversal Using Relays around NAT)](https://tools.ietf.org/html/rfc5766)
* [RFC 6347 - DTLS (Datagram Transport Layer Security)](https://tools.ietf.org/html/rfc6347)

