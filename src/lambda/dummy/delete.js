const AWS = require('aws-sdk');
AWS.config.update({
    region: "ap-northeast-2"
});
const { handleHttpRequest } = require('slsberry');
const apiSpec = {
    category: 'dummy',
    event: [
        {
            type: 'REST',
            method: 'Delete',
        },
    ],

    desc: 'Dummy Delete Function',
    parameters: {
        dummyParam: { req: true, type: 'string', desc: 'dummy용 paramaeter' }
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
                result: { type: 'String', desc: 'result' },
            },
        },
    },
};
exports.apiSpec = apiSpec;
async function handler(inputObject, event) {
    console.log(event)
    const { dummyParam } = inputObject;

    return {
        status: 200,
        response: {
            result: dummyParam,
        }
    };
}
exports.handler = async (event, context) => {
    return await handleHttpRequest(event, context, apiSpec, handler);
};