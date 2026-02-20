#!/bin/bash
set -e

# ============================================================
# Order Tracker - AWS Deployment Script
#
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - Docker installed and running
#   - npm installed
#   - AWS account must be active (not blocked for compute)
#
# Resources already created:
#   - ECR repo: order-tracker-api
#   - RDS SQL Server: order-tracker-db
#   - S3 bucket: order-tracker-ui-482817994966
#   - IAM role: AppRunnerECRAccessRole
#   - VPC connector: order-tracker-vpc-connector
# ============================================================

ACCOUNT_ID=482817994966
REGION=us-east-1
ECR_REGISTRY=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
ECR_IMAGE=$ECR_REGISTRY/order-tracker-api:latest
RDS_ENDPOINT=order-tracker-db.cmzywyqok70d.us-east-1.rds.amazonaws.com
RDS_PASSWORD="Tracker2026Pass"
S3_BUCKET=order-tracker-ui-$ACCOUNT_ID
VPC_CONNECTOR_ARN="arn:aws:apprunner:us-east-1:482817994966:vpcconnector/order-tracker-vpc-connector/1/646032d7859f4919890860f114af8c19"
ACCESS_ROLE_ARN="arn:aws:iam::482817994966:role/AppRunnerECRAccessRole"

echo "=== Step 1: Build and push API Docker image ==="
cd InventoryOrderTracker.Api
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
DOCKER_BUILDKIT=1 docker build --platform linux/amd64 --provenance=false --sbom=false -t order-tracker-api .
docker tag order-tracker-api:latest $ECR_IMAGE
docker push $ECR_IMAGE
cd ..

echo ""
echo "=== Step 2: Deploy API to App Runner ==="
# Delete existing service if any
EXISTING=$(aws apprunner list-services --query 'ServiceSummaryList[?ServiceName==`order-tracker-api`].ServiceArn' --output text 2>/dev/null)
if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then
  echo "Deleting existing App Runner service..."
  aws apprunner delete-service --service-arn "$EXISTING" >/dev/null 2>&1
  echo "Waiting for deletion..."
  while [ "$(aws apprunner list-services --query 'ServiceSummaryList[?ServiceName==`order-tracker-api`]' --output json)" != "[]" ]; do
    sleep 15
  done
  echo "Old service deleted."
fi

# Write source config to temp file to avoid shell escaping issues
CONN_STRING="Server=$RDS_ENDPOINT,1433;Database=OrderTracker;User Id=admin;Password=$RDS_PASSWORD;TrustServerCertificate=True;Connect Timeout=60"
cat > /tmp/apprunner-source.json << ENDJSON
{
  "AuthenticationConfiguration": {"AccessRoleArn": "$ACCESS_ROLE_ARN"},
  "AutoDeploymentsEnabled": false,
  "ImageRepository": {
    "ImageIdentifier": "$ECR_IMAGE",
    "ImageRepositoryType": "ECR",
    "ImageConfiguration": {
      "Port": "8080",
      "RuntimeEnvironmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Production",
        "ConnectionStrings__DefaultConnection": "$CONN_STRING",
        "CORS_ALLOWED_ORIGINS": "PLACEHOLDER"
      }
    }
  }
}
ENDJSON

API_URL=$(aws apprunner create-service \
  --service-name order-tracker-api \
  --source-configuration file:///tmp/apprunner-source.json \
  --instance-configuration '{"Cpu": "0.25 vCPU", "Memory": "1 GB"}' \
  --health-check-configuration '{"Protocol": "HTTP", "Path": "/health", "Interval": 20, "Timeout": 10, "HealthyThreshold": 1, "UnhealthyThreshold": 10}' \
  --network-configuration "{\"EgressConfiguration\": {\"EgressType\": \"VPC\", \"VpcConnectorArn\": \"$VPC_CONNECTOR_ARN\"}}" \
  --region $REGION \
  --query 'Service.ServiceUrl' --output text)

echo "API URL: https://$API_URL"
echo "Waiting for deployment (this takes ~5-10 minutes)..."

while true; do
  SERVICE_ARN=$(aws apprunner list-services --query 'ServiceSummaryList[?ServiceName==`order-tracker-api`].ServiceArn' --output text)
  STATUS=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --query 'Service.Status' --output text)
  echo "  $(date +%H:%M:%S) Status: $STATUS"
  if [ "$STATUS" = "RUNNING" ]; then echo "API is RUNNING!"; break; fi
  if [ "$STATUS" = "CREATE_FAILED" ]; then echo "FAILED! Check CloudWatch logs."; exit 1; fi
  sleep 30
