const fs = require("fs");
const csv = require("csv-parser");

const { analyzeCSV } = require("../services/geminiService");
const { validateRecord } = require("../utils/validateRecords");

exports.uploadFile = async (req, res) => {
  console.log("uploadFile called");

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const rows = [];

  try {
    // -----------------------------------------
    // 1. Read and parse CSV
    // -----------------------------------------

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
          rows.push(data);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log(`CSV contains ${rows.length} rows`);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV file is empty",
      });
    }

    // -----------------------------------------
    // 2. Process CSV in batches
    // -----------------------------------------

    const BATCH_SIZE = 20;

    let allRecords = [];
    let skippedRecords = [];

    const totalBatches = Math.ceil(
      rows.length / BATCH_SIZE
    );

    for (
      let i = 0;
      i < rows.length;
      i += BATCH_SIZE
    ) {
      const batchNumber =
        Math.floor(i / BATCH_SIZE) + 1;

      const batch = rows.slice(
        i,
        i + BATCH_SIZE
      );

      console.log(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} rows)`
      );

      const result = await analyzeCSV(batch);

      // -----------------------------------------
      // 3. Validate Gemini records
      // -----------------------------------------

      if (
        result &&
        Array.isArray(result.records)
      ) {
        for (const record of result.records) {
          const validation =
            validateRecord(record);

          if (validation.valid) {
            allRecords.push(
              validation.record
            );
          } else {
            skippedRecords.push({
              reason: validation.reason,
              record,
            });
          }
        }
      }

      console.log(
        `Batch ${batchNumber} completed. Records returned: ${
          result?.records?.length || 0
        }`
      );
    }

    // -----------------------------------------
    // 4. Calculate results
    // -----------------------------------------

    const imported = allRecords.length;

    const skipped = skippedRecords.length;

    console.log(
      `Import completed: ${imported} imported, ${skipped} skipped`
    );

    // -----------------------------------------
    // 5. Send response
    // -----------------------------------------

    return res.status(200).json({
      success: true,

      totalRows: rows.length,

      imported,

      skipped,

      records: allRecords,

      skippedRecords,
    });

  } catch (error) {
    console.error(
      "Upload/AI Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message: "CSV processing failed",

      error: error.message,
    });

  } finally {
    // -----------------------------------------
    // 6. Delete temporary uploaded CSV
    // -----------------------------------------

    try {
      if (
        req.file?.path &&
        fs.existsSync(req.file.path)
      ) {
        fs.unlinkSync(req.file.path);

        console.log(
          "Temporary uploaded file deleted"
        );
      }

    } catch (cleanupError) {
      console.error(
        "Could not delete temporary uploaded file:",
        cleanupError.message
      );
    }
  }
};