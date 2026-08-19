"use client";

import { useState } from "react";
import Papa from "papaparse";

type CSVRow = Record<string, string>;

interface Result {
  totalRows?: number;
  imported?: number;
  skipped?: number;
  records?: any[];
  error?: string;
  message?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<Result | null>(null);

  const [error, setError] = useState("");

  // Stores CSV data for preview
  const [preview, setPreview] = useState<CSVRow[]>([]);

  // Stores CSV column names
  const [headers, setHeaders] = useState<string[]>([]);

  const handleFileChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const selectedFile = e.target.files?.[0] || null;

  if (!selectedFile) {
    setFile(null);
    setError("");
    setResult(null);
    setPreview([]);
    setHeaders([]);
    return;
  }

  if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setResult(null);
    setError("Please select a CSV file.");
    return;
  }

  setFile(selectedFile);
  setError("");
  setResult(null);
  setPreview([]);
  setHeaders([]);
};

  // STEP 1:
  // Parse CSV locally and show preview.
  // IMPORTANT: This does NOT call the backend or Gemini.
  const handlePreview = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setError("");
    setResult(null);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        if (results.errors.length > 0) {
          console.error("CSV parsing errors:", results.errors);

          setError(
            "There was a problem reading the CSV file. Please check that it is a valid CSV."
          );

          return;
        }

        const rows = results.data;

        if (rows.length === 0) {
          setError("The CSV file does not contain any data rows.");
          return;
        }

        // Get column names
        const csvHeaders = Object.keys(rows[0]);

        setHeaders(csvHeaders);

        // For preview, show first 10 rows
        setPreview(rows.slice(0, 10));
      },

      error: (error) => {
        console.error(error);
        setError("Unable to read the CSV file.");
      },
    });
  };

  // This is your ORIGINAL backend upload function.
  // We will connect this to "Confirm Import" in the next step.
  const handleUpload = async () => {
  if (!file) {
    setError("Please select a CSV file first.");
    return;
  }

  setLoading(true);
  setError("");
  setResult(null);

  try {
    const formData = new FormData();

    formData.append("file", file);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    console.log("API URL:", apiUrl);

    if (!apiUrl) {
      throw new Error(
        "NEXT_PUBLIC_API_URL is not configured."
      );
    }

    const response = await fetch(
      `${apiUrl}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const responseText = await response.text();

    console.log(
      "upload status:",
      response.status
    );

    console.log(
      "upload response:",
      responseText
    );
    
    let data: Result;

    try{
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Backend returned non-JSON response (${response.status}): ${responseText.slice(0, 300)}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        "Upload failed"
      );
    }

    setResult(data);
    
  } catch (err: any) {
    console.error(err);

    setError(
      err.message ||
      "Something went wrong."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen bg-gray-100 py-10">
      <div className="mx-auto max-w-6xl px-4">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            AI CSV Importer
          </h1>

          <p className="mt-2 text-gray-600">
            Upload your CSV file and let AI analyze and
            process your data.
          </p>
        </div>

        {/* Upload Card */}
        <div className="rounded-xl bg-white p-8 shadow-md">

          <h2 className="mb-4 text-2xl font-semibold text-gray-800">
            Upload CSV File
          </h2>

          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mx-auto block"
            />

            {file && (
              <p className="mt-4 text-sm text-gray-600">
                Selected file:{" "}
                <span className="font-semibold">
                  {file.name}
                </span>
              </p>
            )}

            {/* Preview Button */}
            <button
              onClick={handlePreview}
              disabled={!file}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Preview CSV
            </button>

            {loading && (
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-blue-600">
                AI is analyzing your CSV. Please wait...
                </p>

                <div className="mx-auto mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
                 <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600"></div>
                </div>
              </div>
            )}

          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg bg-red-100 p-4 text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* CSV Preview */}
        {preview.length > 0 && (
          <div className="mt-8 rounded-xl bg-white p-8 shadow-md">

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  CSV Preview
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Showing first {preview.length} rows
                </p>
              </div>
            </div>

            {/* Responsive table */}
            <div className="max-h-96 overflow-auto rounded-lg border">

              <table className="min-w-full text-left text-sm">

                {/* Sticky Header */}
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap border-b px-4 py-3 font-semibold text-gray-700"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {preview.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b hover:bg-gray-50"
                    >
                      {headers.map((header) => (
                        <td
                          key={header}
                          className="whitespace-nowrap px-4 py-3 text-gray-700"
                        >
                          {row[header] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

            {/* Confirm button */}
            <div className="mt-6 text-center">

              <button
                onClick={handleUpload}
                disabled={loading}
                className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {loading
                  ? "Processing CSV..."
                  : "Confirm Import"}
              </button>

            </div>

          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 rounded-xl bg-white p-8 shadow-md">

            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              Import Result
            </h2>

            {/* Statistics */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <div className="rounded-lg bg-blue-50 p-5">
                <p className="text-sm text-gray-500">
                  Total Rows
                </p>

                <p className="text-3xl font-bold text-blue-600">
                  {result.totalRows ?? 0}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-5">
                <p className="text-sm text-gray-500">
                  Imported
                </p>

                <p className="text-3xl font-bold text-green-600">
                  {result.imported ?? 0}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-5">
                <p className="text-sm text-gray-500">
                  Skipped
                </p>

                <p className="text-3xl font-bold text-red-600">
                  {result.skipped ?? 0}
                </p>
              </div>

            </div>

            {/* Records */}
            {result.records &&
              result.records.length > 0 && (
                <div className="mt-8">

                  <h3 className="mb-4 text-xl font-semibold">
                    Processed Records
                  </h3>

                  <div className="max-h-96 overflow-auto rounded-lg border">

                    <table className="min-w-full text-left text-sm">

                      <thead className="sticky top-0 bg-gray-100">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3">
                            Name
                          </th>

                          <th className="whitespace-nowrap px-4 py-3">
                            Email
                          </th>

                          <th className="whitespace-nowrap px-4 py-3">
                            Mobile
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.records.map(
                          (
                            record: any,
                            index: number
                          ) => (
                            <tr
                              key={index}
                              className="border-t hover:bg-gray-50"
                            >
                              <td className="px-4 py-3">
                                {record.name || "-"}
                              </td>

                              <td className="px-4 py-3">
                                {record.email || "-"}
                              </td>

                              <td className="px-4 py-3">
                                {record.mobile_without_country_code ||
                                  "-"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>

                    </table>
                  </div>
                </div>
              )}

            {/* Raw JSON */}
            <details className="mt-8">
              <summary className="cursor-pointer font-semibold text-gray-700">
                View Complete Response
              </summary>

              <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-900 p-5 text-sm text-green-400">
                {JSON.stringify(
                  result,
                  null,
                  2
                )}
              </pre>
            </details>

          </div>
        )}

      </div>
    </main>
  );
}