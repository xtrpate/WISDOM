import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";

const REQUIRED_VIEWS = ["front", "top", "left", "right", "back"];

export default function ImportPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const fileInputRef = useRef(null);
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [activeUploadView, setActiveUploadView] = useState(null); // Tracks which box is being uploaded

  const [comments, setComments] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Check if all 5 required files are present
  const isAllRequiredFilled = REQUIRED_VIEWS.every(
    (view) => files[view] !== undefined && files[view] !== null,
  );

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  const handleBoxClick = (view) => {
    setActiveUploadView(view);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || !activeUploadView) return;

    const isValid =
      selectedFile.type.startsWith("image/") ||
      selectedFile.type === "application/pdf";

    if (!isValid) {
      toast.error("Please upload an image or PDF file.");
      e.target.value = null;
      return;
    }

    setFiles((prev) => ({ ...prev, [activeUploadView]: selectedFile }));

    // Create a local preview URL for images
    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setPreviews((prev) => ({ ...prev, [activeUploadView]: url }));
    } else {
      setPreviews((prev) => ({ ...prev, [activeUploadView]: "" })); // PDF placeholder
    }

    e.target.value = null; // reset input
  };

  // Helper function to convert a file to Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImport = async () => {
    if (!isAllRequiredFilled) {
      toast.error("Required: Please upload all 5 views before importing.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Fetch current blueprint to avoid overwriting
      const blueprintRes = await api.get(`/blueprints/${id}`);
      const currentData = blueprintRes.data;

      let designData = {};
      try {
        designData = JSON.parse(currentData.design_data || "{}");
      } catch (e) {}

      // 2. Convert all 5 files to Base64 concurrently
      const referenceFiles = {};
      for (const view of REQUIRED_VIEWS) {
        const file = files[view];
        const base64Data = await fileToBase64(file);

        referenceFiles[view] = {
          url: base64Data,
          type: file.type.split("/")[1] || "unknown",
          name: file.name,
          source: "local",
        };
      }

      // 3. Attach files to design data
      designData.referenceFiles = referenceFiles; // The new 5-file object
      designData.referenceFile = referenceFiles.front; // Keep front as the default fallback for backwards compatibility
      designData.importComments = comments;
      designData.editorMode = "reference"; // Force editor into reference mode

      // 4. Save to database
      await api.put(`/blueprints/${id}`, {
        design_data: JSON.stringify(designData),
      });

      toast.success("All 5 references imported successfully!");
      navigate(`/blueprints/${id}/design`);
    } catch (error) {
      console.error(error);
      toast.error("Import failed. Check server connection.");
      setIsSaving(false);
    }
  };

  const handleGenerate = () => {
    toast("AI Blueprint Generation coming soon!", { icon: "🚧" });
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        background: "#0f172a",
        color: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 12,
          width: "100%",
          maxWidth: 750,
          padding: 30,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h2
          style={{
            margin: "0 0 5px",
            fontSize: 24,
            fontWeight: 700,
            color: "#f8fafc",
          }}
        >
          Import Blueprint References
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8" }}>
          Please upload all 5 required angles to generate or trace the
          blueprint.
        </p>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*,application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {/* Upload Grid (5 Boxes) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {REQUIRED_VIEWS.map((view) => {
            const hasFile = !!files[view];
            const preview = previews[view];

            return (
              <div
                key={view}
                onClick={() => handleBoxClick(view)}
                style={{
                  border: hasFile ? "2px solid #0ea5e9" : "2px dashed #475569",
                  borderRadius: 8,
                  height: 120,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: hasFile ? "#0f172a" : "transparent",
                  transition: "all 0.2s",
                  padding: 8,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt={`${view} preview`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      opacity: 0.8,
                    }}
                  />
                ) : hasFile ? (
                  <div
                    style={{
                      color: "#38bdf8",
                      fontWeight: 600,
                      fontSize: 12,
                      textAlign: "center",
                      wordBreak: "break-all",
                    }}
                  >
                    📄 {files[view].name}
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>📥</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Upload</div>
                  </>
                )}

                {/* Label Overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(15, 23, 42, 0.85)",
                    padding: "4px 0",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: hasFile ? "#38bdf8" : "#cbd5e1",
                  }}
                >
                  {view} {hasFile && "✓"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comments / Details */}
        <div style={{ marginBottom: 30 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
              color: "#cbd5e1",
            }}
          >
            Blueprint Details & Dimensions
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Type any specific dimensions, materials, or instructions here..."
            rows={3}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 6,
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#f8fafc",
              fontSize: 14,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <div
            style={{
              flex: 1,
              fontSize: 12,
              color: isAllRequiredFilled ? "#10b981" : "#f43f5e",
              fontWeight: 600,
            }}
          >
            {isAllRequiredFilled
              ? "All 5 required views uploaded ✓"
              : "⚠️ All 5 views are required"}
          </div>

          <button
            onClick={() => navigate(`/blueprints/${id}/design`)}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={!isAllRequiredFilled}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "1px solid #7c3aed",
              background: "rgba(124, 58, 237, 0.15)",
              color: "#c4b5fd",
              cursor: isAllRequiredFilled ? "pointer" : "not-allowed",
              fontWeight: 600,
              opacity: isAllRequiredFilled ? 1 : 0.5,
            }}
          >
            ✨ Generate Blueprint
          </button>

          <button
            onClick={handleImport}
            disabled={!isAllRequiredFilled || isSaving}
            style={{
              padding: "10px 24px",
              borderRadius: 6,
              border: "none",
              background: "#0ea5e9",
              color: "#fff",
              cursor:
                isAllRequiredFilled && !isSaving ? "pointer" : "not-allowed",
              fontWeight: 600,
              opacity: isAllRequiredFilled && !isSaving ? 1 : 0.5,
            }}
          >
            {isSaving ? "Importing..." : "📥 Import Reference"}
          </button>
        </div>
      </div>
    </div>
  );
}
