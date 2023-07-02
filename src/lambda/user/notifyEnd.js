
var AWS = require("aws-sdk");
AWS.config.update({
    region: process.env.region
});
const { handleHttpRequest } = require('slsberry');

const apiSpec = {
    "category": "User",
    "desc": "StepFunctions에서 유저에게 예약시간 만료를 알려주기 위해 불리는 함수",
    "event": [
        {
            type: "Pure",
        }
    ],
    "parameters": {
    },
    errors: {
    },
    responses: {
        raw: true,
    }
};
exports.apiSpec = apiSpec;

async function handler(inputObject, event) {
    console.log(event)
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: `${process.env.socket_api_gateway_id}.execute-api.ap-northeast-2.amazonaws.com/${process.env.stage}-${process.env.version}`
    });
    try {
        await apigwManagementApi.postToConnection({ ConnectionId: event.connection_id, Data: JSON.stringify({ status: "end" }) }).promise();
    } catch (e) {
        console.log(e);
    }
    return {
        waitQueueURL: event.waitQueueURL, receiptHandle: event.receiptHandle
    }
}
exports.handler = async (event, context) => {
    return await handleHttpRequest(event, context, apiSpec, handler);
};


