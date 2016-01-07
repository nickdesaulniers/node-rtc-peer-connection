var chalk = require('chalk');
var ecstatic = require('ecstatic');
var http = require('http');
var WebSocketServer = require('ws').Server;

var HTTP_PORT = 8080;
var WS_PORT = 8081;

http.createServer(ecstatic({
  root: __dirname,
})).listen(HTTP_PORT, function () {
  console.log(chalk.green('http server listening on port ' + HTTP_PORT));
});

// TODO: it is insecure to use a non encrypted transport for signaling.
// We already have the dependency on generating certs on the fly, use that.
var wss = new WebSocketServer({ port: WS_PORT });
wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    wss.clients.forEach(function (client) {
      if (client !== ws) {
        client.send(message);
      }
    });
    console.log('received: %s', message);
  });
});
wss.on('listening', function () {
  console.log(chalk.green('ws server listening on port ' + WS_PORT));
});

