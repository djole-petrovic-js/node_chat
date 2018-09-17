let deviceInfoType;

if ( process.env.ENV_MODE === 'production' ) {
  deviceInfoType = 'string';
} else {
  deviceInfoType = ['string',null];
}

module.exports = {
  type:'object',
  properties:{
    uuid:{ type:deviceInfoType },
    serial:{ type:deviceInfoType },
    manufacturer:{ type:deviceInfoType }
  },
  required:['uuid','serial','manufacturer'],
  additionalProperties:false
};