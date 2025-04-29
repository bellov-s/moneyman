#!/bin/bash
set -e

echo "Building docker image..."
docker build -t fam-budget .

echo "Tagging image for Artifact Registry..."
docker tag fam-budget europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest

echo "Pushing image to Artifact Registry..."
docker push europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest

echo "Updating Cloud Run Job..."
gcloud run jobs update fam-budget-job --region=europe-west1 --image=europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest

echo "✅ Done! Ready to execute the job."
