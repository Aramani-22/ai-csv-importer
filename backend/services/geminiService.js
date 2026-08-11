const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function analyzeCSV(rows) {
  const prompt = `
You are an expert CRM data transformation AI.

Your job is to convert CSV records into GrowEasy CRM records.

IMPORTANT INPUT RULES:

1. The CSV can have ANY column names.
2. Do NOT assume column names are fixed.
3. You must intelligently identify which input columns correspond to CRM fields.
4. Each input CSV row MUST produce exactly ONE output record.
5. NEVER silently remove, merge, combine, or ignore an input row.
6. Return records in the SAME ORDER as the input rows.
7. If a row has no email AND no mobile number, STILL return an output record for that row with the available fields and empty email/mobile fields. The backend will decide whether to skip it.
8. Do NOT skip records yourself.

FIELD MAPPING EXAMPLES:

"Full Name" -> name
"Name" -> name
"Customer Name" -> name
"Lead Name" -> name

"Email Address" -> email
"Email" -> email
"Email ID" -> email
"Contact Email" -> email
"Work Email" -> email

"Phone Number" -> mobile_without_country_code
"Mobile" -> mobile_without_country_code
"Mobile Number" -> mobile_without_country_code
"WhatsApp Number" -> mobile_without_country_code
"Contact Number" -> mobile_without_country_code

"Company Name" -> company
"Company" -> company
"Organization" -> company
"Business Name" -> company

"Location" may contain city, state, country, or a combination.
Intelligently separate it when possible.

Extract as many of these GrowEasy CRM fields as possible:

created_at
name
email
country_code
mobile_without_country_code
company
city
state
country
lead_owner
crm_status
crm_note
data_source
possession_time
description

CRM STATUS:

crm_status MUST be one of:

GOOD_LEAD_FOLLOW_UP
DID_NOT_CONNECT
BAD_LEAD
SALE_DONE

If the source value does not clearly match one of these,
leave crm_status as an empty string.

DATA SOURCE:

data_source MUST be one of:

leads_on_demand
meridian_tower
eden_park
varah_swamy
sarjapur_plots

If no confident match exists,
leave data_source as an empty string.

PHONE RULES:

If multiple phone numbers exist:

- Put the first phone number into mobile_without_country_code.
- Put additional phone numbers into crm_note.

Remove the country code from mobile_without_country_code
when the country code can be identified confidently.

EMAIL RULES:

If multiple email addresses exist:

- Put the first email into email.
- Put additional email addresses into crm_note.

CRM NOTE:

Use crm_note for:

- remarks
- follow-up notes
- additional comments
- additional phone numbers
- additional email addresses
- useful information that does not fit another CRM field

DATE RULE:

created_at must be a date string that JavaScript can parse using:

new Date(created_at)

IMPORTANT OUTPUT RULE:

You MUST return exactly ONE record for EVERY input row.

For example:

If the input contains 5 rows,
the output MUST contain exactly 5 records.

If the input contains 20 rows,
the output MUST contain exactly 20 records.

NEVER return fewer records than the number of input rows.

Do not merge two input rows into one record.

Do not discard a row because some fields are missing.

Return the records in exactly the same order as the input rows.

Return ONLY valid JSON.

Return exactly this structure:

{
  "records": [
    {
      "created_at": "",
      "name": "",
      "email": "",
      "country_code": "",
      "mobile_without_country_code": "",
      "company": "",
      "city": "",
      "state": "",
      "country": "",
      "lead_owner": "",
      "crm_status": "",
      "crm_note": "",
      "data_source": "",
      "possession_time": "",
      "description": ""
    }
  ]
}

Do not return markdown.
Do not return explanations.
Do not return code fences.

INPUT CSV RECORDS:

${JSON.stringify(rows)}
`;

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      console.log(`Gemini attempt ${attempt} completed`);

      let text = "";

      if (typeof response.text === "function") {
        text = response.text();
      } else if (typeof response.text === "string") {
        text = response.text;
      } else if (
        response.candidates &&
        response.candidates.length > 0 &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts.length > 0
      ) {
        text = response.candidates[0].content.parts[0].text;
      }

      if (!text) {
        throw new Error("No text returned from Gemini.");
      }

      text = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(text);

      if (!parsed || !Array.isArray(parsed.records)) {
        throw new Error(
          "Gemini returned an invalid response format."
        );
      }

      // IMPORTANT:
      // Gemini must return exactly one record for every input row.
      if (parsed.records.length !== rows.length) {
        throw new Error(
          `Gemini returned ${parsed.records.length} records for ${rows.length} input rows.`
        );
      }

      return parsed;
    } catch (err) {
      console.error(
        `Gemini attempt ${attempt} failed:`,
        err.message
      );

      if (attempt === MAX_RETRIES) {
        throw err;
      }

      console.log("Retrying Gemini...");

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
    }
  }
}

module.exports = {
  analyzeCSV,
};