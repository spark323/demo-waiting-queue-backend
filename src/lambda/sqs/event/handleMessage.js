const AWS = require('aws-sdk');
AWS.config.update({
    region: "ap-northeast-2"
});
const { handleHttpRequest } = require('slsberry');
const apiSpec = {
    category: 'SQS',
    event: [
        {
            type: 'sqs',
            sqs: `EventQueue`,
            batchSize: 1,
        },
    ],
    desc: 'SQS Queue에서 메세지를 처리할 때 마다 현재 남은 숫자를 업데이트 해주는 함수. SQS메세지는 cron/one/get에서 생성',
    parameters: {

    },
    errors: {
        unexpected_error: { status_code: 500, reason: '알 수 없는 에러' },
    },
    responses: {
    },
};
exports.apiSpec = apiSpec;

async function handler(inputObject, event) {
    console.log(event);
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    try {
        //실제 batchsize가 1이기 때문에 의미는 없지만, 일단 iteration
        for (const eventItem of event.Records) {
            const messageId = eventItem.messageId;
            const messageBody = JSON.parse(eventItem.body);
            console.log(JSON.stringify(messageBody));
            const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: 'ap-northeast-2' });
            //현재 대기열 큐의 대기숫자 가져오기
            var params = {
                QueueUrl: process.env.waiting_queue_url,
                AttributeNames: [
                    "ApproximateNumberOfMessages",
                ]
            };
            const queueInfo = await sqs.getQueueAttributes(params).promise();
            console.log(queueInfo);
            const queueNum = queueInfo.Attributes.ApproximateNumberOfMessages;


            //웹소켓으로 알림 준비
            const apigwManagementApi = new AWS.ApiGatewayManagementApi({
                apiVersion: '2018-11-29',
                endpoint: `${process.env.socket_api_gateway_id}.execute-api.ap-northeast-2.amazonaws.com/${process.env.stage}-${process.env.version}`
            });
            var params = {
                TableName: process.env.waiting_ddb_name,
            };
            let result = await docClient.scan(params).promise();
            //현재 대기중인 모든 유저에 대해서 웹소캣 전달
            const postCalls = result.Items.map(async ({ connection_id }) => {
                const dt = { ConnectionId: connection_id, Data: JSON.stringify({ status: "update", waitingNum: queueNum }) };
                try {
                    await apigwManagementApi.postToConnection(dt).promise();
                } catch (e) {
                    console.log(`Found stale connection, deleting ${connection_id}`);
                    var params = {
                        TableName: process.env.waiting_ddb_name,
                        Key: {
                            connection_id: connection_id
                        }
                    };
                    await docClient.delete(params).promise();
                }
            });
        }
    } catch (eee) {
        console.log(eee);
        return { predefinedError: apiSpec.errors.unexpected_error };
    }
}
exports.handler = async (event, context) => {
    return await handleHttpRequest(event, context, apiSpec, handler);
};