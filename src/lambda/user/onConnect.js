const AWS = require('aws-sdk');
const { handleHttpRequest } = require('slsberry');


let ddbUtil = require('../lib/ddbUtil');
const moment = require('moment');

const apiSpec = {
  category: 'Websocket',
  event: [
    {
      type: 'websocket',
      method: 'websocket',
      route: '$connect',
    },
  ],
  desc: '웹소캣 접속 시 initilize 함수.',
  parameters: {

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
  console.log(event)
  var docClient = new AWS.DynamoDB.DocumentClient();
  var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
  //웹소켓에 접속하면 부여되는 connectionId를 DB에 저장한다.
  try {
    let count = 0;
    //유저 카운터를 하나 올리고 카운터 숫자를 가져온다.

    try {
      let result = await ddbUtil.update(docClient, process.env.waiting_counter_ddb_name,
        { counter_id: "counter" }, ["+counter", "val"], [1], { rawTableName: true, returnValues: true })
      count = result.Attributes["counter"];

      console.log("count:", count);
    } catch (error) {
      //만약 맨 처음에 counter가 없는 케이스라면, 새로 생성
      if (error.name == "ValidationException") {
        await ddbUtil.put(docClient, process.env.waiting_counter_ddb_name, {
          counter_id: "counter",
          counter: 0,
        }, { rawTableName: true });
      }
      else {
        console.log(error);
      }
    }


    //FIFO SQS Queue에 메세지를 넣는다. MessageGroupId 는 유저 카운터/%동시 처리 갯수 로 만듬
    var params = {
      MessageBody: JSON.stringify({ connection_id: event.requestContext.connectionId, timestamp: moment().valueOf() }),
      QueueUrl: process.env.waiting_queue_url,
      MessageGroupId: count % parseInt(process.env.concurrent) + "",
    }
    console.log(params);
    await sqs.sendMessage(params).promise();
    const item = {
      messageGroupId: count % parseInt(process.env.concurrent) + "",
      connection_id: event.requestContext.connectionId,
      timestamp: moment().valueOf()
    }


    //DDB 테이블에 아이템을 넣기

    await ddbUtil.put(docClient, process.env.waiting_ddb_name, item, { rawTableName: true });

    return {
      status: 200,
      response: {
        result: 'success',
      },
    };
  } catch (e) {
    console.log(e)
    return { predefinedError: 'internal_server_error' };
  }
}

exports.handler = async (event, context) => {
  return await handleHttpRequest(event, context, apiSpec, handler);
};
