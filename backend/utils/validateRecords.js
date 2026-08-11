const ALLOWED_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

const ALLOWED_DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

function validateRecord(record) {
  // Check if record exists
  if (!record || typeof record !== "object") {
    return {
      valid: false,
      reason: "Invalid or empty record",
    };
  }

  // Get email and mobile
  const email = String(record.email || "").trim();

  const mobile = String(
    record.mobile_without_country_code || ""
  ).trim();

  // -----------------------------------------
  // Skip if BOTH email and mobile are missing
  // -----------------------------------------
  if (!email && !mobile) {
    return {
      valid: false,
      reason: "Missing email and mobile number",
    };
  }

  // -----------------------------------------
  // Validate CRM status
  // -----------------------------------------
  if (
    record.crm_status &&
    !ALLOWED_STATUSES.includes(record.crm_status)
  ) {
    record.crm_status = "";
  }

  // -----------------------------------------
  // Validate data source
  // -----------------------------------------
  if (
    record.data_source &&
    !ALLOWED_DATA_SOURCES.includes(record.data_source)
  ) {
    record.data_source = "";
  }

  // -----------------------------------------
  // Return valid record
  // -----------------------------------------
  return {
    valid: true,
    record,
  };
}

module.exports = {
  validateRecord,
};