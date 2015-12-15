# Node-RTCPeerConnection

An attempt (current WIP) to create a spec compliant implementation of
RTCPeerConnection for Node.js. This enables browser-peers to speak to
non-browser (Node.js) peers, or non-browser peer to non-browser peer
communication over RTCDataChannels.

## Status

Able to initiate a call and
[connect successfully to Firefox](https://twitter.com/LostOracle/status/672532399138324480).

Still too tightly coupled to my signaling server, not RFC compliant, can't
receive calls, doesn't work with other browsersi (haven't tried).

the current progress involes setting up an http server for index.html, then
the websocket server (server.js), then opening localhost:8000 in Firefox,
then running `node false_client.js`, checking Firefox's `about:webrtc` logs,
reload Firefox tab, and iterating.

## RFC list

* [RFC 4566 - SDP (Session Description Protocol)](https://tools.ietf.org/html/rfc4566)
* [RFC 5245 - ICE (Interactive Connectivity Establishment)](https://tools.ietf.org/html/rfc5245)
* [DRAFT 5245bis-00 - ICE (Interactive Connectivity Establishment)](https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00)
* [RFC 5389 - STUN (Session Traversal Utilities for NAT)](https://tools.ietf.org/html/rfc5389)
* [RFC 5766 - TURN (Traversal Using Relays around NAT)](https://tools.ietf.org/html/rfc5766)
* [RFC 6347 - DTLS (Datagram Transport Layer Security)](https://tools.ietf.org/html/rfc6347)
* [RFC 7064 - STUN URI Scheme](https://tools.ietf.org/html/rfc7064)
* [DRAFT ???? - ICE w/ SDP & SIP](https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07)

## WebRTC Spec

[WebRTC](https://w3c.github.io/webrtc-pc/)

