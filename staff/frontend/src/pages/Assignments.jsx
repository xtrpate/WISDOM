import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import "./Assignments.css";

export default function Assignments() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    task_role: "Cabinet Maker",
    assigned_to: "",
    due_date: "",
  });

  // Setup Axios interceptor to always attach the token
  const axiosInstance = axios.create();
  axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); // Assuming you store token here
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const fetchTasks = async () => {
    try {
      const res = await axiosInstance.get("/api/pos/tasks");
      const fetchedTasks = res.data;
      setTasks(fetchedTasks);

      // Automatically mark tasks as "read" when the staff views the board
      if (user?.role !== "admin") {
        const unreadTasks = fetchedTasks.filter((t) => t.is_read === 0);
        if (unreadTasks.length > 0) {
          // A silent status update marks them as read in the backend without changing their actual status
          await Promise.all(
            unreadTasks.map((t) =>
              axiosInstance.put(`/api/pos/tasks/${t.id}/status`, {
                status: t.status,
              }),
            ),
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (user?.role !== "admin") return;
    try {
      const res = await axiosInstance.get("/api/pos/tasks/staff");
      setStaffList(res.data);
    } catch (error) {
      console.error("Failed to fetch staff", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStaff();
  }, [user]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axiosInstance.put(`/api/pos/tasks/${taskId}/status`, {
        status: newStatus,
      });
      fetchTasks(); // Refresh list to get updated timestamps
    } catch (error) {
      alert("Failed to update status. Are you assigned to this task?");
    }
  };

  // ─── ADDED: Handle Accept Task Logic ───
  const handleAcceptTask = async (taskId) => {
    try {
      await axiosInstance.put(`/api/pos/tasks/${taskId}/accept`);
      fetchTasks(); // Refreshes the UI to show In Progress and removes the Accept button
    } catch (error) {
      alert("Failed to accept assignment.");
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/api/pos/tasks", newTask);
      setShowModal(false);
      setNewTask({
        title: "",
        description: "",
        task_role: "Cabinet Maker",
        assigned_to: "",
        due_date: "",
      });
      fetchTasks();
      fetchStaff(); // Refresh staff workloads
    } catch (error) {
      alert("Failed to assign task. Please check the required fields.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading)
    return <div className="loading-screen">Loading Assignments...</div>;

  return (
    <div className="assignments-page">
      <div className="assignments-hero">
        <div>
          <h1>Task Assignments</h1>
          <p>
            {user?.role === "admin"
              ? "Manage and allocate staff for active projects."
              : "View and update your assigned tasks."}
          </p>
        </div>
        {user?.role === "admin" && (
          <button className="assign-btn" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Assign Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          No tasks found right now.
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div
              key={task.id}
              /* ADDED: Highlight unread tasks for staff */
              className={`task-card ${task.is_read === 0 && user?.role !== "admin" ? "task-card-unread" : ""}`}
            >
              <div className="task-header">
                <div>
                  <h3 className="task-title">{task.title}</h3>
                  <span className="task-role">{task.task_role}</span>
                </div>
                <span className={`task-badge status-${task.status}`}>
                  {task.status.replace("_", " ")}
                </span>
              </div>

              <p className="task-desc">
                {task.description || "No description provided."}
              </p>

              <div className="task-meta">
                {user?.role === "admin" && (
                  <span>
                    👤 <strong>Assigned to:</strong> {task.assigned_to_name}
                  </span>
                )}
                <span>
                  📅 <strong>Due:</strong> {formatDate(task.due_date)}
                </span>
                {/* ADDED: Show accepted time if it exists */}
                {task.accepted_at && (
                  <span style={{ color: "#2e7d32" }}>
                    ✅ <strong>Accepted:</strong> {formatDate(task.accepted_at)}
                  </span>
                )}
                {task.order_number && (
                  <span>
                    📦 <strong>Order:</strong> {task.order_number}
                  </span>
                )}
              </div>

              <div className="task-actions">
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  Assigned by {task.assigned_by_name}
                </span>

                {/* ADDED: Wrap actions in a flex container to hold the button and select dropdown cleanly */}
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  {/* ADDED: The Accept Button (Only shows for Staff when status is 'pending') */}
                  {task.status === "pending" && user?.role !== "admin" && (
                    <button
                      className="status-btn-green"
                      onClick={() => handleAcceptTask(task.id)}
                    >
                      <CheckCircle size={16} /> Accept
                    </button>
                  )}

                  {/* Staff can change status (Hidden if pending, so they MUST accept first), Admin can always override */}
                  {(user?.role === "admin" || task.status !== "pending") && (
                    <select
                      className="status-select"
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value)
                      }
                      disabled={
                        task.status === "completed" && user?.role !== "admin"
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked / Issue</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADMIN ASSIGNMENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Assign New Task</h2>
            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="e.g. Assemble Oak Cabinets"
                />
              </div>

              <div className="form-group">
                <label>Task Role</label>
                <select
                  value={newTask.task_role}
                  onChange={(e) =>
                    setNewTask({ ...newTask, task_role: e.target.value })
                  }
                >
                  <option value="Cabinet Maker">Cabinet Maker</option>
                  <option value="Installer">Installer</option>
                  <option value="Delivery Personnel">Delivery Personnel</option>
                  <option value="Quality Inspector">Quality Inspector</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Assign To (Staff Member) *</label>
                <select
                  required
                  value={newTask.assigned_to}
                  onChange={(e) =>
                    setNewTask({ ...newTask, assigned_to: e.target.value })
                  }
                >
                  <option value="">-- Select Staff --</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.role}) - {staff.active_tasks} active
                      tasks
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) =>
                    setNewTask({ ...newTask, due_date: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Instructions / Description</label>
                <textarea
                  rows="3"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="Add specific measurements, notes, or client requests..."
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
