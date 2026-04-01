// src/pages/blueprints/BlueprintsPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";

const STAGE_COLORS = {
  design: ["#e0f2fe", "#075985"],
  estimation: ["#fef9c3", "#854d0e"],
  approval: ["#f3e8ff", "#6b21a8"],
  production: ["#fed7aa", "#9a3412"],
  delivery: ["#dbeafe", "#1e40af"],
  completed: ["#d1fae5", "#065f46"],
  archived: ["#f1f5f9", "#475569"],
};

const TABS = ["my", "imports", "gallery", "archive"];
const ALLOWED_IMPORT_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "svg"];
const MAX_IMPORT_FILE_SIZE_MB = 15;

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH");
}

function getFileExtension(filename = "") {
  const parts = String(filename).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function validateImportFile(file) {
  if (!file) {
    return "Please select a file.";
  }

  const ext = getFileExtension(file.name);
  if (!ALLOWED_IMPORT_EXTENSIONS.includes(ext)) {
    return "Only PDF, PNG, JPG, JPEG, and SVG blueprint files are allowed.";
  }

  const maxBytes = MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File size must not exceed ${MAX_IMPORT_FILE_SIZE_MB}MB.`;
  }

  return null;
}

function getBlueprintIcon(fileType) {
  const type = String(fileType || "").toLowerCase();

  if (type === "pdf") return "📄";
  if (type === "svg") return "🧩";
  if (["png", "jpg", "jpeg"].includes(type)) return "🖼️";

  return "🗺️";
}

export default function BlueprintsPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("my");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [importModal, setImportModal] = useState(false);
  const [importForm, setImportForm] = useState({ title: "", file: null });
  const [importing, setImporting] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [archiveConfirmModal, setArchiveConfirmModal] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/blueprints", {
        params: { tab, search, limit: 20 },
      });

      setItems(Array.isArray(data?.rows) ? data.rows : []);
      setTotal(Number(data?.total) || 0);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load blueprints.");
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openArchiveConfirm = (bp) => {
    setArchiveTarget(bp);
    setArchiveConfirmModal(true);
  };

  const closeArchiveConfirm = () => {
    if (archivingId) return;
    setArchiveConfirmModal(false);
    setArchiveTarget(null);
  };

  const confirmArchive = async () => {
    if (!archiveTarget?.id) return;

    try {
      setArchivingId(archiveTarget.id);
      await api.delete(`/blueprints/${archiveTarget.id}`);
      toast.success("Blueprint archived.");
      setArchiveConfirmModal(false);
      setArchiveTarget(null);
      load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to archive blueprint.",
      );
    } finally {
      setArchivingId(null);
    }
  };

  const handleRestore = async (id) => {
    try {
      setRestoringId(id);
      await api.patch(`/blueprints/${id}/restore`);
      toast.success("Blueprint restored.");
      load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to restore blueprint.",
      );
    } finally {
      setRestoringId(null);
    }
  };

  const openDeleteConfirm = (bp) => {
    setDeleteTarget(bp);
    setDeleteConfirmModal(true);
  };

  const closeDeleteConfirm = () => {
    if (deletingId) return;
    setDeleteConfirmModal(false);
    setDeleteTarget(null);
  };

  const confirmPermanentDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeletingId(deleteTarget.id);
      await api.delete(`/blueprints/${deleteTarget.id}/permanent`);
      toast.success("Blueprint deleted permanently.");
      setDeleteConfirmModal(false);
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to permanently delete blueprint.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();

    if (!importForm.title.trim()) {
      toast.error("Please enter a blueprint title.");
      return;
    }

    const fileError = validateImportFile(importForm.file);
    if (fileError) {
      toast.error(fileError);
      return;
    }

    setImporting(true);

    try {
      const fd = new FormData();
      fd.append("title", importForm.title.trim());
      fd.append("source", "imported");
      fd.append("stage", "design");
      fd.append("file", importForm.file);

      await api.post("/blueprints", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Blueprint file imported.");
      setImportModal(false);
      setImportForm({ title: "", file: null });
      setTab("imports");
      load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to import blueprint file.",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleCreateBlueprint = async (e) => {
    e.preventDefault();

    if (!createTitle.trim()) {
      toast.error("Please enter a blueprint title.");
      return;
    }

    setCreating(true);

    try {
      let res;

      try {
        res = await api.post("/blueprints", {
          title: createTitle.trim(),
          source: "created",
          stage: "design",
        });
      } catch {
        const fd = new FormData();
        fd.append("title", createTitle.trim());
        fd.append("source", "created");
        fd.append("stage", "design");

        res = await api.post("/blueprints", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const newId =
        res?.data?.id || res?.data?.blueprint?.id || res?.data?.data?.id;

      if (!newId) {
        throw new Error("No blueprint ID returned.");
      }

      toast.success("Blueprint created.");
      setCreateModal(false);
      setCreateTitle("");
      navigate(`/admin/blueprints/${newId}/design`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create blueprint.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleOpenFile = (fileUrl) => {
    if (!fileUrl) {
      toast.error("No imported file available.");
      return;
    }

    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1e2a38",
            margin: 0,
          }}
        >
          Blueprint Management
        </h1>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setImportModal(true)} style={btnGhost}>
            📂 Import File
          </button>
          <button onClick={() => setCreateModal(true)} style={btnPrimary}>
            + New Blueprint
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          borderBottom: "2px solid #e2e8f0",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              color: tab === t ? "#1e40af" : "#64748b",
              borderBottom:
                tab === t ? "2px solid #1e40af" : "2px solid transparent",
              marginBottom: -2,
              textTransform: "capitalize",
            }}
          >
            {t === "my"
              ? "My Blueprints"
              : t === "imports"
                ? "Device Imports"
                : t === "gallery"
                  ? "Blueprint Gallery"
                  : "Archive"}
          </button>
        ))}

        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "#94a3b8",
            alignSelf: "center",
          }}
        >
          {total} items
        </span>
      </div>

      <input
        placeholder="Search blueprints..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputSm, marginBottom: 16, minWidth: 300 }}
      />

      {items.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 60,
            textAlign: "center",
            color: "#94a3b8",
            boxShadow: "0 1px 6px rgba(0,0,0,.08)",
          }}
        >
          No blueprints found in this section.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((bp) => {
            const [stageBg, stageColor] = STAGE_COLORS[bp.stage] || [
              "#f1f5f9",
              "#475569",
            ];
            const isTemplate = Number(bp.is_template) === 1;
            const hasThumbnail = !!bp.thumbnail_url;
            const isImported =
              String(bp.source || "").toLowerCase() === "imported";
            const displayDate =
              tab === "archive"
                ? bp.archived_at || bp.updated_at || bp.created_at
                : bp.updated_at || bp.created_at;

            const isDeleting = deletingId === bp.id;
            const isRestoring = restoringId === bp.id;
            const isArchiving = archivingId === bp.id;
            const isBusy = isDeleting || isRestoring || isArchiving;

            return (
              <div
                key={bp.id}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 1px 6px rgba(0,0,0,.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: 140,
                    background: "linear-gradient(135deg, #e0f2fe, #ddd6fe)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {hasThumbnail ? (
                    <img
                      src={bp.thumbnail_url}
                      alt={bp.title || "Blueprint"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 48 }} aria-hidden="true">
                      {getBlueprintIcon(bp.file_type)}
                    </span>
                  )}

                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: stageBg,
                      color: stageColor,
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {bp.stage || "design"}
                  </span>

                  {isTemplate && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        background: "#fbbf24",
                        color: "#78350f",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      TEMPLATE
                    </span>
                  )}

                  {isImported && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        background: "rgba(15, 23, 42, 0.8)",
                        color: "#fff",
                        padding: "3px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                      }}
                    >
                      {bp.file_type ? bp.file_type : "file"}
                    </span>
                  )}
                </div>

                <div style={{ padding: 16 }}>
                  <h3
                    style={{
                      margin: "0 0 4px",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1e2a38",
                    }}
                  >
                    {bp.title || "Untitled Blueprint"}
                  </h3>

                  {!!bp.client_name && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        margin: "0 0 4px",
                      }}
                    >
                      Client: {bp.client_name}
                    </p>
                  )}

                  {isImported && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        margin: "0 0 4px",
                      }}
                    >
                      Imported reference
                      {bp.file_type
                        ? ` · ${String(bp.file_type).toUpperCase()}`
                        : ""}
                    </p>
                  )}

                  <p
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      margin: "0 0 12px",
                    }}
                  >
                    By {bp.creator_name || "Admin"} · {formatDate(displayDate)}
                  </p>

                  {tab === "archive" && bp.archive_days_left != null && (
                    <p
                      style={{
                        fontSize: 11,
                        margin: "0 0 12px",
                        fontWeight: 700,
                        color:
                          Number(bp.archive_days_left) <= 5
                            ? "#dc2626"
                            : "#f59e0b",
                      }}
                    >
                      {Number(bp.archive_days_left) === 0
                        ? "Expires today"
                        : `${bp.archive_days_left} day${Number(bp.archive_days_left) === 1 ? "" : "s"} left`}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {tab !== "archive" ? (
                      <>
                        <button
                          onClick={() =>
                            navigate(`/admin/blueprints/${bp.id}/design`)
                          }
                          style={btnEdit}
                          disabled={isBusy}
                        >
                          {isImported ? "🧩 Open Design" : "✏️ Design"}
                        </button>

                        {isImported && !!bp.file_url && (
                          <button
                            onClick={() => handleOpenFile(bp.file_url)}
                            style={{
                              ...btnEdit,
                              background: "#eef2ff",
                              color: "#4338ca",
                            }}
                            disabled={isBusy}
                          >
                            📄 Open File
                          </button>
                        )}

                        <button
                          onClick={() =>
                            navigate(`/admin/blueprints/${bp.id}/estimation`)
                          }
                          style={{
                            ...btnEdit,
                            background: "#f3e8ff",
                            color: "#6b21a8",
                          }}
                          disabled={isBusy}
                        >
                          💰 Estimate
                        </button>

                        <button
                          onClick={() => openArchiveConfirm(bp)}
                          style={{
                            ...btnEdit,
                            background: "#f1f5f9",
                            color: "#64748b",
                            opacity: isArchiving ? 0.7 : 1,
                            cursor: isArchiving ? "not-allowed" : "pointer",
                          }}
                          disabled={isBusy}
                        >
                          {isArchiving ? "Archiving..." : "🗑 Archive"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestore(bp.id)}
                          style={{
                            ...btnEdit,
                            opacity: isRestoring ? 0.7 : 1,
                            cursor: isRestoring ? "not-allowed" : "pointer",
                          }}
                          disabled={isBusy}
                        >
                          {isRestoring ? "Restoring..." : "↩ Restore"}
                        </button>

                        <button
                          onClick={() => openDeleteConfirm(bp)}
                          style={{
                            ...btnDelete,
                            opacity: isDeleting ? 0.7 : 1,
                            cursor: isDeleting ? "not-allowed" : "pointer",
                          }}
                          disabled={isBusy}
                        >
                          {isDeleting ? "Deleting..." : "🗑 Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {importModal && (
        <div style={overlay}>
          <div style={modalBox}>
            <h3 style={{ margin: "0 0 20px" }}>Import Blueprint File</h3>
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              Accepted blueprint files: PDF, PNG, JPG, JPEG, SVG.
              <br />
              Imported files can be opened in the design tool as a traceable
              background/reference.
            </p>

            <form onSubmit={handleImport}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelSm}>Blueprint Title *</label>
                <input
                  required
                  value={importForm.title}
                  onChange={(e) =>
                    setImportForm((f) => ({ ...f, title: e.target.value }))
                  }
                  style={inputFull}
                  placeholder="Enter blueprint title"
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={labelSm}>
                  Blueprint File (PDF / PNG / JPG / JPEG / SVG) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.svg"
                  onChange={(e) =>
                    setImportForm((f) => ({
                      ...f,
                      file: e.target.files?.[0] || null,
                    }))
                  }
                  style={inputFull}
                />
              </div>

              {!!importForm.file && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "10px 12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#475569",
                  }}
                >
                  <div>
                    <strong>Selected:</strong> {importForm.file.name}
                  </div>
                  <div>
                    <strong>Size:</strong>{" "}
                    {(importForm.file.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              )}

              <div
                style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setImportModal(false);
                    setImportForm({ title: "", file: null });
                  }}
                  style={btnGhost}
                >
                  Cancel
                </button>
                <button type="submit" disabled={importing} style={btnPrimary}>
                  {importing ? "Importing..." : "Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createModal && (
        <div style={overlay}>
          <div style={modalBox}>
            <h3 style={{ margin: "0 0 20px" }}>Create New Blueprint</h3>

            <form onSubmit={handleCreateBlueprint}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelSm}>Blueprint Title *</label>
                <input
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  style={inputFull}
                  placeholder="Enter blueprint title"
                />
              </div>

              <div
                style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  style={btnGhost}
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} style={btnPrimary}>
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {archiveConfirmModal && archiveTarget && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: 430 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#fef3c7",
                color: "#b45309",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: 16,
              }}
            >
              🗃️
            </div>

            <h3
              style={{
                margin: "0 0 10px",
                fontSize: 20,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Archive Blueprint?
            </h3>

            <p
              style={{
                margin: "0 0 6px",
                fontSize: 14,
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              You are about to move this blueprint to archive:
            </p>

            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 14,
                fontWeight: 700,
                color: "#1e293b",
                wordBreak: "break-word",
              }}
            >
              {archiveTarget.title || "Untitled Blueprint"}
            </div>

            <p
              style={{
                margin: "0 0 20px",
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              You can still restore this blueprint later from the Archive tab.
            </p>

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                type="button"
                onClick={closeArchiveConfirm}
                disabled={archivingId === archiveTarget.id}
                style={{
                  ...btnGhost,
                  opacity: archivingId === archiveTarget.id ? 0.7 : 1,
                  cursor:
                    archivingId === archiveTarget.id
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmArchive}
                disabled={archivingId === archiveTarget.id}
                style={{
                  ...btnPrimary,
                  background: "#f59e0b",
                  opacity: archivingId === archiveTarget.id ? 0.7 : 1,
                  cursor:
                    archivingId === archiveTarget.id
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {archivingId === archiveTarget.id
                  ? "Archiving..."
                  : "Yes, Move to Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmModal && deleteTarget && (
        <div style={overlay}>
          <div style={{ ...modalBox, width: 430 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#b91c1c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: 16,
              }}
            >
              🗑
            </div>

            <h3
              style={{
                margin: "0 0 10px",
                fontSize: 20,
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Delete Archived Blueprint?
            </h3>

            <p
              style={{
                margin: "0 0 6px",
                fontSize: 14,
                color: "#475569",
                lineHeight: 1.6,
              }}
            >
              You are about to permanently delete:
            </p>

            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: 14,
                fontWeight: 700,
                color: "#1e293b",
                wordBreak: "break-word",
              }}
            >
              {deleteTarget.title || "Untitled Blueprint"}
            </div>

            <p
              style={{
                margin: "0 0 20px",
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              This action cannot be undone and may also remove related
              estimation data.
            </p>

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deletingId === deleteTarget.id}
                style={{
                  ...btnGhost,
                  opacity: deletingId === deleteTarget.id ? 0.7 : 1,
                  cursor:
                    deletingId === deleteTarget.id ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPermanentDelete}
                disabled={deletingId === deleteTarget.id}
                style={{
                  ...btnDanger,
                  opacity: deletingId === deleteTarget.id ? 0.7 : 1,
                  cursor:
                    deletingId === deleteTarget.id ? "not-allowed" : "pointer",
                }}
              >
                {deletingId === deleteTarget.id
                  ? "Deleting..."
                  : "Yes, Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputSm = {
  padding: "7px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
};

const inputFull = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  boxSizing: "border-box",
};

const labelSm = {
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  display: "block",
  marginBottom: 4,
};

const btnPrimary = {
  padding: "8px 18px",
  background: "#1e40af",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const btnGhost = {
  padding: "8px 18px",
  background: "#f1f5f9",
  color: "#374151",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const btnEdit = {
  padding: "4px 12px",
  background: "#e0f2fe",
  color: "#0369a1",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

const btnDelete = {
  padding: "4px 12px",
  background: "#fee2e2",
  color: "#b91c1c",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

const btnDanger = {
  padding: "10px 18px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalBox = {
  background: "#fff",
  borderRadius: 12,
  padding: 28,
  width: 480,
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,.3)",
};
