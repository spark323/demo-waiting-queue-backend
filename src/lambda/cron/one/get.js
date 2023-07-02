
var AWS = require("aws-sdk");
AWS.config.update({
    region: process.env.region
});
const { handleHttpRequest } = require('slsberry');

const apiSpec = {
    "category": "Cron",
    "desc": "1분 주기로 주기로 이벤트를 발생시키는 함수. EventBridge에서 1분마다 호출됨",
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
    }
};
exports.apiSpec = apiSpec;
async function handler(inputObject, event) {
    console.log(event)
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    var params = {
        MessageBody: JSON.stringify({ notification: "test" }),
        QueueUrl: process.env.event_queue_url
    }
    //Interval만큼 SQS Queue에 메세지 생성   
    let invertal = process.env.notification_interval;
    for (var i = 0; i < (60 / invertal); i++) {
        if (i != 0) {
            params["DelaySeconds"] = i * invertal;
        }
        try {
            await sqs.sendMessage(params).promise();
        }
        catch (e) {
            console.log(e);
        }
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


