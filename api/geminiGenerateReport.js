
// Initialize the client (pulls API key from environment variable GEMINI_API_KEY)
const api_key = "AIzaSyBP2P6Qd5ZtfrFlbv0OFG78LJQDFfepeII"

const generateReportPrompt = (
  report_purpose,
  report_audience_or_tone,
  report_key_focus,
  report_length_or_format,
  report_extra_notes,
  user_company,
  design_style,
  main_data
) => {
  return `
You are an AI report generator. Generate a detailed, professional report based on the following instructions and data. Follow all instructions carefully.


---

Report Instructions:

1. Purpose / Objective: ${report_purpose}


2. Audience / Tone: ${report_audience_or_tone}


3. Key Focus / Metrics: ${report_key_focus}


4. Length / Format: ${report_length_or_format}


5. Extra Notes / Custom Instructions: ${report_extra_notes}


6. Made By: ${user_company}  (Optional, include at the end as "Made by [user_company]")


7. Design style: ${design_style}




---

Data:
${main_data}


---

Design Instructions:

Please design this report in responsive HTML + CSS.

Use fluid layouts (percentages, flexbox, grid) instead of fixed pixel widths.

Make sure it looks good on both desktop and mobile.

Add a @media print stylesheet so that when exported to PDF, the layout doesn’t break.

Avoid any CSS/JS that relies only on desktop behavior.

Think A4 size PDF first: it should export cleanly when exported as PDF.

Don’t add animations, not needed.

Make sure it looks great when exported as PDF.



---

Formatting Instructions:

Create sections and headings as needed.

Highlight key metrics or insights from the data.

Use a tone appropriate for the audience.

If instructed, include bullet points, charts (describe them if not generating images), or tables.

Keep report within requested length/format.

Always end with "Made by [user_company]" if provided.



---

Output only the final report content in responsive in single index.html, with css and js embedded, no explanations or extra commentary.
`;
};
import { google } from '@ai-sdk/google';

// Initialize Google Generative AI client
const genAI = google({
  apiKey: api_key});
// import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the client (pulls API key from environment variable GEMINI_API_KEY)

import jwt from "jsonwebtoken"; // make sure to `npm install jsonwebtoken`
import fetch from "node-fetch";

// Verify Firebase ID Token using Google public keys (no Admin SDK)
async function verifyFirebaseToken(idToken) {
  try {
    // Get Google public keys
    const keysResponse = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
    const publicKeys = await keysResponse.json();

    // Decode header to find the correct key ID
    const decodedHeader = jwt.decode(idToken, { complete: true });
    if (!decodedHeader || !decodedHeader.header.kid) throw new Error("Invalid token header");

    const key = publicKeys[decodedHeader.header.kid];
    if (!key) throw new Error("Public key not found");

    // Verify signature and claims
    const decoded = jwt.verify(idToken, key, {
      algorithms: ["RS256"],
      audience: "sigma-app-e9397", // your Firebase project ID
      issuer: "https://securetoken.google.com/sigma-app-e9397",
    });

    return decoded.uid; // return UID if valid
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return null;
  }
}

// const genAI = new GoogleGenerativeAI(api_key);

import { initializeApp } from "firebase/app";

import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  arrayUnion, increment
} from "firebase/firestore";


// ---------- CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyARzeyulL-4c_ATw7NcUP-gsUh2-qE3fNU",
  authDomain: "sigma-app-e9397.firebaseapp.com",
  projectId: "sigma-app-e9397",
  storageBucket: "sigma-app-e9397.firebasestorage.app",
  messagingSenderId: "561606435145",
  appId: "1:561606435145:web:c68e3629ce50215f177a98",
  measurementId: "G-1KG5C55LEB"
};

const USE_SUBCOLLECTION = true;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- UTIL ----------
function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function makePermalink(uid, reportId) {
  return `zero-report.vercel.app/report.html?rid=${encodeURIComponent(reportId)}`;
}

// ---------- Generate & Save (subcollection) ----------
async function generateAndSaveSubcollection(prompt, uid) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    const reportId = makeId();
    const report = {
      reportId,
      title: prompt.slice(0, 60) + (prompt.length > 60 ? "..." : ""),
      html: text,
      createdAt: new Date().toISOString(),
      permalink: makePermalink(uid, reportId)
    };

    // Save report in subcollection
    const reportRef = doc(db, "users", uid, "reports", reportId);
    await setDoc(reportRef, report);

    // Increment reportsGenerated in parent user doc
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { reportsGenerated: 1 });
    } else {
      await updateDoc(userRef, { reportsGenerated: increment(1) });
    }

    return { text, report };
  } catch (err) {
    console.error("Error generating or saving report:", err);
    return { text: null, report: null, error: err.message };
  }
}

// ---------- PUBLIC API wrapper ----------
async function generateAndSave(prompt, uid) {
  if (USE_SUBCOLLECTION) {
    return await generateAndSaveSubcollection(prompt, uid);
  } else {
    console.warn("Inline storage not used; defaulting to subcollection.");
    return await generateAndSaveSubcollection(prompt, uid);
  }
}

// ... [your imports and other functions remain the same]

// ---------- PRODUCTION USAGE ----------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract body
  const {
    report_purpose,
    report_audience_or_tone,
    report_key_focus,
    report_length_or_format,
    report_extra_notes,
    user_company = '',  // Optional
    design_style = 'Minimalist & Clean',  // Default if missing
    main_data,
    uid
    // If you add token later: , idToken
  } = req.body;

  // Looser validation: Require essentials only
  if (!report_purpose || !report_audience_or_tone || !report_key_focus || 
      !report_length_or_format || !main_data || !uid) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // OPTIONAL: If you want Firebase token auth later, uncomment and adjust frontend to send idToken
  // const idToken = req.body.idToken;  // Or req.headers.authorization?.split('Bearer ')[1]
  // if (!idToken) return res.status(401).json({ error: "Missing auth token" });
  // const verifiedUid = await verifyFirebaseToken(idToken);
  // if (!verifiedUid || verifiedUid !== uid) {
  //   return res.status(401).json({ error: "Unauthorized: Invalid user token" });
  // }

  // For now, trust the uid (or add your own cookie verification logic here if needed)

  try {
    // Truncate main_data if huge to avoid Gemini token limits (e.g., first 10K chars)
    const truncatedData = main_data.length > 10000 ? main_data.substring(0, 10000) + '\n... [Truncated for performance]' : main_data;
    
    const prompt = generateReportPrompt(
      report_purpose,
      report_audience_or_tone,
      report_key_focus,
      report_length_or_format,
      report_extra_notes,
      user_company,
      design_style,
      truncatedData  // Use truncated
    );

    const output = await generateAndSave(prompt, uid);

    if (output.error || !output.report) {
      throw new Error(output.error || 'Generation failed');
    }

    res.status(200).json({ permalink: output.report.permalink, reportid: output.report.reportId });
  } catch (err) {
    console.error('Handler error:', err);  // Log full stack for debugging
    res.status(500).json({ error: "Failed to generate report: " + err.message });  // Always JSON!
  }
}