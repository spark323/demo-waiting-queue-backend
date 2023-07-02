/**
 * DynamoDB의 Document Client를 사용하기 쉽게 Wrapping한 모듈
 * @author spark323 <spark@rubywave.io>
 */


async function query(docClient, tableName, keys, keyvalues, options = {}) {

    let KeyConditionExpression = "";
    let ExpressionAttributeNames = {};
    let ExpressionAttributeValues = {};
    let ProjectionExpression = "";
    //hashkey
    KeyConditionExpression = "#" + keys[0] + " = " + ":" + keys[0];
    ExpressionAttributeNames["#" + keys[0]] = keys[0] + ""
    ExpressionAttributeValues[":" + keys[0]] = keyvalues[0];
    //rangeKey
    if (keys.length > 1) {
        if (options.lessThanRange) {
            KeyConditionExpression += " AND #" + keys[1] + " < " + ":" + keys[1];
            ExpressionAttributeNames["#" + keys[1]] = keys[1] + ""
            ExpressionAttributeValues[":" + keys[1]] = keyvalues[1];
        }
        else {
            KeyConditionExpression += " AND #" + keys[1] + " = " + ":" + keys[1];
            ExpressionAttributeNames["#" + keys[1]] = keys[1] + ""
            ExpressionAttributeValues[":" + keys[1]] = keyvalues[1];
        }

    }

    if (options.hasOwnProperty("ProjectionExpression")) {
        let list = options["ProjectionExpression"];
        for (let i = 0; i < list.length; i++) {
            let ck = list[i];
            ExpressionAttributeNames["#" + ck] = ck + ""
            ProjectionExpression += "#" + ck + ",";
        }
        ProjectionExpression = ProjectionExpression.substr(0, ProjectionExpression.length - 1);
    }



    var params = {
        TableName: options.rawTableName ? tableName : getTableName(tableName),
        KeyConditionExpression: KeyConditionExpression,
        ExpressionAttributeNames: ExpressionAttributeNames,
        ExpressionAttributeValues: ExpressionAttributeValues
    };
    if (options.hasOwnProperty("IndexName")) {
        params["IndexName"] = options.IndexName;
    }
    if (options.hasOwnProperty("ProjectionExpression")) {
        params["ProjectionExpression"] = ProjectionExpression;
    }
    if (options.hasOwnProperty("ConsistentRead")) {
        params["ConsistentRead"] = options.ConsistentRead;;
    }
    if (options.hasOwnProperty("ScanIndexForward")) {
        params["ScanIndexForward"] = options.ScanIndexForward;;
    }
    if (options.hasOwnProperty("Limit")) {
        params["Limit"] = options.Limit;;
    }
    console.log("ddb_query", params);
    return docClient.query(params).promise();
}


async function update(docClient, tableName, keyMap, keys, keyvalues, options = {}, ConditionKeys = undefined, ConditionValues = undefined) {

    let UpdateExpression = "";
    let ExpressionAttributeNames = {};
    let ExpressionAttributeValues = {};
    let ConditionExpression = undefined;

    UpdateExpression = "set ";


    for (var i = 0; i < keys.length; i++) {
        let key = keys[i];
        let values = keyvalues[i];
        const sign = key.substr(0, 1);

        if (sign == "+")//increntmental
        {
            key = key.substr(1, key.length - 1);
            const nextKey = keys[i + 1];

            UpdateExpression += "#" + key + " = " + "#" + key + " + " + ":" + nextKey + " ,";
            ExpressionAttributeNames["#" + key] = key + ""

            ExpressionAttributeValues[":" + nextKey] = values;
            i++;
        }
        else if (sign == "-")//decrentmental
        {
            key = key.substr(1, key.length - 1);
            const nextKey = keys[i + 1];


            UpdateExpression += "#" + key + " = " + "#" + key + " - " + ":" + nextKey + " ,";
            ExpressionAttributeNames["#" + key] = key + ""

            ExpressionAttributeValues[":" + nextKey] = values;
            i++;
        }
        else {
            UpdateExpression += "#" + key + " = " + ":" + key + " ,";
            ExpressionAttributeNames["#" + key] = key + ""
            ExpressionAttributeValues[":" + key] = values;
        }
    }
    UpdateExpression = UpdateExpression.substr(0, UpdateExpression.length - 1);

    if (ConditionKeys != undefined) {
        ConditionExpression = "";
        for (var i = 0; i < ConditionKeys.length; i++) {
            let key = ConditionKeys[i];
            let values = ConditionValues[i];
            const sign = key.substr(0, 1);
            key = key.substr(1, key.length - 1);
            ConditionExpression += "#" + key + " " + sign + " " + ":" + key + " ,";
            ExpressionAttributeNames["#" + key] = key + ""
            ExpressionAttributeValues[":" + key] = values;
        }
        ConditionExpression = ConditionExpression.substr(0, ConditionExpression.length - 1);
    }
    if (options.Remove) {
        UpdateExpression += " Remove";
        options.Remove.forEach(element => {
            UpdateExpression += " " + element
        });

    }
    var params = {
        TableName: options.rawTableName ? tableName : getTableName(tableName),
        Key: keyMap,
        UpdateExpression: UpdateExpression,
        ExpressionAttributeNames: ExpressionAttributeNames,
        ExpressionAttributeValues: ExpressionAttributeValues,
        ReturnValues: (options.returnValues) ? "UPDATED_NEW" : "NONE"
    };
    if (ConditionExpression != undefined) {
        params["ConditionExpression"] = ConditionExpression;
    }



    console.log("ddb_updating", params);
    return docClient.update(params).promise();
}
async function doDelete(docClient, tableName, keyMap, options = {},) {

    var params = {
        TableName: options.rawTableName ? tableName : getTableName(tableName),
        Key: keyMap,

    };
    console.log("ddb_deleting", params);
    return docClient.delete(params).promise();
}
async function scan(docClient, tableName, options = {}) {
    var params = {
        TableName: options.rawTableName ? tableName : getTableName(tableName),

    };

    return docClient.scan(params).promise();
}
async function put(docClient, tableName, Item, options = {}) {

    var params = {
        TableName: options.rawTableName ? tableName : getTableName(tableName),
        Item: Item
    };

    console.log("ddb_putting", params);

    return docClient.put(params).promise();
}

function getTableName(tableName) {
    return `${process.env.service}-${process.env.stage}-${tableName}`;
}
module.exports.scan = scan;

module.exports.put = put;

module.exports.doDelete = doDelete;
module.exports.update = update;
module.exports.query = query;