import { useEffect, useState } from "react";
import Layout from "../components/Layout.jsx";
import {
    FiAlertTriangle,
    FiFilter,
    FiTrash2,
    FiCheckSquare,
    FiDatabase,
} from "react-icons/fi";
import { getAuth } from "firebase/auth";

// 🧩 Chuẩn hoá timestamp Firestore về Date
function normalizeTimestamp(ts) {
    if (!ts) return null;
    try {
        // Firestore Timestamp object (có thể là seconds hoặc _seconds)
        if (typeof ts === "object") {
            const sec = ts.seconds ?? ts._seconds;
            if (sec) return new Date(sec * 1000);
        }

        // ISO string
        if (typeof ts === "string" && ts.includes("T")) {
            const d = new Date(ts);
            if (!isNaN(d)) return d;
        }

        // Firestore string kiểu “September 25, 2025 at ...”
        if (typeof ts === "string" && ts.includes(" at ")) {
            const replaced = ts.replace(" at ", " ");
            const parsed = Date.parse(replaced);
            if (!isNaN(parsed)) return new Date(parsed);
        }

        // Number - check if already in milliseconds (13 digits) or seconds (10 digits)
        if (typeof ts === "number") {
            // If timestamp > 10000000000, it's already in milliseconds (after year 2286 in seconds)
            if (ts > 10000000000) {
                return new Date(ts);
            } else {
                // It's in seconds, convert to milliseconds
                return new Date(ts * 1000);
            }
        }

        // Fallback
        const fallback = new Date(ts);
        return isNaN(fallback) ? null : fallback;
    } catch {
        return null;
    }
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState("list");
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]); // Kept this as it was not explicitly removed

    // Filter states
    const [timeRange, setTimeRange] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchTerm, setSearchTerm] = useState(""); // Added search term

    // Fetch alerts from API
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                setLoading(true);
                const auth = getAuth();
                const currentUser = auth.currentUser; // Get currentUser from auth
                if (!currentUser) {
                    console.error("❌ No user logged in.");
                    setLoading(false);
                    return;
                }
                const token = await currentUser.getIdToken();
                if (!token) {
                    console.error("❌ No token found, user not logged in.");
                    setLoading(false);
                    return;
                }

                const res = await fetch("/api/alerts", { // Adjusted API endpoint
                    headers: { Authorization: `Bearer ${token} ` },
                });
                if (!res.ok) throw new Error(`Failed to fetch alerts(${res.status})`);

                const data = await res.json();
                const active = data.filter((a) => a.status !== "disable");

                const formatted = active.map((alert) => ({
                    id: alert.id, // Assuming 'id' is the correct field
                    type: alert.type,
                    cameraId: alert.cameraId,
                    cameraName: alert.cameraName || "Camera không xác định",
                    location: alert.location || "Không xác định",
                    imageUrl: alert.imageUrl || "",
                    timestamp: normalizeTimestamp(alert.timestamp)?.getTime(), // Use normalizeTimestamp
                    status: alert.status || "active",
                }));

                formatted.sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp

                console.log("✅ Tổng cảnh báo:", formatted.length);
                console.log("🕒 Mẫu timestamp:", formatted[0]?.timestamp);

                setAlerts(formatted);
            } catch (err) {
                console.error("🔥 Lỗi tải cảnh báo:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAlerts();
    }, []); // Dependency changed to empty array to match original behavior, or [currentUser] if currentUser is a state/prop

    // 🔹 Cập nhật ngày bắt đầu - kết thúc khi đổi phạm vi
    useEffect(() => {
        const today = new Date();
        let start = new Date();

        switch (timeRange) {
            case "today": // Added "today" case
                start.setDate(today.getDate());
                break;
            case "1d": // Original "1d" case
                start.setDate(today.getDate() - 1);
                break;
            case "7d":
                start.setDate(today.getDate() - 7);
                break;
            case "30d":
                start.setMonth(today.getMonth() - 1);
                break;
            case "90d":
                start.setMonth(today.getMonth() - 3);
                break;
            case "180d": // Added "180d" case
                start.setMonth(today.getMonth() - 6);
                break;
            case "all":
                start = null;
                break;
        }

        if (start) {
            setStartDate(start.toISOString().split("T")[0]);
            setEndDate(today.toISOString().split("T")[0]);
        } else {
            setStartDate("");
            setEndDate("");
        }
    }, [timeRange]);

    // Filter alerts with search and all filters
    const filteredAlerts = alerts.filter((a) => {
        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchLocation = (a.location || "").toLowerCase().includes(search);
            const matchCamera = (a.cameraName || "").toLowerCase().includes(search);
            const matchType = (a.type || "").toLowerCase().includes(search);

            if (!matchLocation && !matchCamera && !matchType) return false;
        }

        // Time range filter
        if (startDate && endDate) {
            const start = new Date(`${startDate}T00:00:00`);
            const end = new Date(`${endDate}T23:59:59`);
            const t = normalizeTimestamp(a.timestamp);
            if (!t || isNaN(t)) return false;
            if (t < start || t > end) return false;
        }

        // Type filter
        if (typeFilter !== "all" && a.type !== typeFilter) return false;

        // Location filter
        if (locationFilter !== "all" && a.location !== locationFilter) return false;

        return true;
    });

    // 🔹 Xóa (disable) - Commented out as not used in new design
    /*
    const handleDeleteSelected = async () => {
        try {
            const auth = getAuth();
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;

            await Promise.all(
                selectedIds.map(async (id) => {
                    await fetch(`/ api / alerts / ${id} `, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token} `,
                        },
                        body: JSON.stringify({ status: "disable" }),
                    });
                })
            );

            setSelectedIds([]);
            // Would need to refetch data here
        } catch (err) {
            console.error("🔥 Lỗi khi xóa:", err);
        }
    };
    */

    const formatTime = (ts) => {
        const d = normalizeTimestamp(ts);
        return d ? d.toLocaleString("vi-VN") : "Không rõ";
    };

    // ================================
    // 🔹 LIST VIEW - Alert Log (Historical Record)
    // ================================
    if (viewMode === "list") {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto p-6">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <FiDatabase size={32} className="text-orange-500" />
                            Lịch sử Cảnh báo
                        </h1>
                        <p className="text-gray-400 text-lg">
                            Tra cứu và phân tích toàn bộ lịch sử phát hiện cháy & khói
                        </p>
                    </div>

                    {/* Search & Filter Section */}
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
                        {/* Search Bar */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-300 mb-2">
                                🔍 Tìm kiếm
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Tìm theo vị trí, camera, hoặc mô tả..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-6 py-3 pl-12 bg-[#252525] border border-[#333333] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <svg className="w-5 h-5 absolute left-4 top-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-3 top-3 p-1 hover:bg-[#333333] rounded-full"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Time Range Filter */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-300 mb-3">
                                ⏱️ Khoảng thời gian
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: "Hôm nay", value: "today" },
                                    { label: "1 tuần", value: "7d" },
                                    { label: "1 tháng", value: "30d" },
                                    { label: "3 tháng", value: "90d" },
                                    { label: "6 tháng", value: "180d" },
                                    { label: "Tất cả", value: "all" },
                                ].map((btn) => (
                                    <button
                                        key={btn.value}
                                        onClick={() => setTimeRange(btn.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === btn.value
                                            ? "bg-blue-600 text-white"
                                            : "bg-[#252525] border border-[#333333] text-gray-300 hover:bg-[#2a2a2a]"
                                            }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Advanced Filters Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-[#333333]">
                            {/* From Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    📅 Từ ngày
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* To Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    📅 Đến ngày
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Type Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    🔥 Loại cảnh báo
                                </label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Tất cả loại</option>
                                    <option value="fire">🔥 Cháy</option>
                                    <option value="smoke">💨 Khói</option>
                                </select>
                            </div>

                            {/* Location Filter */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-300 mb-2">
                                    📍 Khu vực
                                </label>
                                <select
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333333] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">Tất cả khu vực</option>
                                    {[...new Set(alerts.map((a) => a.location || "Không xác định"))].map(
                                        (loc, i) => (
                                            <option key={i} value={loc}>
                                                {loc}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Results Summary */}
                        <div className="mt-6 pt-6 border-t border-[#333333] flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>
                                    Tìm thấy <span className="font-bold text-orange-400">{filteredAlerts.length}</span> / {alerts.length} cảnh báo
                                </span>
                            </div>

                            {(searchTerm || typeFilter !== "all" || locationFilter !== "all" || timeRange !== "all") && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setTypeFilter("all");
                                        setLocationFilter("all");
                                        setTimeRange("all");
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="px-4 py-2 text-sm bg-[#252525] hover:bg-[#2a2a2a] text-gray-300 rounded-lg transition flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
                            <p className="text-gray-400 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        /* Empty State */
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 bg-[#252525] rounded-full flex items-center justify-center mb-4">
                                    <FiAlertTriangle size={48} className="text-gray-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    Không tìm thấy cảnh báo
                                </h3>
                                <p className="text-gray-500">
                                    {searchTerm
                                        ? `Không tìm thấy kết quả cho "${searchTerm}"`
                                        : "Không có cảnh báo nào phù hợp với bộ lọc"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Timeline List View */
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                            {/* Table Header */}
                            <div className="bg-[#252525] px-6 py-4 border-b border-[#333333]">
                                <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-400">
                                    <div className="col-span-1">Loại</div>
                                    <div className="col-span-4">Thông tin</div>
                                    <div className="col-span-3">Khu vực</div>
                                    <div className="col-span-3">Thời gian</div>
                                    <div className="col-span-1 text-right">Chi tiết</div>
                                </div>
                            </div>

                            {/* Timeline List */}
                            <div className="divide-y divide-[#2a2a2a]">
                                {filteredAlerts.map((a, index) => (
                                    <div
                                        key={a.id}
                                        className="group hover:bg-[#252525] transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedAlert(a);
                                            setViewMode("detail");
                                        }}
                                    >
                                        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                            {/* Type Icon */}
                                            <div className="col-span-1">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${a.type === "fire"
                                                    ? "bg-red-500/20"
                                                    : "bg-gray-500/20"
                                                    }`}>
                                                    <FiAlertTriangle className={a.type === "fire" ? "text-red-400" : "text-gray-400"} size={20} />
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="col-span-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.type === "fire"
                                                        ? "bg-red-500/20 text-red-400"
                                                        : "bg-gray-500/20 text-gray-400"
                                                        }`}>
                                                        {a.type === "fire" ? "Cháy" : "Khói"}
                                                    </span>
                                                    <span className="text-xs text-gray-500">#{index + 1}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="font-medium text-gray-300">{a.cameraName || a.cameraId}</span>
                                                </div>
                                            </div>

                                            {/* Location */}
                                            <div className="col-span-3">
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="font-medium truncate">{a.location || "Không xác định"}</span>
                                                </div>
                                            </div>

                                            {/* Time */}
                                            <div className="col-span-3 text-sm text-gray-400">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    {formatTime(a.timestamp)}
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="col-span-1 text-right">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg className="w-5 h-5 text-blue-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Layout>
        );
    }

    // DETAIL VIEW
    return (
        <Layout>
            <div className="max-w-5xl mx-auto p-6">
                {/* Back Button */}
                <button
                    onClick={() => setViewMode("list")}
                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Quay lại danh sách
                </button>

                {/* Main Content */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className={`px-8 py-6 ${selectedAlert?.type === "fire"
                        ? "bg-red-500/20 border-b border-red-500/30"
                        : "bg-gray-500/20 border-b border-gray-500/30"
                        }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${selectedAlert?.type === "fire"
                                    ? "bg-red-500/30"
                                    : "bg-gray-500/30"
                                    }`}>
                                    <FiAlertTriangle className={selectedAlert?.type === "fire" ? "text-red-400" : "text-gray-400"} size={32} />
                                </div>
                                <div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedAlert?.type === "fire"
                                        ? "bg-red-500/30 text-red-300"
                                        : "bg-gray-500/30 text-gray-300"
                                        }`}>
                                        {selectedAlert?.type === "fire" ? "🔥 Cháy" : "💨 Khói"}
                                    </span>
                                    <h1 className="text-2xl font-bold text-white mt-2">Chi tiết Cảnh báo</h1>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400">ID: {selectedAlert?.id?.slice(0, 8)}...</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-[#252525] border border-[#333333] rounded-lg p-5">
                                <p className="text-sm text-gray-400 mb-2">📹 Camera</p>
                                <p className="font-semibold text-white">{selectedAlert?.cameraName || selectedAlert?.cameraId}</p>
                            </div>
                            <div className="bg-[#252525] border border-[#333333] rounded-lg p-5">
                                <p className="text-sm text-gray-400 mb-2">📍 Vị trí</p>
                                <p className="font-semibold text-white">{selectedAlert?.location || "Không xác định"}</p>
                            </div>
                            <div className="bg-[#252525] border border-[#333333] rounded-lg p-5">
                                <p className="text-sm text-gray-400 mb-2">🕐 Thời gian</p>
                                <p className="font-semibold text-white">{formatTime(selectedAlert?.timestamp)}</p>
                            </div>
                            <div className="bg-[#252525] border border-[#333333] rounded-lg p-5">
                                <p className="text-sm text-gray-400 mb-2">📊 Độ tin cậy</p>
                                <p className="font-semibold text-white">
                                    {selectedAlert?.confidence ? `${(selectedAlert.confidence * 100).toFixed(1)}%` : "N/A"}
                                </p>
                            </div>
                        </div>

                        {selectedAlert?.imageUrl && (
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-white mb-4">🖼️ Hình ảnh phát hiện</h3>
                                <img src={selectedAlert.imageUrl} alt="Alert" className="w-full rounded-lg border border-[#333333]" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

