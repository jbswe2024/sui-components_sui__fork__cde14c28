const httpProxy = require('http-proxy')

const proxy = httpProxy.createProxyServer({changeOrigin: true})
// added the error handling to avoid https://github.com/nodejitsu/node-http-proxy/issues/527
proxy.on('error', (error, req, res) => {
  if (!res.headersSent) {
    res.writeHead(500, {'content-type': 'application/json'})
  }

  const json = { error: 'proxy_error', reason: error.message }
  res.end(JSON.stringify(json))
})

module.exports = proxy