done

# Verify health
echo "Verifying health endpoint..."
curl -sf "https://$API_URL/health" && echo " OK" || echo " WARNING: health check returned error"

echo ""
echo "=== Step 3: Build and deploy frontend ==="
cd order-tracker-ui
echo "VITE_API_URL=https://$API_URL" > .env.production
npm run build
aws s3 sync dist/ s3://$S3_BUCKET/ --delete
cd ..

echo ""
echo "=== Step 4: Create CloudFront distribution ==="
OAC_ID="EQQ2ABRAWTV8K"
CF_RESULT=$(aws cloudfront create-distribution \
  --distribution-config "{
    \"CallerReference\": \"order-tracker-$(date +%s)\",
    \"Comment\": \"Order Tracker UI\",
    \"DefaultCacheBehavior\": {
      \"TargetOriginId\": \"S3-order-tracker-ui\",
      \"ViewerProtocolPolicy\": \"redirect-to-https\",
      \"AllowedMethods\": {\"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"], \"CachedMethods\": {\"Quantity\": 2, \"Items\": [\"GET\", \"HEAD\"]}},
      \"ForwardedValues\": {\"QueryString\": false, \"Cookies\": {\"Forward\": \"none\"}},
      \"Compress\": true,
      \"MinTTL\": 0, \"DefaultTTL\": 86400, \"MaxTTL\": 31536000
    },
    \"Origins\": {\"Quantity\": 1, \"Items\": [{\"Id\": \"S3-order-tracker-ui\", \"DomainName\": \"$S3_BUCKET.s3.us-east-1.amazonaws.com\", \"OriginAccessControlId\": \"$OAC_ID\", \"S3OriginConfig\": {\"OriginAccessIdentity\": \"\"}}]},
    \"Enabled\": true,
    \"DefaultRootObject\": \"index.html\",
    \"CustomErrorResponses\": {\"Quantity\": 1, \"Items\": [{\"ErrorCode\": 403, \"ResponseCode\": \"200\", \"ResponsePagePath\": \"/index.html\", \"ErrorCachingMinTTL\": 10}]}
  }" \
  --query 'Distribution.{Domain:DomainName,Id:Id}' --output json)

CF_DOMAIN=$(echo "$CF_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Domain'])")
CF_DIST_ID=$(echo "$CF_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['Id'])")

# Grant CloudFront access to S3 bucket
aws s3api put-bucket-policy --bucket $S3_BUCKET --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"AllowCloudFrontServicePrincipalReadOnly\",
    \"Effect\": \"Allow\",
    \"Principal\": {\"Service\": \"cloudfront.amazonaws.com\"},
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$S3_BUCKET/*\",
    \"Condition\": {\"StringEquals\": {\"AWS:SourceArn\": \"arn:aws:cloudfront::$ACCOUNT_ID:distribution/$CF_DIST_ID\"}}
  }]
}"

echo "CloudFront domain: https://$CF_DOMAIN"

echo ""
echo "=== Step 5: Update CORS with CloudFront domain ==="
SERVICE_ARN=$(aws apprunner list-services --query 'ServiceSummaryList[?ServiceName==`order-tracker-api`].ServiceArn' --output text)

cat > /tmp/apprunner-update.json << ENDJSON
{
  "AuthenticationConfiguration": {"AccessRoleArn": "$ACCESS_ROLE_ARN"},
  "AutoDeploymentsEnabled": false,
  "ImageRepository": {
    "ImageIdentifier": "$ECR_IMAGE",
    "ImageRepositoryType": "ECR",
    "ImageConfiguration": {
      "Port": "8080",
      "RuntimeEnvironmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Production",
        "ConnectionStrings__DefaultConnection": "$CONN_STRING",
        "CORS_ALLOWED_ORIGINS": "https://$CF_DOMAIN"
      }
    }
  }
}
ENDJSON

aws apprunner update-service \
  --service-arn "$SERVICE_ARN" \
  --source-configuration file:///tmp/apprunner-update.json >/dev/null 2>&1

echo "Waiting for CORS update..."
while true; do
  STATUS=$(aws apprunner describe-service --service-arn "$SERVICE_ARN" --query 'Service.Status' --output text)
  if [ "$STATUS" = "RUNNING" ]; then break; fi
  sleep 15
done

# Clean up temp files
rm -f /tmp/apprunner-source.json /tmp/apprunner-update.json

echo ""
echo "============================================"
echo "Deployment complete!"
echo "  API:      https://$API_URL/health"
echo "  Frontend: https://$CF_DOMAIN"
echo "============================================"
