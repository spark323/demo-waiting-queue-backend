const AWS = require('aws-sdk');

const { handleHttpRequest } = require('slsberry');
var ddbUtil = require('../lib/ddbUtil');

const apiSpec = {
  category: 'Websocket',
  event: [
    {
      type: 'websocket',
      method: 'websocket',
      route: '$disconnect',
    },
  ],
  desc: '웹소캣 Disconnect 처리.',
  parameters: {},
  errors: {
    no_permission: { status_code: 403, desc: '요청한 유저를 조회할 권한이 없습니다.' },
  },
  responses: {
    description: '',
    content: 'application/json',
    schema: {
      type: 'object',
      properties: {
        result: { type: 'String', desc: '처리 결과' },
      },
    },
  },
};

exports.apiSpec = apiSpec;
async function handler(inputObject, event) {
  console.log(event)
  //DynamoDB에서 ConnectionID 삭제
  const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'ap-northeast-2' });
  try {
    await ddbUtil.doDelete(docClient, process.env.waiting_ddb_name, {
      connection_id: process.env.testing ? inputObject.connectionId + '' : event.requestContext.connectionId,
    }, { rawTableName: true });
  } catch (e) {
    console.log(e)
    return { predefinedError: 'internal_server_error' };
  }
  return {
    status: 200,
    response: {
      result: 'success',
    },
  };
}

exports.handler = async (event, context) => {
  return await handleHttpRequest(event, context, apiSpec, handler);
};
