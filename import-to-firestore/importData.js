// importData.js

// 导入 Firebase Admin SDK
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------
// !!! IMPORTANT: Configure your service account key and project ID !!!
// -----------------------------------------------------------

// 1. Path to your Service Account Key JSON file
//    Make sure this file is in the same directory as importData.js
//    or specify its correct absolute/relative path.
const serviceAccountPath = './datalens-insights-2fh8a-firebase-adminsdk-fbsvc-5fe929b7b7.json'; // <<--- CHANGE THIS TO YOUR ACTUAL FILENAME

// 2. Your Firebase Project ID
//    You can find this in your Firebase Console -> Project settings
const projectId = 'datalens-insights-2fh8a'; // <<--- OPTIONAL: You can also put this in your serviceAccountPath JSON itself

// -----------------------------------------------------------

// Initialize Firebase Admin SDK
// You MUST provide credentials.
// Option A: Use a downloaded service account key file (recommended for local scripts)
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  projectId: projectId, // Ensure projectId is correctly set here
});

// Option B: If GOOGLE_APPLICATION_CREDENTIALS environment variable is set
// admin.initializeApp();


const db = admin.firestore();

// Path to your insurance_data.json file (in the same directory as this script)
const dataFilePath = path.join(__dirname, 'insurance_data.json');

// The Firestore collection name where you want to store the data
// We'll use 'v4_period_data' as it seems your data is structured around periods (V4PeriodData[])
const collectionName = 'v4_period_data';

async function importData() {
  try {
    console.log(`Starting data import to Firestore collection: "${collectionName}"`);

    // Read the JSON data file
    const rawData = fs.readFileSync(dataFilePath, 'utf8');
    const jsonData = JSON.parse(rawData);

    if (!Array.isArray(jsonData)) {
      console.error('Error: JSON data is not an array. Expected an array of objects.');
      process.exit(1);
    }

    // Use a batch write for efficiency
    const batch = db.batch();
    let counter = 0;

    for (const item of jsonData) {
      // Assuming each item in the array has a 'period_id' that can serve as a unique document ID.
      // If 'period_id' is not unique or not suitable, Firestore will auto-generate an ID if you use addDoc.
      // For this example, we'll use period_id as the document ID for easier lookup.
      if (!item.period_id) {
        console.warn(`Skipping item due to missing period_id:`, item);
        continue;
      }

      const docRef = db.collection(collectionName).doc(item.period_id);
      batch.set(docRef, item); // Use set to create or overwrite documents
      counter++;

      // Commit batch every 500 documents (Firestore batch limit is 500)
      if (counter % 499 === 0) { // Using 499 to be safe within the 500 limit
        await batch.commit();
        console.log(`Committed batch of ${counter} documents.`);
        batch = db.batch(); // Start a new batch
      }
    }

    // Commit any remaining documents in the last batch
    if (counter > 0) {
      await batch.commit();
      console.log(`Successfully imported ${counter} documents to Firestore collection "${collectionName}".`);
    } else {
        console.log("No documents to import or all items skipped.");
    }

  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1); // Exit with an error code
  } finally {
    // You might want to close the app if it's a long-running script,
    // but for a simple import, it usually exits naturally.
  }
}

// Execute the import function
importData();
