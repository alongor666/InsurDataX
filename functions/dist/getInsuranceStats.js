"use strict";
// functions/src/getInsuranceStats.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInsuranceStats = void 0;
// Import Firebase Functions and Admin SDK
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path")); // For handling file paths
const fs = __importStar(require("fs")); // For reading files
// Ensure Firebase Admin SDK is initialized only once
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * [HTTPS Callable Function]
 * Securely provides insurance statistics data.
 * This function requires the caller to be authenticated via Firebase Authentication.
 */
exports.getInsuranceStats = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check: Verify if the user is logged in
    if (!context.auth) {
        // If no authentication information is present, throw an unauthenticated error
        throw new functions.https.HttpsError('unauthenticated', // Error type: unauthenticated
        'The function must be called while authenticated.' // Error message
        );
    }
    // Optional: More granular authorization check (e.g., only specific users or roles)
    // If you need to restrict access to certain users (e.g., based on UID or custom claims)
    // You can check context.auth.uid or context.auth.token.role here.
    // For example:
    // if (context.auth.token.role !== 'admin') {
    //   throw new new functions.https.HttpsError(
    //     'permission-denied',
    //     'Only administrators can access this data.'
    //   );
    // }
    try {
        // 2. Build the absolute path to the JSON file
        // The 'functions' directory is the root directory for Cloud Functions.
        // Assuming insurance_data.json was moved to functions/data/
        // __dirname points to the compiled output directory of the current function (e.g., functions/lib or functions/dist).
        // So if your JSON is in functions/data, it will be at functions/lib/data or functions/dist/data after compilation.
        const filePath = path.join(__dirname, 'data', 'insurance_data.json');
        // Check if the file exists before attempting to read
        if (!fs.existsSync(filePath)) {
            console.error(`File not found at path: ${filePath}`);
            throw new functions.https.HttpsError('not-found', 'Insurance data file not found on the server (internal error).');
        }
        // 3. Read the JSON file content
        const rawData = fs.readFileSync(filePath, 'utf8');
        const insuranceStats = JSON.parse(rawData);
        // 4. Return the statistics data
        return { status: 'success', data: insuranceStats };
    }
    catch (error) {
        console.error('Error fetching insurance stats:', error);
        // Differentiate between file not found error (if existsSync failed) and parsing errors
        if (error instanceof SyntaxError) { // JSON parsing error
            throw new functions.https.HttpsError('internal', 'Failed to parse insurance data. Data file might be corrupted.');
        }
        // Re-throw HttpsError if it's already one
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Catch any other unexpected errors
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while fetching data.');
    }
});
//# sourceMappingURL=getInsuranceStats.js.map