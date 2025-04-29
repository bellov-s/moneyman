import "dotenv/config";
import { subDays } from "date-fns";
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { createLogger } from './utils/logger.js';
import * as path from 'path';

//console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.LOCAL_JSON_STORAGE);

const logger = createLogger('test-secrets');

const client = new SecretManagerServiceClient();
async function getSecret(secretName: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/fam-budget-457819/secrets/${secretName}/versions/latest`,
  });

  // Проверяем, существует ли payload и data
  if (!version.payload || !version.payload.data) {
    throw new Error(`Secret ${secretName} is empty or undefined`);

  }

  const secret = version.payload.data.toString();
  return secret;
}

async function testSecrets() {
  try {
    logger('Starting secret test...');
    await getSecret('ACCOUNTS_JSON');
    await getSecret('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
    await getSecret('FIREBASE_SERVICE_ACCOUNT_JSON');
    logger('Secrets successfully loaded!');
  } catch (error) {
    logger('Error loading secrets', error);
  }
}

testSecrets();
