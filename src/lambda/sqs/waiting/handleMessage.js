const AWS = require('aws-sdk');
AWS.config.update({
    region: "ap-northeast-2"
});
const { handleHttpRequest } = require('slsberry');
var moment = require('moment-timezone');
const apiSpec = {
    category: 'SQS',
    event: [
        {
            type: 'sqs',
            sqs: `WaitingQueue`,
            batchSize: 1,
            //만약 StepFunctions가 아닌 이 함수에서 대기할 경우 주석 해제
            //maximumConcurrency: 2,
        },
    ],
    desc: 'WaitingQueue의 메세지를 처리하며 메세지 처리시 대기중인 유저에게 입력 진행을 시작',
    parameters: {

    },
    environment: {
        stepfunctions_arn: {
            Ref: "WaitingQueueStateMachine"
        }
    },

    errors: {
        unexpected_error: { status_code: 500, reason: '알 수 없는 에러' },

    },
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
    console.log(event);
    try {
        for (const eventItem of event.Records) {
            const messageId = eventItem.messageId;
            const messageBody = JSON.parse(eventItem.body);
            console.log(JSON.stringify(messageBody));
            const now = moment().tz("Asia/Seoul")
            try {
                var queueUrl = process.env.waiting_queue_url;
                const payloadBody = messageBody
                const connectionId = payloadBody.connection_id;

                //웹소켓을 통해 예약 시작 알림
                const apigwManagementApi = new AWS.ApiGatewayManagementApi({
                    apiVersion: '2018-11-29',
                    endpoint: `${process.env.socket_api_gateway_id}.execute-api.ap-northeast-2.amazonaws.com/${process.env.stage}-${process.env.version}`
                });
                try {
                    //클라이언트에 알려주는 내용 : 이 메세지의 SQS receiptHandle, 이 메세지의 MessageGroupId,허용된 예약 시간(환경변수)
                    await apigwManagementApi.postToConnection({
                        ConnectionId: connectionId, Data: JSON.stringify({
                            status: "start",
                            receipt_handle: eventItem.receiptHandle,
                            messageGroupId: eventItem.attributes.MessageGroupId,
                            view_time: process.env.user_view_time_in_mill,
                        })
                    }).promise();
                } catch (e) {
                    console.log(e);
                }

                //만약 이 Lambda에서 기다릴경우 아래 주석 해제 +_ sqs:DeleteMessage deny 주석처리 

                // await new Promise(resolve => setTimeout(resolve, process.env.user_view_time_in_mill));
                // try {
                //     await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify({ status: "end" }) }).promise();
                // } catch (e) {
                //     console.log(e);
                // }
                // //사실 아래 내용은 필요 없다. 여기서 삭제 하지 않아도 함수가 종료되면 Event Source Mapping이 직접 삭제하기 때문
                // var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
                // var deleteParams = {
                //     QueueUrl: queueUrl,
                //     ReceiptHandle: eventItem.receiptHandle
                // };
                // await sqs.deleteMessage(deleteParams).promise();

                //대기를 위한 StepFunctions를 실행
                var stepfunctions = new AWS.StepFunctions();
                await stepfunctions.startExecution({
                    stateMachineArn: process.env.stepfunctions_arn,
                    input: JSON.stringify({
                        view_time: parseInt(process.env.user_view_time_in_mill / 1000),
                        receiptHandle: eventItem.receiptHandle,
                        connection_id: payloadBody.connection_id,
                        waitQueueURL: queueUrl
                    })
                }).promise();

            }
            catch (e) {
                console.log(e);
            }
        }
    } catch (eee) {
        console.log(eee);
        return { predefinedError: apiSpec.errors.unexpected_error };
    }
}
exports.handler = async (event, context) => {
    return await handleHttpRequest(event, context, apiSpec, handler);
};