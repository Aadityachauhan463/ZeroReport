// api/generate.js - Serverless function for report generation
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { initializeApp } from 'firebase/app';
import {
getFirestore, doc, getDoc, setDoc, updateDoc,
increment
} from 'firebase/firestore';

const api_key = process.env.GOOGLE_API_KEY;

const firebaseConfig = {
apiKey: process.env.FIREBASE_API_KEY,
authDomain: process.env.FIREBASE_AUTH_DOMAIN,
projectId: process.env.FIREBASE_PROJECT_ID,
storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
appId: process.env.FIREBASE_APP_ID,
measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

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

Add a @media print stylesheet so that when exported to PDF, the layout doesn't break.

Avoid any CSS/JS that relies only on desktop behavior.

Think A4 size PDF first: it should export cleanly when exported as PDF.

Don't add animations, not needed.

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

async function verifyFirebaseToken(idToken) {
try {
const keysResponse = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
const publicKeys = await keysResponse.json();
const decodedHeader = jwt.decode(idToken, { complete: true });
if (!decodedHeader || !decodedHeader.header.kid) throw new Error("Invalid token header");
const key = publicKeys[decodedHeader.header.kid];
if (!key) throw new Error("Public key not found");
const decoded = jwt.verify(idToken, key, {
algorithms: ["RS256"],
audience: process.env.FIREBASE_PROJECT_ID,
issuer: "https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}",
});
return decoded.uid;
} catch (err) {
console.error("Token verification failed:", err.message);
return null;
}
}

function makeId() {
if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function makePermalink(reportId) {
  return `zero-report.vercel.app/report.html?rid=${encodeURIComponent(reportId)}`;
}

async function generateAndSave(prompt, uid) {
try {
const res = await fetch(
"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
{
method: "POST",
headers: {
"Content-Type": "application/json",
"x-goog-api-key": api_key,
},
body: JSON.stringify({
contents: [{ parts: [{ text: prompt }] }]
}),
}
);

const data = await res.json();  

const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||  
             JSON.stringify(data, null, 2);  

const reportId = makeId();  
const report = {  
  reportId,  
  title: prompt.slice(0, 60) + (prompt.length > 60 ? "..." : ""),  
  html: text,  
  createdAt: new Date().toISOString(),  
  permalink: makePermalink(reportId)  
};  

try {  
  const reportRef = doc(db, "users", uid, "reports", reportId);  
  await setDoc(reportRef, report);  
  const userRef = doc(db, "users", uid);  
  const userSnap = await getDoc(userRef);  
  if (!userSnap.exists()) {  
    await setDoc(userRef, { reportsGenerated: 1 });  
  } else {  
    await updateDoc(userRef, { reportsGenerated: increment(1) });  
  }  
} catch (saveErr) {  
  console.warn("Firestore save failed:", saveErr.message);  
}  

return { text, report };

} catch (err) {
console.error("Error generating or saving report:", err);
return { text: null, report: null, error: err.message };
}
}

export default async function handler(req, res) {
// CORS headers
res.setHeader('Access-Control-Allow-Credentials', 'true');
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

if (req.method === 'OPTIONS') {
res.status(200).end();
return;
}

if (req.method !== 'POST') {
return res.status(405).json({ error: 'Method not allowed' });
}

const {
report_purpose,
report_audience_or_tone,
report_key_focus,
report_length_or_format,
report_extra_notes,
user_company = '',
design_style = 'Minimalist & Clean',
main_data,
uid,
idToken
} = req.body;

if (!report_purpose || !report_audience_or_tone || !report_key_focus ||
!report_length_or_format || !main_data || !uid) {
return res.status(400).json({ error: "Missing required fields" });
}

// OPTIONAL: Verify token if provided
if (idToken) {
const verifiedUid = await verifyFirebaseToken(idToken);
if (!verifiedUid || verifiedUid !== uid) {
return res.status(401).json({ error: "Unauthorized" });
}
}

try {
const truncatedData = main_data.length > 10000
? main_data.substring(0, 10000) + '\n... [Truncated]'
: main_data;

const prompt = generateReportPrompt(  
  report_purpose,  
  report_audience_or_tone,  
  report_key_focus,  
  report_length_or_format,  
  report_extra_notes,  
  user_company,  
  design_style,  
  truncatedData  
);  

const output = await generateAndSave(prompt, uid);  

if (output.error || !output.report) {  
  throw new Error(output.error || 'Generation failed');  
}  

return res.status(200).json({   
  permalink: output.report.permalink,   
  reportid: output.report.reportId,  
  generatedHtmlSnippet: output.text.substring(0, 500) + '... (truncated for response)'  
});

} catch (err) {
console.error('Handler error:', err);
return res.status(500).json({ error: "Failed: " + err.message });
}
}