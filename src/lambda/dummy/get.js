const AWS = require('aws-sdk');
AWS.config.update({
    region: "ap-northeast-2"
});
const { handleHttpRequest } = require('slsberry');
const apiSpec = {
    category: 'http',
    event: [
        {
            type: 'REST',
            method: 'Get',
        },
    ],

    desc: 'echo 함수',
    parameters: {
        email: { req: true, type: 'string', desc: 'email' },
        companyName: { req: true, type: 'string', desc: '회사명' },
        type: { req: false, type: 'string', desc: '타입' },
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
                result: { type: 'string', desc: 'result' },
                records: { type: 'object', desc: 'data' },
            },
        },
    },
};

exports.apiSpec = apiSpec;
async function handler(inputObject, event) {
    console.log(event);
    return {
        status: 200,
        response: {
            ...inputObject
        },
    };
}
exports.handler = async (event, context) => {
    return await handleHttpRequest(event, context, apiSpec, handler);
};