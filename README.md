# demo-waiting-queue-backend
Serverless 기반 대기열의 백엔드 / 인프라 소스코드입니다.
1. node.js 16이상이 필요합니다.
2. yarn v2를 사용합니다.
```
npm install yarn -g
```
3. AWS 크레덴셜이 로컬에 설치되어있어야 합니다. (AWS Configure로 IAM Credential 설정)   
## 인프라 프로비전 방법
serverless_template.yml의 다음 부분에서  "sqs:DeleteMessage" 권한의  deny부분을 주석 처리해야 합니다. (코드에서는 기본적으로 주석처리되어 있습니다.)

```
RoleName: ${self:app}-DefaultLambdaExcutionRole    DefaultRole:
      Type: AWS::IAM::Role
      Properties:
        RoleName: ${self:app}-DefaultLambdaExcutionRole
        AssumeRolePolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action: sts:AssumeRole
        ManagedPolicyArns:
          - arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
        Policies:
          - PolicyName: myPolicyName
            PolicyDocument:
              Version: "2012-10-17"
              Statement:
                - Effect: Allow
                  Action:
                    - s3:*
                    - sqs:*
                    - logs:*
                    - execute-api:*
                    - states:*
                  Resource: "*"
                # - Effect: Deny
                #   Action:
                #     - sqs:DeleteMessage
                #   Resource:
                #     Fn::GetAtt:
                #       - WaitingQueue
                #       - Arn
```
이후 아래 명령어로 프로비전 합니다.

```
yarn 
yarn deploy --aws-profile [프로파일]
```

이후 해당 deny부분을 주석 해제 하고 다시 프로비전합니다.
```
yarn deploy --aws-profile [프로파일]
```



