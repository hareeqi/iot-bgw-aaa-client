
const url = require('url');
const config = require('./config_mgr')();
const internal = require('./validate')
const openid = require("./openid_validate")
const decode64= (b64)=>new Buffer(b64, 'base64').toString('ascii')

let validate = {internal, openid}
validate =  validate[config.aaa_client.auth_provider]

const mqttAuth = async (port,credentials,method,path='')=>{
    const payload = `MQTT/${method}/${config.broker.address}/${config.broker.port}/${path}`
    return (await validate(payload,`[source:${port}]`,credentials.username,credentials.password)).status

}

const httpAuth = (req)=>{
    // in case of not open id then the username = bgw_key
    let username = "";
    let password = "";
    if (req.headers && req.headers.authorization) {
      var parts = req.headers.authorization.split(' ');
      if(parts.length === 2 ) {
        (parts[0] === 'Bearer' && (username = parts[1])) ||
        (parts[0] === 'Basic'  && (username = decode64(parts[1])))
        parts = username.split(":")
        username = parts[0]
        password = parts[1]
      }

    } else if (req.query.bgw_key) {
      username = req.query.bgw_key;
      delete req.query.bgw_key
      req.url = req.url.replace(`bgw_key=${username}`,"")
      req.originalUrl = req.originalUrl.replace(`bgw_key=${username}`,"")
    }

    req.headers.authorization = (req.bgw.alias && req.bgw.alias.override_authorization_header )
                                || config.override_authorization_header || ""

    const parse_fa =  url.parse(req.bgw.forward_address)
    let host = parse_fa.hostname
    let port = parse_fa.port || (parse_fa.protocol=='https:'?443:80)
    const path = `${parse_fa.pathname}${url.parse(req.url).pathname}`.replace('//','/')
    const payload = `HTTP/${req.method}/${host}/${port}${path}`


    return validate(payload,`[source:${req.connection.remoteAddress}:${req.connection.remotePort}]`,username,password)

}


module.exports = { mqttAuth, httpAuth}
