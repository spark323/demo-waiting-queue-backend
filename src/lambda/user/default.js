
const AWS = require('aws-sdk');
const { handleHttpRequest } = require('slsberry');


let ddbUtil = require('../lib/ddbUtil');
const moment = require('moment');

const apiSpec = {
  category: 'UseWebsocketr',
  event: [
    {
      type: 'websocket',
      method: 'websocket_post',
      route: '$default',
    },
  ],
  desc: '대기열 접속 직후 업데이트 요청을 처리하기 위한 함수. 업데이트 내용은 대기열 숫자,메세지 그룹 Id',
  parameters: {
    message: { req: true, type: 'string', desc: 'message' },
  },
  errors: {
    no_permission: { status_code: 403, desc: '요청한 권한이 없습니다.' },
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

  console.log(event);
  console.log(inputObject);
  var docClient = new AWS.DynamoDB.DocumentClient();
  try {
    //요청이 업데이트 요청이라면
    if (inputObject.message == "request_update") {
      var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
      var paramssqs = {
        QueueUrl: process.env.waiting_queue_url,
        AttributeNames: [
          "ApproximateNumberOfMessages",
        ]
      };
      const queueInfo = await sqs.getQueueAttributes(paramssqs).promise();
      console.log(queueInfo);
      const queueNum = queueInfo.Attributes.ApproximateNumberOfMessages
      const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: `${process.env.socket_api_gateway_id}.execute-api.ap-northeast-2.amazonaws.com/${process.env.stage}-${process.env.version}`
      });
      let result = undefined;
      result = await ddbUtil.query(docClient, process.env.waiting_ddb_name, ["connection_id"], [event.requestContext.connectionId], {
        rawTableName: true
      })

      console.log("result:", result.Items[0]);
      const dt = { ConnectionId: event.requestContext.connectionId, Data: JSON.stringify({ status: "update", waitingNum: queueNum, messageGroupId: result.Items[0].messageGroupId }) };
      console.log(dt);
      try {
        await apigwManagementApi.postToConnection(dt).promise();
      } catch (e) {
        console.log(e);
        console.log(`Found stale connection, deleting ${event.requestContext.connectionId}`);
        await ddbUtil.doDelete(docClient, process.env.waiting_ddb_name, {
          connection_id: event.requestContext.connectionId,
        }, { rawTableName: true });
      }
      return {
        statusCode: 200,
        body: ""
      }
    }
    //그냥 주기적인 Ping 이라면
    else {
      return {
        statusCode: 200,
        body: ""
      }
    }
  } catch (e) {
    console.log(e);
    return { predefinedError: apiSpec.errors.unexpected_error };
  }
}

exports.handler = async (event, context) => {
  return await handleHttpRequest(event, context, apiSpec, handler);
};
