Manual

docker build -t fam-budget .
gcloud auth configure-docker europe-west1-docker.pkg.dev
docker tag fam-budget europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest
docker push europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest

renew job
gcloud run jobs update fam-budget-job --region=europe-west1 --image=europe-west1-docker.pkg.dev/fam-budget-457819/cloud-run-source-deploy/fam-budget:latest


Run
gcloud run jobs execute fam-budget-job --region=europe-west1

Logs
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=fam-budget-job" --limit=50 --region=europe-west1 --format="value(textPayload)"