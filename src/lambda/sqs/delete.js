const AWS = require('aws-sdk');
AWS.config.update({
    region: "ap-northeast-2"
});
const { handleHttpRequest } = require('slsberry');
let ddbUtil = require('../lib/ddbUtil');
var moment = require('moment-timezone');
const apiSpec = {
    category: 'http',
    event: [
        {
            type: 'REST',
            method: 'Delete',
        },
    ],
    desc: '유저가 작업을 마치고 나서 요청시 다음으로 넘어가는 함수(SQS메세지를 삭제)',
    parameters: {
        receipt_handle: { req: true, type: 'string', desc: 'SQS메세지의 핸들' },
        email: { req: true, type: 'string', desc: '이메일' },
    },
    errors: {
        unexpected_error: { status_code: 500, reason: '알 수 없는 에러' },
    },
    role: "DeleteRequestRole",
    responses: {
        description: '',
        content: 'application/json',
        schema: {
            type: 'object',
            properties: {
                hashKey: { type: 'String', desc: 'hash_key' },
            },
        },
    },
};
exports.apiSpec = apiSpec;
async function handler(inputObject, event) {
    console.log(event)
    var docClient = new AWS.DynamoDB.DocumentClient();
    const now = moment().tz("Asia/Seoul")
    try {
        const { email, receipt_handle } = inputObject;
        var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
        //다음 처리가 시작될 수 있도록 큐에서 메세지를 삭제한다.  

        await ddbUtil.update(docClient, process.env.email_ddb_table,
            { email: email }, ["date"], [now.format("YYYY-MM-DD HH:mm:ss")], { rawTableName: true })

        var deleteParams = {
            QueueUrl: process.env.waiting_queue_url,
            ReceiptHandle: receipt_handle
        };
        await sqs.deleteMessage(deleteParams).promise();
        return {
            status: 200,
            response: {
                ...inputObject
            }
        };
    } catch (e) {
        console.log(e);
        return { predefinedError: 'internal_server_error' };
    }
}
exports.handler = async (event, context) => {
    return await handleHttpRequest(event, context, apiSpec, handler);
};